// Synthetic matcher counterexamples. No authored corpus or live quality scores.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { matchCaseResponses } from "./eval-response.mjs";
const catalog = JSON.parse(readFileSync(new URL("../data/catalog.json", import.meta.url), "utf8"));
const cp = structuredClone;
let count = 0;
const test = (name, fn) => { fn(); count++; console.log(`PASS ${name}`); };
const oracle = { status: ["matched"], allowedCandidateIds: ["milk"], requiredCandidateIds: ["milk"], allowedKinds: ["exact"], maxCandidates: 3 };
const customer = { id: "TEST-C-1", split: "dev", group: "TEST-C-G1", scenarioId: "SC-DATA-01", researchCaseIds: ["RC01"], origin: "synthetic_expansion",
  riskTags: ["identity"], slice: "clear", normalCompletion: true, service: "search", context: {},
  steps: [{ text: "매일우유 900ml", expect: oracle, semanticChecks: ["명시한 우유와 규격만 정확 후보로 확인한다."] }], rationale: "응답 대조기 전용 합성 사례, 실제 평가 자료가 아니다." };
const request = c => ({ ...cp(c.context), text: c.steps[0].text, id: "wire-1", generation: 3,
  ...(c.service === "search" ? { dialogue: { conversationId: "test-conversation", initialText: c.steps[0].text, turns: [] } } : {}) });
const envelope = input => ({ ok: true, id: input.id, generation: input.generation, mode: "live", model: "synthetic-test", usage: { inputTokens: 10, outputTokens: 5 } });
function search(input, ids = ["milk"], kind = "exact", status = "matched") {
  return { ...envelope(input), candidateIds: ids, status, message: "합성 테스트 응답", dialogue: {
    conversationId: input.dialogue.conversationId, question: status === "clarify" ? "어느 규격을 원하세요?" : null, clues: [],
    candidates: ids.map(productId => ({ productId, kind, reason: "합성 테스트 근거", catalogEvidence: [{ code: `${productId}:name`, value: catalog.find(p => p.id === productId).name }] })),
  } };
}
const pair = c => { const input = request(c); return { request: input, response: search(input) }; };
const one = pair(customer);
test("exact candidate matches mechanically, never semantic/live/quality approval", () => {
  const r = matchCaseResponses(customer, [one]);
  assert.equal(r.mechanicalStatus, "match"); assert.equal(r.steps[0].recallAt3, 1); assert.equal(r.steps[0].exactKindRecallAt3, 1);
  assert.equal(r.semanticStatus, "pending"); assert.equal(r.providerRawStatus, "unobserved"); assert.equal(r.qualityStatus, "not_evaluated");
});
test("no responses is incomplete, not success", () => assert.equal(matchCaseResponses(customer, []).mechanicalStatus, "incomplete"));
test("existing but wrong SKU is an oracle mismatch", () => {
  const p = pair(customer); p.response = search(p.request, ["coffee"]);
  const r = matchCaseResponses(customer, [p]); assert.equal(r.mechanicalStatus, "mismatch"); assert.equal(r.steps[0].recallAt3, 0);
});
test("right SKU among disallowed siblings has recall but not correctness", () => {
  const p = pair(customer); p.response = search(p.request, ["coffee", "milk"]);
  const r = matchCaseResponses(customer, [p]); assert.equal(r.steps[0].recallAt3, 1); assert.equal(r.steps[0].mechanicalMatch, false);
});
test("alternative cannot count as exact-kind identification", () => {
  const c = cp(customer); c.steps[0].expect.allowedKinds = ["alternative"];
  const p = pair(c); p.response = search(p.request, ["milk"], "alternative");
  const r = matchCaseResponses(c, [p]); assert.equal(r.mechanicalStatus, "match"); assert.equal(r.steps[0].recallAt3, 1); assert.equal(r.steps[0].exactKindRecallAt3, 0);
  assert.equal(matchCaseResponses(customer, [p]).mechanicalStatus, "mismatch");
});
for (const [label, mutate] of [
  ["wire identity", p => p.response.id = "other"], ["generation", p => p.response.generation++],
  ["fixture envelope", p => p.response.mode = "fixture"], ["unknown usage", p => p.response.usage = null],
  ["negative usage", p => p.response.usage.inputTokens = -1], ["fictional SKU", p => p.response.candidateIds = ["fabricated"]],
  ["wrong conversation", p => p.response.dialogue.conversationId = "other"], ["made-up evidence", p => p.response.dialogue.candidates[0].catalogEvidence[0].value = "fabricated"],
  ["extra field", p => p.response.hidden = "never logged"], ["ok false", p => p.response = { ok: false, error: { code: "MODEL_UNAVAILABLE" } }],
]) test(`reject ${label}`, () => {
  const p = cp(one); mutate(p); const r = matchCaseResponses(customer, [p]);
  assert.equal(r.mechanicalStatus, "mismatch"); assert.equal(r.steps[0].status, "invalid_response");
});
test("another prompt cannot receive this case's score", () => {
  const p = cp(one); p.request.text = p.request.dialogue.initialText = "합성 다른 요청";
  assert.equal(matchCaseResponses(customer, [p]).steps[0].status, "request_mismatch");
});
for (const [slice, status] of [["unknown", "unknown"], ["refusal", "unsupported"]]) test(`expected ${slice} is separate from normal completion`, () => {
  const c = cp(customer); c.slice = slice; c.normalCompletion = false;
  c.steps[0].expect = { ...oracle, status: [status], allowedCandidateIds: [], requiredCandidateIds: [], allowedKinds: [] };
  const p = pair(c); p.response = search(p.request, [], "exact", status);
  const r = matchCaseResponses(c, [p]); assert.equal(r.mechanicalStatus, "match"); assert.equal(r.steps[0].recallAt3, null);
});
const dialogue = cp(customer); dialogue.slice = "correction";
dialogue.steps = [{ ...cp(customer.steps[0]), text: "우유 좀", expect: { ...cp(oracle), status: ["clarify"], requiredCandidateIds: [] } },
  { ...cp(customer.steps[0]), text: "900ml 매일우유로" }];
