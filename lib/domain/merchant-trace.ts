// Append-only run lifecycle; deliberately no settlement, clock or trade imports.
import { identifier, integer, requireRule } from "./policy";
import { parseMerchantContextRequest, parseMerchantContextResponse, type MerchantContextRequest, type MerchantContextResponse } from "../assistant/merchant-context-contracts";
import { parsePolicyRequest, parsePolicyOutput, resolvePolicyProposal, type PolicyRequest, type PolicyResponse } from "../assistant/policy-contracts";
import { isObject } from "../assistant/contracts";
import type { Command, DomainState } from "./types";
import type { MerchantRun, MerchantObservation } from "./merchant-trace-types";

const rule = (ok: unknown) => requireRule(ok, "INVALID_MERCHANT_TRACE", "경영주 실행 기록의 형식·연결을 확인해주세요.");
const exact = (v: unknown, keys: string[]): v is Record<string, unknown> => isObject(v) && Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k));
const errorCode = (v: unknown) => typeof v === "string" && /^[A-Z][A-Z0-9_]{0,79}$/.test(v);
const sameIds = (a: string[], b: string[]) => a.length === b.length && a.every(id => b.includes(id));
function json(text: string, limit: number): unknown {
  rule(typeof text === "string" && new TextEncoder().encode(text).byteLength <= limit);
  return JSON.parse(text);
}
function input(s: DomainState, r: MerchantRun): MerchantContextRequest | PolicyRequest {
  const ids = s.products.map(p => p.id);
  const value = json(r.inputJson, r.kind === "batch" ? 65536 : 4096);
  const parsed = r.kind === "batch" ? parseMerchantContextRequest(value, ids, [r.storeId]) : parsePolicyRequest(value, ids, [r.storeId]);
  rule(parsed.id === r.id);
  return parsed;
}
function response(s: DomainState, r: MerchantRun, observation: MerchantObservation): MerchantContextResponse | PolicyResponse | null {
  if (observation.status === "error") {
    rule(exact(observation, ["status", "errorCode"]) && errorCode(observation.errorCode));
    return null;
  }
  rule(exact(observation, ["status", "responseJson"]) && observation.status === "success");
  const i = input(s, r), ids = s.products.map(p => p.id);
  const value = json(observation.responseJson, 16384);
  if (r.kind === "batch") return parseMerchantContextResponse(value, i as MerchantContextRequest, ids);
  const p = i as PolicyRequest;
  rule(exact(value, ["action", "enabled", "productIds", "budgetWon", "message", "ok", "id", "generation", "mode", "model", "usage", "storeId", "policyVersion"]));
  const v = value as Record<string, unknown>;
  rule(v.ok === true && v.id === p.id && v.generation === p.generation && v.storeId === p.storeId && v.policyVersion === p.currentPolicy.version &&
    v.mode === "live" && typeof v.model === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(v.model) &&
    exact(v.usage, ["inputTokens", "outputTokens"]) && integer(v.usage.inputTokens as number) && integer(v.usage.outputTokens as number));
  const out = parsePolicyOutput({ action: v.action, enabled: v.enabled, productIds: v.productIds, budgetWon: v.budgetWon, message: v.message }, ids, p.currentPolicy);
  return { ...v, ...out } as PolicyResponse;
}
function validateApplication(s: DomainState, r: MerchantRun) {
  if (r.application === "not_applied") { rule(r.applicationCommandKey === null && r.appliedAt === null); return; }
  rule(r.terminal === "success" && r.observation?.status === "success" && integer(r.appliedAt as number) && r.appliedAt! >= r.finishedAt!);
  const out = response(s, r, r.observation!);
  rule(out);
  if (r.application === "screen_applied") {
    const b = out as MerchantContextResponse;
    rule(r.kind === "batch" && b.scope === "current_batch" && ["filter", "select", "budget"].includes(b.action) && r.applicationCommandKey === null);
    return;
  }
  rule(r.application === "policy_saved" && r.applicationCommandKey === `merchant-policy:${r.id}`);
  const i = input(s, r), ids = s.products.map(p => p.id);
  const policyInput = r.kind === "policy" ? i as PolicyRequest : { ...i, currentPolicy: (i as MerchantContextRequest).context.currentPolicy };
  const patch = r.kind === "policy" ? out as PolicyResponse : (out as MerchantContextResponse).policyDraft;
  rule(patch && (r.kind === "policy" || ((out as MerchantContextResponse).action === "policy" && (out as MerchantContextResponse).scope === "future_policy")));
  const setting = resolvePolicyProposal(policyInput, patch!, policyInput.currentPolicy, ids);
  const receipt = s.receipts.find(x => x.key === r.applicationCommandKey);
  rule(receipt && receipt.result.commandKey === r.applicationCommandKey);
  const cmd = JSON.parse(receipt!.fingerprint);
  rule(cmd.type === "policy.set" && cmd.sessionId === s.sessionId && cmd.generation === s.generation && cmd.actorId === r.actorId && cmd.role === "merchant" && cmd.storeId === r.storeId &&
    cmd.idempotencyKey === receipt!.key && cmd.enabled === setting.enabled && cmd.budgetWon === setting.budgetWon && Array.isArray(cmd.productIds) && sameIds(cmd.productIds, setting.productIds));
  // Log commits may occur AFTER the successful policy commit on explicit retry.
  // The run-specific policy key binds it without imposing log receipt chronology.
}
function validate(s: DomainState, r: MerchantRun) {
  rule(identifier(r.id) && ["batch", "policy"].includes(r.kind) && integer(r.startedAt) &&
    s.actors.some(a => a.id === r.actorId && a.role === "merchant" && a.storeId === r.storeId));
  input(s, r);
  rule(["running", "success", "error", "cancelled", "stale", "interrupted"].includes(r.terminal));
  if (r.terminal === "running") rule(r.finishedAt === null && r.latencyMs === null && r.terminalErrorCode === null && r.observation === null);
  else rule(integer(r.finishedAt as number) && r.finishedAt! >= r.startedAt && integer(r.latencyMs as number) && (r.terminalErrorCode === null || errorCode(r.terminalErrorCode)));
  if (r.terminal === "success") rule(r.observation?.status === "success" && r.terminalErrorCode === null);
  if (r.terminal === "error") rule(errorCode(r.terminalErrorCode));
  const out = r.observation === null ? null : response(s, r, r.observation);
  rule(out ? r.model === out.model && r.usage?.inputTokens === out.usage.inputTokens && r.usage?.outputTokens === out.usage.outputTokens : r.model === null && r.usage === null);
  validateApplication(s, r);
}
export function assertMerchantTraceState(s: DomainState) {
  try {
    rule(Array.isArray(s.merchantRuns) && new Set(s.merchantRuns.map(r => r.id)).size === s.merchantRuns.length);
    for (const r of s.merchantRuns) validate(s, r);
  } catch { requireRule(false, "INVALID_MERCHANT_TRACE", "경영주 실행 기록의 형식·연결을 확인해주세요."); }
}
export function recordMerchantTrace(s: DomainState, command: Command): string {
  requireRule(command.role === "merchant", "FORBIDDEN", "경영주 본인 점포의 기록만 저장할 수 있어요.");
  rule(command.paymentFailureRequestIds === undefined);
  try {
    const contextKeys = ["type", "sessionId", "generation", "expectedRevision", "idempotencyKey", "actorId", "role", "storeId"];
    const payloadKeys = command.type === "merchant.run.start" ? ["run"] : command.type === "merchant.run.finish"
      ? ["runId", "terminal", "finishedAt", "latencyMs", "terminalErrorCode", "observation"] : command.type === "merchant.run.observe"
      ? ["runId", "observation"] : ["runId", "application", "commandKey", "appliedAt"];
    rule(exact(command, [...contextKeys, ...payloadKeys]));
    if (command.type === "merchant.run.start") {
      rule(exact(command.run, ["id", "kind", "inputJson", "startedAt"]));
      requireRule(!s.merchantRuns.some(r => r.id === command.run.id), "MERCHANT_RUN_CONFLICT", "이미 존재하는 실행 기록이에요.");
      const run: MerchantRun = { ...command.run, actorId: command.actorId, storeId: command.storeId, terminal: "running", finishedAt: null,
        latencyMs: null, terminalErrorCode: null, observation: null, model: null, usage: null, application: "not_applied", applicationCommandKey: null, appliedAt: null };
      validate(s, run); s.merchantRuns.push(run); return run.id;
    }
    rule(command.type === "merchant.run.finish" || command.type === "merchant.run.observe" || command.type === "merchant.run.apply");
    if (command.type !== "merchant.run.finish" && command.type !== "merchant.run.observe" && command.type !== "merchant.run.apply") throw Error("invalid");
    const run = s.merchantRuns.find(r => r.id === command.runId && r.actorId === command.actorId && r.storeId === command.storeId);
    requireRule(run, "MERCHANT_RUN_MISSING", "본인 점포의 실행 기록을 찾지 못했어요.");
    if (command.type === "merchant.run.finish") {
      requireRule(run.terminal === "running", "MERCHANT_RUN_TERMINAL", "최초 종료 결과는 변경할 수 없어요.");
      rule(command.terminal !== ("running" as string));
      Object.assign(run, { terminal: command.terminal, finishedAt: command.finishedAt, latencyMs: command.latencyMs,
        terminalErrorCode: command.terminalErrorCode, observation: command.observation });
    } else if (command.type === "merchant.run.observe") {
      requireRule(run.terminal !== "running" && run.observation === null, "MERCHANT_RUN_OBSERVED", "종료 후 최초 관측만 별도로 기록할 수 있어요.");
      run.observation = command.observation;
    } else {
      requireRule(run.application === "not_applied", "MERCHANT_RUN_APPLIED", "이미 기록된 적용 결과는 변경할 수 없어요.");
      run.application = command.application; run.applicationCommandKey = command.commandKey; run.appliedAt = command.appliedAt;
    }
    const out = run.observation === null ? null : response(s, run, run.observation);
    run.model = out?.model ?? null; run.usage = out ? { ...out.usage } : null;
    validate(s, run); return run.id;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && String(error.code).startsWith("MERCHANT_RUN_")) throw error;
    requireRule(false, "INVALID_MERCHANT_TRACE", "경영주 실행 기록의 형식·연결을 확인해주세요.");
  }
}
