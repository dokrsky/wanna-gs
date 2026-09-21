"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { previewAvailability, previewProducts, previewStores, won, type PreviewDraft, type PreviewRequest } from "../demo-preview";
import { AssistantError, errorMessages, isObject, parseSearchOutput, type AssistantErrorCode, type AssistantStatus, type SearchOutput, type SearchResponse } from "../../lib/assistant/contracts";
import styles from "./customer-workspace.module.css";
import StoreMap from "./store-map";
import { catalogEvidenceFor, parseDialogueRequest, parseDialogueResponse, type DialogueRequest, type DialogueResponse } from "../../lib/assistant/dialogue-contracts";
import type { NeedReason, NeedRecordCommand, RecommendationRecordCommand, SearchRecordCommand, SearchRunInput } from "../../lib/domain/types";

export type CustomerActivity = {
  contextKey: string;
  onRecord: (payload: SearchRecordCommand | NeedRecordCommand | RecommendationRecordCommand, targetStoreId?: string) => Promise<boolean>;
  historyContent?: ReactNode;
};
type PendingRecord = { key: string; payload: SearchRecordCommand | NeedRecordCommand | RecommendationRecordCommand; targetStoreId?: string; label: string };
type Conversation = DialogueRequest["dialogue"] & { question: string | null; questionCount: number; finished: boolean };

type RequestCondition = { storeId: string; productId: string; requestable: boolean; unitPrice: number; version?: string; supplyStatus?: string };
type Props = {
  requests: PreviewRequest[]; onRequest: (draft: PreviewDraft) => Promise<boolean>; busy: boolean;
  conditions?: RequestCondition[]; requestContent?: ReactNode; pickupContent?: ReactNode; consentDurationDays?: number;
  activity?: CustomerActivity;
};
type Tab = "want" | "requests" | "pickup";
type SearchMode = "live" | "local";
type SearchResult = SearchOutput & { mode: SearchMode; model?: string; usage?: SearchResponse["usage"]; dialogue?: DialogueResponse["dialogue"]; run?: SearchRunInput };
// DATA-02 RP-007/017, public-dev families PD-RP-F02/F06; examples fill input only.
const examples = ["딸기랑 크림이 들어간 샌드위치 찾아줘", "라라스윗 그릭 복숭아 쫀득바 찾아줘", "유어스로얄밀크티가 궁금해"];
const normalize = (value: string) => value.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
const allowedIds = previewProducts.map(product => product.id);
const requestStores = previewStores.filter(store => store.identityOrigin === "reference_verified");
const provenanceLabels: Record<string, string> = {
  reference_verified: "출처 확인 · reference_verified",
  reference_unverified: "출처 미검증 · reference_unverified",
  synthetic_product: "합성 상품 · synthetic_product",
};
const canRequestAt = (row: RequestCondition | undefined) => row?.requestable === true
  && Number.isSafeInteger(row.unitPrice) && row.unitPrice >= 0;
const resultTitles = { matched: "찾으시는 상품이 맞나요?", clarify: "어떤 상품인지 조금 더 알려주세요", unknown: "아직 상품을 식별하지 못했어요", unsupported: "이 검색에서는 처리할 수 없어요" };

