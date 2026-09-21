"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { type PreviewRequest, previewProducts, previewStores, won } from "../demo-preview";
import { AssistantError, errorMessages, isObject, parseMerchantOutput, parseMerchantRequest, resolveMerchantProposal, type AssistantErrorCode, type AssistantStatus, type MerchantOutput, type MerchantRequest, type MerchantResponse } from "../../lib/assistant/contracts";
import styles from "./merchant-workspace.module.css";

type View = MerchantOutput["view"];
type Proposal = MerchantOutput & {
  ids: string[] | null;
  snapshot: string;
  generation: number;
  model: MerchantResponse["model"];
  usage: MerchantResponse["usage"];
};
const allowedIds = previewProducts.map(product => product.id);
const allowedStores = previewStores.map(store => store.id);
const realStores = previewStores.filter(store => store.identityOrigin === "reference_verified");
const legacyStores = previewStores.filter(store => store.identityOrigin !== "reference_verified");
const provenanceLabels: Record<string, string> = {
  reference_verified: "출처 확인 · reference_verified",
  reference_unverified: "출처 미검증 · reference_unverified",
  synthetic_product: "합성 상품 · synthetic_product",
};
const viewLabels: Record<View, string> = { requested: "검토할 수요", approved: "승인 완료", all: "전체 미확보" };

const examples = [
  "미확보 요청만 보여줘",
  "샌드위치는 빼고, 예산 안에서",
  "이번 묶음은 요청 수량만큼 제안해줘",
];
const sum = (items: PreviewRequest[]) => items.reduce((total, item) => total + item.quantity * item.unitPrice, 0);
const quantity = (items: PreviewRequest[]) => items.reduce((total, item) => total + item.quantity, 0);
const canSelect = (item: PreviewRequest) => item.stage === "requested" && item.consent
  && Number.isSafeInteger(item.quantity) && item.quantity > 0
  && Number.isSafeInteger(item.unitPrice) && item.unitPrice >= 0
  && previewProducts.some((product) => product.id === item.productId);
const dateFormat = new Intl.DateTimeFormat("ko-KR", {
  month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul",
});

