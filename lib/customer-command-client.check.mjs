// Actual SQLite, synthetic data. No browser, model, or network.
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import initSqlJs from "sql.js";
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.includes("/lib/") && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) specifier += ".ts";
  return next(specifier, context);
} });
const { createDomainSeed, createDomainStore, LOCAL_CUSTOMER_ID } = await import("./domain/storage.ts");
const { executeCustomerWrite } = await import("./customer-command-client.ts");
const SQL = await initSqlJs();
const seed = { products: [{ id: "p", name: "합성 우유" }], stores: [{ id: "s", name: "합성 점포" }],
  actors: [{ id: "m", role: "merchant", displayName: "합성 경영주", storeId: "s" }, { id: LOCAL_CUSTOMER_ID, role: "customer", displayName: "합성 고객" }],
  conditions: [{ storeId: "s", productId: "p", requestable: true, unitPrice: 200, unitCost: 100, moq: 1, packSize: 1, supplyStatus: "available", supplyQuantity: 10, version: "v1" }] };
const bytes = createDomainSeed(SQL, seed, "customer-rebase", { products: seed.products, stores: seed.stores, sources: [], provenance: {} });
const db = await createDomainStore({ SQL, seed: bytes, now: () => 1000, sessionId: () => "customer-rebase", persist: async () => {} });
const owner = { sessionId: db.state.sessionId, generation: db.state.generation, actorId: "m", role: "merchant", storeId: "s" };
let cached = { ...owner, role: "customer", actorId: LOCAL_CUSTOMER_ID, expectedRevision: 0, idempotencyKey: "request-1",
  type: "request.create", requestId: "request-1", productId: "p", quantity: 1, unitPrice: 200, consent: true, conditionVersion: "v1" };
const original = structuredClone(cached);
const input = { id: "trace", text: "합성 예산", generation: 1, storeId: "s",
  currentPolicy: { enabled: false, productIds: [], budgetWon: 0, spentWon: 0, version: 1 } };
assert((await db.execute({ ...owner, type: "merchant.run.start", expectedRevision: 0, idempotencyKey: "trace-start",
  run: { id: "trace", kind: "policy", inputJson: JSON.stringify(input), startedAt: 1000 } })).ok);
assert.equal((await db.execute(cached)).error.code, "STALE_REVISION", "pre-fix customer command reproduces stale after a log");
const result = await executeCustomerWrite(db, cached, command => { cached = command; });
assert.equal(result.ok, true, "unchanged consent should survive unrelated merchant log revision");
assert.deepEqual({ ...cached, expectedRevision: 0 }, original);
assert.equal(cached.expectedRevision, 1);
assert((await executeCustomerWrite(db, cached, () => assert.fail("committed receipt cannot rebase"))).ok);
assert.equal(db.state.requests.length, 1);

// Conditions are rechecked by the real domain; a rebase does not renew consent.
const changed = { ...original, idempotencyKey: "changed", requestId: "changed", conditionVersion: "old" };
const changedResult = await executeCustomerWrite(db, changed, () => {});
assert.equal(changedResult.ok, false); assert.equal(changedResult.error.code, "CONSENT_REQUIRED");
assert.equal(db.state.requests.length, 1);

const stale = { ok: false, error: { code: "STALE_REVISION", message: "synthetic" } };
let calls = 0, remembered;
const fake = { state: { ...db.state, receipts: [] }, execute: async () => { calls++; return stale; } };
await executeCustomerWrite(fake, original, command => { remembered = command; });
assert.equal(calls, 2, "at most one definitive stale retry"); assert.equal(remembered.expectedRevision, db.state.revision);
for (const command of [{ ...original, generation: 99 }, { ...original, role: "merchant", actorId: "m", type: "policy.set" }]) {
  calls = 0; await executeCustomerWrite(fake, command, () => assert.fail("context/type cannot rebase")); assert.equal(calls, 1);
}
calls = 0;
await executeCustomerWrite({ ...fake, state: { ...fake.state, receipts: [{ key: original.idempotencyKey }] } }, original, () => assert.fail("receipt present"));
assert.equal(calls, 1);
calls = 0;
const uncertain = { ...fake, execute: async () => { calls++; throw Error("unknown save result"); } };
await assert.rejects(executeCustomerWrite(uncertain, original, () => assert.fail("unknown write must not rebase")));
assert.equal(calls, 1);
calls = 0; remembered = null;
const lostRetry = { ...fake, execute: async () => { calls++; if (calls === 1) return stale; throw Error("retry response lost"); } };
await assert.rejects(executeCustomerWrite(lostRetry, original, command => { remembered = command; }));
assert.equal(calls, 2); assert.equal(remembered.expectedRevision, db.state.revision, "cache exact rebased command before uncertain retry");
console.log("PASS customer write P2: actual SQLite log→request/receipt replay, unchanged consent, changed condition refusal; one bounded stale retry; uncertain/context/merchant writes never rebase.");
