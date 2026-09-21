"use client";

import { useEffect, useState } from "react";
import type { MerchantObservation, MerchantRun, MerchantRunKind, MerchantRunTerminal } from "../../lib/domain/merchant-trace-types";
import type { MerchantTracePort } from "../../lib/merchant-trace-client";
import styles from "./domain-workspace.module.css";

const terminalLabels: Record<MerchantRun["terminal"], string> = {
  running: "응답 대기", success: "응답 처리 완료", error: "호출 오류",
  cancelled: "사용자 취소", stale: "문맥 변경으로 만료", interrupted: "화면 종료·새로고침으로 중단",
};
const applicationLabels: Record<MerchantRun["application"], string> = {
  not_applied: "아직 적용 안 함", screen_applied: "화면 변경안 적용", policy_saved: "정책 저장 확인",
};

// Both AI entry points share one immutable terminal and one late observation.
export function beginMerchantAttempt(activity: MerchantTracePort | undefined, id: string, kind: MerchantRunKind, inputJson: string) {
  const startedAt = Date.now();
  let ended = false, observed = false;
  void activity?.record({ type: "merchant.run.start", run: { id, kind, inputJson, startedAt } });
  return {
    finish(terminal: MerchantRunTerminal, terminalErrorCode: string | null = null, observation: MerchantObservation | null = null) {
      if (ended) {
        if (observation && !observed) { observed = true; void activity?.record({ type: "merchant.run.observe", runId: id, observation }); }
        return;
      }
      ended = true; observed = observation !== null;
      const finishedAt = Math.max(startedAt, Date.now());
      void activity?.record({ type: "merchant.run.finish", runId: id, terminal, finishedAt, latencyMs: finishedAt - startedAt, terminalErrorCode, observation });
    },
  };
}

// A committed C is final even if its application log L is still queued/failed.
// Reuse the first L payload, including its timestamp, across receipt rechecks.
const policyApplications = new WeakMap<MerchantTracePort, Map<string, number>>();
export function recordPolicyReceipt(activity: MerchantTracePort | undefined, commandKey: string): boolean {
  if (!activity || !commandKey.startsWith("merchant-policy:") || !activity.getReceipt(commandKey)) return false;
  const runId = commandKey.slice("merchant-policy:".length);
  if (activity.getState()?.merchantRuns.find(run => run.id === runId)?.application === "policy_saved") return true;
  let times = policyApplications.get(activity);
  if (!times) { times = new Map(); policyApplications.set(activity, times); }
  if (times.has(commandKey)) return true; // The port owns retries of the first L.
  const appliedAt = Date.now(); times.set(commandKey, appliedAt);
  void activity.record({ type: "merchant.run.apply", runId, application: "policy_saved", commandKey, appliedAt });
  return true;
}

export function interruptOrphanRuns(activity: MerchantTracePort, runs: readonly MerchantRun[]) {
  for (const run of runs) if (run.terminal === "running" && !activity.knowsRun(run.id)) {
    const finishedAt = Math.max(run.startedAt, Date.now());
    void activity.record({ type: "merchant.run.finish", runId: run.id, terminal: "interrupted", finishedAt,
      latencyMs: finishedAt - run.startedAt, terminalErrorCode: null, observation: null });
  }
}
const when = (value: number) => new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "medium", timeZone: "Asia/Seoul" }).format(value);
function inputText(run: MerchantRun) {
  try { const input: unknown = JSON.parse(run.inputJson); return input && typeof input === "object" && "text" in input && typeof input.text === "string" ? input.text : "입력 내용 확인 불가"; }
  catch { return "입력 내용 확인 불가"; }
}

export default function MerchantRunHistory({ runs, activity }: { runs: readonly MerchantRun[]; activity?: MerchantTracePort }) {
  const [, refresh] = useState(0);
  const [retrying, setRetrying] = useState(false);
  useEffect(() => activity?.subscribe(() => refresh(value => value + 1)), [activity]);
  useEffect(() => {
    if (!activity) return;
    interruptOrphanRuns(activity, runs);
    for (const run of runs) if (run.terminal === "success" && run.application === "not_applied") recordPolicyReceipt(activity, `merchant-policy:${run.id}`);
  }, [activity, runs]);
  const status = activity?.getStatus();
  return <section className={styles.section} aria-label="내 점포 AI 실행 기록">
    <div className={styles.sectionTitle}><h3>AI 실행 기록</h3><span>{runs.length}건 · 이 경영주·현재 점포</span></div>
    <p className={styles.note}>{activity ? "이 브라우저의 SQLite에 저장해요." : "AI 기록 저장 연결이 없어요. 이 화면에서는 새로운 기록을 저장하지 않아요."} 최근 5개 화면 변경 문맥과는 별개예요. 응답 관측·화면 적용·정책 저장은 서로 다른 상태이며, AI 응답만으로 발주하지 않아요.</p>
    {status && (status.pending > 0 || status.error) && <div className={styles.batch} aria-live="polite"><p className={status.error ? styles.warning : styles.note}>{status.error ?? `AI 기록 ${status.pending}건 저장 중…`}</p><p className={styles.note}>기록 오류는 AI 변경안·이미 저장된 정책의 실패가 아니에요. 이 버튼은 모델·정책을 재실행하지 않아요. 저장 전 새로고침하면 미저장 기록은 사라질 수 있어요.</p>{status.error && <button type="button" disabled={retrying} onClick={async () => { if (!activity || retrying) return; setRetrying(true); try { await activity.retry(); } finally { setRetrying(false); } }}>{retrying ? "기록 저장 재시도 중…" : "미저장 AI 기록만 다시 저장"}</button>}</div>}
    {!runs.length && <p className={styles.empty}>저장된 AI 실행 기록이 없어요.</p>}
    <div className={styles.grid}>{[...runs].sort((a, b) => b.startedAt - a.startedAt).map(run => <article key={run.id} className={styles.card}>
      <div className={styles.sectionTitle}><h4>{run.kind === "batch" ? "이번 묶음 · 정책 전달" : "지속 정책"}</h4><span className={styles.badge}>{terminalLabels[run.terminal]}</span></div>
      <p>{inputText(run)}</p><p>{when(run.startedAt)} · KST</p>
      <p>관측 응답: {run.observation === null ? "아직 관측하지 못함" : run.observation.status === "success" ? "유효 응답 관측" : `오류 관측 (${run.observation.errorCode})`}<br />실제 적용: <strong>{applicationLabels[run.application]}</strong>{run.appliedAt !== null && <> · {when(run.appliedAt)}</>}</p>
      {run.terminal !== "success" && run.observation?.status === "success" && <p className={styles.note}>취소·만료 후 관측한 응답일 수 있어요. 응답이 있어도 실행 종료 상태를 성공으로 바꾸지 않아요.</p>}
      <details><summary>모델 · 사용량 · 처리 시간</summary><p>모델 {run.model ?? "미관측"}<br />{run.usage ? `입력 ${run.usage.inputTokens} · 출력 ${run.usage.outputTokens} 토큰` : "사용량 미관측 (0으로 계산하지 않아요)"}<br />처리 시간 {run.latencyMs === null ? "미확인" : `${run.latencyMs.toLocaleString("ko-KR")}ms`}{run.terminalErrorCode && <><br />종료 오류 {run.terminalErrorCode}</>}{run.finishedAt !== null && <><br />종료 {when(run.finishedAt)}</>}</p></details>
    </article>)}</div>
  </section>;
}
