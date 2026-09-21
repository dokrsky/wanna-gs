"use client";

import { useEffect, useRef, useState } from "react";
import CustomerWorkspace from "../components/customer-workspace";
import DomainWorkspace from "../components/domain-workspace";
import { previewStores, won, type PreviewDraft, type PreviewRequest } from "../demo-preview";
import { DOMAIN_POLICY } from "../../lib/domain/policy";
import { DomainSnapshotError, DomainTransitionRequiredError, LOCAL_CUSTOMER_ID, openDomainStore, type DomainStore, type PreviewArchive } from "../../lib/domain/storage";
import type { Command, CommandOutcome, DomainState } from "../../lib/domain/types";

const failure = (code: string, message: string): CommandOutcome => ({ ok: false, error: { code, message } });

export default function TransactionDemo() {
  const [state, setState] = useState<DomainState | null>(null);
  const [archive, setArchive] = useState<PreviewArchive | null>(null);
  const [role, setRole] = useState<"customer" | "merchant">("customer");
  const [storeId, setStoreId] = useState("");
  const [busy, setBusy] = useState(false);
  const [startRequired, setStartRequired] = useState(false);
  const [error, setError] = useState("");
  const [resetConfirm, setResetConfirm] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const store = useRef<DomainStore | null>(null);
  const recovery = useRef<(() => Promise<DomainStore>) | null>(null);
  const writing = useRef(false);
  const drafts = useRef(new Map<string, Command>());

  function accept(opened: DomainStore) {
    store.current = opened;
    const next = opened.state;
    setState(next); setArchive(opened.archive);
    setStoreId(current => next.stores.some(entry => entry.id === current) ? current : next.stores[0].id);
    setStartRequired(false); setError(""); recovery.current = null;
  }

  useEffect(() => {
    let active = true;
    openDomainStore().then(opened => { if (active) accept(opened); }).catch((caught: unknown) => {
      if (!active) return;
      if (caught instanceof DomainTransitionRequiredError) setStartRequired(true);
      else if (caught instanceof DomainSnapshotError) { recovery.current = caught.reset; setError(caught.message); }
      else setError("거래 저장소를 불러오지 못했어요. 기존 데이터를 지우지 않았어요. 네트워크·저장 권한을 확인하고 다시 불러와 주세요.");
    });
    return () => { active = false; };
  }, [loadAttempt]);

  async function start() {
    if (writing.current) return;
    writing.current = true; setBusy(true); setError("");
    try { accept(await openDomainStore({ confirmNewDomain: true })); }
    catch { setError("새 거래 데모를 저장하지 못했어요. 이전 Preview는 유지돼요. 다시 시도해주세요."); }
    finally { writing.current = false; setBusy(false); }
  }

  const actorId = role === "customer" ? LOCAL_CUSTOMER_ID : state?.actors.find(actor => actor.role === "merchant" && actor.storeId === storeId)?.id ?? "";

  async function execute(command: Command, creating = false): Promise<CommandOutcome> {
    if (!store.current || writing.current) return failure("BUSY", "저장이 끝난 뒤 다시 시도해주세요.");
    if (command.role !== role || command.actorId !== actorId || (!creating && command.storeId !== storeId)
      || (creating && (role !== "customer" || command.type !== "request.create"))) return failure("FORBIDDEN", "현재 역할·점포를 확인해주세요.");
    writing.current = true; setBusy(true); setError("");
    try {
      const result = await store.current.execute(command);
      if (result.ok) {
        setState(store.current.state);
        if (creating) setStoreId(command.storeId);
      } else setError(result.error.message);
      return result;
    } catch (caught) {
      setError("저장 완료를 확인하지 못했어요. 마지막 저장 상태를 유지했어요. 같은 명령으로 다시 확인해주세요.");
      throw caught;
    } finally { writing.current = false; setBusy(false); }
  }

  async function requestProduct(draft: PreviewDraft) {
    if (!store.current || role !== "customer" || writing.current || !draft.consent) return false;
    let command = drafts.current.get(draft.id);
    if (!command) {
      const current = store.current.state;
      const condition = current.conditions.find(entry => entry.storeId === draft.storeId && entry.productId === draft.productId);
      if (!condition) return false;
      command = {
        type: "request.create", sessionId: current.sessionId, generation: current.generation, expectedRevision: current.revision,
        actorId: LOCAL_CUSTOMER_ID, role: "customer", storeId: draft.storeId, idempotencyKey: draft.id,
        requestId: draft.id, productId: draft.productId, quantity: draft.quantity,
        unitPrice: draft.unitPrice, consent: true, conditionVersion: condition.version,
      };
      drafts.current.set(draft.id, command);
    }
    const result = await execute(command, true);
    return result.ok;
  }

  async function reset() {
    if (writing.current || (!store.current && !recovery.current)) return;
    writing.current = true; setBusy(true);
    try {
      if (recovery.current) accept(await recovery.current());
      else { await store.current!.reset(); accept(store.current!); }
      drafts.current.clear(); setResetConfirm(false);
    } catch { setError("초기화를 저장하지 못했어요. 기존 저장 내용을 유지했어요."); }
    finally { writing.current = false; setBusy(false); }
  }

  const mine: PreviewRequest[] = state?.requests.filter(request => request.actorId === LOCAL_CUSTOMER_ID).map(request => ({
    id: request.id, actor: "나", productId: request.productId, storeId: request.storeId, quantity: request.quantity,
    unitPrice: request.unitPrice, consent: true, createdAt: new Date(request.createdAt).toISOString(), stage: "requested",
  })) ?? [];
  const archived = archive?.requests.filter(request => role === "customer" ? request.actor === "나" : request.storeId === storeId) ?? [];
  const detail = state && actorId && storeId ? <DomainWorkspace state={state} role={role} actorId={actorId} storeId={storeId} busy={busy} onCommand={execute} /> : null;
  const pickup = state && actorId && storeId ? <DomainWorkspace state={state} role="customer" actorId={actorId} storeId={storeId} busy={busy} onCommand={execute} pickupOnly /> : null;

  return <div className="site-wrap">
    <div className="preview-ribbon"><span className="preview-dot" />함께 만드는 원하GS <span className="ribbon-divider">/</span> 거래 데모 · 공급부터 픽업까지</div>
    <header className="site-header">
      <a className="brand-lockup" href="/demo" aria-label="원하GS, 원하지쓰 거래 데모"><span className="brand-symbol" aria-hidden="true">w.</span><span><strong>원하<span>GS</span></strong><small>‘원하지쓰’라고 읽어요.</small></span></a>
      <div className="role-switch" role="group" aria-label="데모 역할 선택"><button disabled={busy} aria-pressed={role === "customer"} onClick={() => setRole("customer")}>고객</button><button disabled={busy} aria-pressed={role === "merchant"} onClick={() => setRole("merchant")}>경영주</button></div>
    </header>
    <div className="preview-notice"><span className="notice-label">모의 거래</span><p>실제 GS 거래·청구가 없는 한 탭 데모입니다. 실제 위치 참고 점포, 합성/참고 상품, 모의 가격·공급을 사용합니다. 데이터는 이 브라우저의 SQLite에만 저장됩니다.</p><a href="/">이전 Preview</a></div>
    <main className={`workspace ${role}`}>
      {startRequired && <section className="storage-warning"><h1>공급·결제·픽업까지 이어볼까요?</h1><p>새 거래 데모를 별도로 시작합니다. 이전 Preview 요청과 승인은 읽기 전용 이력으로 보관하며 원본을 삭제하지 않습니다. 기존 승인을 실제 발주로 바꾸거나 새 동의를 대신 만들지 않아요.</p><p>새 데모의 초기 고객 20명은 합성 데이터입니다. 고객 역할에서 만든 새 요청에만 직접 상품·가격·수량·점포를 확인하고 동의해주세요.</p><button disabled={busy} onClick={start}>이전 이력을 보관하고 새 거래 데모 시작</button></section>}
      {!state && !startRequired && !error && <p className="storage-loading" role="status">거래 SQLite 사본을 불러오고 있어요…</p>}
      {error && <section className="storage-warning" role="alert"><p>{error}</p>{!state && !startRequired && <button disabled={busy} onClick={() => { setError(""); setLoadAttempt(value => value + 1); }}>다시 불러오기</button>}{recovery.current && <button disabled={busy} onClick={() => setResetConfirm(true)}>새 거래 사본 초기화 검토</button>}</section>}
      {resetConfirm && <section className="storage-warning"><strong>현재 거래 데모를 초기화할까요?</strong><p>현재 거래 데모의 추가 요청·발주·결제·픽업은 삭제됩니다. 이전 Preview 원본과 보관 이력은 유지됩니다.</p><button disabled={busy} onClick={reset}>확인하고 거래 데모 초기화</button><button disabled={busy} onClick={() => setResetConfirm(false)}>취소</button></section>}
      {state && <>
        <div className="storage-toolbar"><span role="status">{busy ? "SQLite에 저장 중…" : `✓ 저장됨 · revision ${state.revision} · 세대 ${state.generation}`}</span><button disabled={busy} onClick={() => setResetConfirm(true)}>거래 데모 초기화</button></div>
        <div className="domain-store-picker"><label htmlFor="domain-current-store">{role === "customer" ? "요청·픽업을 확인할 점포" : "관리할 점포"}</label><select id="domain-current-store" value={storeId} disabled={busy} onChange={event => setStoreId(event.target.value)}>{state.stores.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select><p>{previewStores.find(entry => entry.id === storeId)?.address} · 위치 참고 자료이며 영업·실제 취급을 보장하지 않아요.</p></div>
        {role === "customer" ? <CustomerWorkspace key={`${state.sessionId}:${state.generation}`} requests={mine} onRequest={requestProduct} busy={busy} conditions={state.conditions} consentDurationDays={DOMAIN_POLICY.consentMs / 86400000} requestContent={detail} pickupContent={pickup} /> : detail}
        <details className="domain-archive"><summary>이전 Preview 보관 이력 · {archived.length}건</summary><p>{archive?.message}</p><p>보관 이력은 현재 거래 수요에 합산하지 않습니다. 다른 점포 또는 가상 점포 이력은 <a href="/">이전 Preview</a>에서도 볼 수 있어요.</p>{archived.map(request => <article key={request.id}><strong>{request.productName} · {request.quantity}개</strong><p>{request.storeName} · {won(request.unitPrice * request.quantity)} · 이전 {request.stage === "approved" ? "화면 승인" : "화면 요청"}</p></article>)}</details>
      </>}
    </main>
    <footer className="site-footer"><div><strong>원하는 말이, 우리 동네 수요가 되도록.</strong><p>원하GS · WANNA GS</p></div><span>모의 결제 · 실제 청구 없음 · 픽업 알림부터 정확히 48시간</span></footer>
  </div>;
}
