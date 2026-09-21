// Browser-safe proposal contract: no SDK, environment access, or domain writes.
// Wire: UTF-8 JSON <=8192 bytes, text 1..300 JS characters,
// id 1..100 ASCII alnum/_/-, generation/version nonnegative safe integers.
// ID count is the entire server catalog, NOT a 20-ID limit.
// Never truncate: oversized requests fail BODY_TOO_LARGE. Shared model output
// is capped at 1200 tokens / 4096 text characters; incomplete output never applies.
import { AssistantError, isObject, parseSearchRequest, type SearchRequest, type SearchResponse } from "./contracts";

export const POLICY_BODY_BYTES = 8192;

export type CurrentPolicy = {
  enabled: boolean; productIds: string[]; budgetWon: number; version: number; spentWon: number;
};
export type PolicyRequest = SearchRequest & { storeId: string; currentPolicy: CurrentPolicy };
export const policyActions = ["propose", "clarify", "unsupported"] as const;
export type PolicyOutput = {
  action: typeof policyActions[number];
  // null = keep. A non-null productIds array REPLACES the entire target set.
  enabled: boolean | null; productIds: string[] | null; budgetWon: number | null; message: string;
};
export type PolicyResponse = Pick<SearchResponse, "ok" | "id" | "generation" | "mode" | "model" | "usage"> &
  PolicyOutput & { storeId: string; policyVersion: number };
export type PolicySetting = Pick<CurrentPolicy, "enabled" | "productIds" | "budgetWon">;

const exactKeys = (v: Record<string, unknown>, keys: string[]) => Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k));
const safeCounter = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) >= 0;
const validBudget = (v: unknown): v is number => safeCounter(v) && v <= 1_000_000_000;
const validIds = (v: unknown, ids: readonly string[]): v is string[] => Array.isArray(v) && v.length <= ids.length &&
  new Set(v).size === v.length && v.every(id => typeof id === "string" && ids.includes(id));
const sameIds = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every(id => b.includes(id));

export function parseCurrentPolicy(value: unknown, allowedIds: readonly string[]): CurrentPolicy {
  if (!isObject(value) || !exactKeys(value, ["enabled", "productIds", "budgetWon", "version", "spentWon"]) ||
      typeof value.enabled !== "boolean" || !validIds(value.productIds, allowedIds) ||
      !validBudget(value.budgetWon) || !validBudget(value.spentWon) || value.spentWon > value.budgetWon ||
      !safeCounter(value.version) || (value.enabled && value.productIds.length === 0)) {
    throw new AssistantError("INVALID_MERCHANT_INPUT");
  }
  return { enabled: value.enabled, productIds: [...value.productIds], budgetWon: value.budgetWon, version: value.version, spentWon: value.spentWon };
}

export function parsePolicyRequest(value: unknown, allowedIds: readonly string[], allowedStores: readonly string[]): PolicyRequest {
  if (!isObject(value) || !exactKeys(value, ["text", "id", "generation", "storeId", "currentPolicy"]) ||
      typeof value.storeId !== "string" || !allowedStores.includes(value.storeId)) throw new AssistantError("INVALID_MERCHANT_INPUT");
  let base: SearchRequest;
  try { base = parseSearchRequest({ text: value.text, id: value.id, generation: value.generation }); }
  catch { throw new AssistantError("INVALID_MERCHANT_INPUT"); }
  return { ...base, storeId: value.storeId, currentPolicy: parseCurrentPolicy(value.currentPolicy, allowedIds) };
}

export function policyOutputSchema(allowedIds: readonly string[]) {
  return {
    type: "object",
    properties: {
      action: { type: "string", enum: [...policyActions] },
      enabled: { type: ["boolean", "null"] },
      productIds: { type: ["array", "null"], items: { type: "string", enum: [...allowedIds] }, maxItems: allowedIds.length },
      budgetWon: { type: ["integer", "null"], minimum: 0, maximum: 1_000_000_000 },
      message: { type: "string", minLength: 1, maxLength: 300 },
    },
    required: ["action", "enabled", "productIds", "budgetWon", "message"], additionalProperties: false,
  };
}

const clarify = (message: string): PolicyOutput => ({ action: "clarify", enabled: null, productIds: null, budgetWon: null, message });

export function parsePolicyOutput(value: unknown, allowedIds: readonly string[], currentPolicy: CurrentPolicy): PolicyOutput {
  const current = parseCurrentPolicy(currentPolicy, allowedIds);
  if (!isObject(value) || !exactKeys(value, ["action", "enabled", "productIds", "budgetWon", "message"]) ||
      !policyActions.includes(value.action as PolicyOutput["action"]) ||
      (value.enabled !== null && typeof value.enabled !== "boolean") ||
      (value.productIds !== null && !validIds(value.productIds, allowedIds)) ||
      (value.budgetWon !== null && !validBudget(value.budgetWon)) ||
      typeof value.message !== "string" || !value.message.trim() || value.message.length > 300) {
    throw new AssistantError("MODEL_MALFORMED", 502);
  }
  const output = value as PolicyOutput;
  if (output.action !== "propose") {
    if (output.enabled !== null || output.productIds !== null || output.budgetWon !== null) throw new AssistantError("MODEL_MALFORMED", 502);
    return { ...output, message: output.message.trim() };
  }
  const enabled = output.enabled ?? current.enabled;
  const productIds = output.productIds ?? current.productIds;
  const budgetWon = output.budgetWon ?? current.budgetWon;
  if (budgetWon < current.spentWon) return clarify("이미 사용·점유한 금액보다 예산을 낮출 수 없어요. 그 금액 이상의 예산을 알려주세요.");
  if (enabled && productIds.length === 0) return clarify("자동발주를 켜려면 대상 상품이 필요해요. 상품을 지정하거나 자동발주 해제를 명시해주세요.");
  // Normalize repeated fields to a minimal patch; a budget-only proposal never
  // rewrites a large existing product set. Even all-null is a harmless no-op.
  return {
    action: "propose", enabled: enabled === current.enabled ? null : enabled,
    productIds: sameIds(productIds, current.productIds) ? null : [...productIds],
    budgetWon: budgetWon === current.budgetWon ? null : budgetWon, message: output.message.trim(),
  };
}

// Pure preview only. UI must match response id/generation/storeId/policyVersion,
// current actor/store and generation, then obtain explicit confirmation before
// local policy.set. SQLite/domain is authoritative; this API cannot attest state.
// Accepts a PolicyResponse structurally too; only its five output fields are parsed.
export function resolvePolicyProposal(input: PolicyRequest, output: PolicyOutput, latestPolicy: CurrentPolicy, allowedIds: readonly string[]): PolicySetting {
  const before = parseCurrentPolicy(input.currentPolicy, allowedIds);
  const latest = parseCurrentPolicy(latestPolicy, allowedIds);
  if (before.version !== latest.version || before.spentWon !== latest.spentWon || before.budgetWon !== latest.budgetWon ||
      before.enabled !== latest.enabled || !sameIds(before.productIds, latest.productIds)) throw new AssistantError("MERCHANT_NOT_APPLICABLE", 409);
  const patch = parsePolicyOutput({ action: output.action, enabled: output.enabled, productIds: output.productIds, budgetWon: output.budgetWon, message: output.message }, allowedIds, latest);
  if (patch.action !== "propose") throw new AssistantError("MERCHANT_NOT_APPLICABLE", 409);
  return { enabled: patch.enabled ?? latest.enabled, productIds: [...(patch.productIds ?? latest.productIds)], budgetWon: patch.budgetWon ?? latest.budgetWon };
}
