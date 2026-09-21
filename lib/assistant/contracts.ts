// Shared wire contract. Safe to import in the browser; no environment or SDK access.
export const searchStatuses = ["matched", "clarify", "unknown", "unsupported"] as const;
export type SearchStatus = typeof searchStatuses[number];
export type SearchRequest = { text: string; id: string; generation: number };
export type SearchOutput = { candidateIds: string[]; message: string; status: SearchStatus };
export type SearchResponse = SearchOutput & {
  ok: true; id: string; generation: number; mode: "live"; model: string;
  usage: { inputTokens: number; outputTokens: number };
};
export type AssistantStatus = { configured: boolean; mode: "live" | "fixture" | "unconfigured"; model?: string };

export const merchantActions = ["filter", "select", "budget", "clarify", "unsupported"] as const;
export const merchantScopes = ["current_batch", "future_policy"] as const;
export const merchantViews = ["requested", "approved", "all"] as const;
export const merchantSelections = ["keep", "all_pending", "include", "exclude"] as const;
export type MerchantRequest = SearchRequest & { storeId: string; budgetWon: number; selectedProductIds: string[] };
export type MerchantOutput = {
  action: typeof merchantActions[number]; scope: typeof merchantScopes[number];
  view: typeof merchantViews[number]; selection: typeof merchantSelections[number];
  productIds: string[]; budgetWon: number | null; message: string;
};
export type MerchantResponse = Pick<SearchResponse, "ok" | "id" | "generation" | "mode" | "model" | "usage"> & MerchantOutput;

export const errorMessages = {
  INVALID_INPUT: "상품 설명을 1~300자로 입력해주세요. 요청 정보도 확인해주세요.",
  INVALID_MERCHANT_INPUT: "지시문(1~300자)·점포·예산·선택 상품을 확인해주세요.",
  MERCHANT_NOT_APPLICABLE: "추가 확인이 필요하거나 아직 지원하지 않는 변경안이에요. 현재 선택과 예산은 유지해주세요.",
  MERCHANT_SELECTION_UNAVAILABLE: "현재 점포의 신규 요청과 선택 상품을 다시 확인해주세요. 변경안은 적용하지 않았어요.",
  INVALID_JSON: "요청 형식을 읽지 못했어요. 다시 시도해주세요.",
  JSON_REQUIRED: "JSON 형식으로 요청해주세요.",
  BODY_TOO_LARGE: "요청 본문이 이 기능의 허용 크기를 넘었어요. 입력을 줄여주세요.",
  BODY_TIMEOUT: "요청을 받는 시간이 초과됐어요. 다시 시도해주세요.",
  ORIGIN_REJECTED: "현재 화면에서 다시 검색해주세요.",
  ASSISTANT_DISABLED: "이 환경에서는 실제 AI 검색이 활성화되지 않았어요.",
  MODEL_NOT_CONFIGURED: "서버의 AI 검색 설정을 확인해야 해요.",
  RATE_LIMITED: "검색 요청이 많아요. 잠시 후 다시 시도해주세요.",
  MODEL_TIMEOUT: "AI 응답 시간이 초과됐어요. 잠시 후 다시 시도해주세요.",
  MODEL_CANCELLED: "검색 요청이 취소됐어요.",
  MODEL_NETWORK: "AI 연결에 실패했어요. 잠시 후 다시 시도해주세요.",
  MODEL_QUOTA: "AI 사용 한도를 확인해야 해요. 지금은 검색할 수 없어요.",
  MODEL_RATE_LIMIT: "AI 서비스 요청이 많아요. 잠시 후 다시 시도해주세요.",
  MODEL_AUTH: "AI 서버 인증 설정을 확인해야 해요.",
  MODEL_PERMISSION: "AI 서버의 모델 사용 권한을 확인해야 해요.",
  MODEL_UNAVAILABLE: "설정된 AI 모델을 사용할 수 없어요.",
  MODEL_REFUSAL: "AI가 이 검색에 답변하지 못했어요. 상품 설명을 바꿔주세요.",
  MODEL_INCOMPLETE: "AI 검색 응답이 완성되지 않았어요. 다시 시도해주세요.",
  MODEL_MALFORMED: "AI 검색 응답을 확인하지 못했어요. 다시 시도해주세요.",
  MODEL_UPSTREAM: "AI 검색 서비스에 오류가 있어요. 잠시 후 다시 시도해주세요.",
  INTERNAL_ERROR: "검색을 완료하지 못했어요. 다시 시도해주세요.",
} as const;
export type AssistantErrorCode = keyof typeof errorMessages;
export type SearchFailure = { ok: false; error: { code: AssistantErrorCode; message: string } };

