// Artificial validator counterexamples, NOT authored evaluation cases or scores.
import assert from "node:assert/strict";
import { inspectPack, evalVersion, riskTags } from "./eval-dataset.mjs";
let checked = 0;
const test = (name, fn) => { fn(); checked++; console.log(`PASS ${name}`); };
const matched = { status: ["matched"], allowedCandidateIds: ["milk"], requiredCandidateIds: ["milk"], allowedKinds: ["exact"], maxCandidates: 3 };
const empty = status => ({ status: [status], allowedCandidateIds: [], requiredCandidateIds: [], allowedKinds: [], maxCandidates: 3 });
const customer = { id: "TEST-C-1", split: "dev", group: "TEST-C-G1", scenarioId: "SC-DATA-01", researchCaseIds: ["RC01"], origin: "synthetic_expansion",
  riskTags: ["identity"], slice: "clear", normalCompletion: true, service: "search", context: {},
  steps: [{ text: "매일우유 900ml", expect: matched, semanticChecks: ["매일우유 900ml 이외의 후보를 정확 일치로 설명하지 않는다."] }],
  rationale: "검사기 반례 전용 합성 자료이며 품질 평가 사례가 아니다." };
const pack = (cases = [structuredClone(customer)], role = "customer") => ({ version: 1, evalVersion, role, cases });
const bad = (name, change, pattern = /./) => test(name, () => { const p = pack(); change(p, p.cases[0]); assert.throws(() => inspectPack(p), pattern); });
test("valid small pack is incomplete, never release PASS", () => {
  const r = inspectPack(pack()); assert.equal(r.caseCount, 1); assert.equal(r.coverageReady, false); assert.equal(r.counts.dev.plannedTurns, 1);
  assert.ok(r.coverageErrors.includes("validation: too few cases"));
});
bad("empty dataset", p => p.cases = [], /empty eval pack/);
bad("unknown version", p => p.version = 2, /pack/);
bad("wrong eval revision", p => p.evalVersion = "old", /pack/);
bad("extra passed flag is not evidence", p => p.passed = true, /pack/);
bad("missing case oracle field", (_p, c) => delete c.steps[0].expect, /step fields/);
bad("private pack rejected by public inspector", (_p, c) => c.split = "holdout", /boundary/);
test("private evaluator can inspect explicitly without printing source", () => {
  const p = pack(); p.cases[0].split = "holdout";
  const r = inspectPack(p, ["holdout"]); assert.equal(r.caseCount, 1); assert.equal(r.coverageReady, false);
  assert.ok(!JSON.stringify(r).includes(customer.steps[0].text));
});
bad("duplicate case identity", p => p.cases.push(structuredClone(p.cases[0])), /duplicate case ID/);
bad("family cannot cross partitions", p => p.cases.push({ ...structuredClone(customer), id: "TEST-C-2", split: "validation" }), /family split leakage/);
bad("case renaming cannot disguise normalized duplicate", p => {
  const next = structuredClone(customer); next.id = "TEST-C-2"; next.group = "TEST-C-G2"; next.steps[0].text = "매일 우유 ９００ｍｌ"; p.cases.push(next);
}, /duplicate normalized/);
bad("fictional candidate", (_p, c) => c.steps[0].expect.allowedCandidateIds.push("made-up"), /SKU/);
bad("required candidate must be allowed", (_p, c) => c.steps[0].expect.allowedCandidateIds = [], /SKU/);
bad("positive result needs positive oracle", (_p, c) => c.steps[0].expect.requiredCandidateIds = [], /positive SKU/);
bad("candidate cap is fixed before outputs", (_p, c) => c.steps[0].expect.maxCandidates = 262, /candidate limit/);
bad("candidate classification required", (_p, c) => c.steps[0].expect.allowedKinds = [], /kinds required/);
bad("unknown cannot accept candidates", (_p, c) => c.steps[0].expect.status = ["unknown"], /cannot accept/);
bad("unknown cannot silently become matched", (_p, c) => c.steps[0].expect.status = ["unknown", "matched"], /incompatible/);
bad("unsupported does not count as normal success", (_p, c) => c.steps[0].expect = empty("unsupported"), /normal final/);
bad("no overlength prompts", (_p, c) => c.steps[0].text = "가".repeat(301), /step text/);
bad("no empty prompt", (_p, c) => c.steps[0].text = " ", /step text/);
bad("must identify synthetic origin", (_p, c) => c.origin = "real_customer", /origin/);
bad("lineage cannot be empty", (_p, c) => c.researchCaseIds = [], /lineage/);
bad("semantic checks cannot be skipped", (_p, c) => c.steps[0].semanticChecks = [], /semantic/);
bad("rationale required", (_p, c) => c.rationale = "", /rationale/);
bad("unknown risk tag", (_p, c) => c.riskTags = ["safe"], /risk tags/);
bad("role service isolation", p => p.role = "merchant", /risk tags|mismatch/);
bad("normal slice consistency", (_p, c) => c.normalCompletion = false, /completion/);
bad("search cannot carry merchant or answer fields", (_p, c) => c.context = { expected: "milk" }, /context/);
bad("unasked followup is not a real conversation", (_p, c) => { c.slice = "correction"; c.steps.push(structuredClone(c.steps[0])); }, /clarification/);
test("bounded correction retains all turns as one case", () => {
  const c = structuredClone(customer); c.slice = "correction"; c.riskTags = ["correction", "ambiguity"];
  c.steps[0].expect = { ...matched, status: ["clarify"], requiredCandidateIds: [] };
  c.steps.push({ text: "아니 900ml 우유야", expect: structuredClone(matched), semanticChecks: ["최초 입력과 정정을 모두 반영한다."] });
  const r = inspectPack(pack([c])); assert.equal(r.caseCount, 1); assert.equal(r.counts.dev.plannedTurns, 2);
});
const currentPolicy = { enabled: false, productIds: ["milk"], budgetWon: 70000, version: 2, spentWon: 5000 };
const merchant = { ...structuredClone(customer), id: "TEST-M-1", group: "TEST-M-G1", service: "merchant", riskTags: ["budget"],
  context: { storeId: "DEMO-ST-01", budgetWon: 50000, selectedProductIds: ["milk"], context: { uiSeq: 0, changes: [], pendingProductIds: ["milk"], currentPolicy } },
  steps: [{ text: "이번 묶음 예산은 2만원", semanticChecks: ["지속 정책과 현재 선택은 변경하지 않는다."],
    expect: { fields: { action: "budget", scope: "current_batch", view: "requested", selection: "keep", productIds: [], budgetWon: 20000,
      restoreSelectionChangeId: null, restoreBudgetChangeId: null, policyDraft: null } } }] };