export default function MerchantWorkspace({ requests, onApprove, busy }: {
  requests: PreviewRequest[];
  onApprove: (ids: string[]) => Promise<boolean>;
  busy: boolean;
}) {
  const [storeId, setStoreId] = useState(realStores[0]?.id ?? previewStores[0].id);
  const [view, setView] = useState<View>("requested");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [budgetInput, setBudgetInput] = useState("50000");
  const [command, setCommand] = useState("");
  const [previousInput, setPreviousInput] = useState<string | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [message, setMessage] = useState("");
  const [assistantStatus, setAssistantStatus] = useState<AssistantStatus | null>(null);
  const [statusAttempt, setStatusAttempt] = useState(0);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState("");
  const [thinking, setThinking] = useState(false);
  const [commandError, setCommandError] = useState("");
  const submitting = useRef(false);
  const commandController = useRef<AbortController | null>(null);
  const requestSequence = useRef(0);
  const commandInput = useRef<HTMLInputElement>(null);

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
        if (active) setStatusError("AI 설정을 확인하지 못했어요. 다시 확인하거나 목록에서 직접 선택해 주세요.");
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
    commandController.current?.abort();
  }, []);

  const store = previewStores.find((item) => item.id === storeId)!;
  const storeRequests = requests.filter((item) => item.storeId === storeId);
  const pending = storeRequests.filter((item) => item.stage === "requested");
  const approved = storeRequests.filter((item) => item.stage === "approved");
  const selected = storeRequests.filter((item) => selectedIds.includes(item.id) && canSelect(item));
  const selectedTotal = sum(selected);
  const budget = Number(budgetInput);
  const validBudget = budgetInput.trim() !== "" && Number.isSafeInteger(budget) && budget >= 0 && budget <= 1_000_000_000;
  const overBudget = validBudget && selectedTotal > budget;
  const snapshot = JSON.stringify([storeRequests, storeId, budgetInput, selectedIds]);
  const currentSnapshot = useRef(snapshot);
  currentSnapshot.current = snapshot;
  const aiReady = assistantStatus?.configured === true && assistantStatus.mode === "live";

  useEffect(() => {
    requestSequence.current += 1;
    setProposal(current => current ? { ...current, generation: -1 } : null);
    if (commandController.current) {
      commandController.current.abort();
      commandController.current = null;
      setThinking(false);
      setCommandError("점포·요청·선택 또는 예산이 바뀌어 이전 AI 제안을 취소했어요. 현재 조건으로 다시 요청해 주세요.");
    }
  }, [snapshot, busy]);

  const proposalStale = proposal !== null && (proposal.snapshot !== snapshot || proposal.generation !== requestSequence.current);
  const proposalApplicable = proposal?.scope === "current_batch" && proposal.action !== "clarify" && proposal.action !== "unsupported";
  const visible = storeRequests.filter((item) => {
    const product = previewProducts.find((entry) => entry.id === item.productId);
    const text = `${product?.name ?? item.productId} ${product?.category ?? ""} ${product?.aliases.join(" ") ?? ""} ${item.actor}`;
    return (view === "all" || item.stage === view) && text.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
  });
  const groups = new Map<string, PreviewRequest[]>();
  visible.forEach((item) => groups.set(item.productId, [...(groups.get(item.productId) ?? []), item]));
  const visibleEligible = visible.filter(canSelect);
  const allVisibleSelected = visibleEligible.length > 0 && visibleEligible.every((item) => selectedIds.includes(item.id));
  const proposedItems = proposal?.ids ? storeRequests.filter((item) => proposal.ids!.includes(item.id) && canSelect(item)) : selected;
  const proposedBudget = proposal?.budgetWon ?? budget;

  function cancelCommand() {
    requestSequence.current += 1;
    commandController.current?.abort();
    commandController.current = null;
    setThinking(false);
  }

  function editCommand(value: string) {
    cancelCommand();
    setCommand(value);
    setProposal(null);
    setCommandError("");
  }

  function toggle(items: PreviewRequest[]) {
    if (busy || submitting.current) return;
    const ids = items.filter(canSelect).map((item) => item.id);
    const allSelected = ids.every((id) => selectedIds.includes(id));
    setSelectedIds((current) => allSelected ? current.filter((id) => !ids.includes(id)) : [...new Set([...current, ...ids])]);
    setMessage("");
  }

  async function propose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || submitting.current || commandController.current) return;
    cancelCommand();
    setProposal(null);
    setMessage("");
    setCommandError("");
    if (!command.trim() || !validBudget) {
      setCommandError(errorMessages.INVALID_MERCHANT_INPUT);
      return;
    }
    if (!aiReady || statusLoading) {
      setCommandError("실제 AI 설정을 먼저 확인해 주세요. 목록에서 직접 선택할 수 있으며 로컬 해석으로 자동 전환하지 않아요.");
      return;
    }
    const controller = new AbortController();
    commandController.current = controller;
    const generation = ++requestSequence.current;
    const sentSnapshot = snapshot;
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 45_000);
    setThinking(true);
    try {
      const input: MerchantRequest = parseMerchantRequest({
        text: command.trim(), id: crypto.randomUUID(), generation, storeId, budgetWon: budget,
        selectedProductIds: [...new Set(selected.map(item => item.productId))],
      }, allowedIds, allowedStores);
      const response = await fetch("/api/assistant/merchant", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
        body: JSON.stringify(input),
      });
      const data: unknown = await response.json().catch(() => { throw new AssistantError("MODEL_MALFORMED"); });
      if (requestSequence.current !== generation || currentSnapshot.current !== sentSnapshot) return;
      if (timedOut) throw new AssistantError("MODEL_TIMEOUT");
      if (controller.signal.aborted) return;
      if (!response.ok || !isObject(data) || data.ok !== true) {
        const code = isObject(data) && isObject(data.error) ? data.error.code : undefined;
        throw new AssistantError(typeof code === "string" && Object.hasOwn(errorMessages, code)
          ? code as AssistantErrorCode : response.status === 429 ? "RATE_LIMITED" : "MODEL_UPSTREAM");
      }
      if (data.id !== input.id || data.generation !== generation || data.mode !== "live"
        || typeof data.model !== "string" || !data.model.trim() || data.model.length > 120
        || !isObject(data.usage) || ![data.usage.inputTokens, data.usage.outputTokens].every(value => Number.isSafeInteger(value) && Number(value) >= 0)) {
        throw new AssistantError("MODEL_MALFORMED");
      }
      const output = parseMerchantOutput({ action: data.action, scope: data.scope, view: data.view, selection: data.selection,
        productIds: data.productIds, budgetWon: data.budgetWon, message: data.message }, allowedIds);
      let ids: string[] | null = null;
      if (output.scope === "current_batch" && output.action !== "clarify" && output.action !== "unsupported") {
        const eligible = pending.filter(canSelect);
        const resolved = resolveMerchantProposal(input, output, [...new Set(eligible.map(item => item.productId))], allowedIds);
        if (output.action === "select") {
          const candidates = output.selection === "exclude" && selected.length ? selected : eligible;
          ids = candidates.filter(item => resolved.selectedProductIds.includes(item.productId)).map(item => item.id);
        }
      }
      setProposal({ ...output, ids, snapshot: sentSnapshot, generation, model: data.model,
        usage: { inputTokens: data.usage.inputTokens as number, outputTokens: data.usage.outputTokens as number } });
    } catch (caught) {
      if (requestSequence.current !== generation || currentSnapshot.current !== sentSnapshot) return;
      setCommandError(timedOut ? errorMessages.MODEL_TIMEOUT : caught instanceof AssistantError ? caught.message : errorMessages.MODEL_NETWORK);
    } finally {
      clearTimeout(timeout);
      if (requestSequence.current === generation) {
        commandController.current = null;
        setThinking(false);
      }
    }
  }

  function applyProposal() {
    if (busy || thinking || submitting.current || !proposal || proposalStale || !proposalApplicable) return;
    if (proposal.generation !== requestSequence.current || proposal.snapshot !== currentSnapshot.current) return;
    setView(proposal.view);
    setSearch("");
    if (proposal.ids !== null) setSelectedIds(proposal.ids);
    if (proposal.budgetWon !== null) setBudgetInput(String(proposal.budgetWon));
    setMessage(proposal.action === "filter" ? "조회 조건만 바꿨어요. 발주 승인이나 거래 변경은 없어요." : "확인한 변경안을 이번 묶음에 적용했어요. 선택과 예산을 검토한 뒤 발주 승인은 따로 진행해 주세요. 미래 정책은 저장하지 않았어요.");
    setProposal(null);
  }

  async function approve() {
    if (busy || submitting.current || !selected.length || !validBudget || overBudget || !Number.isSafeInteger(selectedTotal)) return;
    cancelCommand();
    submitting.current = true;
    setMessage("");
    try {
      if (!await onApprove(selected.map((item) => item.id))) {
        setMessage("승인을 저장하지 못했어요. 선택은 유지했으니 현재 요청 상태를 확인한 뒤 다시 시도해 주세요.");
        return;
      }
      setMessage(`${selected.length}건 · ${quantity(selected)}개의 발주 승인을 이 브라우저에 저장했어요. 아직 공급 확보·결제·예약은 진행되지 않았어요.`);
      setSelectedIds([]);
      setProposal(null);
    } catch {
      setMessage("승인을 저장하지 못했어요. 선택은 유지했으니 다시 시도해 주세요.");
    } finally { submitting.current = false; }
  }

  return (
    <section className={styles.workspace} aria-label="경영주 수요 관리" aria-busy={busy || thinking}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>원하GS · 원하지쓰 <span>경영주</span></p>
          <h1>수요는 모으고,<br className={styles.mobileBreak} /> 확인은 한 번에</h1>
          <p className={styles.subheading}>고객의 요청을 살펴보고, 우리 점포에 필요한 만큼 승인하세요.</p>
        </div>
        <label className={styles.storePicker}>
          <span>관리 점포</span>
          <select value={storeId} disabled={busy} onChange={(event) => {
            cancelCommand();
            setStoreId(event.target.value); setSelectedIds([]); setProposal(null); setMessage(""); setSearch("");
          }}>
            <optgroup label="실제 점포 위치 참고 · 거래는 모의">{realStores.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</optgroup>
            <optgroup label="기존 데이터 보존용 가상 점포">{legacyStores.map((item) => <option key={item.id} value={item.id}>{item.name} · 기존 데이터</option>)}</optgroup>
          </select>
        </label>
      </header>

      <section className={styles.storeInfo} aria-label="선택한 점포와 자료 안내">
        <span className={styles.badge}>{store.identityOrigin === "reference_verified" ? "실제 점포 위치 참고" : "기존 데이터 보존용 가상 점포"}</span>
        <strong>{store.name}</strong><p>{store.address}</p>
        {store.identityOrigin === "reference_verified" ? <>
          <p>참고 좌표: {store.latitude !== undefined && store.longitude !== undefined ? `${store.latitude}, ${store.longitude}` : "미확인"} · 지도 후속 연결 예정</p>
          <p>출처 ID: {store.sourceIds?.join(", ") || "미등록"} · 자료 신뢰도: {store.confidence ?? "미확인"}</p>
          <p>주소·POI 참고 좌표이며 출입구 실측값이 아니에요. 현재 영업·취급·재고·경영주 관계는 확인하지 않았어요.</p>
        </> : <p>기존 요청의 점포·가격·승인 상태를 보존해 보여요. 실제 점포로 자동 이전하지 않으며 새 고객 요청 대상에서는 제외돼요.</p>}
        <p>합성 고객·모의 요청과 가격으로 시연해요. 상품의 출처 확인 표시는 자료의 일부 항목에만 해당하며 실제 GS 발주·결제는 없어요.</p>
      </section>

      <div className={styles.metrics}>
        <article><span>검토할 고객</span><strong>{new Set(pending.map((item) => item.actor)).size}<small>명</small></strong><p>현재 점포의 미승인 요청 기준</p></article>
        <article><span>요청 수량</span><strong>{quantity(pending)}<small>개</small></strong><p>{pending.length}건의 요청이 모였어요</p></article>
        <article className={styles.metricHighlight}><span>검토 금액</span><strong>{sum(pending).toLocaleString("ko-KR")}<small>원</small></strong><p>요청 단가 × 수량 · 시연용 금액</p></article>
      </div>

      <div className={styles.layout}>
        <div className={styles.mainColumn}>
          <section className={styles.assistant} aria-labelledby="merchant-command-heading">
            <div className={styles.sectionHeading}>
              <div><span className={styles.kicker}>간단하게 말해보세요</span><h2 id="merchant-command-heading">이번 묶음, 이렇게 바꿔볼까요?</h2></div>
              <span className={styles.localBadge}>실제 AI · 변경안 제안</span>
            </div>
            <p className={styles.help} role="status">{statusLoading ? "서버의 AI 설정을 확인하고 있어요…" : statusError || (aiReady ? `설정 확인됨${assistantStatus?.model ? ` · ${assistantStatus.model}` : ""}. 입력한 지시를 실제 AI가 해석해요.` : "실제 AI 설정이 필요해요. 서버의 모델·키 설정을 확인해 주세요. 직접 선택과 발주 승인은 사용할 수 있어요.")}</p>
            <button type="button" className={styles.clearSelection} disabled={busy || thinking || statusLoading} onClick={() => { setStatusLoading(true); setStatusAttempt(current => current + 1); }}>AI 설정 다시 확인</button>
            <form onSubmit={propose}>
              <label htmlFor="merchant-command" className={styles.fieldLabel}>조회 또는 이번 묶음 변경 지시</label>
              <div className={styles.commandRow}>
                <input ref={commandInput} id="merchant-command" value={command} disabled={busy} maxLength={300} placeholder="샌드위치는 빼고, 예산 안에서"
                  onChange={(event) => editCommand(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter" && event.nativeEvent.isComposing) event.preventDefault(); }} />
                <button className={styles.primaryButton} type="submit" disabled={busy || thinking || statusLoading || !aiReady || !command.trim() || !validBudget}>{thinking ? "AI가 변경안을 만드는 중…" : "AI 변경안 보기"} <span aria-hidden="true">→</span></button>
              </div>
              {thinking && <div className={styles.proposalActions}><p className={styles.help} role="status">입력이나 검토 조건을 바꾸면 이전 응답을 취소해요.</p><button type="button" className={styles.secondaryButton} onClick={cancelCommand}>AI 요청 취소</button></div>}
              {commandError && <p className={styles.error} role="alert">{commandError}</p>}
            </form>
            <div className={styles.examples} aria-label="입력 예시">
              {examples.map((example) => <button type="button" key={example} disabled={busy} onClick={() => {
                setPreviousInput(command); editCommand(example);
              }}>{example}</button>)}
              {previousInput !== null && <button type="button" className={styles.undoButton} disabled={busy} onClick={() => {
                editCommand(previousInput); setPreviousInput(null);
              }}>이전 입력 복원</button>}
            </div>
            <p className={styles.help}>예시는 입력만 채워요. AI는 변경안만 제시하며 확인 전 선택·예산·거래를 바꾸지 않아요. 설정·응답 오류를 로컬 해석으로 자동 대체하지 않아요.</p>
            {proposal && <div className={styles.proposal}>
              <div className={styles.sectionHeading}><strong>{proposal.scope === "future_policy" ? "미래 정책 · 아직 미연결" : proposal.action === "clarify" ? "추가 확인이 필요해요" : proposal.action === "unsupported" ? "지원하지 않는 지시예요" : "이번 묶음 변경안"}</strong><span className={styles.localBadge}>실제 AI · {proposal.model}</span></div>
              <p>{proposal.message}</p>
              {proposalApplicable ? <>
                <p>조회 화면: <b>{viewLabels[view]} → {viewLabels[proposal.view]}</b></p>
                {proposal.action === "filter" ? <p>조회만 바꾸며 기존 선택과 예산은 유지해요.</p> : <>
                  <p>선택 {selected.length}건 → <b>{proposedItems.length}건 · {quantity(proposedItems)}개 · {won(sum(proposedItems))}</b></p>
                  {proposal.ids !== null && <p className={styles.help}>{proposedItems.length ? [...new Set(proposedItems.map(item => previewProducts.find(product => product.id === item.productId)?.name ?? item.productId))].join(" · ") : "적용 후 선택된 요청이 없어요."}</p>}
                  <p>이번 묶음 예산: <b>{won(budget)} → {won(proposedBudget)}</b>{proposal.budgetWon === null ? " (유지)" : " (확인 후 적용)"}</p>
                  {sum(proposedItems) > proposedBudget && <p className={styles.error}>변경 후에도 예산보다 {won(sum(proposedItems) - proposedBudget)} 많아요. 발주 승인은 차단되며 수량을 자동으로 줄이지 않아요.</p>}
                </>}
                {proposalStale && <p className={styles.error}>점포·요청·선택 또는 예산이 바뀌었어요. 이전 변경안은 적용할 수 없으니 다시 만들어 주세요.</p>}
                <div className={styles.proposalActions}>
                  <button type="button" className={styles.primaryButton} disabled={busy || thinking || proposalStale} onClick={applyProposal}>확인하고 {proposal.action === "filter" ? "조회 적용" : "변경안 적용"}</button>
                  <button type="button" className={styles.secondaryButton} disabled={busy} onClick={() => setProposal(null)}>취소</button>
                </div>
              </> : <>
                <p className={styles.help}>{proposal.scope === "future_policy" ? "미래 정책과 자동발주는 아직 저장·실행할 수 없어요. 이번 묶음에 대한 지시로 다시 입력해 주세요." : "선택·예산·거래는 바뀌지 않았어요. 입력을 보완한 뒤 다시 요청해 주세요."}</p>
                <button type="button" className={styles.secondaryButton} disabled={busy} onClick={() => commandInput.current?.focus()}>지시 입력 수정하기</button>
              </>}
              <p className={styles.help}>금액·수량은 현재 점포 요청으로 계산했어요. AI 답변은 실제 공급·가격·재고 확인이 아니며, 변경안 적용으로 발주 승인이나 미래 정책 저장을 하지 않아요.</p>
              <details className={styles.usage}><summary>이번 AI 사용량</summary><p>입력 {proposal.usage.inputTokens.toLocaleString("ko-KR")} · 출력 {proposal.usage.outputTokens.toLocaleString("ko-KR")} 토큰</p></details>
            </div>}
          </section>

          <section className={styles.demand} aria-labelledby="merchant-demand-heading">
            <div className={styles.sectionHeading}><div><span className={styles.kicker}>고객의 말을 점포의 수요로</span><h2 id="merchant-demand-heading">상품별 요청 <span className={styles.count}>{groups.size}</span></h2></div></div>
            <div className={styles.filters}>
              <div className={styles.tabs} aria-label="요청 상태 필터">
                {([ ["requested", "검토할 수요", pending.length], ["approved", "승인 완료", approved.length], ["all", "전체 미확보", storeRequests.length] ] as const).map(([value, label, count]) => (
                  <button type="button" key={value} aria-pressed={view === value} className={view === value ? styles.activeTab : ""} onClick={() => setView(value)}>{label} <span>{count}</span></button>
                ))}
              </div>
              <label className={styles.search}><span className={styles.srOnly}>상품 또는 고객 검색</span><input type="search" placeholder="상품 또는 고객 검색" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
            </div>
            <div className={styles.listToolbar}>
              <label><input type="checkbox" checked={allVisibleSelected} disabled={busy || !visibleEligible.length} onChange={() => toggle(visibleEligible)} /> 표시된 승인 가능 요청 선택</label>
              <span>{visible.length}건 · {quantity(visible)}개</span>
            </div>

            {groups.size === 0 ? <div className={styles.empty}>
              <span aria-hidden="true">⌑</span><h3>{storeRequests.length === 0 ? "아직 모인 요청이 없어요" : "이 조건에 맞는 요청이 없어요"}</h3>
              <p>{storeRequests.length === 0 ? "고객이 이 점포에 새 요청을 남기면 여기에 바로 보여요." : "다른 상태를 선택하거나 검색어를 지워보세요."}</p>
              {storeRequests.length > 0 && <button type="button" className={styles.secondaryButton} onClick={() => { setView("all"); setSearch(""); }}>전체 요청 보기</button>}
            </div> : <div className={styles.productList}>
              {Array.from(groups, ([productId, items]) => {
                const product = previewProducts.find((item) => item.id === productId);
                const eligible = items.filter(canSelect);
                const selectedCount = eligible.filter((item) => selectedIds.includes(item.id)).length;
                const approvedCount = items.filter((item) => item.stage === "approved").length;
                return <article key={productId} className={`${styles.productCard} ${selectedCount > 0 ? styles.selectedCard : ""}`}>
                  <div className={styles.productSummary}>
                    <input type="checkbox" aria-label={`${product?.name ?? productId} 승인 가능 요청 선택`} checked={eligible.length > 0 && selectedCount === eligible.length} disabled={busy || !eligible.length} onChange={() => toggle(items)} />
                    <span className={styles.productEmoji} style={{ background: product?.color ?? "#eef3f6" }} aria-hidden="true">{product?.emoji ?? "□"}</span>
                    <div className={styles.productName}><h3>{product?.name ?? `확인 필요 상품 · ${productId}`}</h3><span className={styles.provenance}>{provenanceLabels[product?.identityOrigin ?? ""] ?? "출처 정보 없음"}</span><p>출처 ID: {product?.sourceIds?.join(", ") || "미등록"} · 확인 항목: {product?.verifiedFields?.join(", ") || "없음"}</p><p>{new Set(items.map((item) => item.actor)).size}명 · 요청 {items.length}건</p></div>
                    <div className={styles.productAmount}><strong>{quantity(items)}개</strong><span>{won(sum(items))}</span></div>
                    <span className={approvedCount === items.length ? styles.approvedBadge : styles.reviewBadge}>{approvedCount === items.length ? "승인 완료" : approvedCount > 0 ? "일부 승인" : "검토 대기"}</span>
                  </div>
                  <details className={styles.details}>
                    <summary>고객별 요청 상세 <span>{items.length}건 · 접수·동의 확인</span></summary>
                    <div className={styles.requestRows}>
                      {items.map((item) => <div className={styles.requestRow} key={item.id}>
                        <label className={styles.actor}><input type="checkbox" checked={selectedIds.includes(item.id) && canSelect(item)} disabled={busy || !canSelect(item)} onChange={() => toggle([item])} /><strong>{item.actor}</strong></label>
                        <dl><div><dt>수량</dt><dd>{item.quantity}개</dd></div><div><dt>요청 단가</dt><dd>{won(item.unitPrice)}</dd></div><div><dt>자동 구매 동의</dt><dd className={!item.consent ? styles.error : ""}>{item.consent ? "동의함" : "미동의 · 승인 제외"}</dd></div><div><dt>접수 시각 · KST</dt><dd>{Number.isNaN(Date.parse(item.createdAt)) ? item.createdAt : <time dateTime={item.createdAt}>{dateFormat.format(new Date(item.createdAt))}</time>}</dd></div><div><dt>현재 단계</dt><dd>{item.stage === "approved" ? "발주 승인 · 공급 미확보" : "요청 접수 · 검토 대기"}</dd></div></dl>
                      </div>)}
                    </div>
                  </details>
                  {items.some((item) => !item.consent) && <p className={styles.cardNote}>미동의 요청은 확인만 가능하며 승인 선택에서 제외돼요.</p>}
                </article>;
              })}
            </div>}
            <p className={styles.help}>승인 완료 요청도 아직 공급 미확보 상태예요. 공급 확보·결제·예약·입고는 후속 연결 예정이에요.</p>
          </section>
        </div>

        <aside className={styles.sidebar} aria-label="선택한 묶음 검토">
          <section className={styles.orderCard}>
            <span className={styles.kicker}>이번 묶음</span><h2>선택한 요청 확인</h2>
            <p className={styles.help}>{store.name} · {selected.length}건 선택</p>
            <div className={styles.selectionList}>
              {selected.length === 0 ? <p>왼쪽 목록에서 승인할 상품이나<br />고객 요청을 선택해 주세요.</p> : previewProducts.map((product) => {
                const items = selected.filter((item) => item.productId === product.id);
                return items.length > 0 && <div key={product.id}><span>{product.name}<small>{quantity(items)}개</small></span><strong>{won(sum(items))}</strong></div>;
              })}
            </div>
            <div className={styles.total}><span>선택 합계 <small>{quantity(selected)}개</small></span><strong>{won(selectedTotal)}</strong></div>
            <label className={styles.budgetLabel} htmlFor="merchant-budget">이번 묶음 예산</label>
            <div className={styles.budgetInput}><input id="merchant-budget" type="number" inputMode="numeric" min="0" max="1000000000" step="1" value={budgetInput} disabled={busy} aria-invalid={!validBudget || overBudget} aria-describedby="merchant-budget-help" onChange={(event) => setBudgetInput(event.target.value)} /><span>원</span></div>
            <p id="merchant-budget-help" className={!validBudget || overBudget ? styles.error : styles.budgetHelp}>
              {!validBudget ? "예산은 0원부터 10억 원까지 정수로 입력해 주세요." : overBudget ? `예산보다 ${won(selectedTotal - budget)} 초과했어요. 선택을 줄이거나 예산을 수정해 주세요.` : `선택 후 예산 여유 ${won(budget - selectedTotal)}`}
            </p>
            <button type="button" className={styles.approveButton} disabled={busy || !selected.length || !validBudget || overBudget || !Number.isSafeInteger(selectedTotal)} onClick={approve}>{busy ? "승인 저장 중…" : "선택한 요청 발주 승인"} <span aria-hidden="true">→</span></button>
            {selected.length > 0 && <button type="button" className={styles.clearSelection} disabled={busy} onClick={() => setSelectedIds([])}>선택 해제</button>}
            <p className={styles.approvalNote}>필터와 관계없이 위 선택 목록만 승인해요.<br />화면 시연용 승인으로 실제 발주·청구는 없어요.</p>
          </section>
          <section className={styles.policyCard}><div className={styles.sectionHeading}><h3>자동발주</h3><span className={styles.offBadge}>미연결</span></div><p>앞으로의 발주 정책은 아직 저장하지 않아요. 현재는 이번 묶음을 직접 확인하고 승인해 주세요.</p><div className={styles.policyFoot}><span aria-hidden="true">○</span> 자동 실행되지 않아요</div></section>
          <p className={styles.sidebarNote}>요청 → <strong>발주 승인</strong> → 공급 확보<br />승인만으로 결제·예약이 생기지 않아요.</p>
        </aside>
      </div>
      {message && <div className={styles.feedback} role="status"><span>{message}</span><button type="button" aria-label="안내 닫기" onClick={() => setMessage("")}>×</button></div>}
    </section>
  );
}