function NavIcon({ tab }: { tab: Tab }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {tab === "want" ? <><path d="m3 10 9-7 9 7v10H3Z" /><path d="M9 20v-7h6v7" /></> : tab === "requests" ? <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h3" /></> : <><path d="M4 8h16v13H4ZM3 8l2-5h14l2 5M9 12h6" /><path d="M12 3v5" /></>}
  </svg>;
}

export default function CustomerWorkspace(props: Props) {
  return <CustomerPanel key={props.activity?.contextKey ?? "legacy"} {...props} />;
}

function CustomerPanel({ requests, onRequest, busy, conditions = previewAvailability, requestContent, pickupContent, consentDurationDays, activity }: Props) {
  const [tab, setTab] = useState<Tab>("want");
  const [input, setInput] = useState("");
  const [undo, setUndo] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<SearchMode>("live");
  const [assistantStatus, setAssistantStatus] = useState<AssistantStatus | null>(null);
  const [statusAttempt, setStatusAttempt] = useState(0);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [productId, setProductId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [storeId, setStoreId] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const confirmationRef = useRef<HTMLHeadingElement>(null);
  const draftRef = useRef<PreviewDraft | null>(null);
  const submitting = useRef(false);
  const submitted = useRef(false);
  const searchController = useRef<AbortController | null>(null);
  const requestSequence = useRef(0);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [rejected, setRejected] = useState<string[]>([]);
  const [needStoreId, setNeedStoreId] = useState("");
  const [needReason, setNeedReason] = useState<NeedReason>("unidentified");
  const [recording, setRecording] = useState(false);
  const [recordError, setRecordError] = useState("");
  const [pendingRecords, setPendingRecords] = useState<PendingRecord[]>([]);
  const [savedKeys, setSavedKeys] = useState<string[]>([]);
  const queue = useRef<PendingRecord[]>([]);
  const saved = useRef(new Set<string>());
  const recordLock = useRef(false);
  const recordFailed = useRef(false);
  const needDrafts = useRef(new Map<string, PendingRecord>());
  const mounted = useRef(false);
  const activityRef = useRef(activity);
  activityRef.current = activity;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  async function flushRecords(retry = false) {
    if (!activity || busy || recordLock.current || !mounted.current || (recordFailed.current && !retry)) return;
    recordFailed.current = false; recordLock.current = true; setRecording(true); setRecordError("");
    try {
      while (queue.current.length && mounted.current) {
        const item = queue.current[0];
        let ok = false;
        try { ok = await activityRef.current!.onRecord(item.payload, item.targetStoreId); } catch { /* Keep this exact command for a storage-only retry. */ }
        if (!mounted.current) return;
        if (!ok) {
          recordFailed.current = true;
          setRecordError(`${item.label} 저장을 확인하지 못했어요. 검색 결과·구매 결과는 바꾸지 않았어요.`);
          return;
        }
        saved.current.add(item.key); setSavedKeys([...saved.current]);
        queue.current.shift(); setPendingRecords([...queue.current]);
      }
    } finally { recordLock.current = false; if (mounted.current) setRecording(false); }
  }
  function enqueue(items: PendingRecord[]) {
    if (!activity || !mounted.current) return;
    for (const item of items) if (!saved.current.has(item.key) && !queue.current.some(row => row.key === item.key)) queue.current.push(item);
    setPendingRecords([...queue.current]);
    void flushRecords();
  }
  useEffect(() => { if (!busy && queue.current.length && !recordFailed.current) void flushRecords(); }, [busy]);
  function recommendation(run: SearchRunInput, id: string, action: RecommendationRecordCommand["action"], requestId: string | null = null, targetStoreId?: string): PendingRecord {
    const eventId = crypto.randomUUID();
    return { key: eventId, label: action === "requested" ? "구매 요청 연결 이력 (구매 요청은 이미 저장됨)" : "후보 행동 이력", targetStoreId,
      payload: { type: "recommendation.record", eventId, runId: run.id, productId: id, action, requestId } };
  }
  function recordRun(run: SearchRunInput) {
    enqueue([{ key: run.id, label: run.status === "error" ? "검색 오류 이력" : "검색 이력", payload: { type: "search.record", run } },
      ...run.candidates.map(candidate => recommendation(run, candidate.productId, "shown"))]);
  }

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 10_000);
    setStatusLoading(true);
    setStatusError("");
    setAssistantStatus(null);
    async function loadStatus() {
      try {
        const response = await fetch("/api/assistant/status", { signal: controller.signal, cache: "no-store" });
        const data: unknown = await response.json();
        if (!response.ok || !isObject(data) || typeof data.configured !== "boolean"
          || !["live", "fixture", "unconfigured"].includes(String(data.mode))
          || (data.model !== undefined && (typeof data.model !== "string" || data.model.length > 120))) {
          throw new Error("Invalid assistant status");
        }
        if (active && !controller.signal.aborted) setAssistantStatus(data as AssistantStatus);
      } catch {
        if (active) setStatusError("AI 설정을 확인하지 못했어요. 입력은 유지되니 설정 확인을 다시 시도해 주세요.");
      } finally {
        clearTimeout(timeout);
        if (active) setStatusLoading(false);
      }
    }
    void loadStatus();
    return () => { active = false; controller.abort(); clearTimeout(timeout); };
  }, [statusAttempt]);

  useEffect(() => () => {
    requestSequence.current += 1;
    searchController.current?.abort();
  }, []);

  const mine = requests.filter(request => request.actor === "나");
  const selected = previewProducts.find(product => product.id === productId);
  const store = requestStores.find(item => item.id === storeId);
  const availability = conditions.find(row => row.productId === productId && row.storeId === storeId);
  const unitPrice = store && canRequestAt(availability) ? availability!.unitPrice : null;
  const consentCondition = `${productId}/${storeId}/${availability?.version}/${unitPrice}/${availability?.requestable}`;
  useEffect(() => {
    setConsent(false);
    draftRef.current = null;
    submitted.current = false;
  }, [consentCondition]);
  const count = Number(quantity);
  const validQuantity = Number.isInteger(count) && count >= 1 && count <= 20;
  const aiReady = assistantStatus?.configured === true && assistantStatus.mode === "live";
  const candidates = result?.candidateIds.flatMap(id => {
    const product = previewProducts.find(item => item.id === id);
    return product ? [product] : [];
  }) ?? [];

  function cancelSearch() {
    requestSequence.current += 1;
    searchController.current?.abort();
    searchController.current = null;
    setSearching(false);
  }

  function clearConfirmation() {
    setConsent(false);
    setError("");
    draftRef.current = null;
    submitted.current = false;
  }

  function editInput(value: string) {
    cancelSearch();
    setInput(value);
    setResult(null);
    setSearchError("");
    setProductId(null);
    setNotice("");
    clearConfirmation();
  }

  function newSearch(value = "") {
    editInput(value); setConversation(null); setRejected([]); setNeedStoreId(""); setNeedReason("unidentified");
  }

  function switchSearchMode() {
    newSearch(input);
    setSearchMode(current => current === "live" ? "local" : "live");
  }

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || submitting.current || searchController.current) return;
    setSearchError("");
    if (!input.trim()) {
      setSearchError("찾고 싶은 상품 이름이나 특징을 적어주세요.");
      inputRef.current?.focus();
      return;
    }
    if (activity && conversation?.finished) {
      setSearchError("이 대화의 상품 확인은 마쳤어요. 다른 설명으로 찾으려면 ‘새 상품 찾기’를 눌러주세요.");
      return;
    }
    if (activity && conversation && !conversation.question && input.trim() !== conversation.initialText) {
      setSearchError("이 대화의 최초 입력은 보존해요. 첫 설명을 바꾸려면 ‘새 상품 찾기’를 눌러주세요. 현재 입력은 유지했어요.");
      return;
    }
    cancelSearch();
    clearConfirmation();
    setProductId(null);
    setResult(null);
    setNotice("");
    const text = input.trim();
    const base: Conversation = conversation ?? { conversationId: crypto.randomUUID(), initialText: text, turns: [], question: null, questionCount: 0, finished: false };
    const turns = base.question ? [...base.turns, { question: base.question, answer: text }] : base.turns;
    const id = crypto.randomUUID();
    const generation = ++requestSequence.current;
    const started = performance.now();
    let dialogueInput: DialogueRequest | null = null;
    try {
      if (activity) dialogueInput = parseDialogueRequest({ text, id, generation, dialogue: { conversationId: base.conversationId, initialText: base.initialText, turns } });
    } catch (caught) {
      setSearchError(caught instanceof AssistantError ? caught.message : "대화 입력을 확인하지 못했어요. 입력을 확인하거나 새 상품 찾기를 시작해주세요.");
      return;
    }
    if (activity) setConversation(base);
    const makeRun = (output: SearchResult | null, errorCode: string | null): SearchRunInput => ({
      id, conversationId: base.conversationId,
      dialogue: { initialText: base.initialText, currentText: text, turns },
      mode: searchMode, model: output?.model ?? null, usage: output?.usage ?? null,
      status: output ? "success" : "error", action: !output ? null : output.status === "matched" ? "candidates" : output.status === "unknown" ? "unidentified" : output.status,
      question: output?.dialogue?.question ?? null, clues: output?.dialogue?.clues ?? [],
      candidates: output?.dialogue?.candidates ?? [], latencyMs: Math.max(0, Math.round(performance.now() - started)), errorCode,
    });
    function accept(output: SearchResult) {
      const run = activity ? makeRun(output, null) : undefined;
      setResult({ ...output, run }); setRejected([]); setNeedReason(output.status === "clarify" ? "clarification_stopped" : output.status === "unknown" ? "unidentified" : "candidates_rejected");
      if (activity) {
        setConversation({ ...base, turns, question: output.dialogue?.question ?? null, questionCount: base.questionCount + (output.status === "clarify" ? 1 : 0), finished: output.status !== "clarify" });
        if (output.status === "clarify") setInput("");
        recordRun(run!);
      }
    }
    if (searchMode === "local") {
      // ponytail: 명시적으로 선택한 예시 모드에서만 키워드 검색. AI 실패의 fallback이 아니다.
      const ids = previewProducts
        .map(product => ({ product, score: [product.name, ...product.aliases].filter(term => normalize(text).includes(normalize(term))).length }))
        .filter(item => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 3).map(item => item.product.id);
      accept({ mode: "local", candidateIds: ids, status: ids.length ? "matched" : "unknown",
        ...(activity ? { dialogue: { conversationId: base.conversationId, question: null, clues: [], candidates: ids.map(productId => ({ productId, kind: "needs_confirmation" as const, reason: "로컬 이름·별칭 일치 후보예요. 조건과 상품을 직접 확인해주세요.", catalogEvidence: catalogEvidenceFor(previewProducts.find(product => product.id === productId)!).slice(0, 1) })) } } : {}),
        message: ids.length ? `데모 카탈로그의 이름·별칭이 겹치는 후보 ${ids.length}개예요. 맛과 용량을 직접 확인해주세요.` : "로컬 예시 목록에서 일치하는 이름·별칭이 없어요. 실제 상품의 판매 여부를 뜻하지 않아요." });
      return;
    }
    if (!aiReady || statusLoading) {
      setSearchError("실제 AI 검색 설정을 먼저 확인해 주세요. 로컬 검색으로 자동 전환하지 않아요.");
      return;
    }
    const controller = new AbortController();
    searchController.current = controller;
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 45_000);
    setSearching(true);
    try {
      const body = JSON.stringify(dialogueInput ?? { text, id, generation });
      if (activity && new TextEncoder().encode(body).byteLength > 8192) {
        setSearchError("대화 요청은 UTF-8 8KiB 이하여야 해요. 내용을 자동으로 잘라 보내지 않았어요.");
        return;
      }
      const response = await fetch("/api/assistant/search", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
        body,
      });
      const data: unknown = await response.json().catch(() => { throw new AssistantError("MODEL_MALFORMED"); });
      if (requestSequence.current !== generation) return;
      if (timedOut) throw new AssistantError("MODEL_TIMEOUT");
      if (controller.signal.aborted) return;
      if (!response.ok || !isObject(data) || data.ok !== true) {
        const code = isObject(data) && isObject(data.error) ? data.error.code : undefined;
        throw new AssistantError(typeof code === "string" && Object.hasOwn(errorMessages, code)
          ? code as AssistantErrorCode : response.status === 429 ? "RATE_LIMITED" : "MODEL_UPSTREAM");
      }
      if (data.id !== id || data.generation !== generation || data.mode !== "live"
        || typeof data.model !== "string" || !data.model.trim() || data.model.length > 120
        || !isObject(data.usage) || ![data.usage.inputTokens, data.usage.outputTokens].every(value => Number.isSafeInteger(value) && Number(value) >= 0)) {
        throw new AssistantError("MODEL_MALFORMED");
      }
      if (dialogueInput) {
        const output = parseDialogueResponse(data, dialogueInput, previewProducts);
        accept({ ...output, mode: "live" });
      } else {
        const output = parseSearchOutput({ candidateIds: data.candidateIds, message: data.message, status: data.status }, allowedIds);
        accept({ ...output, mode: "live", model: data.model, usage: { inputTokens: data.usage.inputTokens as number, outputTokens: data.usage.outputTokens as number } });
      }
    } catch (caught) {
      if (requestSequence.current !== generation) return;
      setSearchError(timedOut ? errorMessages.MODEL_TIMEOUT : caught instanceof AssistantError ? caught.message : errorMessages.MODEL_NETWORK);
      if (activity) recordRun(makeRun(null, timedOut ? "MODEL_TIMEOUT" : caught instanceof AssistantError ? caught.code : "MODEL_NETWORK"));
    } finally {
      clearTimeout(timeout);
      if (requestSequence.current === generation) {
        searchController.current = null;
        setSearching(false);
      }
    }
  }

  async function request(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || submitting.current || submitted.current) return;
    setNotice("");
    if (!selected || !store || !validQuantity || !consent) {
      setError("상품·1~20개 수량·점포와 자동 구매 동의를 확인해주세요.");
      return;
    }
    if (unitPrice === null) {
      setError("이 점포의 요청 가능 조건과 모의 가격을 확인할 수 없어요. 입력은 유지했으니 요청 가능한 다른 점포를 선택해주세요.");
      return;
    }
    submitting.current = true;
    setError("");
    try {
      // Keep the same command ID when a failed callback is retried.
      const draft = draftRef.current ?? { id: crypto.randomUUID(), productId: selected.id, storeId, quantity: count, unitPrice, consent };
      draftRef.current = draft;
      if (!await onRequest(draft)) {
        setError("요청을 저장하지 못했어요. 입력과 선택은 유지했으니 내 요청과 입력 조건을 확인한 뒤 다시 시도해주세요.");
        return;
      }
      submitted.current = true;
      setError("");
      setNotice(`${selected.name} ${count}개 요청 결과를 이 브라우저에 저장했어요. ${consentDurationDays ? "아래에서 현재 처리 상태를 확인해주세요." : "아직 물량 확보 전이에요."}`);
      setTab("requests");
      setProductId(null);
      setConsent(false);
      if (activity && result?.run) enqueue([recommendation(result.run, draft.productId, "requested", draft.id, draft.storeId)]);
    } catch {
      if (submitted.current) { setRecordError("구매 요청은 저장됐지만 후속 이력 연결을 확인하지 못했어요. 다시 구매하지 말고 내 요청을 확인해주세요."); return; }
      setError("요청을 저장하지 못했어요. 입력과 선택은 유지했으니 내 요청을 확인한 뒤 다시 시도해주세요.");
    } finally { submitting.current = false; }
  }

  function navigate(next: Tab) {
    setTab(next);
    setError("");
  }

  function selectCandidate(id: string) {
    if (busy) return;
    if (result?.run && productId !== id) enqueue([recommendation(result.run, id, "selected")]);
    clearConfirmation(); setProductId(id); setQuantity("1"); setStoreId("");
    setTimeout(() => confirmationRef.current?.focus(), 0);
  }
  function rejectCandidate(id: string) {
    if (busy || rejected.includes(id) || !result?.run) return;
    enqueue([recommendation(result.run, id, "rejected")]); setRejected(current => [...current, id]); setNeedReason("candidates_rejected");
    if (productId === id) { setProductId(null); clearConfirmation(); }
  }
  const needRun = result?.run;
  const fixedNeed = needRun ? needDrafts.current.get(needRun.conversationId) : undefined;
  const canLeaveNeed = needRun?.status === "success" && needRun.action !== "unsupported";
  const reasonOptions: { value: NeedReason; label: string }[] = needRun ? [
    ...(needRun.action === "unidentified" ? [{ value: "unidentified" as const, label: "상품을 식별하지 못함" }] : []),
    ...(needRun.action === "clarify" ? [{ value: "clarification_stopped" as const, label: "추가 설명을 여기서 멈춤" }] : []),
    ...(rejected.length ? [{ value: "candidates_rejected" as const, label: "제안된 후보가 원하는 상품이 아님" }] : []),
    ...(needRun.candidates.some(candidate => { const row = conditions.find(row => row.storeId === needStoreId && row.productId === candidate.productId); return !row || row.supplyStatus === "unknown"; }) ? [{ value: "condition_unknown" as const, label: "이 점포의 상품 조건을 확인하지 못함" }] : []),
    ...(needRun.candidates.some(candidate => conditions.some(row => row.storeId === needStoreId && row.productId === candidate.productId && !row.requestable && row.supplyStatus !== "unknown")) ? [{ value: "not_requestable" as const, label: "이 점포의 모의 조건에서 요청 불가" }] : []),
  ] : [];
  function leaveNeed() {
    if (!needRun || !canLeaveNeed || busy || fixedNeed || !requestStores.some(store => store.id === needStoreId) || !reasonOptions.some(reason => reason.value === needReason)) return;
    const needId = crypto.randomUUID();
    const item: PendingRecord = { key: needId, label: "니즈", targetStoreId: needStoreId, payload: { type: "needs.record", needId, runId: needRun.id, reason: needReason, confirmed: true } };
    needDrafts.current.set(needRun.conversationId, item); enqueue([item]);
  }

  return <div className={styles.workspace} aria-busy={busy || searching}>
    <header className={styles.hero}>
      <div className={styles.heroTop}><span className={styles.brand}>원하GS <span>· 고객</span></span><span className={styles.previewBadge}>화면 미리보기</span></div>
      <p className={styles.pronunciation}>‘원하지쓰’라고 읽어요.</p>
      <div className={styles.heroTitle}>
        <div><h1>{tab === "want" ? <>없으면 말하<span>GS</span></> : tab === "requests" ? <>내가 원한 것,<br /><span>여기 모아뒀어요.</span></> : <>준비되면,<br /><span>픽업하러 와요.</span></>}</h1>
          <p>{tab === "want" ? "찾는 상품의 이름이나 특징을 알려주세요." : tab === "requests" ? "내 요청의 현재 상태를 확인해보세요." : "입고 후 픽업 알림을 받은 상품을 확인하는 곳이에요."}</p>
        </div>
        <span className={styles.mascot} aria-hidden="true">🦊<span>말해봐요!</span></span>
      </div>
    </header>

    {notice && <p className={styles.success} role="status">{notice}</p>}
    {activity && (pendingRecords.length > 0 || recordError) && <section className={styles.modelReply} aria-label="검색 활동 기록 저장">
      <strong>{recording ? "검색 활동 기록 저장 중…" : "저장을 기다리는 기록이 있어요"}</strong>
      <p className={styles.small}>대기 {pendingRecords.length}건 · 검색·후보·니즈 이력은 구매 요청과 별개예요. 새 검색으로 대기 기록을 지우지 않아요.</p>
      {recordError && <p className={styles.error} role="alert">{recordError}</p>}
      <button type="button" className={styles.secondary} disabled={busy || recording || !pendingRecords.length} onClick={() => void flushRecords(true)}>같은 기록 저장만 재시도 · AI 재호출 없음</button>
      <p className={styles.small}>미저장 기록은 이 화면을 떠나거나 새로고침하면 사라질 수 있어요. 구매 요청 성공은 이력 저장 실패로 취소되거나 재구매되지 않아요.</p>
    </section>}

    {tab === "want" && <>
      <section className={styles.card} aria-labelledby="customer-input-title">
        <div className={styles.sectionLine}>
          <h2 id="customer-input-title">원하는 상품 찾기</h2>
          <span className={styles.resultMode}>{searchMode === "local" ? "로컬 예시 검색 · AI 아님" : "실제 AI 검색"}</span>
        </div>
        {activity && conversation?.question && <p className={styles.dialogueQuestion} role="status"><strong>추가 질문 {conversation.questionCount}/2</strong><br />{conversation.question}</p>}
        <form onSubmit={search}>
          <label className={styles.fieldLabel} htmlFor="customer-query">{activity && conversation?.question ? "위 질문에 대한 답변" : "상품 이름이나 특징"}</label>
          <textarea ref={inputRef} id="customer-query" data-testid="customer-query" value={input} disabled={busy} maxLength={300} rows={3} onChange={event => { setUndo(null); editInput(event.target.value); }} onKeyDown={event => { if (event.key === "Enter" && event.nativeEvent.isComposing) event.stopPropagation(); }} placeholder="예: 딸기랑 크림이 들어간 샌드위치 찾아줘" aria-describedby="customer-search-note" />
          <p id="customer-search-note" className={styles.small}>{searchMode === "live" ? "입력한 설명을 AI가 데모 카탈로그와 비교해요. 후보를 확인하기 전에는 요청이나 구매가 실행되지 않아요." : "카탈로그 상품명·별칭을 찾는 로컬 검색이에요. 문장 전체를 이해하는 AI 검색이 아니에요."}</p>
          <button type="submit" className={styles.primary} data-testid="customer-search" disabled={busy || searching || Boolean(activity && conversation?.finished) || (searchMode === "live" && (!aiReady || statusLoading))}>{searching ? "AI가 상품을 찾고 있어요…" : activity && conversation?.finished ? "후보를 확인하거나 새 상품 찾기를 눌러주세요" : searchMode === "live" ? conversation?.question ? "이 답변으로 AI 상품 찾기" : "AI로 상품 찾기" : "로컬 예시 상품 찾기"} <span aria-hidden="true">→</span></button>
          {searching && <div className={styles.sectionLine}><p className={styles.small} role="status">검색 중이에요. 입력을 바꾸면 이전 검색은 취소돼요.</p><button type="button" className={styles.textButton} onClick={cancelSearch}>검색 취소</button></div>}
          {searchError && <p className={styles.error} role="alert">{searchError} 입력은 그대로 남아 있어요.</p>}
        </form>
        {searchMode === "live" ? <div className={styles.searchStatus}>
          <p className={styles.small} role="status">{statusLoading ? "서버의 AI 설정을 확인하고 있어요…" : statusError || (aiReady ? `설정 확인됨${assistantStatus?.model ? ` · ${assistantStatus.model}` : ""}. 검색하면 실제 AI를 호출해요.` : "실제 AI 검색이 설정되지 않았어요. 서버의 모델·키 설정을 확인한 뒤 다시 확인해 주세요.")}</p>
          <button type="button" className={styles.textButton} disabled={busy || statusLoading || searching} onClick={() => { setStatusLoading(true); setStatusAttempt(current => current + 1); }}>AI 설정 다시 확인</button>
        </div> : <p className={styles.small}>직접 선택한 로컬 예시 모드예요. AI를 호출하지 않고 카탈로그 상품명·별칭만 비교해요.</p>}
        {activity && <button type="button" className={styles.textButton} disabled={busy} onClick={() => { newSearch(); setUndo(null); inputRef.current?.focus(); }}>새 상품 찾기 · 대화 새로 시작</button>}
        <div className={styles.examples}>
          <div className={styles.sectionLine}><strong>이렇게 말해보세요</strong>{undo !== null && <button className={styles.textButton} type="button" disabled={busy} onClick={() => { editInput(undo); setUndo(null); inputRef.current?.focus(); }}>입력 되돌리기</button>}</div>
          {examples.map(example => <button key={example} type="button" className={styles.example} disabled={busy} onClick={() => { setUndo(previous => previous ?? input); editInput(example); inputRef.current?.focus(); }}><span aria-hidden="true">↗</span>{example}</button>)}
          <p className={styles.small}>예시를 누르면 입력만 채워져요.</p>
        </div>
        <details className={styles.usage}>
          <summary>검색 모드·대화 도움</summary>
          <button type="button" className={styles.textButton} disabled={busy} onClick={switchSearchMode}>{searchMode === "live" ? "로컬 예시 검색으로 전환" : "실제 AI 검색으로 전환"}</button>
          {activity && <p className={styles.small}>추가 질문은 필요할 때만 최대 2회예요. 명확한 후보는 바로 상품·구매 조건을 확인할 수 있어요.</p>}
        </details>
        {activity && conversation && <details className={styles.usage}><summary>이 대화의 원래 조건 · 추가 질문 {conversation.questionCount}/2</summary><p>처음 입력: {conversation.initialText}</p>{conversation.turns.map((turn, index) => <p key={index}>질문 {index + 1}: {turn.question}<br />내 답변: {turn.answer}</p>)}<p>원래의 필수·제외 조건은 명시적으로 바꾸기 전까지 유지돼요.</p></details>}
      </section>

      {result !== null && <section className={styles.results} aria-labelledby="customer-results-title">
        <span className={styles.step}>02 · 상품 확인</span>
        <h2 id="customer-results-title">{resultTitles[result.status]}</h2>
        <div className={styles.modelReply}>
          <span className={styles.resultMode}>{result.mode === "live" ? `실제 AI · ${result.model}` : "로컬 예시 검색 · AI 아님"}</span>
          <p role="status">{result.message}</p>
          {result.run && <p className={styles.small}>{savedKeys.includes(result.run.id) ? "이 검색 이력을 브라우저에 저장했어요. 원문·실행 상세는 고객 본인만 조회해요." : "유효한 검색 결과예요. 이력 저장은 별도로 진행하며 아직 저장 완료가 아니에요."}</p>}
          {result.status === "clarify" && <button type="button" className={styles.textButton} onClick={() => inputRef.current?.focus()}>질문에 맞게 설명 보완하기</button>}
          <p className={styles.small}>답변은 후보 제안이며 실제 공급·가격·재고 확인 결과가 아니에요. 출처 확인은 자료의 일부 상품 정보에만 해당해요. 아래 금액은 요청 가능한 점포의 모의 가격이며, 점포 선택 후 정확한 조건을 확인해요.</p>
          {result.mode === "live" && result.usage && <details className={styles.usage}><summary>이번 AI 검색 사용량</summary><p>입력 {result.usage.inputTokens.toLocaleString("ko-KR")} · 출력 {result.usage.outputTokens.toLocaleString("ko-KR")} 토큰</p></details>}
          {!!result.dialogue?.clues.length && <details className={styles.usage}><summary>해석한 필수·제외·선호 단서 확인</summary>{result.dialogue.clues.map((clue, index) => <p key={index}>{clue.polarity === "excluded" ? "제외" : clue.polarity === "required" ? "필수" : "선호"}: {clue.value} · {clue.certainty === "explicit" ? "입력 근거에서 추출" : "모델 추정 · 확인 필요"}</p>)}<p>모델의 해석은 고객의 구매 동의가 아니에요.</p></details>}
        </div>
        {candidates.length ? <div className={styles.productGrid}>
          {candidates.map(product => {
            const candidate = result.dialogue?.candidates.find(candidate => candidate.productId === product.id);
            const prices = conditions.filter(row => row.productId === product.id && canRequestAt(row)
              && requestStores.some(store => store.id === row.storeId)).map(row => row.unitPrice);
            const lowestPrice = Math.min(...prices);
            const highestPrice = Math.max(...prices);
            return <article key={product.id} className={`${styles.productCard} ${productId === product.id ? styles.selectedCard : ""}`}>
            <div className={styles.productArt} style={{ backgroundColor: product.color }} aria-hidden="true">{product.emoji}<span>데모 카탈로그</span></div>
            <div className={styles.productBody}><span className={styles.small}>{product.category}</span><h3>{product.name}</h3>
              {candidate && <><span className={styles.resultMode}>{candidate.kind === "alternative" ? "찾으신 상품과 다른 대체 상품" : candidate.kind === "needs_confirmation" ? "확인 필요한 후보" : "정확 후보 · 직접 확인 필요"}</span><p>{candidate.reason}</p><details className={styles.usage}><summary>카탈로그 근거 · 공통점/차이 확인</summary>{candidate.catalogEvidence.map(evidence => <p key={evidence.code}>{evidence.value}</p>)}<p>자료 속 속성 근거이며 실제 판매·재고 보장이 아니에요.</p></details></>}
              <span className={styles.provenance}>{provenanceLabels[product.identityOrigin ?? ""] ?? "출처 정보 없음"}</span>
              <p className={styles.small}>출처 ID: {product.sourceIds?.join(", ") || "미등록"} · 확인 항목: {product.verifiedFields?.join(", ") || "없음"}</p>
              <p>{product.description}</p><strong>{prices.length ? <>{won(lowestPrice)}{highestPrice !== lowestPrice && ` ~ ${won(highestPrice)}`} <span className={styles.small}>/ 개 · 점포별 모의 가격</span></> : "요청 가능한 점포 조건 없음"}</strong>
              <button type="button" className={productId === product.id ? styles.primary : styles.secondary} disabled={busy} aria-pressed={productId === product.id} aria-label={`${product.name} ${productId === product.id ? "선택됨" : "이 상품 선택"}`} onClick={() => { selectCandidate(product.id); setRejected(current => current.filter(id => id !== product.id)); }}>{productId === product.id ? "선택했어요 ✓" : "이 상품 선택"}</button>
              {activity && result.run && <button type="button" className={styles.textButton} disabled={busy || rejected.includes(product.id)} onClick={() => rejectCandidate(product.id)}>{rejected.includes(product.id) ? "원하는 상품이 아니라고 표시했어요" : "이 상품은 아니에요"}</button>}
            </div>
          </article>; })}
        </div> : <div className={styles.empty}><span className={styles.emptyIcon} aria-hidden="true">⌕</span><h3>{result.status === "clarify" ? "질문에 답하거나 니즈만 남길 수 있어요" : result.status === "unsupported" ? "찾을 상품 하나를 글로 설명해주세요" : "다른 이름이나 특징으로 찾아볼까요?"}</h3><p>{result.status === "unknown" ? "후보가 없다는 결과는 실제 품절이나 판매 종료를 뜻하지 않아요." : result.status === "unsupported" ? "이 입력은 지원 범위 밖이에요. 미식별 니즈로 저장하지 않아요." : "위 질문에 답하면 원래 조건과 함께 다시 확인해요."}<br />{activity ? "검색 이력과 점포에 명시 전달하는 니즈는 별개예요." : "미식별 기록 저장은 아직 연결되지 않아, 별도의 요청 기록은 저장되지 않았어요."}</p><button type="button" className={styles.secondary} onClick={() => { if (activity && conversation?.finished) newSearch(); inputRef.current?.focus(); }}>{activity && conversation?.finished ? "새 상품 찾기" : "입력 수정하기"}</button></div>}
        {activity && canLeaveNeed && <details className={styles.storeDirectory}>
          <summary>못 찾은 니즈 남기기 · 구매 요청 아님</summary>
          <p className={styles.small}>선택한 한 점포에 상품 관련 안전한 단서만 전달해요. 원문·대화·사용량은 경영주에게 공개하지 않아요. 수요·발주·예약·결제를 만들지 않으며 답변이나 공급을 보장하지 않아요.</p>
          {fixedNeed ? <p role="status">{requestStores.find(store => store.id === fixedNeed.targetStoreId)?.name}에 {savedKeys.includes(fixedNeed.key) ? "니즈를 저장했어요." : "니즈 저장을 기다리고 있어요. 위에서 같은 기록 저장만 재시도할 수 있어요."} 이 대화는 다른 점포로 이동·복제하지 않아요.</p> : <>
            <label className={styles.fieldLabel} htmlFor="customer-need-store">니즈를 전달할 점포</label><select id="customer-need-store" value={needStoreId} disabled={busy} onChange={event => setNeedStoreId(event.target.value)}><option value="">한 점포를 직접 선택해주세요</option>{requestStores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}</select>
            <label className={styles.fieldLabel} htmlFor="customer-need-reason">남길 사유</label><select id="customer-need-reason" value={reasonOptions.some(reason => reason.value === needReason) ? needReason : ""} disabled={busy} onChange={event => setNeedReason(event.target.value as NeedReason)}><option value="" disabled>현재 결과에 맞는 사유를 선택해주세요</option>{reasonOptions.map(reason => <option key={reason.value} value={reason.value}>{reason.label}</option>)}</select>
            {!reasonOptions.length && <p className={styles.small}>후보가 다르면 ‘이 상품은 아니에요’를 눌러주세요. 점포 조건도 니즈 사유와 구별해요.</p>}
            <button type="button" className={styles.secondary} disabled={busy || !needStoreId || !reasonOptions.some(reason => reason.value === needReason)} onClick={leaveNeed}>이 점포에 못 찾은 니즈 남기기</button>
          </>}
        </details>}
      </section>}

      {selected && <section className={styles.card} aria-labelledby="customer-confirm-title">
        <span className={styles.step}>03 · 조건 확인 후 요청</span>
        <h2 id="customer-confirm-title" ref={confirmationRef} tabIndex={-1}>이 조건으로 요청할까요?</h2>
        <p className={styles.confirmationOrder}>수량 → 점포 → 가격 → 구매 동의</p>
        <form onSubmit={request}>
          <div className={styles.selectedProduct}><span style={{ backgroundColor: selected.color }} aria-hidden="true">{selected.emoji}</span><div><strong>{selected.name}</strong><p className={styles.small}>{unitPrice !== null ? `${won(unitPrice)} / 개 · 선택 점포의 모의 가격` : "요청 가능한 점포를 선택하면 모의 가격이 표시돼요."}</p></div></div>
          <label className={styles.fieldLabel} htmlFor="customer-quantity">수량 <span className={styles.small}>1~20개</span></label>
          <div className={styles.quantityControl}>
            <button type="button" aria-label="수량 1개 줄이기" disabled={busy || !validQuantity || count <= 1} onClick={() => { setQuantity(String(count - 1)); clearConfirmation(); }}>−</button>
            <input id="customer-quantity" type="number" inputMode="numeric" min={1} max={20} step={1} required value={quantity} disabled={busy} onChange={event => { setQuantity(event.target.value); clearConfirmation(); }} />
            <button type="button" aria-label="수량 1개 늘리기" disabled={busy || !validQuantity || count >= 20} onClick={() => { setQuantity(String(count + 1)); clearConfirmation(); }}>+</button>
          </div>
          <label className={styles.fieldLabel} htmlFor="customer-store">요청할 점포</label>
          <select id="customer-store" required value={storeId} disabled={busy} onChange={event => { setStoreId(event.target.value); clearConfirmation(); }}>
            <option value="" disabled>요청 가능한 점포를 선택해주세요</option>
            {requestStores.map(item => {
              const row = conditions.find(row => row.productId === selected.id && row.storeId === item.id);
              return <option key={item.id} value={item.id} disabled={!canRequestAt(row)}>{item.name} · {canRequestAt(row) ? `${won(row!.unitPrice)} (모의)` : !row ? "조건 미확인" : "요청 불가 (모의 설정)"}</option>;
            })}
          </select>
          <p className={styles.small}>{store?.address ?? "실제 점포의 위치 참고 자료예요. 요청 가능 표시는 데모 조건이며 실제 취급·재고·영업 여부가 아니에요."}</p>
          {store && <StoreMap store={store} busy={busy} />}
          <details className={styles.storeDirectory}>
            <summary>실제 점포 {requestStores.length}곳의 주소·참고 좌표 보기</summary>
            <ul>{requestStores.map(item => {
              const row = conditions.find(row => row.productId === selected.id && row.storeId === item.id);
              return <li key={item.id}><strong>{item.name}</strong><p>{item.address}</p><p>참고 좌표: {item.latitude !== undefined && item.longitude !== undefined ? `${item.latitude}, ${item.longitude}` : "미확인"}</p><p>출처 ID: {item.sourceIds?.join(", ") || "미등록"} · 자료 신뢰도: {item.confidence ?? "미확인"}</p><p>{canRequestAt(row) ? `이 상품 요청 가능 · ${won(row!.unitPrice)} / 개 (모의)` : !row ? "이 상품의 조건 미확인 · 요청 불가, 품절을 뜻하지 않아요." : "이 상품 요청 불가 · 모의 설정이며 실제 품절을 뜻하지 않아요."}</p></li>;
            })}</ul>
            <p className={styles.small}>좌표는 주소·POI 참고값이며 출입구 실측값이 아니에요. 기존 가상 점포 2곳은 저장된 요청 보존용으로만 남겨 새 요청 대상에서 제외했어요.</p>
          </details>
          <div className={styles.total}><span>확인할 총액</span><strong>{unitPrice === null ? "점포 조건 확인 필요" : validQuantity ? won(unitPrice * count) : "수량 확인 필요"}</strong></div>
          <div className={styles.consentBox}>
            <label><input data-testid="customer-consent" type="checkbox" checked={consent} required disabled={busy || unitPrice === null || !validQuantity} onChange={event => { setConsent(event.target.checked); setError(""); draftRef.current = null; }} /><span><strong>물량 확보 후 자동 구매에 동의해요</strong><span className={styles.small}>위 상품·점포·수량·가격을 확인했어요. 조건이 바뀌면 다시 확인과 동의가 필요해요.</span></span></label>
            <p>입고 후 <strong>픽업 가능 알림이 생성된 시각부터 정확히 48시간</strong> 안에 수령해요. 요청일이나 발주일 기준이 아니에요.</p>
            <p className={styles.small}>{consentDurationDays ? `구매 동의는 확인한 조건으로 ${consentDurationDays}일 동안 유효해요. 확보 후 조건이 일치하면 모의 자동 결제가 실행돼요. 만료·조건 변경 시 새 동의가 필요하며 실제 청구는 없어요. 결제 후 입고 대기에는 픽업 시간이 흐르지 않아요.` : "이번 미리보기에서는 동의 표시와 요청 화면만 시연해요. 공급 확보·모의 결제·알림은 아직 작동하지 않으며 실제 청구는 없어요."}</p>
          </div>
          <button type="submit" className={styles.primary} data-testid="customer-request" disabled={busy || !validQuantity || !store || unitPrice === null || !consent}>{busy ? "요청 저장 중…" : "이 조건으로 요청 저장"}</button>
          <button type="button" className={styles.textButton} disabled={busy} onClick={() => { setProductId(null); clearConfirmation(); }}>다른 상품을 고를게요</button>
        </form>
      </section>}
    </>}

    {tab === "requests" && (requestContent ?? <section className={styles.results} aria-labelledby="customer-requests-title">
      <div className={styles.sectionLine}><h2 id="customer-requests-title">내 요청</h2><span className={styles.count}>{mine.length}건</span></div>
      <p className={styles.small}>현재 화면의 ‘나’가 요청한 항목만 보여요. 이 브라우저의 SQLite에 저장해요. 같은 주소에서 새로고침해도 이어져요. 다른 기기와 공유되지 않아요.</p>
      {mine.length ? <div className={styles.requestList}>{mine.map(item => {
        const product = previewProducts.find(product => product.id === item.productId);
        const requestStore = previewStores.find(store => store.id === item.storeId);
        return <article className={styles.requestCard} key={item.id}>
          <div className={styles.sectionLine}><span className={item.stage === "approved" ? styles.approved : styles.requested}>{item.stage === "approved" ? "발주 승인" : "요청 접수"}</span><span className={styles.small}>화면 시연</span></div>
          <h3>{product?.name ?? "상품 정보 확인 필요"} · {item.quantity}개</h3>
          <span className={styles.provenance}>{provenanceLabels[product?.identityOrigin ?? ""] ?? "출처 정보 없음"}</span>
          <p>{requestStore?.name ?? "점포 정보 확인 필요"}{requestStore?.identityOrigin === "synthetic" && " · 기존 데이터 보존용 가상 점포"}</p>
          <p className={styles.requestPrice}>{won(item.unitPrice)} × {item.quantity}개 <strong>{won(item.unitPrice * item.quantity)}</strong></p>
          <p className={styles.small}>자동 구매 동의: {item.consent ? "동의함" : "동의하지 않음"}</p>
          <div className={styles.stageNote}>{item.stage === "approved" ? "경영주의 발주 승인을 이 브라우저에 저장했어요." : "이 브라우저에 요청을 저장했어요. 경영주 확인을 기다려요."}<br />아직 공급 확보·결제·예약·픽업 가능 상태가 아니에요.</div>
        </article>;
      })}</div> : <div className={styles.empty}><NavIcon tab="requests" /><h3>아직 남긴 요청이 없어요</h3><p>원하는 상품을 찾아 조건을 확인하면<br />이곳에서 요청 상태를 볼 수 있어요.</p><button type="button" className={styles.primary} onClick={() => navigate("want")}>첫 상품 찾아보기</button></div>}
    </section>)}

    {tab === "requests" && activity?.historyContent}

    {tab === "pickup" && (pickupContent ?? <section className={styles.card} aria-labelledby="customer-pickup-title">
      <span className={styles.step}>픽업 안내</span><h2 id="customer-pickup-title">아직 픽업 가능한 상품이 없어요</h2>
      <div className={styles.empty}><NavIcon tab="pickup" /><h3>요청 접수와 픽업은 달라요</h3><p>공급 확보·모의 결제·입고 후<br />픽업 가능 알림을 받아야 수령할 수 있어요.</p></div>
      <div className={styles.pickupNotice}><strong>알림 생성 시각부터 정확히 48시간</strong><p>요청하거나 발주를 승인한 때부터 세지 않아요. 이번 화면 미리보기에는 입고·알림·수령 기능이 없어 픽업 마감도 아직 없어요.</p></div>
      <button type="button" className={styles.secondary} onClick={() => navigate(mine.length ? "requests" : "want")}>{mine.length ? "내 요청 확인하기" : "원하는 상품 찾아보기"}</button>
    </section>)}

    {error && <p className={styles.error} role="alert">{error}</p>}
    <details className={styles.usage}>
      <summary>모의 데이터·브라우저 저장 안내</summary>
      <p className={styles.small}>상품 {previewProducts.length}개의 출처 확인·미검증·합성 여부를 구분한 데모예요. 실제 점포 {requestStores.length}곳의 위치를 참고하지만 가격·취급·재고·거래는 모의이며 현재 영업을 보장하지 않아요. 이 브라우저의 SQLite에 저장해요. 같은 주소에서 새로고침해도 이어져요. 다른 기기와 공유되지 않아요.</p>
      <p className={styles.small}>원하는 말은 상품으로, 모인 수요는 사장님의 쉬운 판단으로.</p>
    </details>
    <nav className={styles.bottomNav} aria-label="고객 하단 탐색">
      {([{ id: "want", label: "원하기" }, { id: "requests", label: "내 요청" }, { id: "pickup", label: "픽업" }] as const).map(item => <button type="button" key={item.id} className={tab === item.id ? styles.activeTab : undefined} aria-current={tab === item.id ? "page" : undefined} onClick={() => navigate(item.id)}><NavIcon tab={item.id} /><span>{item.label}{item.id === "requests" && mine.length > 0 && <span className={styles.navCount}>{mine.length}</span>}</span></button>)}
    </nav>
  </div>;
}
