"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { getView } from "../../lib/domain/commands";
import { DOMAIN_POLICY, integer } from "../../lib/domain/policy";
import type { Command, CommandContext, CommandOutcome, Condition, CustomerWaiting, DomainState, OrderLine, Policy, RequestDetail, Reservation, View } from "../../lib/domain/types";
import { AssistantError, errorMessages, isObject, parseMerchantOutput, parseMerchantRequest, resolveMerchantProposal, type AssistantErrorCode, type AssistantStatus, type MerchantOutput, type MerchantResponse } from "../../lib/assistant/contracts";
import styles from "./domain-workspace.module.css";
import PolicyAssistant from "./policy-assistant";
import MerchantNeeds from "./merchant-needs";

type Props = {
  state: DomainState;
  onCommand: (command: Command) => Promise<CommandOutcome>;
  role: "customer" | "merchant";
  actorId: string;
  storeId: string;
  busy: boolean;
  pickupOnly?: boolean;
};
type Payload<T = Command> = T extends Command ? Omit<T, keyof CommandContext> : never;
type Send = (payload: Payload, revision?: number) => Promise<boolean>;
const won = (value: number) => `${value.toLocaleString("ko-KR")}원`;
const dateFormat = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "Asia/Seoul" });
const when = (value: number | null) => value === null ? "아직 없음" : dateFormat.format(value);
const labels: Record<string, string> = {
  pending: "요청 대기", review_required: "재확인 필요", reserved: "예약 확정", cancelled: "요청 취소",
  confirmed: "예약 확정 · 입고 대기", pickup_ready: "픽업 가능", collected: "수령 완료", pickup_expired: "픽업 기한 초과",
  NO_SHORTAGE: "진행 중 발주·확보 물량으로 충당 가능하거나 유효 수요가 없어요.",
  SUPPLY_UNAVAILABLE: "요청 또는 공급 조건이 확인되지 않았거나 공급 불가예요.",
  ORDER_WINDOW_CLOSED: "모의 발주 가능 기한이 지났어요.", BUDGET_LIMIT: "매입 예산이 부족해요.",
  MINIMUM_OR_PACK_LIMIT: "최소 발주량·포장 단위·공급 한도를 충족하지 못해요.",
  CONSENT_EXPIRED: "7일 구매 동의가 만료됐어요.", CONDITIONS_CHANGED: "가격 또는 구매 조건이 바뀌었어요.",
  PAYMENT_FAILED: "모의 결제 실패로 배정을 해제했어요. 확인 후 재동의가 필요해요.",
};
const commandLabels: Record<Command["type"], string> = {
  "request.create": "요청 저장", "request.change": "수량 변경", "request.reconsent": "재동의", "request.cancel": "요청 취소",
  "order.approve": "묶음 발주 승인", "policy.set": "자동발주·예산 설정", "auto.run": "승인된 자동발주 정책 실행",
  "supply.finalize": "모의 공급 최종 확정", "receive.full": "모의 전량 입고", "reservation.collect": "모의 전량 수령",
  "condition.update": "모의 조건 변경", "clock.advance": "데모 시간 이동", "clock.tick": "현재 시각으로 상태 처리",
  "search.record": "검색 이력 저장", "needs.record": "니즈 기록", "recommendation.record": "추천 이력 저장",
};

export default function DomainWorkspace(props: Props) {
  // Role/store/reset changes discard only local drafts, never committed domain data.
  return <DomainPanel key={`${props.state.sessionId}:${props.state.generation}:${props.role}:${props.actorId}:${props.storeId}:${props.pickupOnly ?? false}`} {...props} />;
}

