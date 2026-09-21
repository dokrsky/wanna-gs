import { DOMAIN_POLICY as P, DomainError, amount, identifier, integer, requireRule, sum } from "./policy";
import { assertSearchState, recordSearch, searchView } from "./needs";
import type { Actor, Command, CommandOutcome, Condition, ConsentInput, CustomerWaiting, Demand, DomainEvent, DomainState, OrderItem, OrderLine, PurchaseRequest, RequestDetail, Seed, Viewer, View } from "./types";

const copy = <T>(value: T): T => structuredClone(value);
const unique = (values: string[]) => new Set(values).size === values.length;
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  requireRule(value !== undefined && (typeof value !== "number" || Number.isFinite(value)), "INVALID_COMMAND", "명령 값을 확인해주세요.");
  return JSON.stringify(value);
}
function findCondition(state: DomainState, storeId: string, productId: string) {
  const condition = state.conditions.find(c => c.storeId === storeId && c.productId === productId);
  requireRule(condition, "CONDITION_MISSING", "이 점포의 상품 조건이 확인되지 않았어요.");
  return condition;
}
function validateCondition(c: Condition, state: Pick<Seed, "products" | "stores">) {
  requireRule(c && state.products.some(p => p.id === c.productId) && state.stores.some(s => s.id === c.storeId), "INVALID_CONDITION", "상품·점포 조건을 확인해주세요.");
  requireRule(typeof c.requestable === "boolean" && integer(c.unitPrice) && integer(c.unitCost) && integer(c.moq, 1) && integer(c.packSize, 1) && integer(c.supplyQuantity) &&
    ["available", "limited", "unavailable", "unknown"].includes(c.supplyStatus) && typeof c.version === "string" && c.version.length > 0 && c.version.length <= 180 &&
    (c.orderClosesAt === undefined || c.orderClosesAt === null || integer(c.orderClosesAt)), "INVALID_CONDITION", "가격·수량·공급 조건이 올바르지 않아요.");
}
function viewer(state: DomainState, v: Viewer): Actor {
  requireRule(v.sessionId === state.sessionId, "WRONG_SESSION", "현재 데모 세션을 다시 확인해주세요.");
  requireRule(v.generation === state.generation, "STALE_GENERATION", "초기화 이전 요청은 적용할 수 없어요.");
  const actor = state.actors.find(a => a.id === v.actorId);
  requireRule(actor && actor.role === v.role && state.stores.some(s => s.id === v.storeId) && (actor.role !== "merchant" || actor.storeId === v.storeId), "FORBIDDEN", "현재 역할·점포에서 할 수 없는 작업이에요.");
  return actor;
}
function merchant(command: Command) { requireRule(command.role === "merchant", "FORBIDDEN", "해당 점포 경영주만 할 수 있어요."); }
function customer(command: Command) { requireRule(command.role === "customer", "FORBIDDEN", "고객 본인의 요청에서 진행해주세요."); }
function businessNow(state: DomainState, wallNow: number) {
  requireRule(integer(wallNow) && integer(wallNow + state.clockOffsetMs + P.consentMs + P.pickupMs), "INVALID_TIME", "데모 시각을 확인해주세요.");
  return Math.max(state.lastNow, wallNow + state.clockOffsetMs);
}
function consentValid(state: DomainState, request: PurchaseRequest, now: number) {
  const c = state.conditions.find(c => c.storeId === request.storeId && c.productId === request.productId);
  return !!c && c.requestable && request.consentExpiresAt > now && c.version === request.consentVersion && c.unitPrice === request.unitPrice;
}
function pending(state: DomainState, storeId: string, productId: string, now: number) {
  return state.requests.filter(r => r.storeId === storeId && r.productId === productId && r.status === "pending" && consentValid(state, r, now)).sort((a, b) => a.sequence - b.sequence);
}
function freeQuantity(state: DomainState, line: OrderLine) {
  return (line.suppliedQuantity ?? 0) - sum(state.allocations.filter(a => a.lineId === line.id && a.releasedAt === null).map(a => a.quantity));
}
function policyFor(state: DomainState, storeId: string) {
  const policy = state.policies.find(p => p.storeId === storeId);
  requireRule(policy, "INVALID_STATE", "점포 예산 설정을 확인해주세요.");
  return policy;
}
function demandFor(state: DomainState, storeId: string, productId: string, now: number): Demand {
  const validQuantity = sum(pending(state, storeId, productId, now).map(r => r.quantity));
  const lines = state.lines.filter(l => l.storeId === storeId && l.productId === productId);
  // Unconfirmed orders count even if cancellation/expiry detached every request.
  // Do NOT also subtract request links: that would double-count the same supply.
  const outstandingQuantity = sum(lines.filter(l => l.suppliedQuantity === null).map(l => l.quantity));
  const pooledQuantity = sum(lines.map(l => freeQuantity(state, l)));
  const shortage = Math.max(0, validQuantity - outstandingQuantity - pooledQuantity);
  const c = state.conditions.find(c => c.storeId === storeId && c.productId === productId);
  let reason: string | null = null;
  let orderableQuantity = 0;
  if (!shortage) reason = "NO_SHORTAGE";
  else if (!c || !c.requestable || ["unavailable", "unknown"].includes(c.supplyStatus)) reason = "SUPPLY_UNAVAILABLE";
  else if (c.orderClosesAt != null && now >= c.orderClosesAt) reason = "ORDER_WINDOW_CLOSED";
  else {
    // supplyQuantity is this condition's maximum quantity per order line, not
    // existing store stock. Only finalized order lines provide pooled inventory.
    const p = policyFor(state, storeId);
    const affordable = c.unitCost === 0 ? shortage : Math.floor((p.budgetWon - p.spentWon) / c.unitCost);
    orderableQuantity = Math.floor(Math.min(shortage, c.supplyQuantity, affordable) / c.packSize) * c.packSize;
    if (orderableQuantity < c.moq) {
      orderableQuantity = 0;
      reason = affordable < c.moq ? "BUDGET_LIMIT" : "MINIMUM_OR_PACK_LIMIT";
    }
  }
  return { productId, validQuantity, outstandingQuantity, pooledQuantity, shortage, orderableQuantity, reason };
}

