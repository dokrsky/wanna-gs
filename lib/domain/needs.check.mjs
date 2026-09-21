// Bounded ADR-005 pure-state checks. All model metadata is synthetic; no API calls.
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.includes("/lib/") && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) specifier += ".ts";
  return next(specifier, context);
} });
const { createInitialState, applyCommand, getView } = await import("./commands.ts");
const start = Date.UTC(2026, 8, 21);
const customer = { id: "c1", role: "customer", displayName: "합성 고객1" };
const customer2 = { id: "c2", role: "customer", displayName: "합성 고객2" };
const merchant = { id: "m1", role: "merchant", displayName: "합성 경영주1", storeId: "s1" };
const merchant2 = { id: "m2", role: "merchant", displayName: "합성 경영주2", storeId: "s2" };
const seed = { products: [{ id: "p1", name: "모의 우유", category: "유제품" }], stores: [{ id: "s1", name: "모의1" }, { id: "s2", name: "모의2" }],
  actors: [customer, customer2, merchant, merchant2], conditions: [{ productId: "p1", storeId: "s1", requestable: true, unitPrice: 200, unitCost: 100, moq: 1, packSize: 1, supplyStatus: "available", supplyQuantity: 10, version: "v1", orderClosesAt: null }] };
let state = createInitialState(seed, { sessionId: "needs-check", generation: 1, now: start }), serial = 0, cases = 0;
let now = start;
const context = (actor = customer, storeId = "s1") => ({ sessionId: state.sessionId, generation: state.generation, actorId: actor.id, role: actor.role, storeId });
const command = (body, actor, storeId) => ({ ...context(actor, storeId), expectedRevision: state.revision, idempotencyKey: `needs-check-${++serial}`, ...body });
const execute = (body, actor, storeId) => { const c = command(body, actor, storeId), out = applyCommand(state, c, now); assert.equal(out.ok, true, JSON.stringify(out)); state = out.state; cases++; return c; };
const reject = (body, code, actor, storeId) => { const before = structuredClone(state), out = applyCommand(state, command(body, actor, storeId), now); assert.equal(out.ok, false, JSON.stringify(out)); if (code) assert.equal(out.error.code, code); assert.deepEqual(state, before); cases++; };
const run = (id, extra = {}) => ({ id, conversationId: id, dialogue: { initialText: "찾는 상품", currentText: "찾는 상품", turns: [] }, mode: "local", model: null, status: "success", action: "unidentified", question: null, clues: [], candidates: [], usage: null, latencyMs: 1, errorCode: null, ...extra });
execute({ type: "request.create", requestId: "untouched-trade", productId: "p1", quantity: 1, consent: true, unitPrice: 200, conditionVersion: "v1" });
now += 8 * 86400000; // Expired pending request would change if record commands called settle().
const trade = s => Object.fromEntries(["requests", "orders", "lines", "links", "allocations", "payments", "reservations", "notifications", "policies", "conditions", "nextSequence", "clockOffsetMs", "lastNow", "sessionId", "generation"].map(k => [k, structuredClone(s[k])]));
const beforeRecords = trade(state);
const raw = "가상개인메모 유제품";
const unknown = run("run-unknown", { dialogue: { initialText: raw, currentText: raw, turns: [] }, clues: [
  { field: "feature", value: "가상개인메모", polarity: "preferred", certainty: "inferred", rawSourceRange: { source: "initial", start: 0, end: 6 } },
  { field: "category", value: "유제품", polarity: "required", certainty: "explicit", rawSourceRange: { source: "initial", start: 7, end: raw.length } },
] });
const recorded = execute({ type: "search.record", run: unknown });
const replay = applyCommand(state, recorded, now); assert.equal(replay.ok, true); assert.equal(replay.replayed, true); assert.deepEqual(replay.state, state);
const changedKeyBody = applyCommand(state, { ...recorded, run: { ...unknown, latencyMs: 2 } }, now); assert.equal(changedKeyBody.error.code, "IDEMPOTENCY_CONFLICT");
reject({ type: "search.record", run: unknown }, "SEARCH_RUN_CONFLICT");
reject({ type: "search.record", run: { ...unknown, status: "error", action: null, clues: [], errorCode: "TIMEOUT" } }, "SEARCH_RUN_CONFLICT");
execute({ type: "needs.record", needId: "need1", runId: unknown.id, reason: "unidentified", confirmed: true });
reject({ type: "needs.record", needId: "need-copy", runId: unknown.id, reason: "unidentified", confirmed: true }, "NEED_ALREADY_RECORDED", customer, "s2");
reject({ type: "needs.record", needId: "need-other", runId: unknown.id, reason: "unidentified", confirmed: true }, "INVALID_NEED", customer2);
reject({ type: "search.record", run: run("merchant-run") }, "FORBIDDEN", merchant);
const view = getView(state, context(merchant), now);
assert.equal(view.needs.length, 1); assert.equal(view.searchRuns.length, 0); assert.equal(view.recommendationEvents.length, 0);
assert.deepEqual(view.needs[0].safeClues.map(c => c.value), ["유제품"]);
assert.ok(!JSON.stringify(view).includes("가상개인메모"));
assert.equal(getView(state, context(merchant2, "s2"), now).needs.length, 0);
assert.equal(getView(state, context(customer2), now).searchRuns.length, 0);
assert.equal(getView(state, context(), now).searchRuns[0].dialogue.initialText, raw);