function conversation() {
  const a = pair(dialogue); a.response = search(a.request, ["milk"], "exact", "clarify");
  const b = cp(a); b.request.id = "wire-2"; b.request.text = dialogue.steps[1].text;
  b.request.dialogue.turns = [{ question: a.response.dialogue.question, answer: b.request.text }]; b.response = search(b.request);
  return [a, b];
}
test("followup uses real previous question and remains one case", () => {
  const r = matchCaseResponses(dialogue, conversation()); assert.equal(r.plannedSteps, 2); assert.equal(r.observedSteps, 2); assert.equal(r.mechanicalStatus, "match");
});
test("first valid clarify without its answer is incomplete", () => assert.equal(matchCaseResponses(dialogue, conversation().slice(0, 1)).mechanicalStatus, "incomplete"));
for (const [label, mutate] of [
  ["invented question", p => p[1].request.dialogue.turns[0].question = "교체한 질문"],
  ["changed conversation", p => { p[1].request.dialogue.conversationId = "other"; p[1].response.dialogue.conversationId = "other"; }],
  ["changed generation", p => { p[1].request.generation++; p[1].response.generation++; }],
  ["wrong answer", p => p[1].request.dialogue.turns[0].answer = "다른 답"],
]) test(`followup rejects ${label}`, () => {
  const p = conversation(); mutate(p); assert.equal(matchCaseResponses(dialogue, p).steps[1].status, "request_mismatch");
});
test("early terminal failure cannot be repaired by fabricated later response", () => {
  const p = conversation(); p[0].response = search(p[0].request);
  const r = matchCaseResponses(dialogue, p); assert.equal(r.mechanicalStatus, "mismatch"); assert.equal(r.steps[1].responseParsed, false);
});
const currentPolicy = { enabled: false, productIds: ["milk"], budgetWon: 70000, version: 2, spentWon: 5000 };
const merchant = { ...cp(customer), id: "TEST-M-1", group: "TEST-M-G1", service: "merchant", riskTags: ["budget"],
  context: { storeId: "DEMO-ST-01", budgetWon: 50000, selectedProductIds: ["milk"], context: { uiSeq: 0, changes: [], pendingProductIds: ["milk", "coffee"], currentPolicy } },
  steps: [{ text: "이번 묶음 예산은 2만원", semanticChecks: ["지속 정책과 현재 선택은 변경하지 않는다."], expect: { fields: {
    action: "budget", scope: "current_batch", view: "requested", selection: "keep", productIds: [], budgetWon: 20000,
    restoreSelectionChangeId: null, restoreBudgetChangeId: null, policyDraft: null } } }] };
