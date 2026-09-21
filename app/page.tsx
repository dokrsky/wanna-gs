"use client";

import { useEffect, useRef, useState } from "react";
import CustomerWorkspace from "./components/customer-workspace";
import MerchantWorkspace from "./components/merchant-workspace";
import { previewProducts, previewStores, type PreviewDraft, type PreviewRequest } from "./demo-preview";
import { openPreviewStore, PreviewSnapshotError, type PreviewStore } from "./preview-store";

export default function Home() {
  const [role, setRole] = useState<"customer" | "merchant">("customer");
  const [requests, setRequests] = useState<PreviewRequest[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [generation, setGeneration] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const store = useRef<PreviewStore | null>(null);
  const recovery = useRef<(() => Promise<PreviewRequest[]>) | null>(null);
  const saving = useRef(false);

  useEffect(() => {
    let active = true;
    setStorageError("");
    openPreviewStore().then((opened) => {
      if (!active) return;
      store.current = opened;
      recovery.current = null;
      setRequests(opened.requests);
      setReady(true);
    }).catch((error: unknown) => {
      if (!active) return;
      if (error instanceof PreviewSnapshotError) recovery.current = error.reset;
      setStorageError(error instanceof PreviewSnapshotError ? error.message : "브라우저 저장소를 열지 못했어요. 네트워크와 이 사이트의 저장 권한을 확인한 뒤 다시 시도해 주세요. 기존 데이터는 초기화하지 않았어요.");
    });
    return () => { active = false; };
  }, [loadAttempt]);

  async function saveRequests(next: PreviewRequest[]) {
    if (!store.current || saving.current) return false;
    saving.current = true;
    setBusy(true);
    setStorageError("");
    try {
      await store.current.save(next);
      setRequests(store.current.requests);
      return true;
    } catch {
      setStorageError("저장하지 못했어요. 마지막 저장 상태를 유지했으며 요청·승인은 완료되지 않았어요. 저장 공간과 사이트 권한을 확인한 뒤 다시 시도해 주세요.");
      return false;
    } finally { saving.current = false; setBusy(false); }
  }

  async function requestProduct(draft: PreviewDraft) {
    if (!store.current || saving.current) return false;
    const product = previewProducts.find((item) => item.id === draft.productId);
    if (!product || !previewStores.some((store) => store.id === draft.storeId) ||
      !draft.id || !draft.consent || !Number.isInteger(draft.quantity) ||
      draft.quantity < 1 || draft.quantity > 20 || draft.unitPrice !== product.price) return false;
    const existing = store.current.requests.find((request) => request.id === draft.id);
    if (existing) return existing.actor === "나" && existing.productId === draft.productId &&
      existing.storeId === draft.storeId && existing.quantity === draft.quantity && existing.unitPrice === draft.unitPrice && existing.consent === draft.consent;
    const next: PreviewRequest[] = [...store.current.requests, {
      ...draft, actor: "나", stage: "requested", createdAt: new Date().toISOString(),
    }];
    return saveRequests(next);
  }

  async function approveRequests(ids: string[]) {
    if (!store.current || saving.current) return false;
    const selected = new Set(ids);
    const pending = store.current.requests.filter((request) => selected.has(request.id));
    if (!selected.size || pending.length !== selected.size || pending.some((request) => !request.consent || request.stage !== "requested")) return false;
    const next = store.current.requests.map((request): PreviewRequest =>
      selected.has(request.id) ? { ...request, stage: "approved" } : request);
    return saveRequests(next);
  }

  async function resetDemo() {
    if (saving.current || (!store.current && !recovery.current)) return;
    saving.current = true;
    setBusy(true);
    try {
      const next = recovery.current ? await recovery.current() : await store.current!.reset();
      store.current = await openPreviewStore();
      recovery.current = null;
      setRequests(next);
      setStorageError("");
      setReady(true);
      setGeneration((value) => value + 1);
      setConfirmReset(false);
    } catch { setStorageError("초기화를 저장하지 못했어요. 기존 데이터를 유지했어요. 저장 권한과 공간을 확인해 주세요."); }
    finally { saving.current = false; setBusy(false); }
  }

  return (
    <div className="site-wrap">
      <div className="preview-ribbon"><span className="preview-dot" />함께 만드는 원하GS <span className="ribbon-divider">/</span> 미리보기 03B · 두 역할 AI 연결</div>
      <header className="site-header">
        <a className="brand-lockup" href="/" aria-label="원하GS, 원하지쓰 홈">
          <span className="brand-symbol" aria-hidden="true">w.</span>
          <span><strong>원하<span>GS</span></strong><small>‘원하지쓰’라고 읽어요.</small></span>
        </a>
        <div className="role-switch" role="group" aria-label="데모 역할 선택">
          <button type="button" aria-pressed={role === "customer"} onClick={() => setRole("customer")}>고객</button>
          <button type="button" aria-pressed={role === "merchant"} onClick={() => setRole("merchant")}>경영주</button>
        </div>
      </header>

      <div className="preview-notice">
        <span className="notice-label">화면 시연</span>
        <p>상품·가격·점포·수요는 예시입니다. 요청은 이 브라우저에 저장되어 같은 주소에서 새로고침해도 이어집니다.</p>
        <details><summary>연결 상태</summary><p>SQLite 저장·복원과 서버 OpenAI 고객 검색·경영주 지시 해석을 연결했어요. 상품 후보와 변경안을 확인한 뒤 직접 요청·승인해 주세요. 지속 정책·공급·결제·픽업은 다음 단계입니다. 실제 GS 거래나 청구는 없어요.</p></details>
      </div>

      <main className={`workspace ${role}`}>
        <div className="storage-toolbar"><span role="status">{busy ? "SQLite에 저장 중…" : ready ? "✓ 이 브라우저에 저장됨" : "SQLite 준비 중"}</span>{(ready || recovery.current) && <button type="button" disabled={busy} onClick={() => setConfirmReset(true)}>데모 초기화</button>}</div>
        {confirmReset && <section className="storage-warning" aria-label="데모 초기화 확인"><strong>이 브라우저의 데모 요청과 승인을 초기 상태로 되돌릴까요?</strong><p>추가한 요청과 승인 결과는 삭제됩니다. 실제 계정이나 거래에는 영향이 없어요.</p><button type="button" disabled={busy} onClick={resetDemo}>확인하고 초기화</button><button type="button" disabled={busy} onClick={() => setConfirmReset(false)}>취소</button></section>}
        {storageError && <section className="storage-warning" role="alert"><p>{storageError}</p>{!ready && <button type="button" onClick={() => setLoadAttempt((value) => value + 1)}>다시 불러오기</button>}</section>}
        {!ready && !storageError && <p className="storage-loading" role="status">저장된 요청을 불러오고 있어요…</p>}
        {ready && <div key={generation}>
          <div hidden={role !== "customer"}><CustomerWorkspace requests={requests} onRequest={requestProduct} busy={busy} /></div>
          <div hidden={role !== "merchant"}><MerchantWorkspace requests={requests} onApprove={approveRequests} busy={busy} /></div>
        </div>}
      </main>
      <footer className="site-footer">
        <div><strong>원하는 말이, 우리 동네 수요가 되도록.</strong><p>원하GS · WANNA GS</p></div>
        <span>실제 GS 연동·결제가 아닌 개발 중인 프로토타입</span>
      </footer>
    </div>
  );
}
