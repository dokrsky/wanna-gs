// Node24 only: pure record boundaries. No API, browser, app build or live model.
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.includes("/lib/") && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) specifier += ".ts";
  return next(specifier, context);
} });
globalThis.fetch = async () => { throw Error("No network in trace checker"); };
const { createInitialState, applyCommand, getView, assertState } = await import("./commands.ts");
const seed = { products: [{ id: "milk", name: "모의우유" }], stores: [{ id: "s1", name: "모의1" }, { id: "s2", name: "모의2" }],
  actors: [{ id: "m1", role: "merchant", storeId: "s1", displayName: "경영주1" }, { id: "m2", role: "merchant", storeId: "s2", displayName: "경영주2" }, { id: "c1", role: "customer", displayName: "합성고객" }],
  conditions: [{ storeId: "s1", productId: "milk", requestable: true, unitPrice: 200, unitCost: 100, moq: 1, packSize: 1, supplyStatus: "available", supplyQuantity: 10, version: "v1" }] };
let state = createInitialState(seed, { sessionId: "trace-check", generation: 1, now: 0 }), serial = 0, checks = 0;
const command = (body, actorId = "m1", storeId = "s1") => ({ ...body, sessionId: state.sessionId, generation: state.generation, expectedRevision: state.revision,
  idempotencyKey: body.idempotencyKey ?? `trace-${++serial}`, actorId, storeId, role: actorId === "c1" ? "customer" : "merchant" });
const trades = s => Object.fromEntries(["requests", "orders", "lines", "links", "allocations", "payments", "reservations", "notifications", "conditions", "policies", "nextSequence", "lastNow", "clockOffsetMs", "sessionId", "generation"].map(k => [k, s[k]]));
function exec(body, actorId, storeId) {
  const c = command(body, actorId, storeId), before = structuredClone(state), out = applyCommand(state, c, 900_000_000);
  assert.equal(out.ok, true, JSON.stringify(out)); assert.deepEqual(state, before);
  if (body.type.startsWith("merchant.run.")) assert.deepEqual(trades(out.state), trades(before));
  state = out.state; assertState(state); checks++; return c;
}
function reject(body, code, actorId, storeId) {
  const before = structuredClone(state), out = applyCommand(state, command(body, actorId, storeId), 900_000_000);
  assert.equal(out.ok, false, JSON.stringify(out)); if (code) assert.equal(out.error.code, code);
  assert.deepEqual(state, before); checks++;
}
const currentPolicy = () => { const { enabled, productIds, budgetWon, version, spentWon } = state.policies[0]; return { enabled, productIds, budgetWon, version, spentWon }; };
const batch = id => ({ id, text: "요청만 보여줘", generation: 77, storeId: "s1", budgetWon: 1000, selectedProductIds: [],
  context: { uiSeq: 2, changes: [], pendingProductIds: ["milk"], currentPolicy: currentPolicy() } });
const batchResponse = i => ({ ok: true, id: i.id, generation: i.generation, storeId: i.storeId, uiSeq: i.context.uiSeq,
  mode: "live", model: "test-model", usage: { inputTokens: 10, outputTokens: 20 }, action: "filter", scope: "current_batch", view: "requested",
  selection: "keep", productIds: [], budgetWon: null, message: "요청만 표시", restoreSelectionChangeId: null, restoreBudgetChangeId: null, policyDraft: null });
const start = (id, i, kind = "batch") => ({ type: "merchant.run.start", run: { id, kind, inputJson: JSON.stringify(i), startedAt: 100 } });
const finish = (runId, responseJson) => ({ type: "merchant.run.finish", runId, terminal: "success", finishedAt: 110, latencyMs: 10,
  terminalErrorCode: null, observation: { status: "success", responseJson } });
const apply = (runId, application = "screen_applied", commandKey = null) => ({ type: "merchant.run.apply", runId, application, commandKey, appliedAt: 120 });

// A pending, expired consent and an enabled policy MUST remain untouched by logging.
state.requests.push({ id: "pending", actorId: "c1", storeId: "s1", productId: "milk", quantity: 1, unitPrice: 200,
  consentVersion: "v1", consentAt: 0, consentExpiresAt: 604800000, sequence: state.nextSequence++, createdAt: 0, status: "pending", reason: null });
