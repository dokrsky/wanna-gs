import type { NeedRecord, RecommendationEvent, SearchRun } from "../../lib/domain/types";
import { previewProducts, previewStores } from "../demo-preview";
import styles from "./customer-workspace.module.css";

type Props = { actorId: string; searchRuns: SearchRun[]; needs: NeedRecord[]; recommendationEvents: RecommendationEvent[] };
const needLabels = { unidentified: "상품 미식별", clarification_stopped: "추가 설명 중단", candidates_rejected: "후보 거절", condition_unknown: "점포 조건 미확인", not_requestable: "모의 조건에서 요청 불가" };
const actions = { shown: "후보 노출", selected: "후보 선택", rejected: "후보 거절", requested: "구매 요청 연결" };
const when = (value: number) => new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false });
const name = (id: string) => previewProducts.find(product => product.id === id)?.name ?? id;

// Customer-only raw view. Parent must provide the authenticated demo actor/session
// projection; this local actor filter is not a real authentication boundary.
export default function SearchHistory({ actorId, searchRuns, needs, recommendationEvents }: Props) {
  const mine = searchRuns.filter(run => run.actorId === actorId).slice().sort((a, b) => b.createdAt - a.createdAt);
  return <section className={styles.card} aria-label="내 검색·니즈 기록">
    <h2>내 검색 · 니즈 기록</h2><p className={styles.small}>이 고객의 저장 완료된 이력만 보여요. 검색·후보 선택·니즈는 구매 요청이나 예약이 아니에요. 원문·AI 실행 상세는 고객 전용이며 다른 기기와 공유하지 않아요.</p>
    {!mine.length && <p className={styles.empty}>저장된 검색 이력이 아직 없어요.</p>}
    {mine.map(run => <details className={styles.storeDirectory} key={run.id}>
      <summary>{run.dialogue.initialText.slice(0, 60)} · {run.status === "error" ? "실행 오류" : run.action === "clarify" ? "추가 확인" : run.action === "unidentified" ? "미식별" : run.action === "unsupported" ? "지원 범위 밖" : "후보 확인"}</summary>
      <p className={styles.small}>{when(run.createdAt)} KST · {run.mode === "live" ? `실제 AI · ${run.model ?? "모델 확인 불가"}` : run.mode === "local" ? "로컬 예시 · AI 아님" : "fixture · 실제 AI 아님"}</p>
      <p className={styles.historyText}>최초 입력: {run.dialogue.initialText}</p>
      {run.dialogue.turns.map((turn, i) => <p className={styles.historyText} key={i}>질문 {i + 1}: {turn.question}<br />내 답변: {turn.answer}</p>)}
      {run.question && <p className={styles.historyText}>추가 질문: {run.question}</p>}
      {run.errorCode && <p className={styles.small}>실행 오류 {run.errorCode} · 미식별 니즈로 집계하지 않아요.</p>}
      {run.clues.map((clue, i) => {
        const source = clue.rawSourceRange.source === "initial" ? run.dialogue.initialText : run.dialogue.turns[clue.rawSourceRange.source === "answer1" ? 0 : 1]?.answer ?? "";
        return <p className={styles.historyText} key={i}>{clue.polarity === "excluded" ? "제외" : clue.polarity === "required" ? "필수" : "선호"}: {clue.value} · {clue.certainty === "inferred" ? "모델 추정" : "원문 기반 추출"}<br />원문 근거: {source.slice(clue.rawSourceRange.start, clue.rawSourceRange.end)}</p>;
      })}
      {run.candidates.map(candidate => <div key={candidate.productId}><p>{name(candidate.productId)} · {candidate.kind === "alternative" ? "다른 대체 상품" : candidate.kind === "exact" ? "정확 후보" : "확인 필요"}</p><p className={styles.historyText}>{candidate.reason}</p>{candidate.catalogEvidence.map(evidence => <p className={styles.small} key={evidence.code}>{evidence.value}</p>)}</div>)}
      <p className={styles.small}>실행 {run.latencyMs}ms · {run.usage ? `입력 ${run.usage.inputTokens} / 출력 ${run.usage.outputTokens} 토큰` : "사용량 없음 또는 확인 불가"}</p>
      {needs.filter(need => need.actorId === actorId && need.runId === run.id).map(need => <p key={need.id}>명시 등록 니즈: {needLabels[need.reason]} · {previewStores.find(store => store.id === need.storeId)?.name ?? need.storeId} · {when(need.createdAt)} KST</p>)}
      {recommendationEvents.filter(event => event.actorId === actorId && event.runId === run.id).map(event => <p className={styles.small} key={event.id}>{actions[event.action]} · {name(event.productId)} · {when(event.createdAt)} KST{event.requestId && ` · 요청 ${event.requestId}`}</p>)}
    </details>)}
  </section>;
}
