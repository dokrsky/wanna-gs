"use client";

import { FormEvent, useState } from "react";

const products = [
  { name: "매일우유 900ml", detail: "유제품 · 2,800원", emoji: "🥛" },
  { name: "짜파게티 5입", detail: "라면 · 4,600원", emoji: "🍜" },
  { name: "초코송이 36g", detail: "과자 · 1,500원", emoji: "🍪" },
];

export default function Home() {
  const [request, setRequest] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [selected, setSelected] = useState(products[0].name);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.trim()) setSubmitted(true);
  }

  return (
    <main className="shell">
      <nav className="nav">
        <a className="brand" href="/">원하<span>GS</span></a>
        <span className="nav-note">원하지쓰 · 우리 동네 상품 요청</span>
        <button className="ghost" type="button">경영주 화면</button>
      </nav>

      <section className="hero">
        <p className="eyebrow">WANT IT? SAY IT.</p>
        <h1>원하는 상품,<br /><em>말로 남겨두세요.</em></h1>
        <p className="intro">우리 동네 GS에서 찾고 싶은 상품을 알려주면<br />점포 수요로 모아 입고 소식을 전해드려요.</p>
      </section>

      <section className="request-card" aria-labelledby="request-title">
        <div className="card-top">
          <div>
            <span className="step">STEP 01</span>
            <h2 id="request-title">무엇을 찾고 있나요?</h2>
          </div>
          <span className="mascot" aria-hidden="true">✦</span>
        </div>
        <form onSubmit={submit}>
          <label className="sr-only" htmlFor="request">상품 요청</label>
          <textarea id="request" value={request} onChange={(event) => setRequest(event.target.value)} placeholder="예: 우리 동네 GS에 매일우유 900ml가 있었으면 좋겠어요" rows={3} />
          <div className="form-foot">
            <span className="hint">상품 하나, 점포 하나씩 요청해 주세요.</span>
            <button className="primary" type="submit">상품 찾아보기 <span>→</span></button>
          </div>
        </form>
      </section>

      <section className="results" aria-live="polite">
        <div className="section-heading"><span>STEP 02</span><h2>{submitted ? "이 상품을 찾았어요" : "이런 상품을 찾을 수 있어요"}</h2></div>
        <p className="section-copy">실제 요청 전 상품과 가격을 확인해 주세요.</p>
        <div className="product-grid">
          {products.map((product) => (
            <button className={`product ${selected === product.name ? "selected" : ""}`} key={product.name} type="button" onClick={() => setSelected(product.name)}>
              <span className="product-emoji">{product.emoji}</span><span className="product-name">{product.name}</span><span className="product-detail">{product.detail}</span>
            </button>
          ))}
        </div>
        <div className="confirm-row">
          <span><strong>{selected}</strong> · 우리 동네 GS</span>
          <button className="confirm" type="button" onClick={() => setSubmitted(true)}>이 상품 요청하기</button>
        </div>
        {submitted && <p className="success">요청을 남겼어요. 점포 수요가 모이면 알림으로 알려드릴게요.</p>}
      </section>

      <footer><span>원하GS는 ‘원하지쓰’라고 읽어요.</span><span>실제 GS 연동·결제가 아닌 데모입니다.</span></footer>
    </main>
  );
}