export function createInitialState(seed: Seed, context: { sessionId: string; generation: number; now: number }): DomainState {
  requireRule(identifier(context.sessionId) && integer(context.generation) && integer(context.now), "INVALID_CONTEXT", "세션·세대·시각을 확인해주세요.");
  const state: DomainState = {
    products: seed.products.map(({ id, name, category }) => ({ id, name, ...(category === undefined ? {} : { category }) })),
    stores: seed.stores.map(({ id, name }) => ({ id, name })),
    actors: seed.actors.map(({ id, role, displayName, storeId }) => ({ id, role, displayName, ...(storeId ? { storeId } : {}) })),
    conditions: seed.conditions.map(c => ({ storeId: c.storeId, productId: c.productId, requestable: c.requestable, unitPrice: c.unitPrice, unitCost: c.unitCost, moq: c.moq, packSize: c.packSize, supplyStatus: c.supplyStatus, supplyQuantity: c.supplyQuantity, version: c.version, orderClosesAt: c.orderClosesAt ?? null })),
    sessionId: context.sessionId, generation: context.generation, lastNow: context.now, revision: 0, nextSequence: 1, clockOffsetMs: 0,
    requests: [], orders: [], lines: [], links: [], allocations: [], payments: [], reservations: [], notifications: [], events: [], receipts: [],
    policies: seed.stores.map(s => ({ storeId: s.id, enabled: false, productIds: [], budgetWon: 0, spentWon: 0, version: 0 })),
    searchRuns: [], needs: [], recommendationEvents: [],
  };
  assertState(state);
  return state;
}

