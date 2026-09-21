// node app/components/merchant-run-history.check.mjs
// UI lifecycle helpers only: no persistence, browser, network, or independent QA.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url), ts = require("typescript");
for (const ext of [".ts", ".tsx"]) require.extensions[ext] = (m, file) => m._compile(ts.transpileModule(readFileSync(file, "utf8"), {
  fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, file);
require.extensions[".css"] = m => { m.exports = {}; };
globalThis.fetch = () => { throw Error("Network forbidden"); };
const { beginMerchantAttempt, interruptOrphanRuns, recordPolicyReceipt } = require("./merchant-run-history.tsx");
let now = 1000, checks = 0;
const oldNow = Date.now; Date.now = () => now;
function check(name, fn) { fn(); checks++; console.log(`PASS ${name}`); }
function port() {
  const calls = [], known = new Set(), receipts = new Map();
  const state = { merchantRuns: [] };
  return { calls, known, receipts, state,
    record(payload) { calls.push(structuredClone(payload)); known.add(payload.type === "merchant.run.start" ? payload.run.id : payload.runId); return Promise.resolve(false); },
    knowsRun: id => known.has(id), getState: () => state, getReceipt: key => receipts.get(key) ?? null,
  };
}
try {
  const p = port(), attempt = beginMerchantAttempt(p, "cancelled-run", "batch", '{"text":"우유만"}');
  check("start registers immediately despite log failure", () => { assert(p.knowsRun("cancelled-run")); assert.equal(p.calls[0].run.kind, "batch"); });
  now = 1010; attempt.finish("cancelled");
  now = 1090; const observation = { status: "success", responseJson: '{"model":"model","usage":{"inputTokens":4,"outputTokens":5}}' };
  attempt.finish("success", null, observation); attempt.finish("interrupted"); attempt.finish("success", null, observation);
  check("cancel terminal remains immutable with one late observation", () => { assert.deepEqual(p.calls.map(x => x.type), ["merchant.run.start", "merchant.run.finish", "merchant.run.observe"]); assert.equal(p.calls[1].terminal, "cancelled"); assert.equal(p.calls[1].latencyMs, 10); assert.deepEqual(p.calls[2].observation, observation); });
  const s = port(), normal = beginMerchantAttempt(s, "success", "policy", "{}");
  normal.finish("success", null, observation); normal.finish("stale");
  check("normal success records observed response once", () => { assert.equal(s.calls.length, 2); assert.deepEqual(s.calls[1].observation, observation); });
  const e = port(), network = beginMerchantAttempt(e, "network", "batch", "{}");
  network.finish("error", "MODEL_NETWORK");
  check("unobserved network failure keeps usage unknown", () => { assert.equal(e.calls[1].terminal, "error"); assert.equal(e.calls[1].observation, null); });
  const a = port(), api = beginMerchantAttempt(a, "api-error", "policy", "{}");
  api.finish("error", "MODEL_UPSTREAM", { status: "error", errorCode: "MODEL_UPSTREAM" });
  check("parsed API error is distinct from no observation", () => assert.equal(a.calls[1].observation.status, "error"));
  const r = port(); r.known.add("active"); r.known.add("pending-finish");
  const runs = ["old", "active", "pending-finish"].map(id => ({ id, terminal: "running", startedAt: 900 }));
  interruptOrphanRuns(r, [...runs, { id: "done", terminal: "success", startedAt: 900 }]); interruptOrphanRuns(r, runs);
  check("reload interrupts only unknown running, never current or pending finish", () => { assert.equal(r.calls.length, 1); assert.equal(r.calls[0].runId, "old"); assert.equal(r.calls[0].terminal, "interrupted"); });
  const c = port(), key = "merchant-policy:success";
  check("missing receipt never claims policy saved", () => assert.equal(recordPolicyReceipt(c, key), false));
  c.receipts.set(key, { key });
  check("committed policy stays successful when application log fails", () => assert.equal(recordPolicyReceipt(c, key), true));
  const first = structuredClone(c.calls[0]); now += 500;
  recordPolicyReceipt(c, key);
  check("receipt reconciling queues L only once with a stable payload", () => { assert.equal(c.calls.length, 1); assert.deepEqual(c.calls[0], first); assert.equal(first.application, "policy_saved"); assert.equal(first.commandKey, key); });
  const done = port(); done.receipts.set(key, { key }); done.state.merchantRuns = [{ id: "success", application: "policy_saved" }];
  check("persisted application is not replayed", () => { assert(recordPolicyReceipt(done, key)); assert.equal(done.calls.length, 0); });
  // Pin wiring separately from the runtime helper checks above.
  const domain = readFileSync(new URL("./domain-workspace.tsx", import.meta.url), "utf8");
  const policy = readFileSync(new URL("./policy-assistant.tsx", import.meta.url), "utf8");
  const history = readFileSync(new URL("./merchant-run-history.tsx", import.meta.url), "utf8");
  check("same batch run is forwarded without another start", () => { assert(domain.includes("onPolicy({ runId: proposal.input.id")); assert(policy.includes("`merchant-policy:${proposal.runId}`")); });
  check("C receipt is handled before mounted guard, including retry", () => { const start = domain.indexOf("const outcome = await onCommand(command)"); assert(domain.indexOf("recordPolicyReceipt(activity, command.idempotencyKey)", start) < domain.indexOf("if (!mounted.current)", start)); assert(history.includes('run.terminal === "success" && run.application === "not_applied"')); });
  check("policy rebase compares captured business, not log revision", () => { assert(domain.includes("merchantBusinessSnapshot(latestState, actorId, storeId) !== capturedBusiness")); assert(domain.includes("await activity.settle()")); });
} finally { Date.now = oldNow; }
console.log(`Merchant trace UI ${checks} checks PASS (mock port; no live/persistence evidence).`);
