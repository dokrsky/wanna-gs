"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AssistantError, errorMessages, isObject, type AssistantErrorCode, type AssistantStatus } from "../../lib/assistant/contracts";
import { parsePolicyOutput, parsePolicyRequest, resolvePolicyProposal, type CurrentPolicy, type PolicyOutput, type PolicyRequest, type PolicyResponse, type PolicySetting } from "../../lib/assistant/policy-contracts";
import type { DomainState, Policy } from "../../lib/domain/types";
import { getView } from "../../lib/domain/commands";
import styles from "./domain-workspace.module.css";
import { beginMerchantAttempt } from "./merchant-run-history";
import type { MerchantTracePort } from "../../lib/merchant-trace-client";
import type { MerchantObservation } from "../../lib/domain/merchant-trace-types";

type Props = {
  policy: Policy; state: DomainState; actorId: string; revision: number; disabled: boolean;
  draftRevision: number; hasManualDraft: boolean;
  onSave: (setting: PolicySetting, revision: number, stableKey: string) => Promise<boolean>;
  forwarded?: ForwardedPolicyProposal | null;
  activity?: MerchantTracePort;
};
export type ForwardedPolicyProposal = {
  runId: string;
  input: PolicyRequest; output: PolicyOutput; model: string; usage: PolicyResponse["usage"];
  isCurrent: () => boolean;
};
// Local comparison only: never send customer details or this fingerprint to AI.
export function merchantBusinessSnapshot(state: DomainState, actorId: string, storeId: string) {
  const view = getView(state, { sessionId: state.sessionId, generation: state.generation, actorId, role: "merchant", storeId }, Date.now());
  return JSON.stringify([state.sessionId, state.generation, actorId, storeId, state.conditions.filter(row => row.storeId === storeId), view.policy,
    view.requests.map(({ waiting: _waiting, ...detail }) => detail), view.demand, view.orders, view.lines]);
}
type Proposal = {
  runId: string;
  input: PolicyRequest; output: PolicyOutput; setting: PolicySetting | null;
  snapshot: string; sequence: number; model: string; usage: PolicyResponse["usage"];
  isCurrent?: () => boolean;
};
const won = (value: number) => `${value.toLocaleString("ko-KR")}원`;
const tokenCount = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

