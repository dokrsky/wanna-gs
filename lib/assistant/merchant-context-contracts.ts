// Browser-safe UI09A contract. Explicit v2 header, <=64KiB UTF-8 input, <=5
// applied changes, catalog-cardinality ID sets (currently 242); never truncate.
// V2 model text + final wire response <=16KiB each; shared 1200 output tokens,
// 30s timeout/retry0 remain. Incomplete/error is never a fallback proposal.
// These are client snapshot claims, not server-authorized transaction facts.
import { AssistantError, isObject, merchantActions, merchantScopes, merchantSelections, merchantViews, parseSearchRequest, type MerchantOutput, type MerchantRequest, type MerchantResponse } from "./contracts";
import { parseCurrentPolicy, parsePolicyOutput, policyOutputSchema, type CurrentPolicy, type PolicyOutput } from "./policy-contracts";

export const MERCHANT_CONTEXT_BODY_BYTES = 65_536;
export const MERCHANT_CONTEXT_OUTPUT_BYTES = 16_384;
export type MerchantChange = { id: string; seq: number; addedProductIds: string[]; removedProductIds: string[]; beforeBudgetWon: number; afterBudgetWon: number };
export type MerchantContext = { uiSeq: number; changes: MerchantChange[]; pendingProductIds: string[]; currentPolicy: CurrentPolicy };
export type MerchantContextRequest = MerchantRequest & { context: MerchantContext };
export type MerchantContextOutput = Omit<MerchantOutput, "action"> & {
  action: MerchantOutput["action"] | "policy";
  restoreSelectionChangeId: string | null; restoreBudgetChangeId: string | null;
  policyDraft: PolicyOutput | null;
};
export type MerchantContextResponse = Pick<MerchantResponse, "ok" | "id" | "generation" | "mode" | "model" | "usage"> & MerchantContextOutput & { storeId: string; uiSeq: number };
export type MerchantContextProposal = { view: MerchantOutput["view"]; selectedProductIds: string[]; budgetWon: number; policyDraft: PolicyOutput | null };

const keys = (v: Record<string, unknown>, names: readonly string[]) => Object.keys(v).length === names.length && names.every(k => Object.hasOwn(v, k));
const counter = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) >= 0;
const budget = (v: unknown): v is number => counter(v) && v <= 1_000_000_000;
const identifier = (v: unknown): v is string => typeof v === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(v);
const ids = (v: unknown, allowed: readonly string[]): v is string[] => Array.isArray(v) && v.length <= allowed.length && new Set(v).size === v.length && v.every(id => typeof id === "string" && allowed.includes(id));
const sameIds = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every(id => b.includes(id));
const outputKeys = ["action", "scope", "view", "selection", "productIds", "budgetWon", "message", "restoreSelectionChangeId", "restoreBudgetChangeId", "policyDraft"];
function malformed(): never { throw new AssistantError("MODEL_MALFORMED", 502); }
function invalid(): never { throw new AssistantError("INVALID_MERCHANT_INPUT"); }

