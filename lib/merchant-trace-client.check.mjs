// Node24. Client queue seam only: SQL/model/browser behavior is checked separately.
import assert from "node:assert/strict";
import { createMerchantTraceManager } from "./merchant-trace-client.ts";

const owner = { sessionId: "trace-check", generation: 1, role: "merchant", actorId: "merchant", storeId: "store" };
const start = id => ({ type: "merchant.run.start", run: { id, kind: "batch", inputJson: "{}", startedAt: 10 } });
const finish = id => ({ type: "merchant.run.finish", runId: id, terminal: "cancelled", finishedAt: 20, latencyMs: 10, terminalErrorCode: null, observation: null });
function setup() {
  let state = { ...owner, revision: 0, receipts: [] }, viewer = owner, failure = null;
  const calls = [], published = [];
  const store = {
    get state() { return structuredClone(state); },
    async execute(command) {
      calls.push(structuredClone(command));
      const fingerprint = JSON.stringify(command);
      const prior = state.receipts.find(row => row.key === command.idempotencyKey);
      if (prior) {
        assert.equal(prior.fingerprint, fingerprint, "retry must retain the exact command");
        return { ok: true, state: store.state, result: prior.result, replayed: true, events: [] };
      }
      assert.equal(command.generation, state.generation);
      if (failure === "before") { failure = null; throw Error("persist failed"); }
      if (failure === "stale") { failure = null; state.revision++; return { ok: false, error: { code: "STALE_REVISION" } }; }
      assert.equal(command.expectedRevision, state.revision);
      state.revision++;
      const result = { revision: state.revision, commandKey: command.idempotencyKey, entityIds: [] };
      state.receipts.push({ key: command.idempotencyKey, fingerprint, result });
      if (failure === "after") { failure = null; throw Error("committed response lost"); }
      return { ok: true, state: store.state, result, replayed: false, events: [] };
    },
  };
  const manager = createMerchantTraceManager({ getStore: () => store, getViewer: () => viewer, publish: next => published.push(next) });
  return { port: manager.forViewer(owner), manager, calls, published, store,
    fail: kind => { failure = kind; }, viewer: next => { viewer = next; }, reset: () => { state = { ...state, generation: 2 }; } };
}

{
  const s = setup(), p = s.port;
  let changes = 0; const unsubscribe = p.subscribe(() => changes++);
  const a = p.record(start("one")), b = p.record(finish("one"));
  assert(p.knowsRun("one"));
  assert.deepEqual(await Promise.all([a, b]), [true, true]);
  await p.settle();
  assert.deepEqual(s.calls.map(c => c.expectedRevision), [0, 1]);
  assert.equal(s.published.length, 2); assert.equal(p.getStatus().pending, 0); assert(changes > 0);
  assert(await p.record(start("one"))); assert.equal(s.calls.length, 2);
  assert.equal(await p.record({ ...finish("one"), terminal: "success" }), false);
  assert.equal(s.calls.length, 2); unsubscribe();
}
{
  const s = setup(); s.fail("before");
  assert.equal(await s.port.record(start("failed")), false);
  assert.equal(await s.port.record(finish("failed")), false);
  assert.equal(s.calls.length, 1); assert.equal(s.port.getStatus().pending, 2);
  assert(await s.port.retry()); assert.equal(s.port.getStatus().pending, 0);
  assert.deepEqual(s.calls[0], s.calls[1]);
  assert.equal(s.store.state.revision, 2);
}
{
  const s = setup(); s.fail("after");
  assert.equal(await s.port.record(start("uncertain")), false);
  const receipt = s.port.getReceipt(s.calls[0].idempotencyKey); assert(receipt);
  assert(await s.port.retry()); assert.deepEqual(s.calls[0], s.calls[1]);
  assert.equal(s.store.state.revision, 1, "committed trace must not execute twice");
}
{
  const s = setup(); s.fail("stale");
  assert(await s.port.record(start("stale")));
  assert.equal(s.calls.length, 2); assert.equal(s.calls[1].expectedRevision, 1);
  assert.equal(s.calls[0].idempotencyKey, s.calls[1].idempotencyKey);
  const nextPort = s.manager.forViewer({ ...owner, storeId: "other" });
  assert.equal(nextPort.getReceipt(s.calls[1].idempotencyKey), null);
}
{
  const s = setup(); assert(await s.port.record(start("switch")));
  s.viewer({ ...owner, role: "customer", actorId: "customer" });
  assert.equal(await s.port.record(start("forbidden")), false);
  assert(await s.port.record(finish("switch")), "ending an owned attempt may survive a role switch");
  assert.equal(await s.port.record({ type: "merchant.run.apply", runId: "switch", application: "screen_applied", commandKey: null, appliedAt: 21 }), false);
  s.reset();
  assert.equal(await s.port.record({ type: "merchant.run.observe", runId: "switch", observation: { status: "error", errorCode: "MODEL_TIMEOUT" } }), false);
  assert.equal(s.port.getState(), null);
}
{
  const s = setup(); s.fail("before");
  await s.port.record(start("reset")); const calls = s.calls.length;
  s.reset(); assert.equal(await s.port.retry(), false); assert.equal(s.calls.length, calls);
}
{
  const a = setup(), b = setup();
  const longId = "x".repeat(100);
  assert(await a.port.record(start(longId))); assert(await b.port.record(start(longId)));
  assert.equal(a.calls[0].idempotencyKey, b.calls[0].idempotencyKey);
  assert(a.calls[0].idempotencyKey.length <= 100, "catalog contract IDs must fit command keys without truncation");
}
console.log("PASS merchant trace client queue: stable exact retries/committed receipt/stale-only rebase/terminal payload conflict/role switch/reset/100-char IDs. No SQL/browser/model calls.");