// Throws only for a corrupted adapter snapshot/seed. Pure command failures are
// returned by applyCommand; callers must never persist a partially built result.
export function assertState(s: DomainState) {
  assertSearchState(s);
  requireRule(identifier(s.sessionId) && integer(s.generation) && integer(s.revision) && integer(s.nextSequence, 1) && integer(s.lastNow) && integer(s.clockOffsetMs), "INVALID_STATE", "데모 상태 버전을 확인해주세요.");
  for (const rows of [s.products, s.stores, s.actors, s.requests, s.orders, s.lines, s.links, s.allocations, s.payments, s.reservations, s.notifications, s.events]) {
    requireRule(Array.isArray(rows) && rows.every(r => identifier(r.id)) && unique(rows.map(r => r.id)), "INVALID_STATE", "중복되거나 잘못된 식별자가 있어요.");
  }
  requireRule(unique(s.conditions.map(c => `${c.storeId}/${c.productId}`)) && unique(s.policies.map(p => p.storeId)) && s.policies.length === s.stores.length && unique(s.receipts.map(r => r.key)), "INVALID_STATE", "조건·정책·명령 기록이 중복됐어요.");
  for (const a of s.actors) requireRule(["customer", "merchant"].includes(a.role) && (a.role !== "merchant" || s.stores.some(t => t.id === a.storeId)), "INVALID_STATE", "역할·점포 관계를 확인해주세요.");
  for (const c of s.conditions) validateCondition(c, s);
  requireRule(unique(s.requests.map(r => String(r.sequence))), "INVALID_STATE", "접수 순번이 중복됐어요.");
  for (const r of s.requests) {
    requireRule(s.actors.some(a => a.id === r.actorId && a.role === "customer") && s.stores.some(t => t.id === r.storeId) && s.products.some(p => p.id === r.productId) && integer(r.quantity, 1, P.maxRequestQuantity) && integer(r.unitPrice) && integer(r.sequence, 1, s.nextSequence - 1) && integer(r.consentAt) && r.consentExpiresAt === r.consentAt + P.consentMs && ["pending", "review_required", "reserved", "cancelled"].includes(r.status), "INVALID_STATE", "요청 수량·동의·관계를 확인해주세요.");
  }
  const active = s.requests.filter(r => r.status !== "cancelled" && !s.reservations.some(b => b.requestId === r.id && ["collected", "pickup_expired"].includes(b.status)));
  requireRule(unique(active.map(r => `${r.actorId}/${r.storeId}/${r.productId}`)), "INVALID_STATE", "활성 구매 요청이 중복됐어요.");
  for (const o of s.orders) requireRule(s.stores.some(t => t.id === o.storeId) && integer(o.costWon) && o.costWon === sum(s.lines.filter(l => l.orderId === o.id).map(l => amount(l.quantity, l.unitCost))), "INVALID_STATE", "발주 총액을 확인해주세요.");
  for (const l of s.lines) {
    requireRule(s.orders.some(o => o.id === l.orderId && o.storeId === l.storeId) && s.products.some(p => p.id === l.productId) && integer(l.quantity, 1) && integer(l.unitCost) && (l.suppliedQuantity === null || integer(l.suppliedQuantity, 0, l.quantity)) && ((l.suppliedQuantity === null) === (l.suppliedAt === null)) && (l.receivedAt === null || (l.suppliedQuantity !== null && integer(l.receivedAt))) && freeQuantity(s, l) >= 0, "INVALID_STATE", "공급·배정 수량이 맞지 않아요.");
  }
  for (const link of s.links) {
    const r = s.requests.find(r => r.id === link.requestId), l = s.lines.find(l => l.id === link.lineId);
    requireRule(r && l && r.storeId === l.storeId && r.productId === l.productId && integer(link.quantity, 1) && (!link.active || (r.status === "pending" && l.suppliedQuantity === null)), "INVALID_STATE", "발주 연결 관계를 확인해주세요.");
  }
  for (const r of s.requests) requireRule(sum(s.links.filter(l => l.requestId === r.id && l.active).map(l => l.quantity)) <= r.quantity, "INVALID_STATE", "요청 발주 연결량이 초과됐어요.");
  for (const l of s.lines) requireRule(sum(s.links.filter(k => k.lineId === l.id && k.active).map(k => k.quantity)) <= l.quantity, "INVALID_STATE", "발주 연결량이 초과됐어요.");
  for (const a of s.allocations) {
    const r = s.requests.find(r => r.id === a.requestId), l = s.lines.find(l => l.id === a.lineId), payment = s.payments.find(p => p.id === a.paymentId);
    requireRule(r && l && payment && payment.requestId === r.id && r.storeId === l.storeId && r.productId === l.productId && l.suppliedQuantity !== null && integer(a.quantity, 1) && (a.releasedAt === null ? payment.status === "succeeded" : integer(a.releasedAt) && payment.status === "failed"), "INVALID_STATE", "배정 출처·결제를 확인해주세요.");
  }
  for (const p of s.payments) {
    const r = s.requests.find(r => r.id === p.requestId);
    requireRule(r && integer(p.amountWon) && ["succeeded", "failed"].includes(p.status) && sum(s.allocations.filter(a => a.paymentId === p.id).map(a => a.quantity)) >= 1, "INVALID_STATE", "모의 결제 기록을 확인해주세요.");
    if (p.status === "succeeded") requireRule(p.amountWon === amount(r.quantity, r.unitPrice) && s.reservations.some(b => b.paymentId === p.id), "INVALID_STATE", "성공 결제·예약이 일치하지 않아요.");
  }
  requireRule(unique(s.reservations.map(b => b.requestId)) && unique(s.reservations.map(b => b.code)), "INVALID_STATE", "예약이 중복됐어요.");
  for (const b of s.reservations) {
    const r = s.requests.find(r => r.id === b.requestId), p = s.payments.find(p => p.id === b.paymentId);
    const allocations = s.allocations.filter(a => a.paymentId === b.paymentId && a.releasedAt === null);
    requireRule(r && r.status === "reserved" && p?.status === "succeeded" && p.requestId === r.id && b.storeId === r.storeId && b.actorId === r.actorId && sum(allocations.map(a => a.quantity)) === r.quantity && ["confirmed", "pickup_ready", "collected", "pickup_expired"].includes(b.status), "INVALID_STATE", "예약의 전량 배정·결제를 확인해주세요.");
    if (b.status === "confirmed") requireRule(b.pickupAvailableAt === null && b.pickupDeadlineAt === null, "INVALID_STATE", "입고 대기에 픽업 기한이 생겼어요.");
    else requireRule(integer(b.pickupAvailableAt) && b.pickupDeadlineAt === b.pickupAvailableAt + P.pickupMs && allocations.every(a => s.lines.find(l => l.id === a.lineId)?.receivedAt != null), "INVALID_STATE", "입고·픽업 시작과 마감이 맞지 않아요.");
    requireRule(b.status !== "collected" || (integer(b.collectedAt) && b.collectedAt < b.pickupDeadlineAt!), "INVALID_STATE", "수령 기한을 확인해주세요.");
    requireRule(s.notifications.filter(n => n.reservationId === b.id && n.kind === "reservation_confirmed").length === 1 && s.notifications.filter(n => n.reservationId === b.id && n.kind === "pickup_ready").length === (b.pickupAvailableAt === null ? 0 : 1), "INVALID_STATE", "예약·픽업 알림이 일치하지 않아요.");
  }
  for (const p of s.policies) {
    const spent = sum(s.lines.filter(l => l.storeId === p.storeId).map(l => amount(l.suppliedQuantity ?? l.quantity, l.unitCost)));
    requireRule(s.stores.some(t => t.id === p.storeId) && integer(p.budgetWon, 0, P.maxBudgetWon) && p.spentWon === spent && p.spentWon <= p.budgetWon && typeof p.enabled === "boolean" && unique(p.productIds) && p.productIds.every(id => s.products.some(t => t.id === id)), "INVALID_STATE", "예산 점유·정책이 일치하지 않아요.");
  }
}

