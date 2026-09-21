// ADR-006 / UI09B. Bounded, validated request/response JSON only; no raw SDK,
// server secrets, customer search history, or hidden reasoning.
export type MerchantRunKind = "batch" | "policy";
export type MerchantRunTerminal = "success" | "error" | "cancelled" | "stale" | "interrupted";
export type MerchantObservation =
  | { status: "success"; responseJson: string }
  | { status: "error"; errorCode: string };
export type MerchantRun = {
  id: string; actorId: string; storeId: string; kind: MerchantRunKind;
  inputJson: string; startedAt: number;
  terminal: "running" | MerchantRunTerminal; finishedAt: number | null;
  latencyMs: number | null; terminalErrorCode: string | null;
  observation: MerchantObservation | null;
  model: string | null; usage: { inputTokens: number; outputTokens: number } | null;
  application: "not_applied" | "screen_applied" | "policy_saved";
  applicationCommandKey: string | null; appliedAt: number | null;
};
export type MerchantTraceCommand =
  | { type: "merchant.run.start"; run: { id: string; kind: MerchantRunKind; inputJson: string; startedAt: number } }
  | { type: "merchant.run.finish"; runId: string; terminal: MerchantRunTerminal; finishedAt: number;
      latencyMs: number; terminalErrorCode: string | null; observation: MerchantObservation | null }
  | { type: "merchant.run.observe"; runId: string; observation: MerchantObservation }
  | { type: "merchant.run.apply"; runId: string; application: "screen_applied" | "policy_saved";
      commandKey: string | null; appliedAt: number };