function DomainPanel({ state, onCommand, role, actorId, storeId, busy, pickupOnly = false }: Props) {
  const [wallNow, setWallNow] = useState(state.lastNow - state.clockOffsetMs);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [retry, setRetry] = useState<Command | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [failPayments, setFailPayments] = useState(false);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const commandDraft = useRef<{ signature: string; command: Command } | null>(null);
  useEffect(() => {
    mounted.current = true;
    setWallNow(Date.now());
    const timer = setInterval(() => setWallNow(Date.now()), 15_000);
    return () => { mounted.current = false; clearInterval(timer); };
  }, []);

  const context = { sessionId: state.sessionId, generation: state.generation, actorId, role, storeId };
  let view: View;
  try { view = getView(state, context, wallNow); }
  catch { return <section className={styles.workspace}><p className={styles.error} role="alert">현재 역할·점포·데모 세션을 확인해주세요. 거래 정보를 안전하게 조회할 수 없어 조작을 중단했어요.</p></section>; }
  const disabled = busy || sending || uncertain;
  const customerRequests = pickupOnly ? view.requests.filter(detail => detail.reservation !== null) : view.requests;
  const productName = (id: string) => state.products.find(product => product.id === id)?.name ?? id;

  async function run(command: Command) {
    if (busy || inFlight.current || command.sessionId !== state.sessionId || command.generation !== state.generation
      || command.actorId !== actorId || command.role !== role || command.storeId !== storeId) return false;
    inFlight.current = true;
    setSending(true); setError(""); setMessage("");
    try {
      const outcome = await onCommand(command);
      if (!mounted.current) return false;
      if (!outcome.ok) {
        setError(`${outcome.error.message} (${outcome.error.code})`);
        setRetry(command); setUncertain(false);
        return false;
      }
      commandDraft.current = null;
      setRetry(null); setUncertain(false);
      setMessage(`${commandLabels[command.type]} ${outcome.replayed ? "기존 저장 결과를 확인했어요. 중복 실행하지 않았어요." : "결과를 저장했어요. 아래 실제 상태를 확인해주세요."} 실제 청구는 없어요.`);
      setWallNow(Date.now());
      return true;
    } catch {
      if (mounted.current) {
        setError("저장 결과를 확인하지 못했어요. 입력을 유지했어요. 새 명령을 보내기 전에 같은 명령으로 결과를 다시 확인해주세요.");
        setRetry(command); setUncertain(true);
      }
      return false;
    } finally {
      inFlight.current = false;
      if (mounted.current) setSending(false);
    }
  }

  const send: Send = async (payload, revision = state.revision) => {
    if (disabled || inFlight.current) return false;
    if (revision !== state.revision) { setError("검토 중 상태가 바뀌었어요. 최신 조건을 다시 확인해주세요."); return false; }
    const failures = failPayments ? view.requests.filter(detail => ["pending", "review_required"].includes(detail.request.status)).map(detail => detail.request.id) : [];
    const body = { ...context, expectedRevision: revision, ...payload, ...(failures.length ? { paymentFailureRequestIds: failures } : {}) };
    const signature = JSON.stringify(body);
    if (commandDraft.current?.signature !== signature) commandDraft.current = { signature, command: { ...body, idempotencyKey: crypto.randomUUID() } as Command };
    return run(commandDraft.current.command);
  };

  return <section className={styles.workspace} aria-label={`${role === "customer" ? "고객" : "경영주"} 모의 거래`} aria-busy={busy || sending}>
    <header className={styles.header}>
      <div><span className={styles.kicker}>원하GS · 원하지쓰 · {role === "customer" ? "고객" : "경영주"}</span><h2>{role === "customer" ? pickupOnly ? "내 예약 · 픽업" : "내 요청부터 픽업까지" : "모인 수요를 픽업으로"}</h2><p>{state.stores.find(store => store.id === storeId)?.name ?? storeId} · {state.actors.find(actor => actor.id === actorId)?.displayName ?? actorId}</p></div>
      <span className={styles.badge}>모의 거래 · 실제 청구 없음</span>
    </header>
    <p className={styles.note}>한 브라우저 탭의 SQLite 데모예요. 검색 후보·변경 제안은 거래 완료가 아니며, 아래 명령을 저장한 결과만 상태로 표시해요. 실제 GS 주문·결제·외부 알림과 연결되지 않아요.</p>
    <div className={styles.feedback} aria-live="polite">
      {message && <p className={styles.success} role="status">{message}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {retry && <div className={styles.actions}><button type="button" disabled={busy || sending} onClick={() => void run(retry)}>같은 명령으로 저장 결과 재확인</button><span className={styles.note}>명령 키·본문을 그대로 재사용해요. 조건이 바뀐 거절은 최신 조건으로 다시 확인해주세요.</span></div>}
    </div>

    {role === "customer" ? <section aria-label={pickupOnly ? "내 예약 · 현재 점포" : "내 요청 · 현재 점포"}><div className={styles.sectionTitle}><h3>{pickupOnly ? "내 예약 · 현재 점포" : "내 요청 · 현재 점포"}</h3><span>{customerRequests.length}건</span></div>
      {customerRequests.length ? <div className={styles.grid}>{customerRequests.map(detail => <CustomerRequest key={detail.request.id} detail={detail} condition={state.conditions.find(condition => condition.storeId === storeId && condition.productId === detail.request.productId)} name={productName(detail.request.productId)} now={view.now} revision={view.revision} disabled={disabled} send={send} />)}</div> : <p className={styles.empty}>{pickupOnly ? "아직 예약이 없어요. 모의 결제 성공 후 예약이 생기고, 입고 후 픽업 가능 알림부터 48시간이에요." : "이 점포에 남긴 요청이 없어요. 기존 상품 검색에서 상품·점포·가격을 확인하고 요청해주세요."}</p>}
    </section> : <>
      <MerchantDemand state={state} view={view} storeId={storeId} disabled={disabled} send={send} />
      <MerchantNeeds needs={view.needs} products={state.products} actors={state.actors} storeId={storeId} />
      {view.policy && <PolicyEditor key={view.policy.version} policy={view.policy} state={state} actorId={actorId} revision={view.revision} disabled={disabled} send={send} />}
      <section className={styles.section}><div className={styles.sectionTitle}><h3>발주 · 공급 확정 · 입고</h3><span>{view.lines.length}개 라인</span></div>
        <p className={styles.note}>발주 승인은 공급 확보가 아니에요. 공급 최종 확정 후 FIFO 배정·모의 결제가 처리되고, 모든 출처가 입고돼야 픽업 알림이 생겨요.</p>
        <div className={styles.grid}>{view.lines.map(line => <SupplyLine key={line.id} line={line} name={productName(line.productId)} source={view.orders.find(order => order.id === line.orderId)?.source ?? "manual"} disabled={disabled} send={send} />)}</div>
        {!view.lines.length && <p className={styles.empty}>아직 승인된 발주가 없어요.</p>}
      </section>
      <section className={styles.section}><div className={styles.sectionTitle}><h3>예약번호 확인 · 전량 수령</h3><span>{view.reservations.length}건</span></div>
        <div className={styles.grid}>{view.reservations.map(reservation => { const detail = view.requests.find(detail => detail.request.id === reservation.requestId); return <Collection key={reservation.id} reservation={reservation} title={`${detail?.actor.displayName ?? reservation.actorId} · ${detail ? productName(detail.request.productId) : "상품 확인 필요"} ${detail?.request.quantity ?? ""}개`} now={view.now} disabled={disabled} send={send} />; })}</div>
        {!view.reservations.length && <p className={styles.empty}>모의 결제 성공 후 예약이 나타나요.</p>}
      </section>
    </>}

    {!pickupOnly && <section className={styles.demo} aria-labelledby="domain-demo-clock"><div className={styles.sectionTitle}><h3 id="domain-demo-clock">데모 시뮬레이터</h3><span>업무 시각 · KST {when(view.now)}</span></div>
      <p className={styles.note}>시간 이동은 세션 전체에 남아요. 현재 점포의 기한·배정·모의 결제를 처리하며 앱을 닫은 동안 자동 실행하지 않아요. 시간 조회만으로 저장 상태를 바꾸지는 않아요.</p>
      <div className={styles.actions}><button type="button" disabled={disabled} onClick={() => void send({ type: "clock.tick" })}>현재 시각으로 상태 처리</button>{role === "merchant" && <><button type="button" disabled={disabled} onClick={() => void send({ type: "clock.advance", milliseconds: 47 * 3_600_000 })}>모의 시간 +47시간</button><button type="button" disabled={disabled} onClick={() => void send({ type: "clock.advance", milliseconds: 3_600_000 })}>모의 시간 +1시간</button></>}</div>
      <label className={styles.check}><input type="checkbox" checked={failPayments} disabled={disabled} onChange={event => setFailPayments(event.target.checked)} /><span>모의 결제 실패 주입 · 켜진 동안 이 화면의 미결제 요청에 적용</span></label>
      <p className={styles.note}>실패는 예약 성공이 아니며 물량을 반환해요. 고객이 원인·조건을 확인하고 재동의하기 전 자동 재시도하지 않아요. 정상 재시도 전 실패 주입을 꺼주세요.</p>
    </section>}
  </section>;
}

function MerchantAssistant({ state, storeId, revision, budgetWon, selectedProductIds, pendingProductIds, disabled, onApply }: {
  state: DomainState; storeId: string; revision: number; budgetWon: number; selectedProductIds: string[]; pendingProductIds: string[]; disabled: boolean;
  onApply: (output: MerchantOutput, selectedIds: string[]) => void;
}) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<AssistantStatus | null>(null);
  const [statusAttempt, setStatusAttempt] = useState(0);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState("");
  const [proposal, setProposal] = useState<{ output: MerchantOutput; ids: string[]; snapshot: string; sequence: number; model: string; usage: MerchantResponse["usage"] } | null>(null);
  const controller = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const snapshot = JSON.stringify([state.sessionId, state.generation, revision, storeId, budgetWon, selectedProductIds, pendingProductIds]);
  const latestSnapshot = useRef(snapshot);
  latestSnapshot.current = snapshot;
  const allowedIds = state.products.map(product => product.id);
  const aiReady = status?.configured === true && status.mode === "live";
  const stale = proposal !== null && (proposal.snapshot !== snapshot || proposal.sequence !== sequence.current);
  const applicable = proposal?.output.scope === "current_batch" && !["clarify", "unsupported"].includes(proposal.output.action);
  useEffect(() => {
    const abort = new AbortController();
    let active = true;
    const timer = setTimeout(() => abort.abort(), 10_000);
    setStatusLoading(true); setStatusError(""); setStatus(null);
    void (async () => {
      try {
        const response = await fetch("/api/assistant/status", { cache: "no-store", signal: abort.signal });
        const data: unknown = await response.json();
        if (!response.ok || !isObject(data) || typeof data.configured !== "boolean" || !["live", "fixture", "unconfigured"].includes(String(data.mode))) throw new Error("Invalid status");
        if (active && !abort.signal.aborted) setStatus({ configured: data.configured, mode: data.mode as AssistantStatus["mode"] });
      } catch { if (active) setStatusError("AI 설정을 확인하지 못했어요. 다시 확인하거나 수동 선택을 사용해주세요."); }
      finally { clearTimeout(timer); if (active) setStatusLoading(false); }
    })();
    return () => { active = false; abort.abort(); clearTimeout(timer); };
  }, [statusAttempt]);
  useEffect(() => {
    sequence.current++;
    controller.current?.abort(); controller.current = null;
    setThinking(false);
    setProposal(current => current ? { ...current, sequence: -1 } : null);
  }, [snapshot, disabled]);
  useEffect(() => () => { sequence.current++; controller.current?.abort(); }, []);
  function edit(value: string) {
    sequence.current++; controller.current?.abort(); controller.current = null;
    setText(value); setThinking(false); setProposal(null); setError("");
  }
  async function propose(event: FormEvent) {
    event.preventDefault();
    if (disabled || controller.current || !aiReady || statusLoading) return;
    setProposal(null); setError("");
    if (selectedProductIds.length > 20 || pendingProductIds.length > 20) { setError("현재 AI 변경안 계약은 상품 20개 이내예요. 더 큰 묶음은 아래 수동 선택을 사용해주세요. 자동으로 잘라 실행하지 않아요."); return; }
    const abort = new AbortController(); controller.current = abort;
    const generation = ++sequence.current;
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; abort.abort(); }, 45_000);
    setThinking(true);
    try {
      const input = parseMerchantRequest({ text: text.trim(), id: crypto.randomUUID(), generation, storeId, budgetWon, selectedProductIds }, allowedIds, state.stores.map(store => store.id));
      const response = await fetch("/api/assistant/merchant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), signal: abort.signal });
      const data: unknown = await response.json().catch(() => { throw new AssistantError("MODEL_MALFORMED"); });
      if (sequence.current !== generation || latestSnapshot.current !== snapshot) return;
      if (timedOut) throw new AssistantError("MODEL_TIMEOUT");
      if (!response.ok || !isObject(data) || data.ok !== true) {
        const code = isObject(data) && isObject(data.error) ? data.error.code : undefined;
        throw new AssistantError(typeof code === "string" && Object.hasOwn(errorMessages, code) ? code as AssistantErrorCode : "MODEL_UPSTREAM");
      }
      if (data.id !== input.id || data.generation !== generation || data.mode !== "live" || typeof data.model !== "string" || !data.model.trim() || data.model.length > 120 || !isObject(data.usage) || !integer(data.usage.inputTokens) || !integer(data.usage.outputTokens)) throw new AssistantError("MODEL_MALFORMED");
      const output = parseMerchantOutput({ action: data.action, scope: data.scope, view: data.view, selection: data.selection, productIds: data.productIds, budgetWon: data.budgetWon, message: data.message }, allowedIds);
      const ids = output.scope === "current_batch" && !["clarify", "unsupported"].includes(output.action) ? resolveMerchantProposal(input, output, pendingProductIds, allowedIds).selectedProductIds : selectedProductIds;
      setProposal({ output, ids, snapshot, sequence: generation, model: data.model, usage: { inputTokens: data.usage.inputTokens, outputTokens: data.usage.outputTokens } });
    } catch (caught) {
      if (sequence.current === generation && latestSnapshot.current === snapshot) setError(timedOut ? errorMessages.MODEL_TIMEOUT : caught instanceof AssistantError ? caught.message : errorMessages.MODEL_NETWORK);
    } finally {
      clearTimeout(timer);
      if (sequence.current === generation) { controller.current = null; setThinking(false); }
    }
  }
  return <section className={styles.assistant} aria-label="실제 AI 경영주 변경안"><div className={styles.sectionTitle}><h3>이번 묶음, 이렇게 바꿔볼까요?</h3><span className={styles.badge}>실제 AI · 제안만</span></div>
    <p className={styles.note} role="status">{statusLoading ? "AI 설정 확인 중…" : statusError || (aiReady ? "실제 AI를 호출해 선택·조회·이번 묶음 매입 한도 변경안을 만들어요." : "실제 AI 설정이 필요해요. 로컬 해석으로 자동 전환하지 않으며 수동 선택은 사용할 수 있어요.")}</p>
    <button type="button" disabled={disabled || thinking || statusLoading} onClick={() => setStatusAttempt(current => current + 1)}>AI 설정 다시 확인</button>
    <form className={styles.form} onSubmit={propose}><label>조회·선택·이번 묶음 지시<input value={text} maxLength={300} disabled={disabled} placeholder="샌드위치는 빼고 매입 2만원 이내로" onChange={event => edit(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && event.nativeEvent.isComposing) event.preventDefault(); }} /></label><button className={styles.primary} disabled={disabled || thinking || !aiReady || statusLoading || !text.trim() || !integer(budgetWon, 0, DOMAIN_POLICY.maxBudgetWon)}>{thinking ? "AI 변경안 만드는 중…" : "AI 변경안 보기"}</button></form>
    <div className={styles.actions}>{["미확보 요청만 보여줘", "샌드위치는 빼고 매입 2만원 이내로", "선택 모두 해제"].map(example => <button key={example} type="button" disabled={disabled} onClick={() => edit(example)}>{example}</button>)}{thinking && <button type="button" onClick={() => edit(text)}>AI 요청 취소</button>}</div>
    <p className={styles.note}>예시는 입력만 채워요. 공급·수량·금액의 진실은 도메인 상태이며 AI 설명은 실제 가격·재고 확인이나 실행 결과가 아니에요.</p>
    {error && <p className={styles.error} role="alert">{error} 입력은 유지했어요.</p>}
    {proposal && <div className={styles.batch}><span className={styles.badge}>실제 AI · {proposal.model}</span><p>{proposal.output.message}</p>
      {applicable ? <><p>조회: {proposal.output.view === "requested" ? "대기·재확인 요청" : proposal.output.view === "approved" ? "발주 이력·예약 요청" : "전체 요청"}<br />선택: {proposal.ids.map(id => state.products.find(product => product.id === id)?.name ?? id).join(" · ") || "없음"}<br />이번 묶음 매입 한도: {won(budgetWon)} → {won(proposal.output.budgetWon ?? budgetWon)}</p><p>적용은 화면 선택·조회·이번 묶음 한도만 변경해요. 누적 정책 예산 저장이나 발주 승인은 하지 않아요.</p>{stale && <p className={styles.warning}>점포·요청·예산·선택이 바뀌어 만료됐어요. 다시 제안받아주세요.</p>}<button type="button" className={styles.primary} disabled={disabled || thinking || stale} onClick={() => { if (proposal.snapshot !== latestSnapshot.current || proposal.sequence !== sequence.current) return; onApply(proposal.output, proposal.ids); setProposal(null); }}>확인하고 화면 변경안 적용</button></> : <p>{proposal.output.scope === "future_policy" ? "앞으로의 지속 정책은 아래 ‘앞으로의 자동발주, 말로 제안받기’에서 구체적인 대상·예산·ON/OFF를 확인해주세요. 이번 묶음의 선택이나 예산을 자동으로 정책에 옮기지 않아요." : proposal.output.action === "clarify" ? "추가 확인이 필요해요. 입력을 보완하고 다시 요청해주세요. 현재 선택은 유지돼요." : "지원하지 않는 지시예요. 이번 묶음 지시로 다시 입력하거나 수동 설정을 사용해주세요."}</p>}
      <button type="button" disabled={disabled} onClick={() => setProposal(null)}>제안 닫기</button><details><summary>AI 사용량</summary><p>입력 {proposal.usage.inputTokens} · 출력 {proposal.usage.outputTokens} 토큰</p></details>
    </div>}
  </section>;
}

