// Node24 --conditions=react-server. Offline synthetic contracts, NOT live quality.
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.includes("/lib/assistant/") && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) specifier += ".ts";
  return next(specifier, context);
} });
globalThis.fetch = async () => { throw new Error("No network in merchant-context checker"); };
const C = await import("./merchant-context-contracts.ts");
const { validateMerchantContextInput, validateMerchantInput } = await import("./merchant.ts");
const { parseStructuredResponse } = await import("./contracts.ts");
const { readJson } = await import("./server.ts");
const { previewProducts, previewStores } = await import("../../app/demo-preview.ts");
const ids = previewProducts.map(p => p.id), stores = previewStores.map(s => s.id);
const [a, b, c] = ids;
const policy = { enabled: false, productIds: [a], budgetWon: 70000, spentWon: 5000, version: 2 };
const removed = { id: "remove-b", seq: 1, addedProductIds: [], removedProductIds: [b], beforeBudgetWon: 50000, afterBudgetWon: 50000 };
const added = { id: "add-c", seq: 2, addedProductIds: [c], removedProductIds: [], beforeBudgetWon: 50000, afterBudgetWon: 50000 };
const changedBudget = { id: "budget", seq: 3, addedProductIds: [], removedProductIds: [], beforeBudgetWon: 50000, afterBudgetWon: 20000 };
const input = { id: "check-v2", generation: 4, storeId: stores[0], text: "아까 뺀 것 다시", budgetWon: 20000, selectedProductIds: [a, c], context: { uiSeq: 3, changes: [removed, added, changedBudget], pendingProductIds: [a, b, c], currentPolicy: policy } };
const base = { action: "select", scope: "current_batch", view: "requested", selection: "keep", productIds: [], budgetWon: null, message: "선택 복원 제안이에요.", restoreSelectionChangeId: "remove-b", restoreBudgetChangeId: null, policyDraft: null };
const parse = (value, request = input) => C.parseMerchantContextOutput(value, request, ids);
const resolve = (value, latest = input, request = input) => C.resolveMerchantContextProposal(request, value, latest, ids);
const bad = (f, code = "INVALID_MERCHANT_INPUT") => assert.throws(f, e => e.code === code);
const req = body => new Request("http://localhost:3000/api/assistant/merchant", { method: "POST", headers: { "Content-Type": "application/json" }, body });
const before = JSON.stringify(input);
assert.deepEqual(validateMerchantContextInput(input), input);
const restored = parse(base);
assert.deepEqual(restored.productIds, [a, c, b]);
assert.equal(restored.selection, "include");
assert.deepEqual(resolve(restored), { view: "requested", selectedProductIds: [a, c, b], budgetWon: 20000, policyDraft: null });
assert.deepEqual(parse(restored), restored); // Revalidation never double-applies.
const previousBudget = { ...base, action: "budget", restoreSelectionChangeId: null, restoreBudgetChangeId: "budget" };
assert.deepEqual(resolve(previousBudget), { view: "requested", selectedProductIds: [a, c], budgetWon: 50000, policyDraft: null });
assert.equal(resolve({ ...base, restoreBudgetChangeId: "budget" }).budgetWon, 50000);
for (const change of [{ restoreSelectionChangeId: "forgotten" }, { restoreSelectionChangeId: "add-c" }]) assert.equal(parse({ ...base, ...change }).action, "clarify");
assert.equal(parse({ ...previousBudget, restoreBudgetChangeId: "remove-b" }).action, "clarify");
const partial = { ...input, context: { ...input.context, pendingProductIds: [a, c] } };
assert.equal(parse(base, partial).action, "clarify"); // No silent partial restore.
assert.equal(parse(base, { ...input, context: { ...input.context, changes: [] } }).action, "clarify");
const inert = { ...base, action: "clarify", selection: "keep", restoreSelectionChangeId: null };
for (const action of ["clarify", "unsupported", "filter"]) assert.equal(parse({ ...inert, action }).action, action);
bad(() => resolve(inert), "MERCHANT_NOT_APPLICABLE");