Object.assign(state.policies[0], { enabled: true, productIds: ["milk"], budgetWon: 1000 });
const i = batch("batch1"), responseJson = JSON.stringify(batchResponse(i));
const started = exec(start("batch1", i));
assert.equal(applyCommand(state, started, 900000001).replayed, true); checks++;
assert.equal(applyCommand(state, { ...started, run: { ...started.run, startedAt: 101 } }, 900000001).error.code, "IDEMPOTENCY_CONFLICT"); checks++;
reject(start("batch1", i), "MERCHANT_RUN_CONFLICT");
reject(start("customer", i), "FORBIDDEN", "c1");
reject(start("unknown-extra", { ...i, rawSdk: {} }), "INVALID_MERCHANT_TRACE");
reject(start("oversized", { ...i, text: "가".repeat(65536) }), "INVALID_MERCHANT_TRACE");
reject(finish("batch1", JSON.stringify({ ...batchResponse(i), storeId: "s2" })), "INVALID_MERCHANT_TRACE");
exec(finish("batch1", responseJson)); exec(apply("batch1"));
reject(finish("batch1", responseJson), "MERCHANT_RUN_TERMINAL");
reject(apply("batch1"), "MERCHANT_RUN_APPLIED");
reject({ type: "merchant.run.observe", runId: "batch1", observation: { status: "error", errorCode: "MODEL_TIMEOUT" } }, "MERCHANT_RUN_OBSERVED");
reject(finish("batch1", responseJson), "MERCHANT_RUN_MISSING", "m2", "s2");
for (const [id, terminal] of [["cancelled", "cancelled"], ["stale", "stale"], ["interrupted", "interrupted"], ["timeout", "error"]]) {
  const req = batch(id); exec(start(id, req));
  exec({ type: "merchant.run.finish", runId: id, terminal, finishedAt: 111, latencyMs: 11, terminalErrorCode: terminal === "error" ? "MODEL_TIMEOUT" : null, observation: null });
  assert.equal(state.merchantRuns.at(-1).usage, null);
  exec({ type: "merchant.run.observe", runId: id, observation: { status: "success", responseJson: JSON.stringify(batchResponse(req)) } });
  assert.equal(state.merchantRuns.at(-1).terminal, terminal); reject(apply(id), "INVALID_MERCHANT_TRACE");
}
const unsupported = batch("unsupported"); exec(start("unsupported", unsupported));
exec(finish("unsupported", JSON.stringify({ ...batchResponse(unsupported), action: "unsupported" })));
reject(apply("unsupported"), "INVALID_MERCHANT_TRACE");
const p = { id: "policy1", text: "자동발주 꺼줘", generation: 88, storeId: "s1", currentPolicy: currentPolicy() };
exec(start("policy1", p, "policy"));
const pResponse = { ok: true, id: p.id, generation: p.generation, storeId: p.storeId, policyVersion: p.currentPolicy.version,
  mode: "live", model: "test-model", usage: { inputTokens: 2, outputTokens: 3 }, action: "propose", enabled: false, productIds: null, budgetWon: null, message: "꺼짐 제안" };
