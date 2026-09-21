// Node 24: node --conditions=react-server lib/assistant/policy.check.mjs
// Offline contract/post-state check only, not live interpretation or UI evidence.
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.includes("/lib/assistant/") && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) specifier += ".ts";
  return next(specifier, context);
} });
globalThis.fetch = async () => { throw new Error("Network forbidden in offline policy checker"); };

const { parseCurrentPolicy, parsePolicyRequest, parsePolicyOutput, resolvePolicyProposal, policyOutputSchema } = await import("./policy-contracts.ts");
const { validatePolicyInput } = await import("./policy.ts");
const { readJson } = await import("./server.ts");
const { parseStructuredResponse } = await import("./contracts.ts");
const { previewProducts, previewStores } = await import("../../app/demo-preview.ts");
const ids = previewProducts.map(p => p.id);
const stores = previewStores.map(s => s.id);
const currentPolicy = { enabled: true, productIds: ids.slice(0, 60), budgetWon: 100000, version: 2, spentWon: 30000 };
const input = { text: "앞으로 예산만 8만원으로 바꿔줘", id: "policy-offline", generation: 3, storeId: stores[2], currentPolicy };
const proposal = { action: "propose", enabled: null, productIds: null, budgetWon: 80000, message: "대상과 활성 상태는 유지하고 예산만 8만원으로 바꾸는 제안이에요. 확인해주세요." };
const bad = (fn, code = "INVALID_MERCHANT_INPUT") => assert.throws(fn, e => e.code === code);
const parse = value => parsePolicyOutput(value, ids, currentPolicy);
const resolve = (value, latest = currentPolicy) => resolvePolicyProposal(input, value, latest, ids);
const request = body => new Request("http://localhost:3000/api/assistant/policy", { method: "POST", headers: { "Content-Type": "application/json" }, body });

assert.equal(ids.length, 242); // Explicit catalog evidence; revisit when the seed changes.
assert.deepEqual(validatePolicyInput(input), input);
assert.deepEqual(parsePolicyRequest({ ...input, currentPolicy: { ...currentPolicy, productIds: ids } }, ids, stores).currentPolicy.productIds, ids);
for (const text of ["앞으로도 이렇게", "빼지 말고 유지해줘", "매번 우유만 빼고 커피도 포함해줘", "real payments please", "x".repeat(300)]) {
  assert.equal(validatePolicyInput({ ...input, text }).text, text); // Semantic judgment belongs to the model, not a keyword prefilter.
}
for (const value of [null, [], { ...input, text: " " }, { ...input, text: "x".repeat(301) }, { ...input, id: "x".repeat(101) }, { ...input, generation: -1 }, { ...input, generation: 1.5 }, { ...input, storeId: "foreign" }, { ...input, model: "override" }, { ...input, actor: "must-not-send" }]) bad(() => validatePolicyInput(value));
for (const patch of [{ enabled: "true" }, { productIds: [ids[0], ids[0]] }, { productIds: ["external-sku"] }, { productIds: [] }, { productIds: [...ids, ids[0]] }, { budgetWon: -1 }, { budgetWon: 1.5 }, { budgetWon: 1_000_000_001 }, { spentWon: 100001 }, { spentWon: -1 }, { version: -1 }, { version: Number.MAX_SAFE_INTEGER + 1 }, { extra: true }]) {
  bad(() => validatePolicyInput({ ...input, currentPolicy: { ...currentPolicy, ...patch } }));
}
bad(() => parseCurrentPolicy({ enabled: false, productIds: [], budgetWon: 0, version: 0 }, ids));
const emptyPolicy = { enabled: false, productIds: [], budgetWon: 0, spentWon: 0, version: 0 };
assert.deepEqual(parseCurrentPolicy(emptyPolicy, ids), emptyPolicy);
assert.equal(parseCurrentPolicy({ ...emptyPolicy, budgetWon: 1_000_000_000 }, ids).budgetWon, 1_000_000_000);