test("real merchant API accepts coherent context/oracle", () => assert.equal(inspectPack(pack([merchant], "merchant")).caseCount, 1));
test("foreign store context rejected by actual API", () => {
  const c = structuredClone(merchant); c.context.storeId = "foreign"; assert.throws(() => inspectPack(pack([c], "merchant")), /API contract/);
});
test("invalid policy spend rejected by actual API", () => {
  const c = structuredClone(merchant); c.context.context.currentPolicy.spentWon = 70001; assert.throws(() => inspectPack(pack([c], "merchant")), /API contract/);
});
test("incomplete merchant core oracle rejected", () => {
  const c = structuredClone(merchant); delete c.steps[0].expect.fields.scope; assert.throws(() => inspectPack(pack([c], "merchant")), /core fields/);
});
test("missing restore target cannot be a successful oracle", () => {
  const c = structuredClone(merchant); c.steps[0].expect.fields.restoreBudgetChangeId = "absent"; c.steps[0].expect.fields.budgetWon = null;
  assert.throws(() => inspectPack(pack([c], "merchant")), /normalized|API contract/);
});
const policy = { ...structuredClone(merchant), service: "policy", context: { storeId: "DEMO-ST-01", currentPolicy },
  steps: [{ text: "앞으로 예산 9만원", semanticChecks: ["ON/OFF를 유지하고 고객 승인이나 발주 완료를 주장하지 않는다."],
    expect: { fields: { action: "propose", enabled: null, productIds: null, budgetWon: 90000 } } }] };
