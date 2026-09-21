// Node 24: node lib/domain/check.mjs. Pure DTO logic, NOT SQL/IDB/browser evidence.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.includes("/lib/") && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) specifier += ".ts";
  return next(specifier, context);
} });
globalThis.fetch = async () => { throw new Error("No network in domain checker"); };
const { createInitialState, applyCommand, getView, getRequestDetail, assertState } = await import("./commands.ts");
const { DOMAIN_POLICY: P } = await import("./policy.ts");
const read = name => JSON.parse(readFileSync(new URL(`../../data/${name}.json`, import.meta.url), "utf8"));
const catalog = read("catalog"), stores = read("stores"), actors = read("actors"), availability = read("availability");
const fullSeed = { products: catalog, stores, actors, conditions: availability.map(c => ({ ...c, supplyQuantity: c.supplyQuantity ?? 0 })) };
const start = Date.UTC(2026, 8, 21);
const full = createInitialState(fullSeed, { sessionId: "real-data-dto-check", generation: 0, now: start });
assert.deepEqual([full.products.length, full.stores.length, full.conditions.length, full.actors.length], [262, 8, 524, 28]);
const originalCatalogHash = createHash("sha256").update(JSON.stringify(catalog.slice(0, 242), null, 2) + "\n").digest("hex");
assert.equal(originalCatalogHash, "394905eb361194289ee6ec6f3753244a5d2f4f2e023cae1f830f859d405eb1ad", "original IDs and every identity field preserved");
assert.deepEqual(catalog.slice(242).map(p => p.id), [...Array.from({ length: 17 }, (_, i) => i + 1), 22, 23, 24].map(i => `DEMO-RP-${String(i).padStart(3, "0")}`));

// Small deterministic scenario conditions, explicitly not real supply/prices.
const S = stores[0].id, otherStore = stores[1].id;
const merchant = actors.find(a => a.role === "merchant" && a.storeId === S);
const customers = actors.filter(a => a.role === "customer");
const products = catalog.filter(p => ["milk", "coffee", "bread"].includes(p.id));
const seed = { products, stores: stores.slice(0, 2), actors: [...customers, merchant, actors.find(a => a.role === "merchant" && a.storeId === otherStore)], conditions: products.map(p => ({ storeId: S, productId: p.id, requestable: true, unitPrice: 200, unitCost: 100, moq: 1, packSize: 1, supplyStatus: "available", supplyQuantity: 100, version: "test-v1" })) };
let cases = 0;
function world() {
  let state = createInitialState(seed, { sessionId: "demo-session", generation: 1, now: start });
  let key = 0, wallNow = start;
  const command = (action, actor = merchant, overrides = {}) => ({ sessionId: state.sessionId, generation: state.generation, expectedRevision: state.revision, actorId: actor.id, role: actor.role, storeId: S, idempotencyKey: `command-${++key}`, ...action, ...overrides });
  const exec = (action, actor = merchant, overrides = {}) => {
    const c = command(action, actor, overrides), before = structuredClone(state);
    const out = applyCommand(state, c, wallNow);
    assert.deepEqual(state, before, "original committed snapshot mutated");
    assert.equal(out.ok, true, JSON.stringify(out)); state = out.state; assertState(state); cases++;
    return { ...out, command: c };
  };
  const reject = (action, code, actor = merchant, overrides = {}) => {
    const before = structuredClone(state), out = applyCommand(state, command(action, actor, overrides), wallNow);
    assert.equal(out.ok, false, JSON.stringify(out)); assert.equal(out.error.code, code); assert.deepEqual(state, before); cases++;
  };
  const consent = productId => { const c = state.conditions.find(c => c.productId === productId); return { consent: true, unitPrice: c.unitPrice, conditionVersion: c.version }; };
  const request = (id, quantity, customer = customers[0], productId = "milk") => exec({ type: "request.create", requestId: id, productId, quantity, ...consent(productId) }, customer);
  const budget = (budgetWon = 10000, enabled = false, productIds = ["milk"]) => exec({ type: "policy.set", enabled, budgetWon, productIds });
  const order = (quantity, productId = "milk") => exec({ type: "order.approve", items: [{ productId, quantity, conditionVersion: state.conditions.find(c => c.productId === productId).version }] });
  const supply = (index, quantity, flags = {}) => exec({ type: "supply.finalize", lineId: state.lines[index].id, quantity, ...flags });
  const view = (actor = merchant) => getView(state, command({ type: "clock.tick" }, actor), wallNow);
  return { get state() { return state; }, command, exec, reject, request, budget, order, supply, consent, view, setTime: t => { wallNow = t; } };
}