assert.deepEqual(parse(proposal), proposal);
assert.deepEqual(resolve(proposal), { enabled: true, productIds: currentPolicy.productIds, budgetWon: 80000 });
// 60/242 target sets survive a null patch, including a full no-op, without truncation.
assert.equal(resolve({ ...proposal, budgetWon: null }).productIds.length, 60);
const allInput = { ...input, currentPolicy: { ...currentPolicy, productIds: ids } };
assert.equal(resolvePolicyProposal(allInput, proposal, allInput.currentPolicy, ids).productIds.length, 242);
assert.equal(parse({ ...proposal, productIds: [...currentPolicy.productIds].reverse() }).productIds, null);
assert.equal(parse({ ...proposal, productIds: ids }).productIds.length, 242);
// Exclusion = replacement derived from the current set; no catalog widening.
const remaining = currentPolicy.productIds.slice(1);
assert.deepEqual(resolve({ ...proposal, productIds: remaining, budgetWon: null }).productIds, remaining);
assert.deepEqual(resolve({ ...proposal, enabled: false, productIds: [], budgetWon: null }), { enabled: false, productIds: [], budgetWon: 100000 });
assert.equal(parse({ ...proposal, budgetWon: 29999 }).action, "clarify");
assert.equal(parse({ ...proposal, productIds: [] }).action, "clarify");
assert.equal(parse({ ...proposal, budgetWon: 30000 }).budgetWon, 30000);
assert.equal(parsePolicyOutput({ ...proposal, budgetWon: 0 }, ids, { ...emptyPolicy, budgetWon: 1 }).budgetWon, 0);
assert.equal(parsePolicyOutput({ ...proposal, enabled: true, budgetWon: null }, ids, emptyPolicy).action, "clarify");
for (const action of ["clarify", "unsupported"]) {
  const inert = { ...proposal, action, budgetWon: null };
  assert.deepEqual(parse(inert), inert);
  bad(() => resolve(inert), "MERCHANT_NOT_APPLICABLE");
  bad(() => parse({ ...inert, enabled: false }), "MODEL_MALFORMED");
  bad(() => parse({ ...inert, productIds: [] }), "MODEL_MALFORMED");
}
for (const patch of [{ action: "execute" }, { productIds: [ids[0], ids[0]] }, { productIds: ["external-sku"] }, { productIds: [...ids, ids[0]] }, { enabled: 1 }, { budgetWon: -1 }, { budgetWon: 1.5 }, { budgetWon: 1_000_000_001 }, { message: " " }, { message: "x".repeat(301) }, { saved: true }]) bad(() => parse({ ...proposal, ...patch }), "MODEL_MALFORMED");
for (const patch of [{ version: 3 }, { spentWon: 30001 }, { enabled: false }, { budgetWon: 90000 }, { productIds: remaining }]) bad(() => resolve(proposal, { ...currentPolicy, ...patch }), "MERCHANT_NOT_APPLICABLE");
bad(() => resolve({ ...proposal, budgetWon: 29999 }), "MERCHANT_NOT_APPLICABLE");
const copyBefore = JSON.stringify(input);
resolve(proposal).productIds.pop();
assert.equal(JSON.stringify(input), copyBefore); // No input mutation or domain execution.

const schema = policyOutputSchema(ids);
assert.equal(schema.additionalProperties, false);
assert.equal(schema.required.length, 5);
assert.equal(schema.properties.productIds.maxItems, 242);
assert.deepEqual(schema.properties.productIds.items.enum, ids);
const body = JSON.stringify(input);
assert.ok(Buffer.byteLength(body) < 4096);
const fullCatalogBody = JSON.stringify(allInput);
if (Buffer.byteLength(fullCatalogBody) <= 4096) assert.deepEqual(await readJson(request(fullCatalogBody)), allInput);
else await assert.rejects(readJson(request(fullCatalogBody)), e => e.code === "BODY_TOO_LARGE");
assert.deepEqual(await readJson(request(body + " ".repeat(4096 - Buffer.byteLength(body)))), input);
await assert.rejects(readJson(request(body + " ".repeat(4097 - Buffer.byteLength(body)))), e => e.code === "BODY_TOO_LARGE" && e.httpStatus === 413);
// Multi-byte text is counted as UTF-8 bytes, not JS string length.
await assert.rejects(readJson(request(JSON.stringify({ text: "가".repeat(1400) }))), e => e.code === "BODY_TOO_LARGE");
await assert.rejects(readJson(request("{")), e => e.code === "INVALID_JSON");
const response = { status: "completed", output: [], output_text: JSON.stringify(proposal), usage: { input_tokens: 10, output_tokens: 20 } };
assert.deepEqual(parseStructuredResponse(response).usage, { inputTokens: 10, outputTokens: 20 });
bad(() => parseStructuredResponse({ ...response, status: "incomplete" }), "MODEL_INCOMPLETE");
bad(() => parseStructuredResponse({ ...response, output: [{ type: "message", content: [{ type: "refusal" }] }] }), "MODEL_REFUSAL");
console.log(`PASS policy offline checker: ${ids.length} catalog IDs; 60/242 targets, nullable replacement/no-op, inert actions, budget floor, stale state, strict fields, 4096-byte body, output failure checks. Request bytes: 60 IDs=${Buffer.byteLength(body)}, 242 IDs=${Buffer.byteLength(fullCatalogBody)}. Live calls: 0.`);
