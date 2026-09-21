import type { Actor, NeedReason, NeedView, Product, SearchCandidate } from "../../lib/domain/types";
import styles from "./domain-workspace.module.css";

const reasons: Record<NeedReason, string> = {
  unidentified: "카탈로그에서 식별하지 못함",
  clarification_stopped: "고객이 추가 설명을 마치고 남김",
  candidates_rejected: "고객이 제안 후보를 선택하지 않음",
  condition_unknown: "이 점포의 모의 조건을 확인하지 못함",
  not_requestable: "이 점포의 모의 요청 조건이 맞지 않음",
};
const kinds: Record<SearchCandidate["kind"], string> = {
  exact: "일치 후보", needs_confirmation: "확인 필요 후보", alternative: "대체 후보",
};
const when = new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Seoul" });

// Receives only getView's catalog-only projection, never raw search runs.
export default function MerchantNeeds({ needs, products, actors, storeId }: {
  needs: NeedView[]; products: Product[]; actors: Actor[]; storeId: string;
}) {
  const visible = needs.filter(need => need.storeId === storeId);
  return <section className={styles.section} aria-label="구매 수요와 구분한 고객 니즈">
    <div className={styles.sectionTitle}><h3>못 찾은 상품 이야기</h3><span>{visible.length}건 · 구매 수요 아님</span></div>
    <p className={styles.note}>고객이 이 점포에 직접 남긴 니즈예요. 수량·구매 동의가 있는 요청과 구분하며 발주·예산·결제에 합산하지 않아요. 건마다 승인하거나 답변할 필요는 없어요.</p>
    {visible.length ? <div className={styles.grid}>{visible.map(need => <article className={styles.card} key={need.id}>
      <div className={styles.sectionTitle}><h4>{reasons[need.reason]}</h4><span className={styles.badge}>관심 기록</span></div>
      <p className={styles.note}>{actors.find(actor => actor.id === need.actorId && actor.role === "customer")?.displayName ?? "합성 데모 고객"} · {when.format(need.createdAt)} KST</p>
      {need.safeClues.length ? <ul>{need.safeClues.map((clue, index) => <li key={`${clue.attribute}:${clue.productId}:${index}`}>
        {clue.attribute === "category" ? "분류" : "상품"}: {clue.value} · {clue.polarity === "excluded" ? "제외 조건" : clue.polarity === "required" ? "필수 조건" : "선호 조건"} · {clue.certainty === "explicit" ? "입력에서 추출" : "모델 추정"}
      </li>)}</ul> : <p>안전하게 공유할 수 있는 상품 단서가 없어요. 고객 원문은 공개하지 않아요.</p>}
      {!!need.candidates.length && <details><summary>당시 검색 후보 {need.candidates.length}개 · 구매 확정 아님</summary>
        {need.candidates.map(candidate => <p key={candidate.productId}>{products.find(product => product.id === candidate.productId)?.name ?? "상품 정보 확인 필요"} · {kinds[candidate.kind]}</p>)}
      </details>}
      <p className={styles.note}>상품 관련 공개 카탈로그 단서만 표시해요. 이 기록으로 실제 미취급·품절·생산 종료를 판단하지 않아요.</p>
    </article>)}</div> : <p className={styles.empty}>이 점포에 전달된 니즈가 아직 없어요. 고객이 검색 후 점포를 골라 남긴 경우에만 나타나요.</p>}
  </section>;
}
