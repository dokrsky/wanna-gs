import type { DomainStore } from "./domain/storage";
import type { Command } from "./domain/types";

export async function executeCustomerWrite(store: DomainStore, command: Command, remember: (command: Command) => void) {
  const result = await store.execute(command);
  const current = store.state;
  // A definite rejection has no committed receipt. Keep consent/payload intact;
  // the domain rechecks current conditions. Never rebase an uncertain write.
  if (!result.ok && result.error.code === "STALE_REVISION" && command.role === "customer"
    && ["request.create", "search.record", "needs.record", "recommendation.record"].includes(command.type)
    && command.sessionId === current.sessionId && command.generation === current.generation
    && !current.receipts.some(receipt => receipt.key === command.idempotencyKey)) {
    const rebased = { ...command, expectedRevision: current.revision };
    remember(rebased); // Preserve this exact command even if its response is lost.
    return store.execute(rebased);
  }
  return result;
}