export function applyCommand(committedState: DomainState, command: Command, wallNow: number): CommandOutcome {
  try {
    assertState(committedState);
    viewer(committedState, command);
    requireRule(identifier(command.idempotencyKey) && command.idempotencyKey.length <= 100 && integer(command.expectedRevision), "INVALID_COMMAND", "명령 키(100자 이하)·버전을 확인해주세요.");
    const fingerprint = canonical(command);
    const receipt = committedState.receipts.find(r => r.key === command.idempotencyKey);
    if (receipt) {
      requireRule(receipt.fingerprint === fingerprint, "IDEMPOTENCY_CONFLICT", "같은 명령 키의 내용이 달라요.");
      return { ok: true, state: copy(committedState), events: [], result: copy(receipt.result), replayed: true };
    }
    requireRule(command.expectedRevision === committedState.revision, "STALE_REVISION", "내용이 바뀌었어요. 최신 상태를 확인해주세요.");
    const state = copy(committedState);
    let now = businessNow(state, wallNow);
    const events: DomainEvent[] = [], entityIds: string[] = [];
    let idIndex = 0;
    const id = (kind: string) => `${state.generation}:${command.idempotencyKey}:${kind}:${++idIndex}`;
    const emit = (type: string, entityId: string) => {
      const event = { id: id("event"), commandKey: command.idempotencyKey, type, entityId, storeId: command.storeId, at: now };
      events.push(event); state.events.push(event);
    };
    if (["search.record", "needs.record", "recommendation.record"].includes(command.type)) {
      const entityId = recordSearch(state, command, now);
      emit(command.type, entityId);
      state.revision++;
      const result = { commandKey: command.idempotencyKey, revision: state.revision, entityIds: [entityId] };
      state.receipts.push({ key: command.idempotencyKey, fingerprint, result: copy(result) });
      assertState(state);
      return { ok: true, state, events: copy(events), result, replayed: false };
    }
    const failures = command.paymentFailureRequestIds ?? [];
    requireRule(Array.isArray(failures) && unique(failures) && failures.every(key => identifier(key) && (state.requests.some(r => r.id === key && r.storeId === command.storeId) || (command.type === "request.create" && key === command.requestId))), "INVALID_SIMULATION", "모의 결제 실패 대상 요청을 확인해주세요.");
    requireRule(command.role === "merchant" || failures.every(key => (command.type === "request.create" && key === command.requestId) || state.requests.some(r => r.id === key && r.actorId === command.actorId)), "FORBIDDEN", "다른 고객의 모의 결제 결과를 바꿀 수 없어요.");
    const detach = (requestId: string) => {
      state.links.filter(l => l.requestId === requestId && l.active).forEach(l => { l.active = false; });
    };
    const ownedRequest = (requestId: string) => {
      customer(command);
      const r = state.requests.find(r => r.id === requestId);
      requireRule(r && r.actorId === command.actorId && r.storeId === command.storeId, "FORBIDDEN", "본인의 현재 점포 요청만 변경할 수 있어요.");
      return r;
    };
    const checkConsent = (c: Condition, input: ConsentInput) => {
      requireRule(c.requestable && input.consent === true && input.unitPrice === c.unitPrice && input.conditionVersion === c.version, "CONSENT_REQUIRED", "현재 상품·점포·수량·가격·조건을 확인하고 새로 동의해주세요.");
    };
    const expire = () => {
      for (const r of state.requests.filter(r => r.storeId === command.storeId && r.status === "pending")) {
        if (!consentValid(state, r, now)) {
          r.status = "review_required"; r.reason = now >= r.consentExpiresAt ? "CONSENT_EXPIRED" : "CONDITIONS_CHANGED";
          detach(r.id); emit("request.review_required", r.id);
        }
      }
      for (const b of state.reservations.filter(b => b.storeId === command.storeId && b.status === "pickup_ready")) {
        if (now >= b.pickupDeadlineAt!) { b.status = "pickup_expired"; emit("reservation.pickup_expired", b.id); }
      }
    };
    const ready = () => {
      for (const b of state.reservations.filter(b => b.storeId === command.storeId && b.status === "confirmed")) {
        const allocations = state.allocations.filter(a => a.paymentId === b.paymentId && a.releasedAt === null);
        if (allocations.length && allocations.every(a => state.lines.find(l => l.id === a.lineId)?.receivedAt != null)) {
          b.status = "pickup_ready"; b.pickupAvailableAt = now; b.pickupDeadlineAt = now + P.pickupMs;
          state.notifications.push({ id: id("notification"), actorId: b.actorId, reservationId: b.id, kind: "pickup_ready", createdAt: now });
          emit("reservation.pickup_ready", b.id);
        }
      }
    };
    const settle = () => {
      expire();
      const productIds = [...new Set(state.requests.filter(r => r.storeId === command.storeId && r.status === "pending").map(r => r.productId))].sort();
      for (const productId of productIds) {
        const sources = state.lines.filter(l => l.storeId === command.storeId && l.productId === productId && l.suppliedQuantity !== null).sort((a, b) => a.suppliedAt! - b.suppliedAt! || a.id.localeCompare(b.id));
        for (const r of pending(state, command.storeId, productId, now)) {
          if (sum(sources.map(l => freeQuantity(state, l))) < r.quantity) break; // Strict whole-request FIFO.
          const paymentId = id("payment"); let left = r.quantity;
          const failed = failures.includes(r.id);
          for (const l of sources) {
            const quantity = Math.min(left, freeQuantity(state, l));
            if (quantity) {
              state.allocations.push({ id: id("allocation"), requestId: r.id, lineId: l.id, paymentId, quantity, releasedAt: null });
              left -= quantity;
            }
            if (!left) break;
          }
          state.payments.push({ id: paymentId, requestId: r.id, amountWon: amount(r.quantity, r.unitPrice), status: failed ? "failed" : "succeeded", createdAt: now });
          detach(r.id);
          if (failed) {
            state.allocations.filter(a => a.paymentId === paymentId).forEach(a => { a.releasedAt = now; });
            r.status = "review_required"; r.reason = "PAYMENT_FAILED"; emit("payment.failed", paymentId);
          } else {
            r.status = "reserved"; r.reason = null;
            const reservation = { id: id("reservation"), requestId: r.id, paymentId, storeId: r.storeId, actorId: r.actorId, code: id("pickup"), status: "confirmed" as const, createdAt: now, pickupAvailableAt: null, pickupDeadlineAt: null, collectedAt: null };
            state.reservations.push(reservation);
            state.notifications.push({ id: id("notification"), actorId: r.actorId, reservationId: reservation.id, kind: "reservation_confirmed", createdAt: now });
            emit("payment.succeeded", paymentId); emit("reservation.confirmed", reservation.id);
          }
        }
      }
      ready();
    };
    const approve = (items: OrderItem[], source: "manual" | "auto") => {
      requireRule(Array.isArray(items) && items.length > 0 && items.length <= state.products.length && unique(items.map(i => i.productId)), "INVALID_ORDER", "발주 상품을 중복 없이 선택해주세요.");
      const p = policyFor(state, command.storeId);
      let total = 0;
      for (const item of items) {
        const c = findCondition(state, command.storeId, item.productId);
        const demand = demandFor(state, command.storeId, item.productId, now);
        requireRule(c.version === item.conditionVersion, "STALE_CONDITION", "상품 조건이 바뀌었어요. 묶음 전체를 다시 확인해주세요.");
        requireRule(integer(item.quantity, 1) && item.quantity >= c.moq && item.quantity % c.packSize === 0 && item.quantity <= demand.orderableQuantity, "ORDER_LIMIT", "유효 수요·공급·MOQ·포장 단위·예산 안에서만 발주할 수 있어요.");
        total = sum([total, amount(item.quantity, c.unitCost)]);
      }
      requireRule(total <= p.budgetWon - p.spentWon, "BUDGET_LIMIT", "묶음 전체가 남은 매입 예산을 넘어요.");
      const orderId = id("order");
      state.orders.push({ id: orderId, storeId: command.storeId, source, createdAt: now, costWon: total });
      p.spentWon += total;
      for (const item of items) {
        const c = findCondition(state, command.storeId, item.productId), lineId = id("line");
        state.lines.push({ id: lineId, orderId, storeId: command.storeId, productId: item.productId, quantity: item.quantity, unitCost: c.unitCost, conditionVersion: c.version, suppliedQuantity: null, suppliedAt: null, receivedAt: null });
        let left = item.quantity;
        for (const r of pending(state, command.storeId, item.productId, now)) {
          const linked = sum(state.links.filter(l => l.requestId === r.id && l.active).map(l => l.quantity));
          const quantity = Math.min(left, r.quantity - linked);
          if (quantity) { state.links.push({ id: id("link"), requestId: r.id, lineId, quantity, active: true }); left -= quantity; }
          if (!left) break;
        }
      }
      entityIds.push(orderId); emit("order.submitted", orderId);
    };
    const autoRun = () => {
      const p = policyFor(state, command.storeId);
      if (!p.enabled) return;
      const candidates = p.productIds.map(productId => ({ productId, first: pending(state, command.storeId, productId, now).find(r => sum(state.links.filter(l => l.active && l.requestId === r.id).map(l => l.quantity)) < r.quantity)?.sequence ?? Infinity }))
        .sort((a, b) => a.first - b.first || a.productId.localeCompare(b.productId));
      for (const { productId } of candidates) {
        const d = demandFor(state, command.storeId, productId, now);
        if (d.orderableQuantity) approve([{ productId, quantity: d.orderableQuantity, conditionVersion: findCondition(state, command.storeId, productId).version }], "auto");
      }
    };

    expire();
    switch (command.type) {
      case "request.create": {
        customer(command);
        requireRule(identifier(command.requestId) && !state.requests.some(r => r.id === command.requestId), "DUPLICATE_REQUEST", "요청 식별자가 이미 사용됐어요.");
        requireRule(integer(command.quantity, 1, P.maxRequestQuantity), "INVALID_QUANTITY", "수량은 1~20개 정수로 입력해주세요.");
        const c = findCondition(state, command.storeId, command.productId); checkConsent(c, command);
        requireRule(!state.requests.some(r => r.actorId === command.actorId && r.storeId === command.storeId && r.productId === command.productId && r.status !== "cancelled" && !state.reservations.some(b => b.requestId === r.id && ["collected", "pickup_expired"].includes(b.status))), "ACTIVE_REQUEST_EXISTS", "같은 상품의 활성 요청이 있어요. 기존 요청을 확인해주세요.");
        state.requests.push({ id: command.requestId, actorId: command.actorId, storeId: command.storeId, productId: command.productId, quantity: command.quantity, unitPrice: c.unitPrice, consentVersion: c.version, consentAt: now, consentExpiresAt: now + P.consentMs, sequence: state.nextSequence++, createdAt: now, status: "pending", reason: null });
        entityIds.push(command.requestId); emit("request.created", command.requestId); break;
      }
      case "request.change": {
        const r = ownedRequest(command.requestId);
        requireRule(r.status === "pending" && consentValid(state, r, now), "RECONSENT_REQUIRED", "조건 변경·동의 만료 요청은 먼저 재동의해주세요.");
        requireRule(!state.links.some(l => l.requestId === r.id && l.active) && !state.allocations.some(a => a.requestId === r.id && a.releasedAt === null), "REQUEST_LINKED", "발주 연결·배정된 요청은 수량을 바꿀 수 없어요.");
        requireRule(integer(command.quantity, 1, P.maxRequestQuantity), "INVALID_QUANTITY", "수량은 1~20개 정수로 입력해주세요.");
        const c = findCondition(state, command.storeId, r.productId); checkConsent(c, command);
        if (command.quantity > r.quantity) r.sequence = state.nextSequence++;
        r.quantity = command.quantity; r.consentAt = now; r.consentExpiresAt = now + P.consentMs;
        entityIds.push(r.id); emit("request.changed", r.id); break;
      }
      case "request.reconsent": {
        const r = ownedRequest(command.requestId);
        requireRule(r.status === "review_required", "INVALID_STATE_TRANSITION", "재확인이 필요한 요청에서만 재동의할 수 있어요.");
        const c = findCondition(state, command.storeId, r.productId); checkConsent(c, command);
        detach(r.id); r.status = "pending"; r.reason = null; r.unitPrice = c.unitPrice; r.consentVersion = c.version;
        r.consentAt = now; r.consentExpiresAt = now + P.consentMs; r.sequence = state.nextSequence++;
        entityIds.push(r.id); emit("request.reconsented", r.id); break;
      }
      case "request.cancel": {
        const r = ownedRequest(command.requestId);
        requireRule(["pending", "review_required"].includes(r.status), "CANCEL_NOT_ALLOWED", "모의 결제 완료 이후에는 취소할 수 없어요.");
        detach(r.id); r.status = "cancelled"; r.reason = null;
        entityIds.push(r.id); emit("request.cancelled", r.id); break;
      }
      case "order.approve": merchant(command); settle(); approve(command.items, "manual"); break;
      case "policy.set": {
        merchant(command);
        const p = policyFor(state, command.storeId);
        requireRule(typeof command.enabled === "boolean" && Array.isArray(command.productIds) && unique(command.productIds) && command.productIds.every(id => state.products.some(p => p.id === id)) && (!command.enabled || command.productIds.length > 0), "INVALID_POLICY", "자동발주 상품 대상을 확인해주세요.");
        requireRule(integer(command.budgetWon, 0, P.maxBudgetWon) && command.budgetWon >= p.spentWon, "BUDGET_LIMIT", "예산은 이미 사용·점유한 금액보다 낮출 수 없어요.");
        p.enabled = command.enabled; p.productIds = [...command.productIds]; p.budgetWon = command.budgetWon; p.version++;
        emit("policy.changed", p.storeId); break;
      }
      case "auto.run": merchant(command); break;
      case "supply.finalize": {
        merchant(command);
        const l = state.lines.find(l => l.id === command.lineId && l.storeId === command.storeId);
        requireRule(l && l.suppliedQuantity === null, "SUPPLY_ALREADY_FINAL", "공급은 발주 라인별 한 번만 확정할 수 있어요.");
        requireRule(integer(command.quantity, 0, l.quantity), "INVALID_QUANTITY", "공급량은 0부터 발주량까지의 정수여야 해요.");
        l.suppliedQuantity = command.quantity; l.suppliedAt = now;
        state.links.filter(k => k.lineId === l.id && k.active).forEach(k => { k.active = false; });
        policyFor(state, command.storeId).spentWon -= amount(l.quantity - command.quantity, l.unitCost);
        entityIds.push(l.id); emit("supply.finalized", l.id); break;
      }
      case "receive.full": {
        merchant(command);
        const l = state.lines.find(l => l.id === command.lineId && l.storeId === command.storeId);
        requireRule(l && l.suppliedQuantity !== null && l.receivedAt === null, "RECEIVE_NOT_ALLOWED", "공급 확정 후 한 번만 전량 입고할 수 있어요.");
        l.receivedAt = now; entityIds.push(l.id); emit("supply.received", l.id); break;
      }
      case "reservation.collect": {
        merchant(command);
        const b = state.reservations.find(b => b.id === command.reservationId && b.storeId === command.storeId);
        requireRule(b && b.status === "pickup_ready" && b.code === command.code && now < b.pickupDeadlineAt!, "COLLECT_NOT_ALLOWED", "점포·예약번호·픽업 가능 상태·48시간 기한을 확인해주세요.");
        b.status = "collected"; b.collectedAt = now; entityIds.push(b.id); emit("reservation.collected", b.id); break;
      }
      case "condition.update": {
        merchant(command); validateCondition(command.condition, state);
        requireRule(command.condition.storeId === command.storeId, "FORBIDDEN", "현재 점포의 모의 조건만 변경할 수 있어요.");
        const index = state.conditions.findIndex(c => c.storeId === command.storeId && c.productId === command.condition.productId);
        requireRule(index >= 0 && state.conditions[index].version !== command.condition.version, "STALE_CONDITION", "변경 조건에는 새로운 버전이 필요해요.");
        state.conditions[index] = copy(command.condition); emit("condition.changed", command.condition.productId); break;
      }
      case "clock.advance":
        merchant(command); requireRule(integer(command.milliseconds, 1, P.maxClockAdvanceMs), "INVALID_TIME", "시간은 한 번에 30일 이내로 앞으로만 이동할 수 있어요.");
        requireRule(integer(state.clockOffsetMs + command.milliseconds), "INVALID_TIME", "데모 시각 범위를 넘었어요.");
        state.clockOffsetMs += command.milliseconds; now = businessNow(state, wallNow); emit("clock.advanced", state.sessionId); break;
      case "clock.tick": break;
      default: throw new DomainError("INVALID_COMMAND", "지원하지 않는 거래 명령이에요.");
    }
    settle();
    if (["request.create", "request.change", "request.reconsent", "condition.update", "policy.set", "auto.run"].includes(command.type)) autoRun();
    state.lastNow = now; state.revision++;
    const result = { commandKey: command.idempotencyKey, revision: state.revision, entityIds };
    state.receipts.push({ key: command.idempotencyKey, fingerprint, result: copy(result) });
    assertState(state);
    return { ok: true, state, events: copy(events), result, replayed: false };
  } catch (error) {
    return { ok: false, error: error instanceof DomainError ? { code: error.code, message: error.message } : { code: "INVALID_COMMAND", message: "명령 또는 저장된 상태 형식을 확인해주세요." } };
  }
}