// Normal whole flow, exact idempotency, receipt replay after newer commits, safe views.
{
  const w = world(); w.budget(200);
  const create = w.request("r1", 2); w.order(2);
  const replay = applyCommand(w.state, create.command, start + 1);
  assert.equal(replay.ok, true); assert.equal(replay.replayed, true); assert.deepEqual(replay.events, []); assert.deepEqual(replay.state, w.state);
  w.reject({ ...create.command, quantity: 1 }, "IDEMPOTENCY_CONFLICT", customers[0]);
  w.reject({ type: "clock.tick" }, "STALE_REVISION", merchant, { expectedRevision: 0 });
  w.reject({ type: "clock.tick" }, "STALE_GENERATION", merchant, { generation: 0 });
  w.reject({ type: "clock.tick" }, "WRONG_SESSION", merchant, { sessionId: "other" });
  w.reject({ type: "auto.run" }, "FORBIDDEN", customers[0]);
  w.reject({ type: "auto.run" }, "FORBIDDEN", merchant, { storeId: otherStore });
  w.supply(0, 2); assert.equal(w.state.reservations[0].status, "confirmed"); assert.equal(w.state.notifications.length, 1);
  const b = w.state.reservations[0];
  w.reject({ type: "reservation.collect", reservationId: b.id, code: b.code }, "COLLECT_NOT_ALLOWED");
  w.reject({ type: "supply.finalize", lineId: w.state.lines[0].id, quantity: 2 }, "SUPPLY_ALREADY_FINAL");
  const received = w.exec({ type: "receive.full", lineId: w.state.lines[0].id });
  assert.equal(w.state.reservations[0].pickupDeadlineAt, start + P.pickupMs);
  assert.equal(w.state.notifications.length, 2);
  assert.equal(applyCommand(w.state, received.command, start + 1234).replayed, true);
  w.reject({ type: "receive.full", lineId: w.state.lines[0].id }, "RECEIVE_NOT_ALLOWED");
  w.reject({ type: "reservation.collect", reservationId: b.id, code: "wrong" }, "COLLECT_NOT_ALLOWED");
  w.setTime(start + P.pickupMs - 1); w.exec({ type: "reservation.collect", reservationId: b.id, code: b.code });
  w.reject({ type: "reservation.collect", reservationId: b.id, code: b.code }, "COLLECT_NOT_ALLOWED");
  const context = w.command({ type: "clock.tick" }, customers[0]);
  const detail = getRequestDetail(w.state, context, "r1", start);
  detail.request.quantity = 99; assert.equal(w.state.requests[0].quantity, 2);
  assert.throws(() => getRequestDetail(w.state, { ...context, actorId: customers[1].id }, "r1", start), error => error.code === "FORBIDDEN");
  assert.equal(w.view(customers[1]).requests.length, 0);
}

// Public command key is <=100 chars, leaving room in every generated row ID.
{
  const w = world();
  w.exec({ type: "request.create", requestId: "key-boundary", productId: "milk", quantity: 1, ...w.consent("milk") }, customers[0], { idempotencyKey: "k".repeat(100) });
  assert.equal(w.state.events.every(event => event.id.length <= 180), true);
  for (const length of [101, 180]) w.reject({ type: "clock.tick" }, "INVALID_COMMAND", merchant, { idempotencyKey: "k".repeat(length) });
  w.reject({ type: "clock.tick", paymentFailureRequestIds: ["key-boundary"] }, "FORBIDDEN", customers[1]);
}