export function parseMerchantContextRequest(value: unknown, allowedIds: readonly string[], allowedStores: readonly string[]): MerchantContextRequest {
  if (!isObject(value) || !keys(value, ["text", "id", "generation", "storeId", "budgetWon", "selectedProductIds", "context"]) ||
      typeof value.storeId !== "string" || !allowedStores.includes(value.storeId) || !budget(value.budgetWon) || !ids(value.selectedProductIds, allowedIds)) invalid();
  let base;
  try { base = parseSearchRequest({ text: value.text, id: value.id, generation: value.generation }); } catch { invalid(); }
  const c = value.context;
  if (!isObject(c) || !keys(c, ["uiSeq", "changes", "pendingProductIds", "currentPolicy"]) || !counter(c.uiSeq) || !ids(c.pendingProductIds, allowedIds) || !Array.isArray(c.changes) || c.changes.length > 5) invalid();
  const uiSeq = c.uiSeq;
  let previousSeq = -1;
  const seen = new Set<string>();
  const changes = c.changes.map(change => {
    if (!isObject(change) || !keys(change, ["id", "seq", "addedProductIds", "removedProductIds", "beforeBudgetWon", "afterBudgetWon"]) ||
        !identifier(change.id) || seen.has(change.id) || !counter(change.seq) || change.seq <= previousSeq || change.seq > uiSeq ||
        !ids(change.addedProductIds, allowedIds) || !ids(change.removedProductIds, allowedIds) ||
        change.addedProductIds.some(id => (change.removedProductIds as string[]).includes(id)) || !budget(change.beforeBudgetWon) || !budget(change.afterBudgetWon) ||
        (!change.addedProductIds.length && !change.removedProductIds.length && change.beforeBudgetWon === change.afterBudgetWon)) invalid();
    previousSeq = change.seq; seen.add(change.id);
    return { id: change.id, seq: change.seq, addedProductIds: [...change.addedProductIds], removedProductIds: [...change.removedProductIds], beforeBudgetWon: change.beforeBudgetWon, afterBudgetWon: change.afterBudgetWon };
  });
  return { ...base, storeId: value.storeId, budgetWon: value.budgetWon, selectedProductIds: [...value.selectedProductIds], context: {
    uiSeq: c.uiSeq, changes, pendingProductIds: [...c.pendingProductIds], currentPolicy: parseCurrentPolicy(c.currentPolicy, allowedIds),
  } };
}

const clarify = (scope: MerchantOutput["scope"], message: string): MerchantContextOutput => ({ action: "clarify", scope, view: "requested", selection: "keep", productIds: [], budgetWon: null, message, restoreSelectionChangeId: null, restoreBudgetChangeId: null, policyDraft: null });