export default function PolicyAssistant({ policy, state, actorId, revision, disabled, draftRevision, hasManualDraft, onSave, forwarded, activity }: Props) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState<AssistantStatus | null>(null);
  const [statusAttempt, setStatusAttempt] = useState(0);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState("");
  const [thinking, setThinking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const attempt = useRef<ReturnType<typeof beginMerchantAttempt> | null>(null);
  const saveLock = useRef(false);
  const mounted = useRef(false);
  const received = useRef<string | null>(null);
  const currentPolicy: CurrentPolicy = { enabled: policy.enabled, productIds: policy.productIds, budgetWon: policy.budgetWon, version: policy.version, spentWon: policy.spentWon };
  const currentSnapshot = () => JSON.stringify([merchantBusinessSnapshot(state, actorId, policy.storeId), currentPolicy, draftRevision]);
  const snapshot = currentSnapshot();
  const latest = useRef({ snapshot, disabled });
  latest.current = { snapshot, disabled };
  const allowedIds = state.products.map(product => product.id);
  const names = (ids: string[]) => ids.map(id => state.products.find(product => product.id === id)?.name ?? id).join(" · ") || "없음";
  const ready = status?.configured === true && status.mode === "live";
  const stale = proposal !== null && (proposal.snapshot !== snapshot || proposal.sequence !== sequence.current || proposal.isCurrent?.() === false);
  const changed = proposal?.output.action === "propose" && [proposal.output.enabled, proposal.output.productIds, proposal.output.budgetWon].some(value => value !== null);

  useEffect(() => {
    mounted.current = true;
    return () => { attempt.current?.finish("interrupted"); mounted.current = false; sequence.current++; controller.current?.abort(); };
  }, []);
  useEffect(() => {
    attempt.current?.finish("stale");
    sequence.current++; controller.current?.abort(); controller.current = null;
    setThinking(false); setConfirmed(false);
  }, [snapshot]);
  useEffect(() => {
    if (!forwarded || received.current === forwarded.input.id) return;
    received.current = forwarded.input.id;
    attempt.current?.finish("cancelled");
    sequence.current++; controller.current?.abort(); controller.current = null; setThinking(false);
    setConfirmed(false); setError("");
    try {
      if (!forwarded.isCurrent()) throw new AssistantError("MERCHANT_NOT_APPLICABLE");
      const output = parsePolicyOutput(forwarded.output, allowedIds, currentPolicy);
      const setting = resolvePolicyProposal(forwarded.input, output, currentPolicy, allowedIds);
      setProposal({ ...forwarded, output, setting, snapshot, sequence: sequence.current });
      setConfirmed(true);
    } catch { setProposal(null); setError("이번 묶음에서 전달한 정책 초안이 만료됐어요. 현재 선택과 정책을 확인해주세요."); }
  }, [forwarded]);
  useEffect(() => {
    if (disabled && controller.current) {
      attempt.current?.finish("stale");
      sequence.current++; controller.current.abort(); controller.current = null; setThinking(false);
    }
  }, [disabled]);
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
      } catch { if (active) setStatusError("OpenAI 설정을 확인하지 못했어요. 다시 확인하거나 아래 수동 정책 폼을 사용해주세요."); }
      finally { clearTimeout(timer); if (active) setStatusLoading(false); }
    })();
    return () => { active = false; abort.abort(); clearTimeout(timer); };
  }, [statusAttempt]);

  function edit(value: string) {
    attempt.current?.finish("cancelled");
    sequence.current++; controller.current?.abort(); controller.current = null;
    setText(value); setThinking(false); setProposal(null); setConfirmed(false); setError("");
  }
  async function propose(event: FormEvent) {
    event.preventDefault();
    if (disabled || saveLock.current || controller.current || !ready || statusLoading) return;
    setError(""); setProposal(null); setConfirmed(false);
    const abort = new AbortController(); controller.current = abort;
    const generation = ++sequence.current;
    let timedOut = false;
    let trace: ReturnType<typeof beginMerchantAttempt> | null = null;
    let observation: MerchantObservation | null = null;
    const timer = setTimeout(() => { timedOut = true; abort.abort(); }, 45_000);
    setThinking(true);
    try {
      const input = parsePolicyRequest({ text: text.trim(), id: crypto.randomUUID(), generation, storeId: policy.storeId, currentPolicy }, allowedIds, state.stores.map(store => store.id));
      const body = JSON.stringify(input);
      if (new TextEncoder().encode(body).byteLength > 4096) throw new AssistantError("BODY_TOO_LARGE");
      trace = beginMerchantAttempt(activity, input.id, "policy", body); attempt.current = trace;
      const response = await fetch("/api/assistant/policy", { method: "POST", headers: { "Content-Type": "application/json" }, body, signal: abort.signal });
      const data: unknown = await response.json().catch(() => { throw new AssistantError("MODEL_MALFORMED"); });
      if (!response.ok || !isObject(data) || data.ok !== true) {
        const code = isObject(data) && isObject(data.error) ? data.error.code : undefined;
        if (typeof code === "string" && Object.hasOwn(errorMessages, code)) observation = { status: "error", errorCode: code };
        throw new AssistantError(typeof code === "string" && Object.hasOwn(errorMessages, code) ? code as AssistantErrorCode : "MODEL_UPSTREAM");
      }
      if (data.id !== input.id || data.generation !== generation || data.storeId !== input.storeId || data.policyVersion !== input.currentPolicy.version || data.mode !== "live"
        || typeof data.model !== "string" || !data.model.trim() || data.model.length > 120 || !isObject(data.usage) || !tokenCount(data.usage.inputTokens) || !tokenCount(data.usage.outputTokens)) throw new AssistantError("MODEL_MALFORMED");
      const output = parsePolicyOutput({ action: data.action, enabled: data.enabled, productIds: data.productIds, budgetWon: data.budgetWon, message: data.message }, allowedIds, currentPolicy);
      const wire: PolicyResponse = { ...output, ok: true, id: input.id, generation, storeId: input.storeId, policyVersion: input.currentPolicy.version,
        mode: "live", model: data.model, usage: { inputTokens: data.usage.inputTokens, outputTokens: data.usage.outputTokens } };
      observation = { status: "success", responseJson: JSON.stringify(wire) };
      const outdated = !mounted.current || sequence.current !== generation || latest.current.snapshot !== snapshot || latest.current.disabled;
      trace.finish(timedOut || outdated ? "stale" : "success", null, observation);
      if (outdated || timedOut) return;
      const setting = output.action === "propose" ? resolvePolicyProposal(input, output, currentPolicy, allowedIds) : null;
      setProposal({ runId: input.id, input, output, setting, snapshot, sequence: generation, model: data.model, usage: wire.usage });
    } catch (caught) {
      trace?.finish("error", timedOut ? "MODEL_TIMEOUT" : caught instanceof AssistantError ? caught.code : "MODEL_NETWORK", observation);
      if (mounted.current && sequence.current === generation && latest.current.snapshot === snapshot) setError(timedOut ? errorMessages.MODEL_TIMEOUT : caught instanceof AssistantError ? caught.message : errorMessages.MODEL_NETWORK);
    } finally {
      clearTimeout(timer);
      if (mounted.current && sequence.current === generation) { controller.current = null; setThinking(false); }
    }
  }
  async function save() {
    if (!proposal || !confirmed || !changed || disabled || saveLock.current || thinking || proposal.snapshot !== currentSnapshot() || proposal.sequence !== sequence.current || proposal.isCurrent?.() === false) return;
    saveLock.current = true; setSaving(true); setError("");
    try {
      const setting = resolvePolicyProposal(proposal.input, proposal.output, currentPolicy, allowedIds);
      const saved = await onSave(setting, revision, `merchant-policy:${proposal.runId}`);
      if (!mounted.current) return;
      if (saved) { setProposal(null); setConfirmed(false); }
      else setError("정책을 저장하지 못했어요. 위 거래 알림을 확인하고 같은 변경안으로 다시 시도해주세요.");
    } catch {
      if (mounted.current) setError("정책 저장 결과를 확인하지 못했어요. 위 거래 알림과 같은 명령 재확인 경로를 확인해주세요.");
    } finally { saveLock.current = false; if (mounted.current) setSaving(false); }
  }

  return <section className={styles.assistant} aria-label="지속 정책 AI 변경안" aria-busy={thinking || saving}>
    <div className={styles.sectionTitle}><h4>앞으로의 자동발주, 말로 제안받기</h4><span className={styles.badge}>OpenAI · 실제 AI · 제안만</span></div>
    <p className={styles.note} role="status">{statusLoading ? "OpenAI 설정 확인 중…" : statusError || (ready ? "실제 OpenAI로 지속 정책 변경안을 만들어요. 응답만으로 저장·발주하지 않아요." : "실제 AI 설정이 필요해요. 로컬 해석으로 자동 전환하지 않으며 수동 설정은 그대로 사용할 수 있어요.")}</p>
    <button type="button" disabled={disabled || thinking || saving || statusLoading} onClick={() => { edit(text); setStatusAttempt(value => value + 1); }}>AI 설정 다시 확인</button>
    <p className={styles.note}>이 입력창의 AI는 <strong>저장된 정책</strong>을 기준으로 해석해요. 미저장 수동 초안은 보내지 않아요. 위 묶음에서 전달한 초안은 현재 선택을 대상으로 하며, 이번 한도를 누적 예산으로 자동 복사하지 않아요.</p>
    {hasManualDraft && <p className={styles.warning}>미저장 수동 초안이 있어요. AI 제안으로 덮어쓰지 않아요. AI안을 최종 저장하면 저장 정책이 바뀌어 수동 폼도 새 정책으로 초기화돼요.</p>}
    <form className={styles.form} onSubmit={propose}><label>앞으로 적용할 정책 지시<input value={text} maxLength={300} disabled={disabled || saving} placeholder="앞으로 누적 매입 예산을 8만원으로 바꿔줘" onChange={event => edit(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && event.nativeEvent.isComposing) event.preventDefault(); }} /></label><button className={styles.primary} disabled={disabled || saving || thinking || !ready || statusLoading || !text.trim()}>{thinking ? "정책 AI 변경안 만드는 중…" : error ? "같은 입력으로 AI 다시 요청" : "AI 정책 변경안 보기"}</button></form>
    <div className={styles.actions}>{["앞으로 누적 매입 예산을 8만원으로 바꿔줘", "자동발주를 꺼줘"].map(example => <button type="button" key={example} disabled={disabled || saving} onClick={() => edit(example)}>{example}</button>)}{thinking && <button type="button" onClick={() => edit(text)}>AI 요청 취소</button>}</div>
    <p className={styles.note}>예시는 입력만 채워요. ‘이번 묶음’은 위 묶음 화면을 사용해주세요. AI는 실제 재고·공급·가격·예약 성공을 판단하지 않아요.</p>
    <p className={styles.note}>이번 묶음에서 전달한 정책 초안은 상품명 재입력·추가 AI 호출 없이 같은 실행 기록으로 확인해요. {activity ? "기록 저장 오류는 아래 AI 실행 기록에서 따로 확인하고 기록만 재시도할 수 있어요." : "현재 AI 실행 기록 저장은 연결되지 않았어요."}</p>
    {error && <p role="alert" className={styles.error}>{error} 입력은 유지했어요.</p>}
    {proposal && <div className={styles.batch}>
      <span className={styles.badge}>실제 AI · {proposal.model}</span><p>{proposal.output.message}</p>
      {proposal.setting ? <>
        <p>자동발주: {proposal.input.currentPolicy.enabled ? "ON" : "OFF"} → {proposal.setting.enabled ? "ON" : "OFF"} {proposal.output.enabled === null ? "(유지)" : "(변경)"}<br />누적 매입 예산: {won(proposal.input.currentPolicy.budgetWon)} → {won(proposal.setting.budgetWon)} {proposal.output.budgetWon === null ? "(유지)" : "(변경)"}<br />이미 사용·점유: {won(proposal.input.currentPolicy.spentWon)}</p>
        <details><summary>대상 상품 전후 확인 · {proposal.input.currentPolicy.productIds.length}개 → {proposal.setting.productIds.length}개 {proposal.output.productIds === null ? "(유지)" : "(전체 교체)"}</summary><p>저장된 대상: {names(proposal.input.currentPolicy.productIds)}</p><p>변경 후 대상: {names(proposal.setting.productIds)}</p></details>
        <p>ON으로 저장하거나 켜진 정책의 예산·대상을 변경하면 <strong>현재 수요에도 즉시 모의 발주</strong>할 수 있어요. 유효 동의·미확보 수요·매입 예산·발주 조건 안에서만 실행해요. OFF나 대상 제외는 기존 발주를 취소하지 않아요. 실제 청구는 없어요.</p>
        {!changed && <p className={styles.note}>저장된 정책과 같은 변경 없는 제안이에요. 다시 저장하거나 발주를 실행하지 않아요.</p>}
        {changed && !confirmed && <button type="button" disabled={disabled || saving || thinking || stale} onClick={() => { if (proposal.snapshot === latest.current.snapshot && proposal.sequence === sequence.current) setConfirmed(true); }}>AI 변경안을 최종 확인하기 (아직 저장 안 함)</button>}
        {confirmed && <><strong>저장 전 최종 확인 · 위 ON/OFF·대상·누적 예산</strong>{hasManualDraft && <p className={styles.warning}>아래 수동 초안이 아닌 위 AI안을 저장하며, 미저장 수동 초안은 초기화돼요.</p>}<div className={styles.actions}><button type="button" className={styles.primary} disabled={disabled || saving || thinking || stale || !changed} onClick={() => void save()}>{saving ? "정책 저장 중…" : "현재 수요 발주 영향을 확인하고 AI 정책 저장"}</button><button type="button" disabled={disabled || saving} onClick={() => setConfirmed(false)}>최종 확인 취소</button></div></>}
      </> : <p>{proposal.output.action === "clarify" ? "추가 확인이 필요해요. 지시를 보완해 다시 요청해주세요. 정책·수동 초안은 유지돼요." : "지원하지 않는 지시예요. 이번 묶음 화면 또는 아래 수동 정책 폼을 사용해주세요."}</p>}
      {stale && <p className={styles.warning}>상태·정책·수동 초안이 바뀌어 만료된 제안이에요. 최신 저장 정책으로 다시 제안받아주세요.</p>}
      <button type="button" disabled={disabled || saving} onClick={() => { setProposal(null); setConfirmed(false); }}>AI 제안 닫기</button><details><summary>AI 사용량</summary><p>입력 {proposal.usage.inputTokens} · 출력 {proposal.usage.outputTokens} 토큰</p></details>
    </div>}
  </section>;
}