const waitingLabels: Record<CustomerWaiting["code"], string> = {
  RECONSENT_REQUIRED: "현재 구매 조건을 확인하고 다시 동의해주세요.",
  SUPPLY_CONFIRMATION_PENDING: "발주 물량의 공급 확정을 기다려요. 아직 확보 완료가 아니에요.",
  CONDITION_UNKNOWN: "모의 발주 조건 확인을 기다려요. 실제 품절을 뜻하지 않아요.",
  SIMULATED_SUPPLY_UNAVAILABLE: "현재 모의 조건에서는 공급할 수 없어요. 실제 점포 재고와는 달라요.",
  ORDER_WINDOW_CLOSED: "모의 발주 가능 기한이 닫혀 있어요.",
  MINIMUM_OR_PACK_WAIT: "최소 발주·포장 조건 또는 모의 공급 한도 확인을 기다려요.",
  STORE_REVIEW_PENDING: "점포의 검토를 기다려요. 아직 발주·공급 확보가 확정되지 않았어요.",
  ALLOCATION_PENDING: "확보 물량의 배정 처리를 기다려요. 아직 구매 완료가 아니에요.",
};

function CustomerRequest({ detail, condition, name, now, revision, disabled, send }: {
  detail: RequestDetail; condition?: Condition; name: string; now: number; revision: number; disabled: boolean; send: Send;
}) {
  const { request, reservation, waiting } = detail;
  const pickupReady = reservation?.status === "pickup_ready" && reservation.pickupAvailableAt !== null && reservation.pickupDeadlineAt !== null && now < reservation.pickupDeadlineAt;
  const [quantity, setQuantity] = useState(String(request.quantity));
  const [consent, setConsent] = useState(false);
  const [confirmedRevision, setConfirmedRevision] = useState(revision);
  const [consentedTerms, setConsentedTerms] = useState("");
  const needsConsent = request.status === "review_required" || (request.status === "pending" && !detail.consentValid);
  const editable = request.status === "pending" && detail.consentValid && !detail.links.some(link => link.active) && !detail.allocations.some(allocation => allocation.releasedAt === null);
  const actionable = needsConsent || editable;
  const count = needsConsent ? request.quantity : Number(quantity);
  const terms = JSON.stringify([revision, request.id, needsConsent, count, condition?.version, condition?.unitPrice, condition?.requestable]);
  const stale = confirmedRevision !== revision || (consent && consentedTerms !== terms);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!condition?.requestable || !consent || stale || !integer(count, 1, DOMAIN_POLICY.maxRequestQuantity)) return;
    const shared = { requestId: request.id, consent: true as const, unitPrice: condition.unitPrice, conditionVersion: condition.version };
    if (await send(needsConsent ? { type: "request.reconsent", ...shared } : { type: "request.change", quantity: count, ...shared }, confirmedRevision)) setConsent(false);
  }
  return <article className={styles.card}>
    <div className={styles.sectionTitle}><h4>{name} · {request.quantity}개</h4><span className={styles.badge}>{labels[reservation?.status ?? (needsConsent ? "review_required" : request.status)]}</span></div>
    <p>동의한 판매가 {won(request.unitPrice)} / 개 · 합계 {won(request.unitPrice * request.quantity)}</p>
    {waiting && <div className={styles.waiting}>
      <strong>{waitingLabels[waiting.code]}</strong>
      {waiting.code === "MINIMUM_OR_PACK_WAIT" && <p>{waiting.moq !== undefined && <>최소 발주량 {waiting.moq}개 (모의)</>}{waiting.moq !== undefined && waiting.packSize !== undefined && " · "}{waiting.packSize !== undefined && <>포장 단위 {waiting.packSize}개 (모의)</>}</p>}
      <p>상태 확인 {when(waiting.checkedAt)} · KST · 데모 시각</p>
    </div>}
    <ol className={styles.timeline}>
      <li><strong>요청 접수</strong><span>{when(request.createdAt)} · 접수 순번 {request.sequence}</span></li>
      <li><strong>발주·공급</strong><span>진행 중 발주 연결 {detail.links.filter(link => link.active).length}건 · 연결 출처 중 공급 확정 {detail.lines.filter(line => line.supplied).length}건</span></li>
      <li><strong>모의 결제</strong>{detail.payments.length ? detail.payments.map(payment => <span key={payment.id}>{when(payment.createdAt)} · {payment.status === "succeeded" ? "성공" : "실패 · 예약 아님"} · {won(payment.amountWon)}</span>) : <span>아직 결제 전 · 공급 확보·유효 동의 확인 후 처리</span>}</li>
      <li><strong>예약·픽업</strong><span>{reservation ? labels[reservation.status] : "예약 없음"}</span></li>
    </ol>
    {reservation ? <div className={`${styles.pickup} ${pickupReady ? styles.pickupReady : ""}`}>
      <strong className={pickupReady ? styles.pickupTitle : undefined}>{pickupReady ? "여기 있GS · 픽업 가능" : labels[reservation.status]}</strong>
      {pickupReady && <div className={styles.pickupDeadline}><span>픽업 마감 · 이 시각 전까지 수령해주세요 (KST)</span><strong>{when(reservation.pickupDeadlineAt)}</strong></div>}
      <p>예약번호 <code>{reservation.code}</code></p>
      <p>최초 픽업 알림 {when(reservation.pickupAvailableAt)} · KST{!pickupReady && <><br />픽업 마감 {when(reservation.pickupDeadlineAt)} · KST</>}</p>
      {pickupReady && reservation.pickupDeadlineAt !== null && <p>최초 알림부터 정확히 48시간 · 남은 시간 약 {Math.max(0, Math.ceil((reservation.pickupDeadlineAt - now) / 60_000)).toLocaleString("ko-KR")}분 · 마감 시각부터 수령 불가</p>}
      <p>{reservation.status === "confirmed" ? "입고 대기예요. 아직 픽업 48시간이 시작되지 않았어요." : reservation.status === "pickup_expired" ? "기한이 지났어요. 자동 환불·재판매·예외 수령은 제공하지 않아요." : reservation.status === "collected" ? `전량 수령 완료 · ${when(reservation.collectedAt)}` : "고객이 직접 수령 완료하지 않아요. 해당 점포 경영주가 예약번호를 확인해 처리해요."}</p>
    </div> : <p className={styles.note}>구매 동의 {when(request.consentAt)} → {when(request.consentExpiresAt)} · 7일<br />입고 후 최초 픽업 알림부터 별도로 정확히 48시간이에요.</p>}
    {request.reason && <p className={styles.warning}>{labels[request.reason] ?? request.reason}</p>}
    {actionable && <form className={styles.form} onSubmit={submit}>
      <strong>{needsConsent ? "현재 조건 확인 · 7일 재동의" : "미연결 요청 수량 변경"}</strong>
      {!needsConsent && <label>수량 · 1~{DOMAIN_POLICY.maxRequestQuantity}<input type="number" min="1" max={DOMAIN_POLICY.maxRequestQuantity} step="1" value={quantity} disabled={disabled} onChange={event => { setQuantity(event.target.value); setConsent(false); setConfirmedRevision(revision); }} /></label>}
      <p className={styles.note}>{condition?.requestable ? `현재 판매가 ${won(condition.unitPrice)} × ${count}개 · 조건 ${condition.version}` : "현재 요청 가능 조건이 없어 재동의·변경할 수 없어요."}</p>
      <label className={styles.check}><input type="checkbox" checked={consent && !stale} disabled={disabled || !condition?.requestable} onChange={event => { setConsent(event.target.checked); setConfirmedRevision(revision); setConsentedTerms(terms); }} /><span>상품·현재 점포·수량·판매가를 확인하고 공급 확보 후 모의 자동 구매에 새로 동의해요.</span></label>
      <p className={styles.note}>{needsConsent ? "재동의는 새 접수 순번으로 복귀해요. 확보 잔량이 있으면 즉시 모의 결제될 수 있어요." : "유효 조건에서 수량만 줄이면 순번 유지, 늘리면 새 순번이에요. 만료·조건 변경은 감소로 우회하지 않아요."}</p>
      {stale && consent && <p className={styles.warning}>상태가 바뀌었어요. 위 조건을 다시 확인하고 동의해주세요.</p>}
      <button className={styles.primary} disabled={disabled || !consent || stale || !condition?.requestable || !integer(count, 1, DOMAIN_POLICY.maxRequestQuantity) || (!needsConsent && count === request.quantity)}>{needsConsent ? "현재 조건으로 재동의 (모의)" : "새 동의로 수량 변경"}</button>
    </form>}
    {!actionable && request.status === "pending" && <p className={styles.note}>발주에 연결되거나 배정된 요청은 수량을 바꿀 수 없어요.</p>}
    {["pending", "review_required"].includes(request.status) && <button type="button" className={styles.danger} disabled={disabled} onClick={() => void send({ type: "request.cancel", requestId: request.id })}>모의 결제 전 요청 취소</button>}
  </article>;
}