const stale = { ...input, selectedProductIds: [a, b], context: { ...input.context, pendingProductIds: [a, c] } };
// Read-only filters preserve stale selections rather than treating them as a
// purchase proposal. They still reject smuggled state changes/stale snapshots.
const filter = { ...inert, action: "filter", view: "approved" };
const staleBefore = JSON.stringify(stale);
assert.deepEqual(resolve(filter, stale, stale), { view: "approved", selectedProductIds: [a, b], budgetWon: 20000, policyDraft: null });
assert.equal(JSON.stringify(stale), staleBefore);
bad(() => resolve({ ...filter, budgetWon: 100 }, stale, stale), "MODEL_MALFORMED");
bad(() => resolve({ ...filter, selection: "include", productIds: [] }, stale, stale), "MODEL_MALFORMED");
bad(() => resolve(filter, { ...stale, context: { ...stale.context, uiSeq: 4 } }, stale), "MERCHANT_NOT_APPLICABLE");
for (const [selection, productIds, expected] of [["include", [], []], ["include", [c], [c]], ["exclude", [b], [a]], ["all_pending", [], [a, c]]]) {
  const output = { ...base, selection, productIds, restoreSelectionChangeId: null };
  assert.equal(parse(output, stale).action, "select");
  assert.deepEqual(resolve(output, stale, stale).selectedProductIds, expected);
}
assert.equal(parse({ ...base, selection: "exclude", productIds: [c], restoreSelectionChangeId: null }, stale).action, "clarify");

const future = { ...base, action: "policy", scope: "future_policy", restoreSelectionChangeId: null, policyDraft: { action: "propose", enabled: null, productIds: null, budgetWon: null, message: "현재 선택을 정책 대상으로 제안하며 ON/OFF와 누적 예산은 유지해요." } };
const futureParsed = parse(future);
assert.deepEqual(futureParsed.policyDraft.productIds, [a, c]);
assert.equal(futureParsed.policyDraft.enabled, null);
assert.equal(futureParsed.policyDraft.budgetWon, null); // NOT batch 20000 nor policy 70000 copy.
assert.equal(resolve(future).budgetWon, 20000);
assert.deepEqual(parse(futureParsed), futureParsed);
assert.equal(parse({ ...future, policyDraft: { ...future.policyDraft, enabled: true } }).policyDraft.enabled, true);
assert.equal(parse({ ...future, policyDraft: { ...future.policyDraft, budgetWon: 4999 } }).action, "clarify");
assert.equal(parse({ ...future, policyDraft: { ...future.policyDraft, budgetWon: 5000 } }).policyDraft.budgetWon, 5000);
assert.equal(parse(future, stale).action, "clarify");
assert.equal(parse(future, { ...input, selectedProductIds: [] }).action, "clarify");
bad(() => parse({ ...future, policyDraft: { ...future.policyDraft, productIds: [b] } }), "MODEL_MALFORMED");
bad(() => parse({ ...future, budgetWon: 100 }), "MODEL_MALFORMED");
for (const latest of [
  { ...input, generation: 5 }, { ...input, selectedProductIds: [a] }, { ...input, budgetWon: 123 },
  { ...input, context: { ...input.context, uiSeq: 4 } }, partial,
  { ...input, context: { ...input.context, changes: [] } },
  { ...input, context: { ...input.context, currentPolicy: { ...policy, version: 3 } } },
  { ...input, context: { ...input.context, currentPolicy: { ...policy, spentWon: 5001 } } },
]) bad(() => resolve(base, latest), "MERCHANT_NOT_APPLICABLE");
for (const value of [null, { ...input, extra: true }, { ...input, actor: "customer" }, { ...input, storeId: "foreign" }, { ...input, text: "" }, { ...input, text: "x".repeat(301) }, { ...input, selectedProductIds: [a, a] }, { ...input, selectedProductIds: ["foreign-sku"] }, { ...input, budgetWon: 1.5 }]) bad(() => validateMerchantContextInput(value));
for (const changes of [[removed, removed], [added, removed], [{ ...removed, seq: 4 }], [{ ...removed, addedProductIds: [b] }], [{ ...removed, removedProductIds: [] }], [{ ...removed, actor: "leak" }], Array.from({ length: 6 }, (_, i) => ({ ...removed, id: `change${i}`, seq: i }))]) bad(() => validateMerchantContextInput({ ...input, context: { ...input.context, changes } }));
for (const change of [{ extra: true }, { productIds: [a, a] }, { productIds: ["foreign"] }, { message: "" }, { budgetWon: -1 }, { policyDraft: {} }, { restoreSelectionChangeId: "x".repeat(101) }]) bad(() => parse({ ...base, ...change }), "MODEL_MALFORMED");
bad(() => parse({ ...inert, productIds: [a] }), "MODEL_MALFORMED");
bad(() => parse({ ...base, productIds: [a] }), "MODEL_MALFORMED");

