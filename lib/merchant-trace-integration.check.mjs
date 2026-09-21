// Actual sql.js + client adapter seam. Synthetic model envelope, no API/browser.
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import initSqlJs from "sql.js";
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.includes("/lib/") && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) specifier += ".ts";
  return next(specifier, context);
} });
const { createDomainSeed, createDomainStore } = await import("./domain/storage.ts");
const { createMerchantTraceManager } = await import("./merchant-trace-client.ts");
const SQL = await initSqlJs();
const seed = { products: [{ id: "milk", name: "합성 우유" }], stores: [{ id: "s1", name: "합성 점포" }],
  actors: [{ id: "m1", displayName: "합성 경영주", role: "merchant", storeId: "s1" }],
  conditions: [{ storeId: "s1", productId: "milk", requestable: true, unitPrice: 200, unitCost: 100, moq: 1, packSize: 1, supplyStatus: "available", supplyQuantity: 10, version: "v1" }] };
const bytes = createDomainSeed(SQL, seed, "trace-integration", { products: seed.products, stores: seed.stores, sources: [], provenance: {} });
let committed, fail = false;
const store = await createDomainStore({ SQL, seed: bytes, now: () => 1000, sessionId: () => "trace-integration",
  persist: async value => { if (fail) throw Error("synthetic IndexedDB failure"); committed = value.slice(); } });
const owner = { sessionId: store.state.sessionId, generation: store.state.generation, actorId: "m1", role: "merchant", storeId: "s1" };
let publishes = 0;
const port = createMerchantTraceManager({ getStore: () => store, getViewer: () => owner, publish: () => publishes++ }).forViewer(owner);
const id = "late-start-log", policy = store.state.policies[0];
const input = { id, text: "누적 예산을 9만원으로", generation: 1, storeId: "s1",
  currentPolicy: { enabled: policy.enabled, productIds: policy.productIds, budgetWon: policy.budgetWon, spentWon: policy.spentWon, version: policy.version } };
const response = { ok: true, id, generation: 1, storeId: "s1", policyVersion: policy.version,
  mode: "live", model: "synthetic-contract-envelope", usage: { inputTokens: 10, outputTokens: 20 },
  action: "propose", enabled: null, productIds: null, budgetWon: 90000, message: "합성 계약 검사" };
fail = true;
assert.equal(await port.record({ type: "merchant.run.start", run: { id, kind: "policy", inputJson: JSON.stringify(input), startedAt: 1000 } }), false);
assert.equal(await port.record({ type: "merchant.run.finish", runId: id, terminal: "success", finishedAt: 1010, latencyMs: 10,
  terminalErrorCode: null, observation: { status: "success", responseJson: JSON.stringify(response) } }), false);
assert.equal(store.state.merchantRuns.length, 0); assert.equal(publishes, 0);
fail = false;
const command = { ...owner, expectedRevision: store.state.revision, idempotencyKey: `merchant-policy:${id}`,
  type: "policy.set", enabled: false, productIds: [], budgetWon: 90000 };
assert.equal((await store.execute(command)).ok, true);
const c = structuredClone(port.getReceipt(command.idempotencyKey)); assert(c);
const afterC = store.state;
assert.equal(await port.record({ type: "merchant.run.apply", runId: id, application: "policy_saved", commandKey: command.idempotencyKey, appliedAt: 1020 }), false);
assert.equal(store.state.policies[0].budgetWon, 90000);
assert.equal(port.getStatus().pending, 3);
assert(await port.retry(), "saving start/finish/L after successful C must be allowed");
assert.equal(port.getStatus().pending, 0);
const after = store.state, run = after.merchantRuns[0];
assert.equal(run.terminal, "success"); assert.equal(run.application, "policy_saved");
assert.deepEqual(run.usage, { inputTokens: 10, outputTokens: 20 });
assert.deepEqual(port.getReceipt(command.idempotencyKey), c);
assert.equal(after.receipts.filter(r => JSON.parse(r.fingerprint).type === "policy.set").length, 1);
for (const key of ["policies", "orders", "lines", "payments", "reservations", "lastNow", "nextSequence", "clockOffsetMs"]) assert.deepEqual(after[key], afterC[key]);
const restored = await createDomainStore({ SQL, seed: bytes, initial: committed, persist: async () => { throw Error("no migration expected"); } });
assert.deepEqual(restored.state.merchantRuns, after.merchantRuns);
assert.deepEqual(restored.state.receipts, after.receipts);
console.log("PASS actual sql.js + client trace: failed start/finish logs do not block C; retry persists only start/finish/L; C receipt/transactions/clock unchanged; snapshot restore exact. Synthetic response, no live/browser.");