function MerchantDemand({ state, view, storeId, disabled, send }: { state: DomainState; view: View; storeId: string; disabled: boolean; send: Send }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [selectionRevision, setSelectionRevision] = useState(view.revision);
  const [batchBudgetInput, setBatchBudgetInput] = useState("");
  const [filter, setFilter] = useState<MerchantOutput["view"]>("all");
  const eligible = view.demand.filter(demand => demand.orderableQuantity > 0);
  const items = eligible.filter(demand => selected.includes(demand.productId)).flatMap(demand => {
    const condition = state.conditions.find(condition => condition.storeId === storeId && condition.productId === demand.productId);
    return condition ? [{ productId: demand.productId, quantity: demand.orderableQuantity, conditionVersion: condition.version, unitCost: condition.unitCost }] : [];
  });
  const cost = items.reduce((total, item) => total + item.quantity * item.unitCost, 0);
  const remaining = view.policy ? view.policy.budgetWon - view.policy.spentWon : 0;
  const batchBudget = batchBudgetInput.trim() === "" ? remaining : Number(batchBudgetInput);
  const validBudget = integer(batchBudget, 0, DOMAIN_POLICY.maxBudgetWon);
  const pendingIds = [...new Set(view.requests.filter(detail => detail.request.status === "pending" && detail.consentValid).map(detail => detail.request.productId))];
  const hasUnavailable = selected.some(id => !items.some(item => item.productId === id));
  const shownRequests = view.requests.filter(detail => filter === "all" || (filter === "requested" ? ["pending", "review_required"].includes(detail.request.status) : detail.links.length > 0 || detail.reservation !== null));
  const stale = selectionRevision !== view.revision;
  return <section className={styles.section}>
    <MerchantAssistant state={state} storeId={storeId} revision={view.revision} budgetWon={batchBudget} selectedProductIds={selected} pendingProductIds={pendingIds} disabled={disabled} onApply={(output, ids) => {
      setFilter(output.view);
      if (output.action === "select") { setSelected(ids); setSelectionRevision(view.revision); }
      if (output.budgetWon !== null) setBatchBudgetInput(String(output.budgetWon));
    }} />
    <div className={styles.sectionTitle}><h3>수요 묶음 · 보수적 발주</h3><span>{view.demand.length}개 상품</span></div>
    <div className={styles.metrics}><p>누적 매입 예산<strong>{won(view.policy?.budgetWon ?? 0)}</strong></p><p>사용·점유<strong>{won(view.policy?.spentWon ?? 0)}</strong></p><p>남은 예산<strong>{won(remaining)}</strong></p></div>
    <p className={styles.note}>처음 예산은 0원이며 아래 설정에서 명시적으로 확인해야 해요. 발주 가능 수량은 도메인의 현재 수요·미확정 발주·확보 잔량·MOQ·포장·매입 예산 계산 결과예요. 각 상품의 가능량을 모두 합치면 예산을 넘을 수 있어요.</p>
    <div className={styles.actions} aria-label="요청 조회 필터">{([['all', '전체 요청'], ['requested', '대기·재확인'], ['approved', '발주 이력·예약']] as const).map(([value, title]) => <button key={value} type="button" disabled={disabled} aria-pressed={filter === value} onClick={() => setFilter(value)}>{title}</button>)}</div>
    <div className={styles.actions}><button type="button" disabled={disabled || !eligible.length} onClick={() => { setSelected(eligible.map(demand => demand.productId)); setSelectionRevision(view.revision); }}>현재 발주 가능 상품 전체 선택</button><button type="button" disabled={disabled} onClick={() => { setSelected([]); setSelectionRevision(view.revision); }}>선택 해제</button></div>
    <div className={styles.grid}>{view.demand.filter(demand => shownRequests.some(detail => detail.request.productId === demand.productId)).map(demand => {
      const product = state.products.find(product => product.id === demand.productId);
      const condition = state.conditions.find(condition => condition.storeId === storeId && condition.productId === demand.productId);
      const details = shownRequests.filter(detail => detail.request.productId === demand.productId);
      return <article className={styles.card} key={demand.productId}><label className={styles.check}><input type="checkbox" checked={selected.includes(demand.productId)} disabled={disabled || !demand.orderableQuantity} onChange={event => { setSelected(current => event.target.checked ? [...new Set([...current, demand.productId])] : current.filter(id => id !== demand.productId)); setSelectionRevision(view.revision); }} /><strong>{product?.name ?? demand.productId}</strong></label>
        <dl className={styles.facts}><div><dt>유효 수요</dt><dd>{demand.validQuantity}개</dd></div><div><dt>미확정 발주</dt><dd>{demand.outstandingQuantity}개</dd></div><div><dt>미배정 확보</dt><dd>{demand.pooledQuantity}개</dd></div><div><dt>부족분</dt><dd>{demand.shortage}개</dd></div><div><dt>발주 가능</dt><dd>{demand.orderableQuantity}개</dd></div><div><dt>매입 단가</dt><dd>{condition ? won(condition.unitCost) : "미확인"}</dd></div></dl>
        {condition && <p className={styles.note}>최소 {condition.moq}개 · {condition.packSize}개 단위 · 판매가 {won(condition.unitPrice)} (모의)</p>}
        {demand.reason && <p className={styles.warning}>{labels[demand.reason] ?? demand.reason}</p>}
        <details><summary>고객별 요청 상세 · {details.length}건</summary>{details.map(detail => <div className={styles.detailRow} key={detail.request.id}><strong>{detail.actor.displayName} · {detail.request.quantity}개</strong><p>{won(detail.request.unitPrice)} / 개 · 순번 {detail.request.sequence} · {when(detail.request.createdAt)}</p><p>동의 {detail.consentValid ? "유효" : "만료 또는 조건 불일치"} · {when(detail.request.consentAt)} → {when(detail.request.consentExpiresAt)}</p><p>발주 연결 {detail.links.filter(link => link.active).length}건 · 배정 {detail.allocations.filter(allocation => allocation.releasedAt === null).reduce((sum, allocation) => sum + allocation.quantity, 0)}개 · 모의 결제 {detail.payments.at(-1)?.status === "succeeded" ? "성공" : detail.payments.at(-1)?.status === "failed" ? "실패" : "전"}</p><p>{labels[detail.reservation?.status ?? detail.request.status]}</p></div>)}</details>
      </article>;
    })}</div>
    {!view.demand.length && <p className={styles.empty}>현재 점포의 요청이 없어요. 고객 검색에서 요청을 저장하면 여기에 반영돼요.</p>}
    {!!view.demand.length && !shownRequests.length && <p className={styles.empty}>이 조회 조건의 요청이 없어요. 전체 요청에서 확인해주세요.</p>}
    <div className={styles.batch}><strong>선택 {selected.length}개 상품 · 현재 가능 매입 합계 {won(cost)}</strong>
      <label className={styles.field}>이번 묶음 매입 한도 (원)<input type="number" min="0" max={DOMAIN_POLICY.maxBudgetWon} step="1" value={batchBudgetInput} disabled={disabled} placeholder={String(remaining)} onChange={event => setBatchBudgetInput(event.target.value)} /></label><p>빈칸이면 남은 누적 예산 {won(remaining)}을 한도로 사용해요. 이 입력은 저장된 정책 예산을 변경하지 않아요.</p>
      {items.map(item => <p key={item.productId}>{state.products.find(product => product.id === item.productId)?.name ?? item.productId} · {item.quantity}개 × 매입 {won(item.unitCost)} = {won(item.quantity * item.unitCost)}</p>)}
      <p>필터와 무관하게 위 선택 전체를 승인해요. 수량은 도메인의 발주 가능량이며 임의로 예산에 맞춰 줄이지 않아요. 하나라도 조건이 바뀌면 전체 미실행이에요. 공급 확보·모의 결제·예약은 별도 상태예요.</p>
      {stale && selected.length > 0 && <p className={styles.warning}>목록이 바뀌었어요. 선택을 해제하고 현재 묶음을 다시 확인해주세요.</p>}
      {hasUnavailable && <p className={styles.warning}>선택에 현재 발주 불가 상품이 포함돼 있어요. 일부만 몰래 승인하지 않아요. 선택을 해제하고 조건을 다시 확인해주세요.</p>}
      {(!validBudget || cost > remaining || cost > batchBudget) && <p className={styles.warning}>묶음 합계가 이번 한도 또는 남은 누적 예산을 넘거나 한도가 올바르지 않아요. 상품 선택·이번 한도·정책 예산을 확인해주세요.</p>}
      <button type="button" className={styles.primary} disabled={disabled || stale || hasUnavailable || !items.length || !validBudget || cost > remaining || cost > batchBudget || !integer(cost)} onClick={async () => { if (await send({ type: "order.approve", items: items.map(({ productId, quantity, conditionVersion }) => ({ productId, quantity, conditionVersion })) }, selectionRevision)) setSelected([]); }}>확인한 묶음 발주 승인 (모의)</button>
    </div>
  </section>;
}