// Model references are resolved here, never interpreted as commands. Calling
// this again on a normalized server response is safe (no second restoration).
export function parseMerchantContextOutput(value: unknown, input: MerchantContextRequest, allowedIds: readonly string[]): MerchantContextOutput {
  if (!isObject(value) || !keys(value, outputKeys) || ![...merchantActions, "policy"].includes(String(value.action)) ||
      !merchantScopes.includes(value.scope as MerchantOutput["scope"]) || !merchantViews.includes(value.view as MerchantOutput["view"]) ||
      !merchantSelections.includes(value.selection as MerchantOutput["selection"]) || !ids(value.productIds, allowedIds) ||
      (value.budgetWon !== null && !budget(value.budgetWon)) || typeof value.message !== "string" || !value.message.trim() || value.message.length > 300 ||
      (value.restoreSelectionChangeId !== null && !identifier(value.restoreSelectionChangeId)) || (value.restoreBudgetChangeId !== null && !identifier(value.restoreBudgetChangeId))) malformed();
  let out = { ...value, productIds: [...value.productIds], message: value.message.trim() } as MerchantContextOutput;
  const selectionRef = out.restoreSelectionChangeId;
  const budgetRef = out.restoreBudgetChangeId;
  if (["clarify", "unsupported", "filter"].includes(out.action)) {
    if (out.selection !== "keep" || out.productIds.length || out.budgetWon !== null || selectionRef || budgetRef || out.policyDraft !== null || (out.action === "filter" && out.scope !== "current_batch")) malformed();
    return out;
  }
  if (out.action === "policy") {
    if (out.scope !== "future_policy" || out.selection !== "keep" || out.productIds.length || out.budgetWon !== null || selectionRef || budgetRef || !isObject(out.policyDraft)) malformed();
    if (!input.selectedProductIds.length) return clarify("future_policy", "앞으로 적용할 현재 선택 상품이 없어요. 대상 상품을 먼저 선택해주세요.");
    if (input.selectedProductIds.some(id => !input.context.pendingProductIds.includes(id))) return clarify("future_policy", "현재 선택 중 유효 미확보 후보가 아닌 상품이 있어요. 최신 선택을 확인해주세요.");
    const draft = out.policyDraft;
    if (draft.productIds !== null && (!ids(draft.productIds, allowedIds) || !sameIds(draft.productIds, input.selectedProductIds))) malformed();
    const parsed = parsePolicyOutput({ ...draft, productIds: input.selectedProductIds }, allowedIds, input.context.currentPolicy);
    if (parsed.action !== "propose") return clarify("future_policy", parsed.message);
    // Explicit full target handoff, even when identical; enable/budget remain
    // nullable patches and NEVER inherit the current-batch spending ceiling.
    return { ...out, policyDraft: { ...parsed, productIds: [...input.selectedProductIds] } };
  }
  if (out.scope !== "current_batch" || out.policyDraft !== null) malformed();
  if (selectionRef) {
    if (out.action !== "select" || !["keep", "include"].includes(out.selection)) malformed();
    const change = input.context.changes.find(c => c.id === selectionRef);
    if (!change?.removedProductIds.length) return clarify(out.scope, "참조한 제외 변경을 최근 5개 기록에서 찾지 못했어요. 복원할 상품을 확인해주세요.");
    const union = [...new Set([...input.selectedProductIds, ...change.removedProductIds])];
    if (union.some(id => !input.context.pendingProductIds.includes(id))) return clarify(out.scope, "복원 대상 일부가 현재 유효 미확보 후보가 아니에요. 만료·발주 연결 등 최신 상태를 확인해주세요. 일부만 복원하지 않았어요.");
    if (out.productIds.length && !sameIds(out.productIds, union)) malformed();
    out = { ...out, selection: "include", productIds: union };
  }
  if (budgetRef) {
    if (!["select", "budget"].includes(out.action)) malformed();
    const change = input.context.changes.find(c => c.id === budgetRef);
    if (!change || change.beforeBudgetWon === change.afterBudgetWon) return clarify(out.scope, "참조한 예산 변경을 최근 5개 기록에서 찾지 못했어요. 이번 묶음 한도를 다시 확인해주세요.");
    if (out.budgetWon !== null && out.budgetWon !== change.beforeBudgetWon) malformed();
    out = { ...out, budgetWon: change.beforeBudgetWon };
  }
  if ((out.action === "budget" && (out.selection !== "keep" || out.productIds.length || out.budgetWon === null)) ||
      (out.action === "select" && out.selection === "keep") || (["keep", "all_pending"].includes(out.selection) && out.productIds.length) ||
      (out.selection === "exclude" && !out.productIds.length)) malformed();
  const nextSelected = out.selection === "all_pending" ? input.context.pendingProductIds
    : out.selection === "include" ? out.productIds
    : out.selection === "exclude" ? (input.selectedProductIds.length ? input.selectedProductIds : input.context.pendingProductIds).filter(id => !out.productIds.includes(id))
    : input.selectedProductIds;
  if (nextSelected.some(id => !input.context.pendingProductIds.includes(id))) {
    return clarify(out.scope, "선택 대상이 현재 유효 미확보 후보와 달라요. 최신 요청 상태를 확인한 뒤 변경해주세요.");
  }
  return out;
}

export function parseMerchantContextResponse(value: unknown, input: MerchantContextRequest, allowedIds: readonly string[]): MerchantContextResponse {
  if (!isObject(value) || !keys(value, [...outputKeys, "ok", "id", "generation", "mode", "model", "usage", "storeId", "uiSeq"]) ||
      value.ok !== true || value.id !== input.id || value.generation !== input.generation || value.storeId !== input.storeId || value.uiSeq !== input.context.uiSeq ||
      value.mode !== "live" || typeof value.model !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(value.model) ||
      !isObject(value.usage) || !keys(value.usage, ["inputTokens", "outputTokens"]) || !counter(value.usage.inputTokens) || !counter(value.usage.outputTokens)) malformed();
  if (new TextEncoder().encode(JSON.stringify(value)).byteLength > MERCHANT_CONTEXT_OUTPUT_BYTES) malformed();
  const output = parseMerchantContextOutput(Object.fromEntries(outputKeys.map(k => [k, value[k]])), input, allowedIds);
  return { ...output, ok: true, id: input.id, generation: input.generation, storeId: input.storeId, uiSeq: input.context.uiSeq, mode: "live", model: value.model, usage: { inputTokens: value.usage.inputTokens, outputTokens: value.usage.outputTokens } };
}

