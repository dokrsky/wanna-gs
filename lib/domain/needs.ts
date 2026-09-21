import { identifier, integer, requireRule } from "./policy";
import type { Command, DomainState, NeedRecord, NeedView, SearchRunInput, Viewer } from "./types";

const unique = (values: string[]) => new Set(values).size === values.length;
const text = (value: unknown, max: number) => typeof value === "string" && value.trim().length > 0 && value.length <= max;
const reasons = ["unidentified", "clarification_stopped", "candidates_rejected", "condition_unknown", "not_requestable"];
export function validateSearchRun(run: SearchRunInput, state: DomainState) {
  requireRule(identifier(run.id) && identifier(run.conversationId), "INVALID_SEARCH_RECORD", "검색 실행 식별자를 확인해주세요.");
  const d = run.dialogue;
  requireRule(d && text(d.initialText, 300) && text(d.currentText, 300) && Array.isArray(d.turns) && d.turns.length <= 2 &&
    d.turns.every(t => t && text(t.question, 300) && text(t.answer, 300)) && d.currentText === (d.turns.at(-1)?.answer ?? d.initialText), "INVALID_SEARCH_RECORD", "최초 입력·답변·질문 횟수를 확인해주세요.");
  requireRule(["live", "local", "fixture"].includes(run.mode) && ["success", "error"].includes(run.status) && integer(run.latencyMs) &&
    (run.model === null || text(run.model, 180)) && (run.usage === null || (integer(run.usage.inputTokens) && integer(run.usage.outputTokens))), "INVALID_SEARCH_RECORD", "검색 모드·사용량을 확인해주세요.");
  requireRule(run.mode !== "local" || (run.model === null && run.usage === null), "INVALID_SEARCH_RECORD", "로컬 검색은 모델·사용량이 없습니다.");
  requireRule(run.mode !== "live" || run.status !== "success" || (text(run.model, 180) && run.usage !== null), "INVALID_SEARCH_RECORD", "실제 모델 성공의 모델·사용량이 필요합니다.");
  requireRule(Array.isArray(run.clues) && run.clues.length <= 6 && Array.isArray(run.candidates) && run.candidates.length <= 3 &&
    unique(run.candidates.map(c => c.productId)), "INVALID_SEARCH_RECORD", "검색 단서·후보 수를 확인해주세요.");
  for (const c of run.clues) {
    const r = c.rawSourceRange;
    const source = r?.source === "initial" ? d.initialText : r?.source === "answer1" ? d.turns[0]?.answer : r?.source === "answer2" ? d.turns[1]?.answer : undefined;
    requireRule(["name", "brand", "category", "flavor", "size", "feature"].includes(c.field) && text(c.value, 300) &&
      ["required", "excluded", "preferred"].includes(c.polarity) && ["explicit", "inferred"].includes(c.certainty) &&
      source !== undefined && integer(r.start) && integer(r.end, r.start + 1, source.length), "INVALID_SEARCH_RECORD", "단서와 원문 근거 범위를 확인해주세요.");
  }
  for (const c of run.candidates) requireRule(state.products.some(p => p.id === c.productId) &&
    ["exact", "needs_confirmation", "alternative"].includes(c.kind) && text(c.reason, 600) && Array.isArray(c.catalogEvidence) && c.catalogEvidence.length <= 3 &&
    c.catalogEvidence.every(e => text(e.code, 240) && text(e.value, 300)), "INVALID_SEARCH_RECORD", "존재 상품·후보 분류·근거를 확인해주세요.");
  if (run.status === "error") {
    requireRule(run.action === null && run.question === null && !run.candidates.length && !run.clues.length &&
      typeof run.errorCode === "string" && /^[A-Z][A-Z0-9_]{0,79}$/.test(run.errorCode), "INVALID_SEARCH_RECORD", "운영 오류는 검색 결과·니즈와 분리해주세요.");
  } else {
    requireRule(run.errorCode === null && ["candidates", "clarify", "unidentified", "unsupported"].includes(String(run.action)), "INVALID_SEARCH_RECORD", "검색 결과 상태를 확인해주세요.");
    requireRule(run.action === "clarify" ? text(run.question, 300) && d.turns.length < 2 : run.question === null, "INVALID_SEARCH_RECORD", "추가 질문은 최대 두 번입니다.");
    requireRule(run.action !== "candidates" || run.candidates.length > 0, "INVALID_SEARCH_RECORD", "후보 결과에 존재 상품이 필요합니다.");
    requireRule(!["unidentified", "unsupported"].includes(String(run.action)) || run.candidates.length === 0, "INVALID_SEARCH_RECORD", "미식별·범위 밖 결과에 구매 후보를 넣지 않습니다.");
  }
}