// Strict FIFO: head 3 / follower 1 / first supply 2, then pooled sources finish both.
{
  const w = world(); w.budget(); w.request("a", 3); w.request("b", 1, customers[1]); w.order(4);
  w.supply(0, 2); assert.equal(w.state.reservations.length, 0); assert.equal(w.view().demand[0].pooledQuantity, 2);
  assert.equal(w.view().demand[0].shortage, 2); w.order(2); w.supply(1, 2);
  assert.deepEqual(w.state.reservations.map(r => r.requestId), ["a", "b"]);
  assert.equal(w.state.allocations.filter(a => a.requestId === "a").length, 2);
  assert.equal(w.state.policies[0].spentWon, 400);
  w.exec({ type: "receive.full", lineId: w.state.lines[0].id }); assert.equal(w.state.reservations[0].status, "confirmed");
  w.exec({ type: "receive.full", lineId: w.state.lines[1].id }); assert.equal(w.state.reservations[0].status, "pickup_ready");
}

// Detached outstanding orders still cover demand; no link double-subtraction.
{
  const w = world(); w.budget(); w.request("cancel", 2); w.order(2);
  w.exec({ type: "request.cancel", requestId: "cancel" }, customers[0]); w.request("replacement", 2, customers[1]);
  assert.equal(w.view().demand[0].shortage, 0); assert.equal(w.state.policies[0].spentWon, 200);
  w.reject({ type: "order.approve", items: [{ productId: "milk", quantity: 1, conditionVersion: "test-v1" }] }, "ORDER_LIMIT");
  w.supply(0, 0); assert.equal(w.state.policies[0].spentWon, 0); assert.equal(w.view().demand[0].shortage, 2);
  w.order(2); w.request("extra", 1, customers[2]); assert.equal(w.view().demand[0].shortage, 1);
}

// Payment failure releases sources, never auto-retries, and reconsent gets a new sequence.
{
  const w = world(); w.budget(); w.request("fail", 2); w.order(2);
  w.supply(0, 2, { paymentFailureRequestIds: ["fail"] });
  assert.equal(w.state.reservations.length, 0); assert.equal(w.state.requests[0].reason, "PAYMENT_FAILED");
  assert.equal(w.state.allocations.every(a => a.releasedAt !== null), true);
  w.exec({ type: "clock.tick" }); assert.equal(w.state.payments.length, 1);
  w.exec({ type: "receive.full", lineId: w.state.lines[0].id });
  w.setTime(start + 10000); w.exec({ type: "request.reconsent", requestId: "fail", ...w.consent("milk") }, customers[0]);
  assert.equal(w.state.reservations[0].pickupAvailableAt, start + 10000);
  assert.equal(w.state.reservations[0].pickupDeadlineAt, start + 10000 + P.pickupMs);
  assert.equal(w.state.requests[0].sequence, 2); assert.equal(w.state.payments.length, 2);
}

// Decrease exception, increase sequence, seven-day exact expiry, changed price consent.
{
  const w = world(); w.request("edit", 3); w.request("next", 1, customers[1]);
  w.exec({ type: "request.change", requestId: "edit", quantity: 2, ...w.consent("milk") }, customers[0]); assert.equal(w.state.requests[0].sequence, 1);
  w.exec({ type: "request.change", requestId: "edit", quantity: 3, ...w.consent("milk") }, customers[0]); assert.equal(w.state.requests[0].sequence, 3);
  w.setTime(start + P.consentMs);
  assert.equal(w.view().requests[0].request.status, "review_required");
  assert.equal(w.state.requests[0].status, "pending"); // Read-only clock projection.
  w.reject({ type: "request.change", requestId: "edit", quantity: 1, ...w.consent("milk") }, "RECONSENT_REQUIRED", customers[0]);
  w.exec({ type: "clock.tick" }); assert.equal(w.state.requests[0].status, "review_required");
  w.exec({ type: "request.reconsent", requestId: "edit", ...w.consent("milk") }, customers[0]); assert.equal(w.state.requests[0].sequence, 4);
  w.exec({ type: "condition.update", condition: { ...w.state.conditions[0], unitPrice: 201, version: "price-v2" } });
  w.reject({ type: "request.change", requestId: "edit", quantity: 1, ...w.consent("milk") }, "RECONSENT_REQUIRED", customers[0]);
  w.exec({ type: "request.reconsent", requestId: "edit", ...w.consent("milk") }, customers[0]); assert.equal(w.state.requests[0].unitPrice, 201);
}