function PolicyEditor({ policy, state, actorId, revision, disabled, send }: { policy: Policy; state: DomainState; actorId: string; revision: number; disabled: boolean; send: Send }) {
  const [enabled, setEnabled] = useState(policy.enabled);
  const [budget, setBudget] = useState(String(policy.budgetWon));
  const [productIds, setProductIds] = useState(policy.productIds);
  const [proposal, setProposal] = useState<{ enabled: boolean; budgetWon: number; productIds: string[]; revision: number } | null>(null);
  const [draftRevision, setDraftRevision] = useState(0);
  const hasManualDraft = enabled !== policy.enabled || budget !== String(policy.budgetWon) || productIds.length !== policy.productIds.length || productIds.some(id => !policy.productIds.includes(id));
  const edited = () => { setProposal(null); setDraftRevision(value => value + 1); };
  const budgetWon = Number(budget);
  const valid = budget.trim() !== "" && integer(budgetWon, policy.spentWon, DOMAIN_POLICY.maxBudgetWon) && (!enabled || productIds.length > 0);
  const products = state.products.filter(product => state.conditions.some(condition => condition.storeId === policy.storeId && condition.productId === product.id));
  return <section className={styles.policy}>
    <div className={styles.sectionTitle}><h3>점포 예산 · 자동발주 정책</h3><span className={styles.badge}>{policy.enabled ? "저장된 정책 켜짐" : "저장된 정책 꺼짐"}</span></div>
    <p className={styles.note}>기본 꺼짐. 초기화까지 누적 매입 예산이며 일별로 복구되지 않아요. 이미 사용·점유한 {won(policy.spentWon)} 아래로 낮출 수 없어요. 활성화하면 현재 수요에도 즉시 발주할 수 있어요.</p>
    <PolicyAssistant policy={policy} state={state} actorId={actorId} revision={revision} disabled={disabled} draftRevision={draftRevision} hasManualDraft={hasManualDraft} onSave={(setting, expectedRevision) => send({ type: "policy.set", ...setting }, expectedRevision)} />
    <h4>직접 정책 설정</h4>
    <form onSubmit={event => { event.preventDefault(); if (valid && !disabled) { setDraftRevision(value => value + 1); setProposal({ enabled, budgetWon, productIds: [...productIds], revision }); } }}>
      <label className={styles.check}><input type="checkbox" checked={enabled} disabled={disabled} onChange={event => { setEnabled(event.target.checked); edited(); }} />앞으로 이 점포의 선택 상품에 보수적 자동발주 사용</label>
      <label className={styles.field}>누적 매입 예산 (원)<input type="number" min={policy.spentWon} max={DOMAIN_POLICY.maxBudgetWon} step="1" value={budget} disabled={disabled} onChange={event => { setBudget(event.target.value); edited(); }} /></label>
      <details><summary>정책 대상 상품 선택 · {productIds.length}개</summary><div className={styles.productChoices}>{products.map(product => <label key={product.id} className={styles.check}><input type="checkbox" checked={productIds.includes(product.id)} disabled={disabled} onChange={event => { setProductIds(current => event.target.checked ? [...new Set([...current, product.id])] : current.filter(id => id !== product.id)); edited(); }} />{product.name}</label>)}</div></details>
      {!valid && <p className={styles.warning}>예산 범위와 자동발주 대상 상품을 확인해주세요.</p>}
      <button type="submit" disabled={disabled || !valid}>설정 변경안 확인</button>
    </form>
    {proposal && <div className={styles.batch}><strong>저장 전 최종 확인</strong><p>자동발주 {policy.enabled ? "켜짐" : "꺼짐"} → {proposal.enabled ? "켜짐" : "꺼짐"}<br />누적 예산 {won(policy.budgetWon)} → {won(proposal.budgetWon)}</p><p>대상: {proposal.productIds.map(id => state.products.find(product => product.id === id)?.name ?? id).join(" · ") || "없음"}</p><p>켜면 현재·새 요청과 조건 변경 시 정책 범위 안에서 건별 승인 없이 모의 발주해요. 앱을 닫은 동안 실행하지 않아요. 이미 낸 발주는 정책을 꺼도 취소되지 않아요.</p>{proposal.revision !== revision && <p className={styles.warning}>상태가 바뀌어 만료된 제안이에요. 변경안을 다시 확인해주세요.</p>}<div className={styles.actions}><button type="button" className={styles.primary} disabled={disabled || proposal.revision !== revision} onClick={async () => { if (await send({ type: "policy.set", enabled: proposal.enabled, budgetWon: proposal.budgetWon, productIds: proposal.productIds }, proposal.revision)) setProposal(null); }}>확인하고 정책·예산 저장</button><button type="button" disabled={disabled} onClick={() => setProposal(null)}>변경안 취소</button></div></div>}
    <button type="button" disabled={disabled || !policy.enabled} onClick={() => void send({ type: "auto.run" })}>저장된 정책 지금 실행 (모의)</button>
  </section>;
}