function validNeed(need: NeedRecord, state: DomainState) {
  const run = state.searchRuns.find(r => r.id === need.runId && r.actorId === need.actorId);
  requireRule(run && run.conversationId === need.conversationId && run.status === "success" && run.action !== "unsupported" &&
    reasons.includes(need.reason) && state.stores.some(s => s.id === need.storeId), "INVALID_NEED", "지원 범위의 성공한 검색에서 한 점포에 니즈를 남겨주세요.");
  requireRule(need.reason !== "unidentified" || run.action === "unidentified", "INVALID_NEED", "식별 결과와 사유가 다릅니다.");
  requireRule(need.reason !== "clarification_stopped" || run.action === "clarify", "INVALID_NEED", "추가 설명을 멈춘 검색인지 확인해주세요.");
  requireRule(need.reason !== "candidates_rejected" || run.candidates.length > 0, "INVALID_NEED", "거절한 후보가 없습니다.");
  // Conditions may change later; condition-based evidence is checked at creation, not retroactively.
  return run;
}

export function assertSearchState(state: DomainState) {
  for (const rows of [state.searchRuns, state.needs, state.recommendationEvents]) requireRule(Array.isArray(rows) &&
    unique(rows.map(r => r.id)) && rows.every(r => identifier(r.id) && integer(r.createdAt) && state.actors.some(a => a.id === r.actorId && a.role === "customer")), "INVALID_STATE", "검색 기록의 식별자·고객을 확인해주세요.");
  for (const run of state.searchRuns) validateSearchRun(run, state);
  for (const run of state.searchRuns) requireRule(state.searchRuns.every(other => other.actorId !== run.actorId || other.conversationId !== run.conversationId || other.dialogue.initialText === run.dialogue.initialText), "INVALID_STATE", "같은 대화의 최초 입력은 보존합니다.");
  requireRule(unique(state.needs.map(n => `${n.actorId}/${n.conversationId}`)), "INVALID_STATE", "같은 대화의 니즈는 한 점포에 한 건입니다.");
  for (const need of state.needs) validNeed(need, state);
  for (const event of state.recommendationEvents) {
    const run = state.searchRuns.find(r => r.id === event.runId && r.actorId === event.actorId && r.status === "success");
    requireRule(run?.candidates.some(c => c.productId === event.productId) && ["shown", "selected", "rejected", "requested"].includes(event.action), "INVALID_STATE", "추천 사건의 고객·후보를 확인해주세요.");
    requireRule(event.action === "requested" ? state.requests.some(r => r.id === event.requestId && r.actorId === event.actorId && r.productId === event.productId) : event.requestId === null, "INVALID_STATE", "추천과 실제 구매 요청 연결을 확인해주세요.");
  }
}

