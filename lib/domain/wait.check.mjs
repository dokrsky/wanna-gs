// Node 24, read-only UI08 projection checks. No SQLite/build/browser/network.
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.includes("/lib/domain/") && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) specifier += ".ts";
  return next(specifier, context);
} });
const { createInitialState, applyCommand, getView, getRequestDetail, assertState } = await import("./commands.ts");
const { DOMAIN_POLICY: P } = await import("./policy.ts");
const now = Date.UTC(2026, 8, 21);
const customer = { id: "c", role: "customer", displayName: "합성 고객" };
const other = { id: "other", role: "customer", displayName: "타 고객 비공개" };
const merchant = { id: "m", role: "merchant", displayName: "합성 경영주", storeId: "s" };
let checks = 0;
function world(changes = {}) {
  const condition = { storeId: "s", productId: "p", requestable: true, unitPrice: 200, unitCost: 100, moq: 1, packSize: 1, supplyStatus: "available", supplyQuantity: 100, version: "v1", ...changes };
  let state = createInitialState({ products: [{ id: "p", name: "모의 상품" }], stores: [{ id: "s", name: "모의 점포" }], actors: [customer, other, merchant], conditions: [condition] }, { sessionId: "wait-check", generation: 1, now });
  let serial = 0;
  const context = (actor = customer) => ({ sessionId: state.sessionId, generation: state.generation, actorId: actor.id, role: actor.role, storeId: "s" });
  const exec = (action, actor = merchant) => {
    const before = structuredClone(state);
    const out = applyCommand(state, { ...context(actor), expectedRevision: state.revision, idempotencyKey: `wait-${++serial}`, ...action }, now);
    assert.equal(out.ok, true, JSON.stringify(out)); assert.deepEqual(state, before); state = out.state;
  };
  const request = (id = "r", quantity = 1, actor = customer) => exec({ type: "request.create", requestId: id, productId: "p", quantity, consent: true, unitPrice: 200, conditionVersion: "v1" }, actor);
  const budget = (budgetWon = 10000) => exec({ type: "policy.set", enabled: false, productIds: ["p"], budgetWon });
  const read = (expected, at = now, id = "r", actor = customer) => {
    assertState(state);
    const before = structuredClone(state), ctx = context(actor), ctxBefore = structuredClone(ctx);
    const view = getView(state, ctx, at), detail = getRequestDetail(state, ctx, id, at);
    assert.deepEqual(detail, view.requests.find(r => r.request.id === id));
    assert.equal(detail.waiting?.code ?? null, expected);
    if (detail.waiting) {
      assert.equal(detail.waiting.checkedAt, Math.max(state.lastNow, at + state.clockOffsetMs));
      assert.deepEqual(Object.keys(detail.waiting).sort(), (expected === "MINIMUM_OR_PACK_WAIT" ? ["code", "checkedAt", "moq", "packSize"] : ["code", "checkedAt"]).sort());
    }
    if (actor.role === "customer") {
      assert.deepEqual(view.demand, []); assert.equal(view.policy, null); assert.deepEqual(view.orders, []); assert.deepEqual(view.lines, []);
      assert.ok(view.requests.every(r => r.actor.id === actor.id));
      if (actor.id === customer.id) assert.ok(!JSON.stringify(view).includes("타 고객 비공개"));
      for (const line of detail.lines) for (const key of ["unitCost", "quantity", "suppliedQuantity"]) assert.equal(key in line, false);
    }
    assert.deepEqual(ctx, ctxBefore);
    assert.deepEqual(state, before, "view changed a trade/record/receipt/clock/budget/revision");
    detail.request.quantity = 20;
    if (detail.waiting) detail.waiting.checkedAt = 0;
    assert.deepEqual(state, before, "projection leaked mutable references");
    checks++; return view.requests.find(r => r.request.id === id);
  };
  return { get state() { return state; }, exec, request, budget, read, context };
}