export function resolveMerchantContextProposal(input: MerchantContextRequest, output: MerchantContextOutput, latest: MerchantContextRequest, allowedIds: readonly string[]): MerchantContextProposal {
  const before = parseMerchantContextRequest(input, allowedIds, [input.storeId]);
  const current = parseMerchantContextRequest(latest, allowedIds, [input.storeId]);
  // Deliberately excludes DB revision: an unrelated append-only log is not a
  // changed business input. UI still checks session/actor/current conditions and
  // uses the current SQLite revision when explicitly executing any command.
  const fingerprint = (v: MerchantContextRequest) => JSON.stringify([v.generation, v.storeId, v.budgetWon, [...v.selectedProductIds].sort(), v.context.uiSeq,
    v.context.changes, [...v.context.pendingProductIds].sort(), { ...v.context.currentPolicy, productIds: [...v.context.currentPolicy.productIds].sort() }]);
  if (fingerprint(before) !== fingerprint(current)) throw new AssistantError("MERCHANT_NOT_APPLICABLE", 409);
  const parsed = parseMerchantContextOutput(Object.fromEntries(outputKeys.map(k => [k, output[k as keyof MerchantContextOutput]])), current, allowedIds);
  if (["clarify", "unsupported"].includes(parsed.action)) throw new AssistantError("MERCHANT_NOT_APPLICABLE", 409);
  const selectedProductIds = parsed.selection === "all_pending" ? current.context.pendingProductIds
    : parsed.selection === "include" ? parsed.productIds
    : parsed.selection === "exclude" ? (current.selectedProductIds.length ? current.selectedProductIds : current.context.pendingProductIds).filter(id => !parsed.productIds.includes(id))
    : current.selectedProductIds;
  // A validated filter only changes the view, not selection/budget/policy.
  if (parsed.action !== "filter" && selectedProductIds.some(id => !current.context.pendingProductIds.includes(id))) throw new AssistantError("MERCHANT_SELECTION_UNAVAILABLE", 409);
  return { view: parsed.view, selectedProductIds: [...selectedProductIds], budgetWon: parsed.budgetWon ?? current.budgetWon, policyDraft: parsed.policyDraft ? { ...parsed.policyDraft, productIds: parsed.policyDraft.productIds ? [...parsed.policyDraft.productIds] : null } : null };
}

export function merchantContextOutputSchema(allowedIds: readonly string[]) {
  const ref = { type: ["string", "null"], maxLength: 100 };
  const policy = policyOutputSchema(allowedIds);
  return { type: "object", additionalProperties: false, required: outputKeys, properties: {
    action: { type: "string", enum: [...merchantActions, "policy"] }, scope: { type: "string", enum: [...merchantScopes] },
    view: { type: "string", enum: [...merchantViews] }, selection: { type: "string", enum: [...merchantSelections] },
    productIds: { type: "array", items: { type: "string", enum: [...allowedIds] }, maxItems: allowedIds.length },
    budgetWon: { type: ["integer", "null"], minimum: 0, maximum: 1_000_000_000 }, message: { type: "string", minLength: 1, maxLength: 300 },
    restoreSelectionChangeId: ref, restoreBudgetChangeId: ref,
    // Model refers to the current selection with null; code supplies the exact
    // set. Public PolicyOutput stays unchanged and needs no second model call.
    policyDraft: { anyOf: [{ type: "null" }, { ...policy, properties: { ...policy.properties, productIds: { type: "null" } } }] },
  } };
}