function merchantPair(c) {
  const input = request(c);
  return { request: input, response: { ...envelope(input), ...cp(c.steps[0].expect.fields), message: "합성 테스트", storeId: input.storeId,
    ...(c.service === "merchant" ? { uiSeq: input.context.uiSeq } : { policyVersion: input.currentPolicy.version }) } };
}
test("merchant full tuple matches", () => assert.equal(matchCaseResponses(merchant, [merchantPair(merchant)]).mechanicalStatus, "match"));
for (const [label, mutate, status] of [
  ["store", p => p.response.storeId = "DEMO-ST-02", "invalid_response"],
  ["uiSeq", p => p.response.uiSeq++, "invalid_response"],
  ["different request context", p => p.request.budgetWon++, "request_mismatch"],
  ["wrong budget", p => p.response.budgetWon++, "oracle_mismatch"],
  ["missing core field", p => delete p.response.scope, "invalid_response"],
]) test(`merchant ${label}`, () => {
  const p = merchantPair(merchant); mutate(p); assert.equal(matchCaseResponses(merchant, [p]).steps[0].status, status);
});
const ambiguous = cp(merchant); ambiguous.slice = "ambiguous"; ambiguous.normalCompletion = false;
ambiguous.steps[0].expect.fields.action = "clarify"; ambiguous.steps[0].expect.fields.budgetWon = null;
ambiguous.steps[0].expect.alternatives = [{ ...cp(ambiguous.steps[0].expect.fields), scope: "future_policy", view: "all" }];
test("each complete alternative is allowed, their unlisted combination is not", () => {
  const a = merchantPair(ambiguous), b = cp(a); Object.assign(b.response, ambiguous.steps[0].expect.alternatives[0]);
  assert.equal(matchCaseResponses(ambiguous, [a]).mechanicalStatus, "match"); assert.equal(matchCaseResponses(ambiguous, [b]).mechanicalStatus, "match");
  b.response.view = "requested"; assert.equal(matchCaseResponses(ambiguous, [b]).mechanicalStatus, "mismatch");
});
const policy = { ...cp(merchant), service: "policy", context: { storeId: "DEMO-ST-01", currentPolicy },
  steps: [{ text: "앞으로 예산 9만원", semanticChecks: ["ON/OFF와 상품을 유지한다."], expect: { fields: { action: "propose", enabled: null, productIds: null, budgetWon: 90000 } } }] };
test("policy full tuple and version envelope", () => assert.equal(matchCaseResponses(policy, [merchantPair(policy)]).mechanicalStatus, "match"));
for (const [label, mutate] of [["version", p => p.response.policyVersion++], ["usage", p => p.response.usage.outputTokens = NaN], ["extra", p => p.response.extra = true]]) test(`policy rejects ${label}`, () => {
  const p = merchantPair(policy); mutate(p); assert.equal(matchCaseResponses(policy, [p]).steps[0].status, "invalid_response");
});
test("safety-normalized unsafe policy is not original correctness", () => {
  const c = cp(policy); c.slice = "ambiguous"; c.normalCompletion = false;
  c.steps[0].expect.fields = { action: "clarify", enabled: null, productIds: null, budgetWon: null };
  const p = merchantPair(c); p.response.action = "propose"; p.response.budgetWon = 100;
  const r = matchCaseResponses(c, [p]); assert.equal(r.mechanicalStatus, "mismatch"); assert.equal(r.steps[0].status, "response_not_normalized");
});
test("equivalent SKU set order accepted without mutating input", () => {
  const c = cp(merchant); Object.assign(c.steps[0].expect.fields, { action: "select", selection: "include", productIds: ["milk", "coffee"], budgetWon: null });
  const p = merchantPair(c); p.response.productIds.reverse(); p.request.context.pendingProductIds.reverse();
  const before = JSON.stringify(p); assert.equal(matchCaseResponses(c, [p]).mechanicalStatus, "match"); assert.equal(JSON.stringify(p), before);
});
test("overlong/extra evidence and malformed oracle rejected without source echo", () => {
  assert.throws(() => matchCaseResponses(customer, [one, one]), /^Error: Invalid response evidence$/);
  assert.throws(() => matchCaseResponses(customer, [{ ...one, key: "CANARY_NOT_OUTPUT" }]), /^Error: Invalid response evidence$/);
  const c = cp(customer); c.steps[0].expect.requiredCandidateIds = ["CANARY_NOT_OUTPUT"];
  assert.throws(() => matchCaseResponses(c, [one]), /^Error: Invalid evaluation case$/);
  assert.ok(!JSON.stringify(matchCaseResponses(customer, [{ request: { text: "CANARY_NOT_OUTPUT" }, response: null }])).includes("CANARY_NOT_OUTPUT"));
});
console.log(`Eval response matcher: ${count} synthetic checks PASS (no live or semantic score).`);