const all = { ...input, selectedProductIds: ids, context: { ...input.context, pendingProductIds: ids, currentPolicy: { ...policy, productIds: ids } } };
assert.equal(validateMerchantContextInput(all).selectedProductIds.length, ids.length);
assert.equal(parse(future, all).policyDraft.productIds.length, ids.length);
assert.equal(resolve({ ...base, selection: "all_pending", restoreSelectionChangeId: null }, all, all).selectedProductIds.length, ids.length);
const { context, ...legacy } = input;
assert.deepEqual(validateMerchantInput(legacy), legacy);
bad(() => validateMerchantInput({ ...legacy, selectedProductIds: ids.slice(0, 21) })); // V1 unchanged.
const envelope = { ...futureParsed, ok: true, id: input.id, generation: input.generation, mode: "live", model: "gpt-5-mini", usage: { inputTokens: 100, outputTokens: 80 }, storeId: input.storeId, uiSeq: 3 };
assert.deepEqual(C.parseMerchantContextResponse(envelope, input, ids), envelope);
for (const patch of [{ id: "wrong" }, { generation: 3 }, { storeId: "wrong" }, { uiSeq: 2 }, { mode: "fixture" }, { usage: null }, { saved: true }]) bad(() => C.parseMerchantContextResponse({ ...envelope, ...patch }, input, ids), "MODEL_MALFORMED");
const fullEnvelope = { ...envelope, ...parse(future, all) };
assert.equal(C.parseMerchantContextResponse(fullEnvelope, all, ids).policyDraft.productIds.length, ids.length);
const body = JSON.stringify(all), bodyBytes = Buffer.byteLength(body);
assert.ok(bodyBytes < C.MERCHANT_CONTEXT_BODY_BYTES);
const maximalHistory = { ...all, context: { ...all.context, uiSeq: 5, changes: Array.from({ length: 5 }, (_, i) => ({ ...removed, id: `change-${i}`, seq: i + 1, removedProductIds: ids })) } };
assert.equal(validateMerchantContextInput(maximalHistory).context.changes.length, 5);
assert.ok(Buffer.byteLength(JSON.stringify(maximalHistory)) < C.MERCHANT_CONTEXT_BODY_BYTES);
assert.deepEqual(await readJson(req(body), C.MERCHANT_CONTEXT_BODY_BYTES), all);
assert.deepEqual(await readJson(req(body + " ".repeat(C.MERCHANT_CONTEXT_BODY_BYTES - bodyBytes)), C.MERCHANT_CONTEXT_BODY_BYTES), all);
await assert.rejects(readJson(req(body + " ".repeat(C.MERCHANT_CONTEXT_BODY_BYTES + 1 - bodyBytes)), C.MERCHANT_CONTEXT_BODY_BYTES), e => e.code === "BODY_TOO_LARGE");
await assert.rejects(readJson(req(" ".repeat(4097))), e => e.code === "BODY_TOO_LARGE");
const structured = { status: "completed", output: [], output_text: JSON.stringify(base), usage: { input_tokens: 1, output_tokens: 2 } };
bad(() => parseStructuredResponse({ ...structured, status: "incomplete" }, C.MERCHANT_CONTEXT_OUTPUT_BYTES), "MODEL_INCOMPLETE");
bad(() => parseStructuredResponse({ ...structured, output: [{ type: "message", content: [{ type: "refusal" }] }] }), "MODEL_REFUSAL");
bad(() => parseStructuredResponse({ ...structured, output_text: " ".repeat(4097) }), "MODEL_MALFORMED");
assert.deepEqual(parseStructuredResponse({ ...structured, output_text: structured.output_text + " ".repeat(4100) }, C.MERCHANT_CONTEXT_OUTPUT_BYTES).value, base);
const schema = C.merchantContextOutputSchema(ids);
assert.equal(schema.additionalProperties, false);
assert.equal(schema.properties.productIds.maxItems, ids.length);
assert.deepEqual(schema.properties.policyDraft.anyOf[1].properties.productIds, { type: "null" });
assert.ok(Buffer.byteLength(JSON.stringify(fullEnvelope)) <= C.MERCHANT_CONTEXT_OUTPUT_BYTES);
resolve(base).selectedProductIds.pop();
assert.equal(JSON.stringify(input), before);
console.log(`PASS merchant-context offline: union/separate budget/missing+stale refs/stale-selection repair/policy handoff+floor/stale snapshot/strict fields/v1 preserved; ${ids.length} IDs; full input=${bodyBytes}B/full response=${Buffer.byteLength(JSON.stringify(fullEnvelope))}B; 64KiB input/16KiB response caps. No live/build/SQL/browser.`);