exec(finish("policy1", JSON.stringify(pResponse)));
reject(apply("policy1", "policy_saved", started.idempotencyKey), "INVALID_MERCHANT_TRACE");
const wrong = exec({ type: "policy.set", enabled: false, productIds: ["milk"], budgetWon: 2000 });
reject(apply("policy1", "policy_saved", wrong.idempotencyKey), "INVALID_MERCHANT_TRACE");
const correct = exec({ type: "policy.set", enabled: false, productIds: ["milk"], budgetWon: 1000, idempotencyKey: "merchant-policy:policy1" });
exec(apply("policy1", "policy_saved", correct.idempotencyKey));
assert.equal(state.merchantRuns.at(-1).applicationCommandKey, correct.idempotencyKey);
// Failed start-log does not block a successful policy: all log receipts can follow C.
const delayedInput = { ...p, id: "delayed", currentPolicy: currentPolicy() };
const earlyPolicy = exec({ type: "policy.set", enabled: false, productIds: ["milk"], budgetWon: 1000, idempotencyKey: "merchant-policy:delayed" });
exec(start("delayed", delayedInput, "policy"));
exec(finish("delayed", JSON.stringify({ ...pResponse, id: "delayed", policyVersion: delayedInput.currentPolicy.version, enabled: null })));
exec(apply("delayed", "policy_saved", earlyPolicy.idempotencyKey));
// Future-policy batch handoff uses the response draft, NEVER the batch ceiling.
const future = { ...batch("future"), selectedProductIds: ["milk"] };
exec(start("future", future));
exec(finish("future", JSON.stringify({ ...batchResponse(future), action: "policy", scope: "future_policy", policyDraft: {
  action: "propose", enabled: null, productIds: ["milk"], budgetWon: null, message: "기존 OFF/예산 유지" } })));
reject(apply("future"), "INVALID_MERCHANT_TRACE");
const futureC = exec({ type: "policy.set", enabled: false, productIds: ["milk"], budgetWon: 1000, idempotencyKey: "merchant-policy:future" });
exec(apply("future", "policy_saved", futureC.idempotencyKey));
reject(start("different-run-id", batch("different-input-id")), "INVALID_MERCHANT_TRACE");
reject({ ...start("no-hidden-sdk", batch("no-hidden-sdk")), rawSdk: { ignored: true } }, "INVALID_MERCHANT_TRACE");
assert.equal(getView(state, command({}, "c1"), 900000000).merchantRuns.length, 0);
assert.equal(getView(state, command({}, "m2", "s2"), 900000000).merchantRuns.length, 0);
assert.equal(getView(state, command({}), 900000000).merchantRuns.length, state.merchantRuns.length); checks += 3;
// Exact full-catalog IDs + multibyte message are valid above 4KiB, below 16KiB.
const catalog = JSON.parse(readFileSync(new URL("../../data/catalog.json", import.meta.url), "utf8"));
state = createInitialState({ ...seed, products: catalog }, { sessionId: "utf8-catalog", generation: 1, now: 0 });
const wideInput = { id: "wide", text: "카탈로그 상품 정책 제안", generation: 1, storeId: "s1", currentPolicy: currentPolicy() };
exec(start("wide", wideInput, "policy"));
const wideOutput = JSON.stringify({ ...pResponse, id: "wide", generation: 1, policyVersion: 0, productIds: catalog.map(p => p.id), enabled: false, message: "가".repeat(300) });
assert.ok(Buffer.byteLength(wideOutput) > 4096 && Buffer.byteLength(wideOutput) <= 16384); checks++;
reject(finish("wide", wideOutput + " ".repeat(16384)), "INVALID_MERCHANT_TRACE");
exec(finish("wide", wideOutput));
const fullPolicyInput = { id: "full-policy-input", text: "가".repeat(300), generation: 1, storeId: "s1",
  currentPolicy: { ...currentPolicy(), productIds: catalog.map(p => p.id) } };
const fullPolicyJson = JSON.stringify(fullPolicyInput);
assert.ok(Buffer.byteLength(fullPolicyJson) > 4096 && Buffer.byteLength(fullPolicyJson) < 8192);
exec(start(fullPolicyInput.id, fullPolicyInput, "policy"));
const bounded = start("policy-at-cap", { ...fullPolicyInput, id: "policy-at-cap" }, "policy");
bounded.run.inputJson += " ".repeat(8192 - Buffer.byteLength(bounded.run.inputJson));
exec(bounded);
const tooLarge = start("policy-over-cap", { ...fullPolicyInput, id: "policy-over-cap" }, "policy");
tooLarge.run.inputJson += " ".repeat(8193 - Buffer.byteLength(tooLarge.run.inputJson));
reject(tooLarge, "INVALID_MERCHANT_TRACE");
console.log(`PASS merchant trace pure: ${checks} commands/assertions; exact bounded parser, role/store isolation, idempotency conflicts, immutable terminal + late observation, null unknown usage, receipt setting/context, record-only trade/clock freeze. No browser/live.`);