function SupplyLine({ line, name, source, disabled, send }: { line: OrderLine; name: string; source: "manual" | "auto"; disabled: boolean; send: Send }) {
  const [quantity, setQuantity] = useState(String(line.quantity));
  const count = Number(quantity);
  return <article className={styles.card}><div className={styles.sectionTitle}><h4>{name} · 발주 {line.quantity}개</h4><span className={styles.badge}>{source === "auto" ? "정책 자동발주" : "묶음 수동 승인"}</span></div><p>매입 {won(line.unitCost)} / 개 · {won(line.unitCost * line.quantity)}</p>
    {line.suppliedQuantity === null ? <form className={styles.form} onSubmit={event => { event.preventDefault(); if (quantity.trim() && integer(count, 0, line.quantity)) void send({ type: "supply.finalize", lineId: line.id, quantity: count }); }}><label>최종 공급량 · 0~{line.quantity}개<input type="number" min="0" max={line.quantity} step="1" value={quantity} disabled={disabled} onChange={event => setQuantity(event.target.value)} /></label><p className={styles.note}>한 번만 최종 확정해요. 부족분만 매입 예산을 반납하고, 확보 물량은 FIFO 전량 배정·모의 결제로 이어져요.</p><button className={styles.primary} disabled={disabled || !quantity.trim() || !integer(count, 0, line.quantity)}>공급 {integer(count, 0, line.quantity) ? count : "확인 필요"}개 최종 확정 (모의)</button></form> : <><p>공급 확정 {line.suppliedQuantity}개 · {when(line.suppliedAt)}</p><p>입고 {line.receivedAt === null ? "아직 전" : `완료 · ${when(line.receivedAt)}`}</p><button type="button" className={styles.primary} disabled={disabled || line.receivedAt !== null} onClick={() => void send({ type: "receive.full", lineId: line.id })}>확보한 {line.suppliedQuantity}개 전량 입고 (모의)</button></>}
  </article>;
}

