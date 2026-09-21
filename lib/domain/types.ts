// UI04 / ADR-003 v1. DTOs for a committed relational SQL snapshot, NOT a storage format.
export type Role = "customer" | "merchant";
export type Actor = { id: string; role: Role; displayName: string; storeId?: string };
export type Product = { id: string; name: string; category?: string };
export type Store = { id: string; name: string };
export type Condition = {
  storeId: string; productId: string; requestable: boolean; unitPrice: number; unitCost: number;
  moq: number; packSize: number; supplyStatus: "available" | "limited" | "unavailable" | "unknown";
  supplyQuantity: number; version: string; orderClosesAt?: number | null;
};
export type Seed = { products: Product[]; stores: Store[]; actors: Actor[]; conditions: Condition[] };
export type PurchaseRequest = {
  id: string; actorId: string; storeId: string; productId: string; quantity: number;
  unitPrice: number; consentVersion: string; consentAt: number; consentExpiresAt: number;
  sequence: number; createdAt: number; status: "pending" | "review_required" | "reserved" | "cancelled";
  reason: string | null;
};
export type Order = { id: string; storeId: string; source: "manual" | "auto"; createdAt: number; costWon: number };
export type OrderLine = {
  id: string; orderId: string; storeId: string; productId: string; quantity: number;
  unitCost: number; conditionVersion: string; suppliedQuantity: number | null;
  suppliedAt: number | null; receivedAt: number | null;
};
export type RequestOrderLink = { id: string; requestId: string; lineId: string; quantity: number; active: boolean };
export type Allocation = { id: string; requestId: string; lineId: string; paymentId: string; quantity: number; releasedAt: number | null };
export type Payment = { id: string; requestId: string; amountWon: number; status: "succeeded" | "failed"; createdAt: number };
export type Reservation = {
  id: string; requestId: string; paymentId: string; storeId: string; actorId: string; code: string;
  status: "confirmed" | "pickup_ready" | "collected" | "pickup_expired";
  createdAt: number; pickupAvailableAt: number | null; pickupDeadlineAt: number | null; collectedAt: number | null;
};
export type Notification = { id: string; actorId: string; reservationId: string; kind: "reservation_confirmed" | "pickup_ready"; createdAt: number };
export type Policy = { storeId: string; enabled: boolean; productIds: string[]; budgetWon: number; spentWon: number; version: number };
export type DomainEvent = { id: string; commandKey: string; type: string; entityId: string; storeId: string; at: number };
export type CommandResult = { commandKey: string; revision: number; entityIds: string[] };
export type Receipt = { key: string; fingerprint: string; result: CommandResult };
// ADR-005: raw dialogue, clues and execution detail are customer-only.
export type SearchCandidate = {
  productId: string; kind: "exact" | "needs_confirmation" | "alternative"; reason: string;
  catalogEvidence: { code: string; value: string }[];
};
export type SearchClue = {
  field: "name" | "brand" | "category" | "flavor" | "size" | "feature";
  value: string; polarity: "required" | "excluded" | "preferred"; certainty: "explicit" | "inferred";
  rawSourceRange: { source: "initial" | "answer1" | "answer2"; start: number; end: number };
};
export type SearchDialogue = { initialText: string; currentText: string; turns: { question: string; answer: string }[] };
export type SearchRunInput = {
  id: string; conversationId: string; dialogue: SearchDialogue;
  mode: "live" | "local" | "fixture"; model: string | null; status: "success" | "error";
  action: "candidates" | "clarify" | "unidentified" | "unsupported" | null;
  question: string | null; clues: SearchClue[]; candidates: SearchCandidate[];
  usage: { inputTokens: number; outputTokens: number } | null; latencyMs: number; errorCode: string | null;
};
export type SearchRun = SearchRunInput & { actorId: string; createdAt: number };
export type NeedReason = "unidentified" | "clarification_stopped" | "candidates_rejected" | "condition_unknown" | "not_requestable";
export type NeedRecord = { id: string; actorId: string; storeId: string; conversationId: string; runId: string; reason: NeedReason; createdAt: number };
export type RecommendationEvent = {
  id: string; actorId: string; runId: string; productId: string;
  action: "shown" | "selected" | "rejected" | "requested"; requestId: string | null; createdAt: number;
};
export type SafeClue = { productId: string | null; attribute: "name" | "category"; value: string;
  polarity: SearchClue["polarity"]; certainty: SearchClue["certainty"] };