// Whole-batch rollback, auto budget competition, MOQ/pack with demand above goal.
{
  const w = world(); w.budget(300); w.request("milk", 2); w.request("coffee", 2, customers[1], "coffee");
  w.reject({ type: "order.approve", items: [{ productId: "milk", quantity: 2, conditionVersion: "test-v1" }, { productId: "coffee", quantity: 2, conditionVersion: "old" }] }, "STALE_CONDITION");
  assert.equal(w.state.orders.length, 0);
  w.reject({ type: "order.approve", items: [{ productId: "milk", quantity: 2, conditionVersion: "test-v1" }, { productId: "coffee", quantity: 2, conditionVersion: "test-v1" }] }, "BUDGET_LIMIT");
  w.budget(300, true, ["coffee", "milk"]);
  assert.deepEqual(w.state.lines.map(l => [l.productId, l.quantity]), [["milk", 2], ["coffee", 1]]);
  w.exec({ type: "auto.run" }); assert.equal(w.state.orders.length, 2);
  w.reject({ type: "policy.set", enabled: false, productIds: [], budgetWon: 299 }, "BUDGET_LIMIT");
  w.budget(300, false, []); w.request("no-auto", 1, customers[2]); assert.equal(w.state.orders.length, 2);
}
{
  const w = world(); w.exec({ type: "condition.update", condition: { ...w.state.conditions[0], moq: 6, packSize: 6, supplyQuantity: 12, version: "six" } });
  w.budget(10000, true);
  for (let i = 0; i < 13; i++) w.request(`demand-${i}`, 1, customers[i]);
  assert.equal(w.state.requests.length, 13); assert.equal(w.state.lines.length, 2); assert.equal(w.view().demand[0].shortage, 1);
  w.reject({ type: "request.create", requestId: "too-many", productId: "milk", quantity: 21, ...w.consent("milk") }, "INVALID_QUANTITY", customers[14]);
}

// Exact 48-hour deadline and paid reservation unaffected by consent expiry pre-receive.
{
  const w = world(); w.budget(); w.request("paid", 1); w.order(1); w.supply(0, 1);
  w.exec({ type: "clock.advance", milliseconds: 8 * 86400000 });
  assert.equal(w.state.reservations[0].status, "confirmed");
  w.exec({ type: "receive.full", lineId: w.state.lines[0].id });
  w.exec({ type: "clock.advance", milliseconds: P.pickupMs });
  const b = w.state.reservations[0]; assert.equal(b.status, "pickup_expired");
  w.reject({ type: "reservation.collect", reservationId: b.id, code: b.code }, "COLLECT_NOT_ALLOWED");
  w.reject({ type: "clock.advance", milliseconds: -1 }, "INVALID_TIME");
  w.reject({ type: "clock.advance", milliseconds: P.maxClockAdvanceMs + 1 }, "INVALID_TIME");
}
console.log(`PASS domain pure checker: ${cases} commands/rejections; 262/8/524/28 DTOs and original 242 identities preserved; FIFO/pools, consent, budget, replay, permissions, failure recovery, exact deadlines. SQL/IDB/browser/live: NOT RUN.`);
await import("./needs.check.mjs");
await import("./wait.check.mjs");