for (const [id, action, status, errorCode] of [["unsupported", "unsupported", "success", null], ["error", null, "error", "MODEL_TIMEOUT"]]) {
  execute({ type: "search.record", run: run(id, { action, status, errorCode }) });
  reject({ type: "needs.record", needId: `need-${id}`, runId: id, reason: "unidentified", confirmed: true }, "INVALID_NEED");
}
reject({ type: "search.record", run: run("bad-current", { dialogue: { initialText: "원래 제외조건", currentText: "다른 입력", turns: [] } }) }, "INVALID_SEARCH_RECORD");
reject({ type: "search.record", run: run("bad-live", { mode: "live" }) }, "INVALID_SEARCH_RECORD");
reject({ type: "search.record", run: run("bad-local", { model: "pretend-model" }) }, "INVALID_SEARCH_RECORD");
const turns = [{ question: "종류?", answer: "우유" }, { question: "맛?", answer: "흰우유" }];
reject({ type: "search.record", run: run("third-question", { action: "clarify", question: "세 번째?", dialogue: { initialText: "원래 제외조건", currentText: "흰우유", turns } }) }, "INVALID_SEARCH_RECORD");
execute({ type: "search.record", run: run("after-two", { dialogue: { initialText: "원래 제외조건", currentText: "흰우유", turns } }) });
execute({ type: "search.record", run: run("live-metadata-only", { mode: "live", model: "synthetic-test-model-label", usage: { inputTokens: 3, outputTokens: 4 } }) });
const candidate = { productId: "p1", kind: "alternative", reason: "고객 전용 자유 이유", catalogEvidence: [{ code: "p1:name", value: "모의 우유" }] };
reject({ type: "search.record", run: run("fake-sku", { action: "candidates", candidates: [{ ...candidate, productId: "missing" }] }) }, "INVALID_SEARCH_RECORD");
execute({ type: "search.record", run: run("candidates", { action: "candidates", candidates: [candidate] }) });
for (const action of ["shown", "selected", "rejected"]) execute({ type: "recommendation.record", eventId: `event-${action}`, runId: "candidates", productId: "p1", action, requestId: null });
reject({ type: "recommendation.record", eventId: "event-shown", runId: "candidates", productId: "p1", action: "shown", requestId: null }, "RECOMMENDATION_CONFLICT");
execute({ type: "recommendation.record", eventId: "event-requested", runId: "candidates", productId: "p1", action: "requested", requestId: "untouched-trade" });
reject({ type: "recommendation.record", eventId: "wrong-link", runId: "candidates", productId: "p1", action: "requested", requestId: "missing" }, "INVALID_RECOMMENDATION");
assert.deepEqual(trade(state), beforeRecords, "record-only commands must not settle, expire, auto-order, pay or change trade clocks/sequences");
assert.equal(state.requests[0].status, "pending");
console.log(`PASS needs pure checker: ${cases} commands/rejections; private raw/safe merchant category, explicit one-store need, exclusive run/event IDs, unsupported/error/local/live metadata, bounded dialogue, recommendation linkage, all trade arrays/clock/sequence unchanged. No model calls/browser.`);