test("policy-only oracle follows actual normalized contract", () => assert.equal(inspectPack(pack([policy], "merchant")).caseCount, 1));
test("below-spent proposal cannot be labelled successful", () => {
  const c = structuredClone(policy); c.steps[0].expect.fields.budgetWon = 4999; assert.throws(() => inspectPack(pack([c], "merchant")), /normalized/);
});
test("case contexts use canonical key order for duplicate detection", () => {
  const c = structuredClone(policy); c.id = "TEST-M-2"; c.group = "TEST-M-G2";
  c.context = { currentPolicy: { spentWon: 5000, version: 2, budgetWon: 70000, productIds: ["milk"], enabled: false }, storeId: "DEMO-ST-01" };
  assert.throws(() => inspectPack(pack([policy, c], "merchant")), /duplicate normalized/);
});
// Synthetic bulk below ONLY tests arithmetic and failure detection, never used
// as the actual corpus. Tags deliberately overlap to isolate count computation.
const full = pack(["dev", "validation"].flatMap(split => Array.from({ length: split === "dev" ? 180 : 60 }, (_, i) => {
  const c = structuredClone(customer); c.id = `${split}-${i}`; c.group = `${split}-group-${i}`; c.split = split;
  c.steps[0].text += ` 검사기합성${split}${i}`; c.riskTags = [...riskTags.customer];
  c.slice = ["clear", "clear", "clear", "clear", "clear", "clear", "correction", "ambiguous", "unknown", "refusal"][i % 10];
  c.normalCompletion = ["clear", "correction"].includes(c.slice);
  if (c.slice === "ambiguous") c.steps[0].expect = { ...matched, status: ["clarify"], requiredCandidateIds: [] };
  if (c.slice === "unknown") c.steps[0].expect = empty("unknown");
  if (c.slice === "refusal") c.steps[0].expect = empty("unsupported");
  return c;
})));
test("fixed denominators and ceil thresholds, not actual model scores", () => {
  const r = inspectPack(full); assert.equal(r.coverageReady, true); assert.equal(r.caseCount, 240);
  assert.equal(r.counts.validation.slices.clear.cases, 36); assert.equal(r.counts.validation.slices.clear.requiredSuccesses, 35);
  assert.equal(r.counts.validation.risks.unknown.requiredSuccesses, 51);
});
test("all-one-family cannot satisfy coverage", () => {
  const p = structuredClone(full); for (const c of p.cases) if (c.split === "validation") c.group = "collapsed";
  const r = inspectPack(p); assert.equal(r.coverageReady, false); assert.ok(r.coverageErrors.some(e => e.includes("families")));
});
test("risk completeness and slice completeness are independent", () => {
  const p = structuredClone(full); for (const c of p.cases) if (c.slice === "unknown") {
    c.slice = "refusal"; c.steps[0].expect = empty("unsupported");
  }
  const r = inspectPack(p); assert.equal(r.coverageReady, false); assert.ok(r.coverageErrors.includes("validation/slices/unknown: fewer than 3 families"));
});
for (const slice of ["ambiguous", "unknown", "refusal"]) bad(`F1 ${slice} cannot be matched`, (_p, c) => { c.slice = slice; c.normalCompletion = false; }, /slice\/final/);
bad("F2 no impossible third clarification", (_p, c) => {
  c.slice = "ambiguous"; c.normalCompletion = false;
  c.steps = ["우유", "잘 모르겠어", "종류도 몰라"].map(text => ({ text, expect: { ...matched, status: ["clarify"], requiredCandidateIds: [] }, semanticChecks: ["더 이상 확인할 단서가 없다."] }));
}, /third-step/);
for (const finalStatus of ["matched", "unknown"]) test(`F2 valid third ${finalStatus} remains accepted`, () => {
  const c = structuredClone(customer); c.slice = finalStatus === "matched" ? "correction" : "ambiguous"; c.normalCompletion = finalStatus === "matched";
  c.steps = ["우유", "종류를 더 보고 싶어", "900ml 아니면 모르겠어"].map((text, i) => ({ text,
    expect: i < 2 ? { ...matched, status: ["clarify"], requiredCandidateIds: [] } : finalStatus === "matched" ? matched : empty("unknown"), semanticChecks: ["세 번째 질문은 하지 않는다."] }));
  assert.equal(inspectPack(pack([c])).counts.dev.plannedTurns, 3);
});
for (const id of ["NONEXISTENT-RESEARCH", "CORE-99999", "CORE-99"]) bad(`F3 reject unresolved ${id}`, (_p, c) => c.researchCaseIds = [id], /unknown research/);
test("F3 existing research and CORE refs remain accepted", () => {
  const c = structuredClone(customer); c.researchCaseIds = ["RC01", "CORE-03"]; assert.equal(inspectPack(pack([c])).caseCount, 1);
});
for (const base of [merchant, policy]) for (const field of ["text", "id", "generation"]) test(`F4 no shadow ${base.service}/${field}`, () => {
  const c = structuredClone(base); c.context[field] = "ignored"; assert.throws(() => inspectPack(pack([c], "merchant")), /exact service context/);
});
test("F5 all SKU set reordering cannot hide same effective input", () => {
  const a = structuredClone(merchant), b = structuredClone(merchant);
  for (const c of [a, b]) {
    c.context.selectedProductIds = ["milk", "coffee"]; c.context.context.pendingProductIds = ["milk", "coffee"];
    c.context.context.currentPolicy.productIds = ["milk", "coffee"];
    c.context.context.uiSeq = 1;
    c.context.context.changes = [{ id: "same-change", seq: 1, addedProductIds: ["milk", "coffee"], removedProductIds: [], beforeBudgetWon: 50000, afterBudgetWon: 50000 }];
  }
  b.id = "TEST-M-2"; b.group = "TEST-M-G2"; b.split = "validation";
  b.context.selectedProductIds.reverse(); b.context.context.pendingProductIds.reverse(); b.context.context.currentPolicy.productIds.reverse(); b.context.context.changes[0].addedProductIds.reverse();
  assert.throws(() => inspectPack(pack([a, b], "merchant")), /duplicate normalized/);
});
test("F6 decimal/sign punctuation preserves different instructions", () => {
  const cases = ["1.5만원", "15만원", "+1.5만원", "-1.5만원"].map((text, i) => {
    const c = structuredClone(merchant); c.id = `DEC-${i}`; c.group = `DEC-G-${i}`; c.steps[0].text = `이번 예산 ${text}`;
    c.steps[0].expect.fields.budgetWon = [15000, 150000, 65000, 35000][i]; return c;
  });
  assert.equal(inspectPack(pack(cases, "merchant")).caseCount, 4);
});
const ambiguousMerchant = structuredClone(merchant);
ambiguousMerchant.slice = "ambiguous"; ambiguousMerchant.normalCompletion = false;
ambiguousMerchant.steps[0].expect.fields.action = "clarify"; ambiguousMerchant.steps[0].expect.fields.budgetWon = null;
test("complete exact alternatives admit both safe clarification scopes", () => {
  const c = structuredClone(ambiguousMerchant);
  c.steps[0].expect.alternatives = [{ ...c.steps[0].expect.fields, scope: "future_policy" }];
  assert.equal(inspectPack(pack([c], "merchant")).caseCount, 1);
});
for (const [label, alternatives] of [["empty", []], ["duplicate", [ambiguousMerchant.steps[0].expect.fields]], ["partial", [{ scope: "future_policy" }]],
  ["invalid", [{ ...ambiguousMerchant.steps[0].expect.fields, productIds: ["made-up"] }]], ["inconsistent completion", [merchant.steps[0].expect.fields]]]) test(`reject ${label} oracle alternatives`, () => {
  const c = structuredClone(ambiguousMerchant); c.steps[0].expect.alternatives = alternatives;
  assert.throws(() => inspectPack(pack([c], "merchant")), /oracle|API contract|completion/);
});
console.log(`Eval dataset validator: ${checked} counterexamples PASS (offline tooling, not NL quality).`);