// Called before ANY settle/auto/payment/expiry code. Only auxiliary arrays change here.
export function recordSearch(state: DomainState, command: Command, now: number): string {
  requireRule(command.role === "customer" && !command.paymentFailureRequestIds?.length, "FORBIDDEN", "고객 본인의 검색 기록만 남길 수 있습니다.");
  if (command.type === "search.record") {
    validateSearchRun(command.run, state);
    requireRule(!state.searchRuns.some(r => r.id === command.run.id), "SEARCH_RUN_CONFLICT", "이미 기록한 실행입니다. 같은 저장 명령으로 재시도해주세요.");
    requireRule(!state.searchRuns.some(r => r.actorId === command.actorId && r.conversationId === command.run.conversationId && r.dialogue.initialText !== command.run.dialogue.initialText), "SEARCH_CONVERSATION_CONFLICT", "최초 입력은 유지하고 다른 상품은 새 대화에서 찾아주세요.");
    state.searchRuns.push({ ...structuredClone(command.run), actorId: command.actorId, createdAt: now });
    return command.run.id;
  }
  if (command.type === "needs.record") {
    const run = state.searchRuns.find(r => r.id === command.runId && r.actorId === command.actorId);
    requireRule(run && command.confirmed === true && identifier(command.needId), "INVALID_NEED", "검색과 한 점포 등록 확인이 필요합니다.");
    requireRule(!state.needs.some(n => n.id === command.needId || (n.actorId === command.actorId && n.conversationId === run.conversationId)), "NEED_ALREADY_RECORDED", "이 대화의 니즈는 이미 한 점포에 남겼습니다.");
    const need = { id: command.needId, runId: run.id, actorId: command.actorId, conversationId: run.conversationId, storeId: command.storeId, reason: command.reason, createdAt: now };
    validNeed(need, state);
    if (["condition_unknown", "not_requestable"].includes(need.reason)) requireRule(run.candidates.some(candidate => {
      const c = state.conditions.find(c => c.storeId === need.storeId && c.productId === candidate.productId);
      return need.reason === "condition_unknown" ? !c || c.supplyStatus === "unknown" : !!c && !c.requestable && c.supplyStatus !== "unknown";
    }), "INVALID_NEED", "현재 점포의 확인 가능한 조건과 사유가 다릅니다.");
    state.needs.push(need); return need.id;
  }
  requireRule(command.type === "recommendation.record", "INVALID_COMMAND", "지원하지 않는 기록입니다.");
  const run = state.searchRuns.find(r => r.id === command.runId && r.actorId === command.actorId && r.status === "success");
  requireRule(identifier(command.eventId) && run?.candidates.some(c => c.productId === command.productId), "INVALID_RECOMMENDATION", "본인의 검색 후보에서 기록해주세요.");
  requireRule(!state.recommendationEvents.some(e => e.id === command.eventId), "RECOMMENDATION_CONFLICT", "같은 사건의 저장 명령으로 재시도해주세요.");
  requireRule(command.action !== "requested" || state.requests.some(r => r.id === command.requestId && r.actorId === command.actorId && r.storeId === command.storeId && r.productId === command.productId), "INVALID_RECOMMENDATION", "확인·동의해 저장된 본인 요청만 연결합니다.");
  state.recommendationEvents.push({ id: command.eventId, actorId: command.actorId, runId: command.runId, productId: command.productId, action: command.action, requestId: command.requestId, createdAt: now });
  return command.eventId;
}

export function searchView(state: DomainState, viewer: Viewer) {
  const needs: NeedView[] = state.needs.filter(n => viewer.role === "customer" ? n.actorId === viewer.actorId : n.storeId === viewer.storeId).map(need => {
    const run = state.searchRuns.find(r => r.id === need.runId)!;
    // Never forward raw strings or model evidence, including nested strings. Exact trusted values only.
    const safeClues: NeedView["safeClues"] = [];
    for (const clue of run.clues) {
      if (clue.field === "category") {
        const product = state.products.find(p => p.category === clue.value);
        if (product?.category) safeClues.push({ productId: null, attribute: "category", value: product.category, polarity: clue.polarity, certainty: clue.certainty });
      } else if (clue.field === "name") {
        const product = state.products.find(p => p.name === clue.value && run.candidates.some(c => c.productId === p.id));
        if (product) safeClues.push({ productId: product.id, attribute: "name", value: product.name, polarity: clue.polarity, certainty: clue.certainty });
      }
    }
    return { ...need, safeClues, candidates: run.candidates.map(({ productId, kind }) => ({ productId, kind })) };
  });
  return { needs, searchRuns: viewer.role === "customer" ? state.searchRuns.filter(r => r.actorId === viewer.actorId) : [],
    recommendationEvents: viewer.role === "customer" ? state.recommendationEvents.filter(r => r.actorId === viewer.actorId) : [] };
}