export class AssistantError extends Error {
  code: AssistantErrorCode;
  httpStatus: number;
  constructor(code: AssistantErrorCode, httpStatus = 400) {
    super(errorMessages[code]);
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function exactKeys(value: Record<string, unknown>, keys: string[]) {
  return Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}

export function parseSearchRequest(value: unknown): SearchRequest {
  if (!isObject(value) || !exactKeys(value, ["text", "id", "generation"]) ||
      typeof value.text !== "string" || !value.text.trim() || value.text.length > 300 ||
      typeof value.id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(value.id) ||
      !Number.isSafeInteger(value.generation) || Number(value.generation) < 0) {
    throw new AssistantError("INVALID_INPUT");
  }
  // No keyword/language filter: every nonempty bounded query reaches the model.
  return { text: value.text, id: value.id, generation: value.generation as number };
}

export function searchOutputSchema(allowedIds: readonly string[]) {
  return {
    type: "object",
    properties: {
      candidateIds: { type: "array", items: { type: "string", enum: [...allowedIds] }, maxItems: 3 },
      message: { type: "string", minLength: 1, maxLength: 300 },
      status: { type: "string", enum: [...searchStatuses] },
    },
    required: ["candidateIds", "message", "status"], additionalProperties: false,
  };
}

export function parseSearchOutput(value: unknown, allowedIds: readonly string[]): SearchOutput {
  if (!isObject(value) || !exactKeys(value, ["candidateIds", "message", "status"]) ||
      !Array.isArray(value.candidateIds) || value.candidateIds.length > 3 ||
      !value.candidateIds.every(id => typeof id === "string" && allowedIds.includes(id)) ||
      new Set(value.candidateIds).size !== value.candidateIds.length ||
      typeof value.message !== "string" || !value.message.trim() || value.message.length > 300 ||
      !searchStatuses.includes(value.status as SearchStatus) ||
      (value.status === "matched" && value.candidateIds.length === 0) ||
      (["unknown", "unsupported"].includes(String(value.status)) && value.candidateIds.length !== 0)) {
    throw new AssistantError("MODEL_MALFORMED", 502);
  }
  return { candidateIds: value.candidateIds, message: value.message.trim(), status: value.status as SearchStatus };
}

// Shared Responses envelope parsing; never expose the raw response/refusal.
export function parseStructuredResponse(response: unknown, maxTextChars = 4096) {
  if (!isObject(response) || !Array.isArray(response.output)) throw new AssistantError("MODEL_MALFORMED", 502);
  if (response.output.some(item => isObject(item) && item.type === "message" && Array.isArray(item.content) && item.content.some(part => isObject(part) && part.type === "refusal"))) {
    throw new AssistantError("MODEL_REFUSAL", 422);
  }
  if (response.status === "incomplete") throw new AssistantError("MODEL_INCOMPLETE", 502);
  if (response.status !== "completed") throw new AssistantError("MODEL_UPSTREAM", 502);
  if (typeof response.output_text !== "string" || response.output_text.length > maxTextChars) throw new AssistantError("MODEL_MALFORMED", 502);
  let value: unknown;
  try { value = JSON.parse(response.output_text); }
  catch { throw new AssistantError("MODEL_MALFORMED", 502); }
  if (!isObject(response.usage) || ![response.usage.input_tokens, response.usage.output_tokens].every(n => Number.isSafeInteger(n) && Number(n) >= 0)) {
    throw new AssistantError("MODEL_MALFORMED", 502);
  }
  return { value, usage: { inputTokens: response.usage.input_tokens as number, outputTokens: response.usage.output_tokens as number } };
}

export function parseModelResponse(response: unknown, allowedIds: readonly string[]) {
  const parsed = parseStructuredResponse(response);
  return { ...parseSearchOutput(parsed.value, allowedIds), usage: parsed.usage };
}

const validBudget = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 1_000_000_000;
function validProductIds(value: unknown, allowedIds: readonly string[]): value is string[] {
  return Array.isArray(value) && value.length <= 20 && new Set(value).size === value.length &&
    value.every(id => typeof id === "string" && allowedIds.includes(id));
}

export function parseMerchantRequest(value: unknown, allowedIds: readonly string[], allowedStores: readonly string[]): MerchantRequest {
  if (!isObject(value) || !exactKeys(value, ["text", "id", "generation", "storeId", "budgetWon", "selectedProductIds"]) ||
      typeof value.storeId !== "string" || !allowedStores.includes(value.storeId) ||
      !validBudget(value.budgetWon) || !validProductIds(value.selectedProductIds, allowedIds)) {
    throw new AssistantError("INVALID_MERCHANT_INPUT");
  }
  let common: SearchRequest;
  try { common = parseSearchRequest({ text: value.text, id: value.id, generation: value.generation }); }
  catch { throw new AssistantError("INVALID_MERCHANT_INPUT"); }
  return { ...common, storeId: value.storeId, budgetWon: value.budgetWon, selectedProductIds: [...value.selectedProductIds] };
}

export function merchantOutputSchema(allowedIds: readonly string[]) {
  return {
    type: "object",
    properties: {
      action: { type: "string", enum: [...merchantActions] },
      scope: { type: "string", enum: [...merchantScopes] },
      view: { type: "string", enum: [...merchantViews] },
      selection: { type: "string", enum: [...merchantSelections] },
      productIds: { type: "array", items: { type: "string", enum: [...allowedIds] }, maxItems: 20 },
      budgetWon: { type: ["integer", "null"], minimum: 0, maximum: 1_000_000_000 },
      message: { type: "string", minLength: 1, maxLength: 300 },
    },
    required: ["action", "scope", "view", "selection", "productIds", "budgetWon", "message"], additionalProperties: false,
  };
}

export function parseMerchantOutput(value: unknown, allowedIds: readonly string[]): MerchantOutput {
  if (!isObject(value) || !exactKeys(value, ["action", "scope", "view", "selection", "productIds", "budgetWon", "message"]) ||
      !merchantActions.includes(value.action as MerchantOutput["action"]) || !merchantScopes.includes(value.scope as MerchantOutput["scope"]) ||
      !merchantViews.includes(value.view as MerchantOutput["view"]) || !merchantSelections.includes(value.selection as MerchantOutput["selection"]) ||
      !validProductIds(value.productIds, allowedIds) || (value.budgetWon !== null && !validBudget(value.budgetWon)) ||
      typeof value.message !== "string" || !value.message.trim() || value.message.length > 300) {
    throw new AssistantError("MODEL_MALFORMED", 502);
  }
  const output = value as MerchantOutput;
  const hasIds = output.productIds.length > 0;
  const selectionChanges = output.selection !== "keep";
  // Inert proposals must not smuggle state changes. Future policy is not connected.
  if ((output.scope === "future_policy" && output.action !== "unsupported") ||
      (["clarify", "unsupported"].includes(output.action) && (selectionChanges || hasIds || output.budgetWon !== null)) ||
      (output.action === "filter" && (selectionChanges || hasIds || output.budgetWon !== null)) ||
      (output.action === "budget" && (selectionChanges || hasIds || output.budgetWon === null)) ||
      (output.action === "select" && !selectionChanges) ||
      (["keep", "all_pending"].includes(output.selection) && hasIds) ||
      (output.selection === "exclude" && !hasIds)) {
    throw new AssistantError("MODEL_MALFORMED", 502);
  }
  // include [] deliberately represents an explicit "clear my selection" proposal.
  return { ...output, productIds: [...output.productIds], message: output.message.trim() };
}

// Client-side preview helper, not an order/policy executor. Call only after checking
// response id/generation AND that store/budget/selection still match the sent input.
// pendingProductIds comes from current local requested rows in that same store.
// keep preserves; all_pending replaces; include replaces with the explicit IDs;
// exclude uses the existing nonempty selection, otherwise all pending IDs.
export function resolveMerchantProposal(input: MerchantRequest, value: MerchantOutput, pendingProductIds: readonly string[], allowedIds: readonly string[]) {
  const output = parseMerchantOutput(value, allowedIds);
  if (output.scope !== "current_batch" || output.action === "clarify" || output.action === "unsupported") {
    throw new AssistantError("MERCHANT_NOT_APPLICABLE", 409);
  }
  if (!validBudget(input.budgetWon) || !validProductIds(input.selectedProductIds, allowedIds) || !validProductIds(pendingProductIds, allowedIds)) {
    throw new AssistantError("MERCHANT_SELECTION_UNAVAILABLE", 409);
  }
  const pending = new Set(pendingProductIds);
  if (input.selectedProductIds.some(id => !pending.has(id)) || (output.selection === "include" && output.productIds.some(id => !pending.has(id)))) {
    throw new AssistantError("MERCHANT_SELECTION_UNAVAILABLE", 409);
  }
  const removed = new Set(output.productIds);
  const selectedProductIds = output.selection === "all_pending" ? [...pendingProductIds]
    : output.selection === "include" ? [...output.productIds]
    : output.selection === "exclude" ? (input.selectedProductIds.length ? input.selectedProductIds : pendingProductIds).filter(id => !removed.has(id))
    : [...input.selectedProductIds];
  if (!validProductIds(selectedProductIds, allowedIds) || selectedProductIds.some(id => !pending.has(id))) {
    throw new AssistantError("MERCHANT_SELECTION_UNAVAILABLE", 409);
  }
  return { view: output.view, selectedProductIds, budgetWon: output.budgetWon ?? input.budgetWon };
}