function waitingFor(state: DomainState, request: PurchaseRequest, now: number): CustomerWaiting | null {
  if (request.status === "cancelled" || request.status === "reserved") return null;
  const result = (code: CustomerWaiting["code"]): CustomerWaiting => ({ code, checkedAt: now });
  if (request.status === "review_required") return result("RECONSENT_REQUIRED");
  const demand = demandFor(state, request.storeId, request.productId, now);
  const throughRequest = sum(pending(state, request.storeId, request.productId, now).filter(r => r.sequence <= request.sequence).map(r => r.quantity));
  if (throughRequest > 0 && demand.pooledQuantity >= throughRequest) return result("ALLOCATION_PENDING");
  if (state.links.some(l => l.requestId === request.id && l.active)) return result("SUPPLY_CONFIRMATION_PENDING");
  if (!demand.shortage && demand.outstandingQuantity > 0) return result("SUPPLY_CONFIRMATION_PENDING");
  const c = state.conditions.find(c => c.storeId === request.storeId && c.productId === request.productId);
  if (!c || c.supplyStatus === "unknown") return result("CONDITION_UNKNOWN");
  if (!c.requestable || c.supplyStatus === "unavailable" || c.supplyQuantity === 0) return result("SIMULATED_SUPPLY_UNAVAILABLE");
  if (demand.reason === "ORDER_WINDOW_CLOSED") return result("ORDER_WINDOW_CLOSED");
  if (demand.reason === "MINIMUM_OR_PACK_LIMIT") return { ...result("MINIMUM_OR_PACK_WAIT"), moq: c.moq, packSize: c.packSize };
  // Includes budget restrictions without disclosing finances or other demand.
  return result("STORE_REVIEW_PENDING");
}

