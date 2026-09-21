"use client";

import { useState, type FormEvent } from "react";
import { type PreviewRequest, previewProducts, previewStores, won } from "../demo-preview";
import styles from "./merchant-workspace.module.css";

type View = "requested" | "approved" | "all";
type Proposal = { description: string; ids: string[] | null; view: View; snapshot: string };

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

export default function MerchantWorkspace({ requests, onApprove }: {
  requests: PreviewRequest[];
  onApprove: (ids: string[]) => boolean;
}) {
  const [storeId, setStoreId] = useState(previewStores[0].id);
  const [view, setView] = useState<View>("requested");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [budgetInput, setBudgetInput] = useState("50000");
  const [command, setCommand] = useState("");
  const [previousInput, setPreviousInput] = useState<string | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [message, setMessage] = useState("");

  const store = previewStores.find((item) => item.id === storeId)!;
  const storeRequests = requests.filter((item) => item.storeId === storeId);
  const pending = storeRequests.filter((item) => item.stage === "requested");
  const approved = storeRequests.filter((item) => item.stage === "approved");
  const selected = storeRequests.filter((item) => selectedIds.includes(item.id) && canSelect(item));
  const selectedTotal = sum(selected);
  const budget = Number(budgetInput);
  const validBudget = budgetInput.trim() !== "" && Number.isSafeInteger(budget) && budget >= 0;
  const overBudget = validBudget && selectedTotal > budget;
  const snapshot = JSON.stringify([storeRequests, storeId, budgetInput]);
  const proposalStale = proposal !== null && proposal.snapshot !== snapshot;
  const visible = storeRequests.filter((item) => {
    const product = previewProducts.find((entry) => entry.id === item.productId);
    const text = `${product?.name ?? item.productId} ${product?.category ?? ""} ${product?.aliases.join(" ") ?? ""} ${item.actor}`;
    return (view === "all" || item.stage === view) && text.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
  });
  const groups = new Map<string, PreviewRequest[]>();
  visible.forEach((item) => groups.set(item.productId, [...(groups.get(item.productId) ?? []), item]));
  const visibleEligible = visible.filter(canSelect);
  const allVisibleSelected = visibleEligible.length > 0 && visibleEligible.every((item) => selectedIds.includes(item.id));
  const proposedItems = proposal?.ids ? storeRequests.filter((item) => proposal.ids!.includes(item.id)) : [];

  function toggle(items: PreviewRequest[]) {
    const ids = items.filter(canSelect).map((item) => item.id);
    const allSelected = ids.every((id) => selectedIds.includes(id));
    setSelectedIds((current) => allSelected ? current.filter((id) => !ids.includes(id)) : [...new Set([...current, ...ids])]);
    setMessage("");
  }

  function propose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProposal(null);
    setMessage("");
    const text = command.trim().replace(/[\s,.!?，。]/g, "");
    // ponytail: 화면 시연용 제한 문법. 실제 자연어 이해는 후속 서버 모델 연결에서 처리한다.
    if (/앞으로|항상|자동|매일|정책|다음/.test(text)) {
      setMessage("앞으로의 정책은 아직 저장할 수 없어요. 이번 묶음만 변경할 수 있으며 자동발주는 연결되지 않았어요.");
      return;
    }
    if (/^(미확보|미승인|검토할)(요청|수요)?만?(보여줘|조회해줘|조회)$/.test(text)) {
      const unfulfilled = text.startsWith("미확보");
      setProposal({ ids: null, view: unfulfilled ? "all" : "requested", snapshot,
        description: unfulfilled ? "승인 여부와 관계없이 아직 공급을 확보하지 않은 요청을 모두 보여줘요. 조회만 바뀌어요." : "발주 승인 전인 요청만 보여줘요. 조회만 바뀌어요." });
      return;
    }
    const excludeSandwich = /^(이번묶음(은|에서)?)?샌드위치(는|를)?(빼고|제외(하고|해줘)?)(나머지는)?(요청(수량)?만큼)?(예산(안에서|이내로))?(제안해줘|보여줘)?$/.test(text);
    const requestQuantity = /^(이번묶음은?)?요청(수량)?만큼(제안해줘|보여줘)$/.test(text);
    if (!excludeSandwich && !requestQuantity) {
      setMessage("이 화면에서는 아래 예시 문장과 간단한 변형만 해석해요. 예시를 선택하거나 상품을 직접 체크해 주세요. 변경된 항목은 없어요.");
      return;
    }
    const ids = pending.filter((item) => canSelect(item) && (!excludeSandwich
      || !previewProducts.find((product) => product.id === item.productId)?.name.includes("샌드위치"))).map((item) => item.id);
    setProposal({ ids, view: "requested", snapshot,
      description: `${excludeSandwich ? "샌드위치를 제외하고, " : ""}현재 점포의 동의된 미승인 요청을 요청 수량 그대로 선택해요. 기존 선택을 바꾸며, 예산 초과 시 승인은 차단돼요.` });
  }

  function applyProposal() {
    if (!proposal || proposalStale) return;
    setView(proposal.view);
    setSearch("");
    if (proposal.ids !== null) setSelectedIds(proposal.ids);
    setMessage(proposal.ids === null ? "조회 조건을 바꿨어요. 발주 승인이나 정책 변경은 없어요." : "이번 묶음의 선택을 바꿨어요. 오른쪽 합계와 예산을 확인한 뒤 발주 승인해 주세요.");
    setProposal(null);
  }

  function approve() {
    if (!selected.length || !validBudget || overBudget || !Number.isSafeInteger(selectedTotal)) return;
    if (onApprove(selected.map((item) => item.id))) {
      setMessage(`${selected.length}건 · ${quantity(selected)}개를 화면 시연용으로 발주 승인했어요. 아직 공급 확보·결제·예약은 진행되지 않았어요.`);
      setSelectedIds([]);
      setProposal(null);
    } else {
      setMessage("요청 상태가 바뀌었거나 이미 승인된 항목이 있어요. 현재 목록에서 다시 선택해 주세요.");
    }
  }

  return (
    <section className={styles.workspace} aria-label="경영주 수요 관리">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>원하GS · 원하지쓰 <span>경영주</span></p>
          <h1>수요는 모으고,<br className={styles.mobileBreak} /> 확인은 한 번에</h1>
          <p className={styles.subheading}>고객의 요청을 살펴보고, 우리 점포에 필요한 만큼 승인하세요.</p>
        </div>
        <label className={styles.storePicker}>
          <span>관리 점포</span>
          <select value={storeId} onChange={(event) => {
            setStoreId(event.target.value); setSelectedIds([]); setProposal(null); setMessage(""); setSearch("");
          }}>
            {previewStores.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
      </header>

      <div className={styles.demoNote}><span className={styles.badge}>화면 시연</span> 합성 고객 요청 · {store.address} · 실제 GS 발주·결제 없음</div>

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
              <span className={styles.localBadge}>로컬 예시 해석 · AI 아님</span>
            </div>
            <form onSubmit={propose}>
              <label htmlFor="merchant-command" className={styles.fieldLabel}>조회 또는 이번 묶음 변경 지시</label>
              <div className={styles.commandRow}>
                <input id="merchant-command" value={command} maxLength={240} placeholder="샌드위치는 빼고, 예산 안에서"
                  onChange={(event) => { setCommand(event.target.value); setProposal(null); }}
                  onKeyDown={(event) => { if (event.key === "Enter" && event.nativeEvent.isComposing) event.preventDefault(); }} />
                <button className={styles.primaryButton} type="submit" disabled={!command.trim()}>변경안 보기 <span aria-hidden="true">→</span></button>
              </div>
            </form>
            <div className={styles.examples} aria-label="입력 예시">
              {examples.map((example) => <button type="button" key={example} onClick={() => {
                setPreviousInput(command); setCommand(example); setProposal(null);
              }}>{example}</button>)}
              {previousInput !== null && <button type="button" className={styles.undoButton} onClick={() => {
                setCommand(previousInput); setPreviousInput(null); setProposal(null);
              }}>이전 입력 복원</button>}
            </div>
            <p className={styles.help}>예시는 입력만 채워요. 변경안을 확인해 적용한 뒤, 발주 승인은 따로 진행해요.</p>
            {proposal && <div className={styles.proposal}>
              <strong>{proposal.ids === null ? "조회 변경안" : "이번 묶음 변경안"}</strong>
              <p>{proposal.description}</p>
              {proposal.ids !== null && <p><b>{proposedItems.length}건 · {quantity(proposedItems)}개 · {won(sum(proposedItems))}</b> 선택 예정</p>}
              {proposal.ids !== null && validBudget && sum(proposedItems) > budget && <p className={styles.error}>현재 예산보다 {won(sum(proposedItems) - budget)} 많아요. 적용 후 선택을 줄이거나 예산을 수정해 주세요.</p>}
              {proposalStale && <p className={styles.error}>요청 또는 예산이 바뀌었어요. 변경안을 다시 만들어 주세요.</p>}
              <div className={styles.proposalActions}>
                <button type="button" className={styles.primaryButton} disabled={proposalStale} onClick={applyProposal}>확인하고 {proposal.ids === null ? "조회 적용" : "선택 적용"}</button>
                <button type="button" className={styles.secondaryButton} onClick={() => setProposal(null)}>취소</button>
              </div>
              <p className={styles.help}>미래 정책으로 저장되지 않으며, 이 단계에서 발주하지 않아요.</p>
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
              <label><input type="checkbox" checked={allVisibleSelected} disabled={!visibleEligible.length} onChange={() => toggle(visibleEligible)} /> 표시된 승인 가능 요청 선택</label>
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
                    <input type="checkbox" aria-label={`${product?.name ?? productId} 승인 가능 요청 선택`} checked={eligible.length > 0 && selectedCount === eligible.length} disabled={!eligible.length} onChange={() => toggle(items)} />
                    <span className={styles.productEmoji} style={{ background: product?.color ?? "#eef3f6" }} aria-hidden="true">{product?.emoji ?? "□"}</span>
                    <div className={styles.productName}><h3>{product?.name ?? `확인 필요 상품 · ${productId}`}</h3><p>{new Set(items.map((item) => item.actor)).size}명 · 요청 {items.length}건</p></div>
                    <div className={styles.productAmount}><strong>{quantity(items)}개</strong><span>{won(sum(items))}</span></div>
                    <span className={approvedCount === items.length ? styles.approvedBadge : styles.reviewBadge}>{approvedCount === items.length ? "승인 완료" : approvedCount > 0 ? "일부 승인" : "검토 대기"}</span>
                  </div>
                  <details className={styles.details}>
                    <summary>고객별 요청 상세 <span>{items.length}건 · 접수·동의 확인</span></summary>
                    <div className={styles.requestRows}>
                      {items.map((item) => <div className={styles.requestRow} key={item.id}>
                        <label className={styles.actor}><input type="checkbox" checked={selectedIds.includes(item.id) && canSelect(item)} disabled={!canSelect(item)} onChange={() => toggle([item])} /><strong>{item.actor}</strong></label>
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
            <div className={styles.budgetInput}><input id="merchant-budget" type="number" inputMode="numeric" min="0" step="100" value={budgetInput} aria-invalid={!validBudget || overBudget} aria-describedby="merchant-budget-help" onChange={(event) => setBudgetInput(event.target.value)} /><span>원</span></div>
            <p id="merchant-budget-help" className={!validBudget || overBudget ? styles.error : styles.budgetHelp}>
              {!validBudget ? "예산은 0 이상의 정수로 입력해 주세요." : overBudget ? `예산보다 ${won(selectedTotal - budget)} 초과했어요. 선택을 줄이거나 예산을 수정해 주세요.` : `선택 후 예산 여유 ${won(budget - selectedTotal)}`}
            </p>
            <button type="button" className={styles.approveButton} disabled={!selected.length || !validBudget || overBudget || !Number.isSafeInteger(selectedTotal)} onClick={approve}>선택한 요청 발주 승인 <span aria-hidden="true">→</span></button>
            {selected.length > 0 && <button type="button" className={styles.clearSelection} onClick={() => setSelectedIds([])}>선택 해제</button>}
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
