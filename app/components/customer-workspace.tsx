"use client";

import { useRef, useState, type FormEvent } from "react";
import { previewProducts, previewStores, won, type PreviewDraft, type PreviewRequest } from "../demo-preview";
import styles from "./customer-workspace.module.css";

type Props = { requests: PreviewRequest[]; onRequest: (draft: PreviewDraft) => Promise<boolean>; busy: boolean };
type Tab = "want" | "requests" | "pickup";
const examples = ["딸기랑 크림이 들어간 샌드위치 찾아줘", "매일우유 900ml가 있었으면 좋겠어", "고소한 버터 소금빵을 찾고 있어"];
const normalize = (value: string) => value.normalize("NFKC").toLowerCase().replace(/\s+/g, "");

function NavIcon({ tab }: { tab: Tab }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {tab === "want" ? <><path d="m3 10 9-7 9 7v10H3Z" /><path d="M9 20v-7h6v7" /></> : tab === "requests" ? <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h3" /></> : <><path d="M4 8h16v13H4ZM3 8l2-5h14l2 5M9 12h6" /><path d="M12 3v5" /></>}
  </svg>;
}

export default function CustomerWorkspace({ requests, onRequest, busy }: Props) {
  const [tab, setTab] = useState<Tab>("want");
  const [input, setInput] = useState("");
  const [undo, setUndo] = useState<string | null>(null);
  const [query, setQuery] = useState<string | null>(null);
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
  const mine = requests.filter(request => request.actor === "나");
  const selected = previewProducts.find(product => product.id === productId);
  const store = previewStores.find(item => item.id === storeId);
  const count = Number(quantity);
  const validQuantity = Number.isInteger(count) && count >= 1 && count <= 20;
  const candidates = query === null ? [] : previewProducts
    .map(product => ({ product, score: [product.name, ...product.aliases].filter(term => normalize(query).includes(normalize(term))).length }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.product);

  function clearConfirmation() {
    setConsent(false);
    setError("");
    draftRef.current = null;
    submitted.current = false;
  }

  function editInput(value: string) {
    setInput(value);
    setQuery(null);
    setProductId(null);
    setNotice("");
    clearConfirmation();
  }

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || submitting.current) return;
    if (!input.trim()) {
      setError("찾고 싶은 상품 이름이나 특징을 적어주세요.");
      inputRef.current?.focus();
      return;
    }
    clearConfirmation();
    setProductId(null);
    setQuery(input.trim());
    setNotice("");
  }

  async function request(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || submitting.current || submitted.current) return;
    setNotice("");
    if (!selected || !store || !validQuantity || !consent) {
      setError("상품·1~20개 수량·점포와 자동 구매 동의를 확인해주세요.");
      return;
    }
    submitting.current = true;
    setError("");
    try {
      // Keep the same command ID when a failed callback is retried.
      const draft = draftRef.current ?? { id: crypto.randomUUID(), productId: selected.id, storeId, quantity: count, unitPrice: selected.price, consent };
      draftRef.current = draft;
      if (!await onRequest(draft)) {
        setError("요청을 저장하지 못했어요. 입력과 선택은 유지했으니 내 요청과 입력 조건을 확인한 뒤 다시 시도해주세요.");
        return;
      }
      submitted.current = true;
      setError("");
      setNotice(`${selected.name} ${count}개 요청을 이 브라우저에 저장했어요. 아직 물량 확보 전이에요.`);
      setTab("requests");
      setProductId(null);
      setConsent(false);
    } catch {
      setError("요청을 저장하지 못했어요. 입력과 선택은 유지했으니 내 요청을 확인한 뒤 다시 시도해주세요.");
    } finally { submitting.current = false; }
  }

  function navigate(next: Tab) {
    setTab(next);
    setError("");
  }

  return <div className={styles.workspace} aria-busy={busy}>
    <header className={styles.hero}>
      <div className={styles.heroTop}><span className={styles.brand}>원하GS <span>· 고객</span></span><span className={styles.previewBadge}>화면 미리보기</span></div>
      <p className={styles.pronunciation}>‘원하지쓰’라고 읽어요.</p>
      <div className={styles.heroTitle}>
        <div><h1>{tab === "want" ? <>없으면<br />말하<span>GS</span></> : tab === "requests" ? <>내가 원한 것,<br /><span>여기 모아뒀어요.</span></> : <>준비되면,<br /><span>픽업하러 와요.</span></>}</h1>
          <p>{tab === "want" ? "원하는 말은 상품으로, 모인 수요는 사장님의 쉬운 판단으로." : tab === "requests" ? "내 요청의 현재 상태를 확인해보세요." : "입고 후 픽업 알림을 받은 상품을 확인하는 곳이에요."}</p>
        </div>
        <span className={styles.mascot} aria-hidden="true">🦊<span>말해봐요!</span></span>
      </div>
    </header>

    <p className={styles.previewNote}>모의 상품·가상 점포로 보는 화면 시연이에요. AI는 아직 연결되지 않았어요. 이 브라우저의 SQLite에 저장해요. 같은 주소에서 새로고침해도 이어져요. 다른 기기와 공유되지 않아요.</p>
    {notice && <p className={styles.success} role="status">{notice}</p>}

    {tab === "want" && <>
      <section className={styles.card} aria-labelledby="customer-input-title">
        <span className={styles.step}>01 · 원하는 상품 말하기</span>
        <h2 id="customer-input-title">어떤 상품을 찾고 있나요?</h2>
        <form onSubmit={search}>
          <label className={styles.fieldLabel} htmlFor="customer-query">상품 이름이나 특징</label>
          <textarea ref={inputRef} id="customer-query" data-testid="customer-query" value={input} disabled={busy} maxLength={300} rows={3} onChange={event => { setUndo(null); editInput(event.target.value); }} onKeyDown={event => { if (event.key === "Enter" && event.nativeEvent.isComposing) event.stopPropagation(); }} placeholder="예: 딸기랑 크림이 들어간 샌드위치 찾아줘" aria-describedby="customer-search-note" />
          <p id="customer-search-note" className={styles.small}>현재는 모의 상품명·별칭을 찾는 로컬 검색이에요. 문장 전체를 이해하는 AI 검색은 아직 연결 전이에요.</p>
          <div className={styles.examples}>
            <div className={styles.sectionLine}><strong>이렇게 말해보세요</strong>{undo !== null && <button className={styles.textButton} type="button" disabled={busy} onClick={() => { editInput(undo); setUndo(null); inputRef.current?.focus(); }}>입력 되돌리기</button>}</div>
            {examples.map(example => <button key={example} type="button" className={styles.example} disabled={busy} onClick={() => { setUndo(previous => previous ?? input); editInput(example); inputRef.current?.focus(); }}><span aria-hidden="true">↗</span>{example}</button>)}
            <p className={styles.small}>예시를 누르면 입력만 채워져요.</p>
          </div>
          <button type="submit" className={styles.primary} data-testid="customer-search" disabled={busy}>상품 찾기 <span aria-hidden="true">→</span></button>
        </form>
      </section>

      {query !== null && <section className={styles.results} aria-labelledby="customer-results-title">
        <span className={styles.step}>02 · 상품 확인</span>
        <h2 id="customer-results-title">{candidates.length ? "찾으시는 상품이 맞나요?" : "아직 찾지 못했어요"}</h2>
        <p className={styles.small} role="status">{candidates.length ? `모의 상품에서 이름·별칭이 겹치는 후보 ${candidates.length}개를 찾았어요. 맛과 용량을 직접 확인해주세요.` : "모의 목록에서 일치하는 상품명·별칭이 없어요. 입력은 그대로 남아 있어요."}</p>
        {candidates.length ? <div className={styles.productGrid}>
          {candidates.map(product => <article key={product.id} className={`${styles.productCard} ${productId === product.id ? styles.selectedCard : ""}`}>
            <div className={styles.productArt} style={{ backgroundColor: product.color }} aria-hidden="true">{product.emoji}<span>모의 상품</span></div>
            <div className={styles.productBody}><span className={styles.small}>{product.category}</span><h3>{product.name}</h3><p>{product.description}</p><strong>{won(product.price)} <span className={styles.small}>/ 개 · 시연 가격</span></strong>
              <button type="button" className={productId === product.id ? styles.primary : styles.secondary} disabled={busy} aria-pressed={productId === product.id} aria-label={`${product.name} ${productId === product.id ? "선택됨" : "이 상품 선택"}`} onClick={() => { clearConfirmation(); setProductId(product.id); setQuantity("1"); setStoreId(""); setTimeout(() => confirmationRef.current?.focus(), 0); }}>{productId === product.id ? "선택했어요 ✓" : "이 상품 선택"}</button>
            </div>
          </article>)}
        </div> : <div className={styles.empty}><span className={styles.emptyIcon} aria-hidden="true">⌕</span><h3>조금 다른 말로 찾아볼까요?</h3><p>“매일우유”, “초코송이”, “커피”처럼 이름을 적어보세요.<br />미식별 요청 저장 기능은 아직 준비 중이에요.</p><button type="button" className={styles.secondary} onClick={() => inputRef.current?.focus()}>입력 수정하기</button></div>}
      </section>}

      {selected && <section className={styles.card} aria-labelledby="customer-confirm-title">
        <span className={styles.step}>03 · 조건 확인 후 요청</span>
        <h2 id="customer-confirm-title" ref={confirmationRef} tabIndex={-1}>이 조건으로 요청할까요?</h2>
        <form onSubmit={request}>
          <div className={styles.selectedProduct}><span style={{ backgroundColor: selected.color }} aria-hidden="true">{selected.emoji}</span><div><strong>{selected.name}</strong><p className={styles.small}>{won(selected.price)} / 개 · 모의 가격</p></div></div>
          <label className={styles.fieldLabel} htmlFor="customer-quantity">수량 <span className={styles.small}>1~20개</span></label>
          <div className={styles.quantityControl}>
            <button type="button" aria-label="수량 1개 줄이기" disabled={busy || !validQuantity || count <= 1} onClick={() => { setQuantity(String(count - 1)); clearConfirmation(); }}>−</button>
            <input id="customer-quantity" type="number" inputMode="numeric" min={1} max={20} step={1} required value={quantity} disabled={busy} onChange={event => { setQuantity(event.target.value); clearConfirmation(); }} />
            <button type="button" aria-label="수량 1개 늘리기" disabled={busy || !validQuantity || count >= 20} onClick={() => { setQuantity(String(count + 1)); clearConfirmation(); }}>+</button>
          </div>
          <label className={styles.fieldLabel} htmlFor="customer-store">요청할 점포</label>
          <select id="customer-store" required value={storeId} disabled={busy} onChange={event => { setStoreId(event.target.value); clearConfirmation(); }}><option value="" disabled>가상 점포를 선택해주세요</option>{previewStores.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <p className={styles.small}>{store?.address ?? "실제 위치·거리·재고를 안내하는 점포가 아니에요."}</p>
          <div className={styles.total}><span>확인할 총액</span><strong>{validQuantity ? won(selected.price * count) : "수량 확인 필요"}</strong></div>
          <div className={styles.consentBox}>
            <label><input data-testid="customer-consent" type="checkbox" checked={consent} required disabled={busy} onChange={event => { setConsent(event.target.checked); setError(""); draftRef.current = null; }} /><span><strong>물량 확보 후 자동 구매에 동의해요</strong><span className={styles.small}>위 상품·점포·수량·가격을 확인했어요. 조건이 바뀌면 다시 확인과 동의가 필요해요.</span></span></label>
            <p>입고 후 <strong>픽업 가능 알림이 생성된 시각부터 정확히 48시간</strong> 안에 수령해요. 요청일이나 발주일 기준이 아니에요.</p>
            <p className={styles.small}>이번 미리보기에서는 동의 표시와 요청 화면만 시연해요. 공급 확보·모의 결제·알림은 아직 작동하지 않으며 실제 청구는 없어요.</p>
          </div>
          <button type="submit" className={styles.primary} data-testid="customer-request" disabled={busy || !validQuantity || !store || !consent}>{busy ? "요청 저장 중…" : "이 조건으로 요청 저장"}</button>
          <button type="button" className={styles.textButton} disabled={busy} onClick={() => { setProductId(null); clearConfirmation(); }}>다른 상품을 고를게요</button>
        </form>
      </section>}
    </>}

    {tab === "requests" && <section className={styles.results} aria-labelledby="customer-requests-title">
      <div className={styles.sectionLine}><h2 id="customer-requests-title">내 요청</h2><span className={styles.count}>{mine.length}건</span></div>
      <p className={styles.small}>현재 화면의 ‘나’가 요청한 항목만 보여요. 이 브라우저의 SQLite에 저장해요. 같은 주소에서 새로고침해도 이어져요. 다른 기기와 공유되지 않아요.</p>
      {mine.length ? <div className={styles.requestList}>{mine.map(item => {
        const product = previewProducts.find(product => product.id === item.productId);
        const requestStore = previewStores.find(store => store.id === item.storeId);
        return <article className={styles.requestCard} key={item.id}>
          <div className={styles.sectionLine}><span className={item.stage === "approved" ? styles.approved : styles.requested}>{item.stage === "approved" ? "발주 승인" : "요청 접수"}</span><span className={styles.small}>화면 시연</span></div>
          <h3>{product?.name ?? "상품 정보 확인 필요"} · {item.quantity}개</h3>
          <p>{requestStore?.name ?? "점포 정보 확인 필요"}</p>
          <p className={styles.requestPrice}>{won(item.unitPrice)} × {item.quantity}개 <strong>{won(item.unitPrice * item.quantity)}</strong></p>
          <p className={styles.small}>자동 구매 동의: {item.consent ? "동의함" : "동의하지 않음"}</p>
          <div className={styles.stageNote}>{item.stage === "approved" ? "경영주의 발주 승인을 이 브라우저에 저장했어요." : "이 브라우저에 요청을 저장했어요. 경영주 확인을 기다려요."}<br />아직 공급 확보·결제·예약·픽업 가능 상태가 아니에요.</div>
        </article>;
      })}</div> : <div className={styles.empty}><NavIcon tab="requests" /><h3>아직 남긴 요청이 없어요</h3><p>원하는 상품을 찾아 조건을 확인하면<br />이곳에서 요청 상태를 볼 수 있어요.</p><button type="button" className={styles.primary} onClick={() => navigate("want")}>첫 상품 찾아보기</button></div>}
    </section>}

    {tab === "pickup" && <section className={styles.card} aria-labelledby="customer-pickup-title">
      <span className={styles.step}>픽업 안내</span><h2 id="customer-pickup-title">아직 픽업 가능한 상품이 없어요</h2>
      <div className={styles.empty}><NavIcon tab="pickup" /><h3>요청 접수와 픽업은 달라요</h3><p>공급 확보·모의 결제·입고 후<br />픽업 가능 알림을 받아야 수령할 수 있어요.</p></div>
      <div className={styles.pickupNotice}><strong>알림 생성 시각부터 정확히 48시간</strong><p>요청하거나 발주를 승인한 때부터 세지 않아요. 이번 화면 미리보기에는 입고·알림·수령 기능이 없어 픽업 마감도 아직 없어요.</p></div>
      <button type="button" className={styles.secondary} onClick={() => navigate(mine.length ? "requests" : "want")}>{mine.length ? "내 요청 확인하기" : "원하는 상품 찾아보기"}</button>
    </section>}

    {error && <p className={styles.error} role="alert">{error}</p>}
    <nav className={styles.bottomNav} aria-label="고객 하단 탐색">
      {([{ id: "want", label: "원하기" }, { id: "requests", label: "내 요청" }, { id: "pickup", label: "픽업" }] as const).map(item => <button type="button" key={item.id} className={tab === item.id ? styles.activeTab : undefined} aria-current={tab === item.id ? "page" : undefined} onClick={() => navigate(item.id)}><NavIcon tab={item.id} /><span>{item.label}{item.id === "requests" && mine.length > 0 && <span className={styles.navCount}>{mine.length}</span>}</span></button>)}
    </nav>
  </div>;
}