function detail(state: DomainState, request: PurchaseRequest, now: number, role: Viewer["role"]): RequestDetail {
  const links = state.links.filter(l => l.requestId === request.id), allocations = state.allocations.filter(a => a.requestId === request.id);
  const lineIds = new Set([...links.map(l => l.lineId), ...allocations.map(a => a.lineId)]);
  const reservation = state.reservations.find(b => b.requestId === request.id) ?? null;
  const valid = consentValid(state, request, now);
  // Derived clock display only; no writes/notifications while reading a snapshot.
  const displayRequest = request.status === "pending" && !valid ? { ...request, status: "review_required" as const, reason: now >= request.consentExpiresAt ? "CONSENT_EXPIRED" : "CONDITIONS_CHANGED" } : request;
  const lines = state.lines.filter(l => lineIds.has(l.id)).map(line => {
    const { quantity, suppliedQuantity, unitCost, ...safe } = line;
    return { ...(role === "merchant" ? line : safe), supplied: suppliedQuantity !== null };
  });
  return copy({ request: displayRequest, actor: state.actors.find(a => a.id === request.actorId)!, consentValid: valid && request.status !== "cancelled", links, lines, allocations, payments: state.payments.filter(p => p.requestId === request.id), reservation: reservation && reservation.status === "pickup_ready" && now >= reservation.pickupDeadlineAt! ? { ...reservation, status: "pickup_expired" as const } : reservation, waiting: waitingFor(state, displayRequest, now) });
}