function Collection({ reservation, title, now, disabled, send }: { reservation: Reservation; title: string; now: number; disabled: boolean; send: Send }) {
  const [code, setCode] = useState("");
  const ready = reservation.status === "pickup_ready" && reservation.pickupDeadlineAt !== null && now < reservation.pickupDeadlineAt;
  return <article className={styles.card}><div className={styles.sectionTitle}><h4>{title}</h4><span className={styles.badge}>{labels[reservation.status]}</span></div><p>최초 픽업 알림 {when(reservation.pickupAvailableAt)}<br />마감 {when(reservation.pickupDeadlineAt)} · KST</p>{reservation.status === "collected" && <p>수령 완료 {when(reservation.collectedAt)}</p>}
    <form className={styles.form} onSubmit={async event => { event.preventDefault(); if (ready && code.trim() && await send({ type: "reservation.collect", reservationId: reservation.id, code: code.trim() })) setCode(""); }}><label>고객 예약번호<input type="text" value={code} disabled={disabled || !ready} autoComplete="off" placeholder="고객의 픽업 카드에 표시된 번호" onChange={event => setCode(event.target.value)} /></label><p className={styles.note}>현재 점포·예약번호 일치·기한 내 전량 수령만 가능해요. 입고 전 수령·기한 초과 예외·부분 수령은 지원하지 않아요.</p><button className={styles.primary} disabled={disabled || !ready || !code.trim()}>예약번호 확인 후 전량 수령 (모의)</button></form>
  </article>;
}