// Normal request -> order -> supply/payment -> receive -> collect, with private line projection.
{
  const w = world(); w.budget(); w.request(); w.request("other", 1, other);
  w.read("STORE_REVIEW_PENDING");
  w.exec({ type: "order.approve", items: [{ productId: "p", quantity: 2, conditionVersion: "v1" }] });
  assert.equal(w.read("SUPPLY_CONFIRMATION_PENDING").lines[0].supplied, false);
  const merchantView = getView(w.state, w.context(merchant), now);
  assert.equal(merchantView.requests[0].lines[0].unitCost, 100);
  assert.equal(merchantView.requests[0].lines[0].quantity, 2);
  assert.equal(merchantView.demand[0].validQuantity, 2);
  w.read("RECONSENT_REQUIRED", now + P.consentMs); // Read must not actually expire/unlink.
  const lineId = w.state.lines[0].id;
  w.exec({ type: "supply.finalize", lineId, quantity: 2 });
  assert.equal(w.read(null).lines[0].supplied, true);
  w.read(null, now + P.consentMs); // Paid reservation is not a consent wait.
  w.exec({ type: "receive.full", lineId }); w.read(null);
  const b = w.state.reservations[0];
  assert.equal(b.pickupDeadlineAt, now + P.pickupMs);
  w.read(null, b.pickupDeadlineAt);
  w.exec({ type: "reservation.collect", reservationId: b.id, code: b.code });
  assert.equal(w.read(null).reservation.status, "collected");
}
for (const [changes, code] of [
  [{ supplyStatus: "unknown" }, "CONDITION_UNKNOWN"],
  [{ supplyStatus: "unavailable" }, "SIMULATED_SUPPLY_UNAVAILABLE"],
  [{ supplyQuantity: 0 }, "SIMULATED_SUPPLY_UNAVAILABLE"],
  [{ orderClosesAt: now }, "ORDER_WINDOW_CLOSED"],
  [{ moq: 6, packSize: 6 }, "MINIMUM_OR_PACK_WAIT"],
  [{ moq: 1, packSize: 6 }, "MINIMUM_OR_PACK_WAIT"],
]) {
  const w = world(changes); w.budget(); w.request(); const d = w.read(code);
  if (code === "MINIMUM_OR_PACK_WAIT") assert.deepEqual([d.waiting.moq, d.waiting.packSize], [changes.moq, changes.packSize]);
}
{
  const w = world(); w.request(); w.read("STORE_REVIEW_PENDING"); // Budget zero stays private.
  w.exec({ type: "request.cancel", requestId: "r" }, customer); w.read(null, now + P.consentMs);
}
{
  const w = world(); w.request();
  assert.equal(w.read("RECONSENT_REQUIRED", now + P.consentMs).request.reason, "CONSENT_EXPIRED");
  w.exec({ type: "condition.update", condition: { ...w.state.conditions[0], version: "v2" } });
  assert.equal(w.read("RECONSENT_REQUIRED").request.reason, "CONDITIONS_CHANGED");
}
{
  const w = world({ orderClosesAt: now + 1 }); w.budget(); w.request();
  w.exec({ type: "order.approve", items: [{ productId: "p", quantity: 1, conditionVersion: "v1" }] });
  w.read("SUPPLY_CONFIRMATION_PENDING", now + 1); // Active order beats later closing time.
  w.exec({ type: "supply.finalize", lineId: w.state.lines[0].id, quantity: 1, paymentFailureRequestIds: ["r"] });
  assert.equal(w.read("RECONSENT_REQUIRED").request.reason, "PAYMENT_FAILED");
}
{
  const w = world(); w.budget(); w.request("r", 3); w.request("other", 1, other);
  w.exec({ type: "order.approve", items: [{ productId: "p", quantity: 4, conditionVersion: "v1" }] });
  w.exec({ type: "supply.finalize", lineId: w.state.lines[0].id, quantity: 2 });
  // A valid persisted snapshot can have read-derived expiry: later request remains
  // valid while FIFO head expires, but reading must not allocate/pay/settle it.
  w.state.requests[1].consentAt += 1000; w.state.requests[1].consentExpiresAt += 1000;
  w.read("ALLOCATION_PENDING", now + P.consentMs, "other", other);
}
console.log(`PASS waiting pure checker: ${checks} projections; 8 codes, terminal/reconsent/active-order priority, private line/budget/aggregate projection, normal trade/pickup, entire state and viewer unchanged. No SQL/browser/build/live.`);
