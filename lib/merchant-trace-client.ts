import type { DomainStore } from "./domain/storage";
import type { Command, DomainState, Receipt, Viewer } from "./domain/types";
import type { MerchantTraceCommand } from "./domain/merchant-trace-types";

export type MerchantTracePort = {
  contextKey: string;
  record(payload: MerchantTraceCommand): Promise<boolean>;
  retry(): Promise<boolean>;
  subscribe(listener: () => void): () => void;
  getStatus(): { pending: number; error: string | null };
  getState(): DomainState | null;
  getReceipt(key: string): Receipt | null;
  settle(): Promise<void>;
  knowsRun(id: string): boolean;
};
type Entry = { payload: MerchantTraceCommand; signature: string; command: Command | null; saved: boolean };
const identity = (v: Viewer) => JSON.stringify([v.sessionId, v.generation, v.role, v.actorId, v.storeId]);

// One queue for all merchant log ports, independent of the UI's trade busy flag.
// SQLite itself remains the authority and serializes both logs and transactions.
export function createMerchantTraceManager(options: {
  getStore: () => DomainStore | null;
  getViewer: () => Viewer | null;
  publish: (state: DomainState) => void;
}) {
  let queue: Promise<void> = Promise.resolve();
  const ports = new Map<string, MerchantTracePort>();
  function enqueue<T>(work: () => Promise<T>): Promise<T> {
    const result = queue.then(work);
    queue = result.then(() => undefined, () => undefined);
    return result;
  }
  return {
    forViewer(owner: Viewer): MerchantTracePort {
      const contextKey = identity(owner);
      const existing = ports.get(contextKey);
      if (existing) return existing;
      const entries = new Map<string, Entry>();
      const knownRuns = new Set<string>();
      const listeners = new Set<() => void>();
      let error: string | null = null;
      let failed = false;
      const notify = () => listeners.forEach(listener => listener());
      function currentState() {
        const state = options.getStore()?.state;
        return state?.sessionId === owner.sessionId && state.generation === owner.generation ? state : null;
      }
      function ownReceipt(key: string): Receipt | null {
        const receipt = currentState()?.receipts.find(row => row.key === key);
        if (!receipt) return null;
        try {
          const command = JSON.parse(receipt.fingerprint) as Viewer;
          return identity(command) === contextKey ? receipt : null;
        } catch { return null; }
      }
      async function attempt(entry: Entry) {
        const store = options.getStore(), state = currentState();
        if (!store || !state) throw Error("TRACE_CONTEXT_ENDED");
        if (!entry.command) {
          const runId = entry.payload.type === "merchant.run.start" ? entry.payload.run.id : entry.payload.runId;
          const suffix = entry.payload.type === "merchant.run.apply" ? `:${entry.payload.application}` : "";
          const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${contextKey}:${entry.payload.type}:${runId}${suffix}`));
          const actionKey = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
          const latest = currentState();
          if (!latest) throw Error("TRACE_CONTEXT_ENDED");
          entry.command = { ...owner, ...entry.payload, expectedRevision: latest.revision,
            idempotencyKey: `merchant-trace:${actionKey}` } as Command;
        }
        let outcome = await store.execute(entry.command);
        // A definitive stale rejection has no receipt. Only these append-only
        // records may rebase; an uncertain write always retains its exact command.
        if (!outcome.ok && outcome.error.code === "STALE_REVISION") {
          const latest = currentState();
          if (!latest) throw Error("TRACE_CONTEXT_ENDED");
          entry.command = { ...entry.command, expectedRevision: latest.revision };
          outcome = await store.execute(entry.command);
        }
        if (!outcome.ok) throw Error(outcome.error.code);
        entry.saved = true;
        options.publish(store.state);
      }
      const port: MerchantTracePort = {
        contextKey,
        getState: currentState,
        getReceipt: ownReceipt,
        settle: () => queue,
        knowsRun: id => knownRuns.has(id),
        getStatus: () => ({ pending: [...entries.values()].filter(entry => !entry.saved).length, error }),
        subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener); }; },
        record(payload) {
          const runId = payload.type === "merchant.run.start" ? payload.run.id : payload.runId;
          const key = `${payload.type}:${runId}${payload.type === "merchant.run.apply" ? `:${payload.application}` : ""}`;
          const signature = JSON.stringify(payload);
          const prior = entries.get(key);
          if (prior) {
            if (prior.signature !== signature) {
              error = "같은 AI 기록의 내용이 달라 저장하지 않았어요. 기존 기록은 유지돼요."; notify();
              return Promise.resolve(false);
            }
            if (prior.saved) return Promise.resolve(true);
            // Explicit retry() handles failed writes; do not replay the model.
            if (failed) return Promise.resolve(false);
          }
          const viewer = options.getViewer();
          const inContext = viewer !== null && identity(viewer) === contextKey;
          const receiptBacked = payload.type === "merchant.run.apply" && payload.application === "policy_saved"
            && payload.commandKey !== null && ownReceipt(payload.commandKey) !== null;
          if (!currentState() || owner.role !== "merchant" ||
            ((!inContext && (payload.type === "merchant.run.start" || payload.type === "merchant.run.apply")) && !receiptBacked)) {
            error = "이전 역할·점포·세대의 기록을 새 문맥에 저장하지 않았어요."; notify();
            return Promise.resolve(false);
          }
          knownRuns.add(runId);
          const entry = prior ?? { payload: structuredClone(payload), signature, command: null, saved: false };
          entries.set(key, entry); notify();
          if (failed) return Promise.resolve(false);
          return enqueue(async () => {
            if (entry.saved) return true;
            if (failed) return false;
            try { await attempt(entry); error = null; return true; }
            catch { failed = true; error = "AI 기록 저장을 확인하지 못했어요. 모델·정책을 다시 실행하지 말고 기록만 재시도해주세요."; return false; }
            finally { notify(); }
          });
        },
        retry() {
          return enqueue(async () => {
            try {
              for (const entry of entries.values()) if (!entry.saved) await attempt(entry);
              failed = false; error = null; return true;
            } catch {
              failed = true; error = "기록이 아직 저장되지 않았어요. 기존 거래는 유지돼요. 같은 기록만 다시 시도할 수 있어요.";
              return false;
            } finally { notify(); }
          });
        },
      };
      ports.set(contextKey, port);
      return port;
    },
  };
}