export function getRequestDetail(state: DomainState, context: Viewer, requestId: string, wallNow: number): RequestDetail {
  viewer(state, context);
  const request = state.requests.find(r => r.id === requestId);
  requireRule(request && request.storeId === context.storeId && (context.role === "merchant" || request.actorId === context.actorId), "FORBIDDEN", "이 요청을 조회할 수 없어요.");
  return detail(state, request, businessNow(state, wallNow), context.role);
}

export function getView(state: DomainState, context: Viewer, wallNow: number): View {
  viewer(state, context);
  const now = businessNow(state, wallNow);
  const requests = state.requests.filter(r => r.storeId === context.storeId && (context.role === "merchant" || r.actorId === context.actorId)).sort((a, b) => a.sequence - b.sequence).map(r => detail(state, r, now, context.role));
  const reservations = requests.flatMap(r => r.reservation ? [r.reservation] : []);
  const reservationIds = new Set(reservations.map(r => r.id));
  return copy({ revision: state.revision, generation: state.generation, now, requests,
    orders: context.role === "merchant" ? state.orders.filter(o => o.storeId === context.storeId) : [],
    lines: context.role === "merchant" ? state.lines.filter(l => l.storeId === context.storeId) : [],
    reservations, notifications: state.notifications.filter(n => reservationIds.has(n.reservationId)),
    demand: context.role === "merchant" ? [...new Set(state.requests.filter(r => r.storeId === context.storeId).map(r => r.productId))].map(id => demandFor(state, context.storeId, id, now)) : [],
    policy: context.role === "merchant" ? policyFor(state, context.storeId) : null,
    ...searchView(state, context),
  });
}
