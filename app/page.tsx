"use client";

import { useRef, useState } from "react";
import CustomerWorkspace from "./components/customer-workspace";
import MerchantWorkspace from "./components/merchant-workspace";
import { previewProducts, previewRequests, previewStores, type PreviewDraft, type PreviewRequest } from "./demo-preview";

export default function Home() {
  const [role, setRole] = useState<"customer" | "merchant">("customer");
  const [requests, setRequests] = useState<PreviewRequest[]>(previewRequests);
  const currentRequests = useRef(requests);

  function requestProduct(draft: PreviewDraft) {
    const product = previewProducts.find((item) => item.id === draft.productId);
    if (!product || !previewStores.some((store) => store.id === draft.storeId) ||
      !draft.id || !draft.consent || !Number.isInteger(draft.quantity) ||
      draft.quantity < 1 || draft.quantity > 20 || draft.unitPrice !== product.price) return false;
    if (currentRequests.current.some((request) => request.id === draft.id)) return true;
    const next: PreviewRequest[] = [...currentRequests.current, {
      ...draft, actor: "나", stage: "requested", createdAt: new Date().toISOString(),
    }];
    currentRequests.current = next;
    setRequests(next);
    return true;
  }

  function approveRequests(ids: string[]) {
    const selected = new Set(ids);
    const pending = currentRequests.current.filter((request) => selected.has(request.id));
    if (!selected.size || pending.length !== selected.size || pending.some((request) => !request.consent)) return false;
    const next = currentRequests.current.map((request): PreviewRequest =>
      selected.has(request.id) ? { ...request, stage: "approved" } : request);
    currentRequests.current = next;
    setRequests(next);
    return true;
  }

  return (
    <div className="site-wrap">
      <div className="preview-ribbon"><span className="preview-dot" />함께 만드는 원하GS <span className="ribbon-divider">/</span> 화면 미리보기 01</div>
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
        <p>상품·가격·점포·수요는 예시입니다. 요청은 역할을 바꿔도 이어지지만, 새로고침하면 초기화됩니다.</p>
        <details><summary>연결 상태</summary><p>현재 검색은 로컬 예시 검색입니다. 실제 AI·SQLite 저장·공급·결제·픽업은 다음 개발 단계에서 연결합니다. 실제 GS 거래나 청구는 발생하지 않습니다.</p></details>
      </div>

      <main className={`workspace ${role}`}>
        <div hidden={role !== "customer"}><CustomerWorkspace requests={requests} onRequest={requestProduct} /></div>
        <div hidden={role !== "merchant"}><MerchantWorkspace requests={requests} onApprove={approveRequests} /></div>
      </main>
      <footer className="site-footer">
        <div><strong>원하는 말이, 우리 동네 수요가 되도록.</strong><p>원하GS · WANNA GS</p></div>
        <span>실제 GS 연동·결제가 아닌 개발 중인 프로토타입</span>
      </footer>
    </div>
  );
}