export type NeedView = NeedRecord & { safeClues: SafeClue[]; candidates: { productId: string; kind: SearchCandidate["kind"] }[] };
export type SearchRecordCommand = { type: "search.record"; run: SearchRunInput };
export type NeedRecordCommand = { type: "needs.record"; needId: string; runId: string; reason: NeedReason; confirmed: true };
export type RecommendationRecordCommand = { type: "recommendation.record"; eventId: string; runId: string;
  productId: string; action: RecommendationEvent["action"]; requestId: string | null };
export type DomainState = Seed & {
  sessionId: string; generation: number; revision: number; nextSequence: number;
  clockOffsetMs: number; lastNow: number; requests: PurchaseRequest[]; orders: Order[];
  lines: OrderLine[]; links: RequestOrderLink[]; allocations: Allocation[]; payments: Payment[];
  reservations: Reservation[]; notifications: Notification[]; events: DomainEvent[];
  policies: Policy[]; receipts: Receipt[];
  searchRuns: SearchRun[]; needs: NeedRecord[]; recommendationEvents: RecommendationEvent[];
};
export type Viewer = { sessionId: string; generation: number; actorId: string; role: Role; storeId: string };
export type CommandContext = Viewer & { expectedRevision: number; idempotencyKey: string };
export type ConsentInput = { consent: true; unitPrice: number; conditionVersion: string };
export type OrderItem = { productId: string; quantity: number; conditionVersion: string };
export type Command = CommandContext & {
  // Explicit demo failure injection; omission means simulated success. Never a real charge.
  paymentFailureRequestIds?: string[];
} & (
  | ({ type: "request.create"; requestId: string; productId: string; quantity: number } & ConsentInput)
  | ({ type: "request.change"; requestId: string; quantity: number } & ConsentInput)
  | ({ type: "request.reconsent"; requestId: string } & ConsentInput)
  | { type: "request.cancel"; requestId: string }
  | { type: "order.approve"; items: OrderItem[] }
  | { type: "policy.set"; enabled: boolean; productIds: string[]; budgetWon: number }
  | { type: "auto.run" }
  | { type: "supply.finalize"; lineId: string; quantity: number }
  | { type: "receive.full"; lineId: string }
  | { type: "reservation.collect"; reservationId: string; code: string }
  | { type: "condition.update"; condition: Condition }
  | { type: "clock.advance"; milliseconds: number }
  | { type: "clock.tick" }
  | SearchRecordCommand | NeedRecordCommand | RecommendationRecordCommand
);
export type CommandOutcome =
  | { ok: true; state: DomainState; events: DomainEvent[]; result: CommandResult; replayed: boolean }
  | { ok: false; error: { code: string; message: string } };
// Read-only customer explanation, never persisted or used to authorize a trade.
export type CustomerWaiting = {
  code: "RECONSENT_REQUIRED" | "SUPPLY_CONFIRMATION_PENDING" | "CONDITION_UNKNOWN"
    | "SIMULATED_SUPPLY_UNAVAILABLE" | "ORDER_WINDOW_CLOSED" | "MINIMUM_OR_PACK_WAIT"
    | "STORE_REVIEW_PENDING" | "ALLOCATION_PENDING";
  checkedAt: number; moq?: number; packSize?: number;
};
// Customer projections omit all three merchant-only fields, not zero them out.
export type RequestDetailLine = Omit<OrderLine, "quantity" | "suppliedQuantity" | "unitCost">
  & Partial<Pick<OrderLine, "quantity" | "suppliedQuantity" | "unitCost">> & { supplied: boolean };
export type RequestDetail = {
  request: PurchaseRequest; actor: Actor; consentValid: boolean; links: RequestOrderLink[];
  lines: RequestDetailLine[]; allocations: Allocation[]; payments: Payment[]; reservation: Reservation | null;
  waiting: CustomerWaiting | null;
};
export type Demand = {
  productId: string; validQuantity: number; outstandingQuantity: number; pooledQuantity: number;
  shortage: number; orderableQuantity: number; reason: string | null;
};
export type View = {
  revision: number; generation: number; now: number; requests: RequestDetail[];
  orders: Order[]; lines: OrderLine[]; reservations: Reservation[]; notifications: Notification[];
  demand: Demand[]; policy: Policy | null;
  searchRuns: SearchRun[]; needs: NeedView[]; recommendationEvents: RecommendationEvent[];
};
