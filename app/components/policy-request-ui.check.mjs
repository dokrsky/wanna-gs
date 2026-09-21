// Node24: node app/components/policy-request-ui.check.mjs
// Actual TSX propose callback, extracted by AST; in-memory/stubbed transport only.
// No browser, live model, persistence, or independent/whole-product QA evidence.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url), ts = require("typescript");
const compile = source => ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
} }).outputText;
require.extensions[".ts"] = (m, file) => m._compile(compile(readFileSync(file, "utf8")), file);
const contracts = require("../../lib/assistant/contracts.ts");
const policyContracts = require("../../lib/assistant/policy-contracts.ts");
const file = new URL("./policy-assistant.tsx", import.meta.url);
const source = readFileSync(file, "utf8");
const ast = ts.createSourceFile(file.pathname, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === "PolicyAssistant");
const propose = component?.body.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === "propose");
assert(propose, "actual PolicyAssistant.propose must exist");
const guards = [];
function visit(node) {
  if (ts.isBinaryExpression(node) && node.left.getText(ast) === "new TextEncoder().encode(body).byteLength"
    && node.operatorToken.kind === ts.SyntaxKind.GreaterThanToken) guards.push(node);
  ts.forEachChild(node, visit);
}
visit(propose);
assert.equal(guards.length, 1, "exactly one actual wire-byte guard");
assert.equal(guards[0].right.getText(ast), "POLICY_BODY_BYTES", "UI consumes the shared limit");
assert(ast.statements.some(n => ts.isImportDeclaration(n)
  && n.moduleSpecifier.text === "../../lib/assistant/policy-contracts"
  && n.importClause?.namedBindings?.elements?.some(e => e.name.text === "POLICY_BODY_BYTES")));
assert.equal(policyContracts.POLICY_BODY_BYTES, 8192);
const callback = propose.getText(ast);
const guardStart = guards[0].right.getStart(ast) - propose.getStart(ast);
const prepatch = callback.slice(0, guardStart) + "4096" + callback.slice(guardStart + guards[0].right.getWidth(ast));
const catalog = JSON.parse(readFileSync(new URL("../../data/catalog.json", import.meta.url), "utf8"));
const stores = JSON.parse(readFileSync(new URL("../../data/stores.json", import.meta.url), "utf8"));
const ids = catalog.map(row => row.id), storeId = stores[0].id;
assert.equal(ids.length, 262, "POLICY-01 actual DATA02 catalog");
const requestId = "00000000-0000-4000-8000-000000000001";
const current = productIds => ({ enabled: false, productIds, budgetWon: 50000, version: 1, spentWon: 0 });
const wire = (text, productIds) => JSON.stringify(policyContracts.parsePolicyRequest({
  text, id: requestId, generation: 1, storeId, currentPolicy: current(productIds),
}, productIds, [storeId]));
const originalFetch = globalThis.fetch;
globalThis.fetch = () => { throw new Error("Network forbidden in POLICY-01 checker"); };

async function run(text, productIds = ids, code = callback, allowedIds = productIds) {
  const result = { fetch: 0, trace: 0, onSave: 0, prevented: 0, error: "", proposal: null, finishes: [] };
  const controller = { current: null }, currentPolicy = current(productIds);
  const deps = {
    ...contracts, ...policyContracts, text, currentPolicy, allowedIds,
    policy: { ...currentPolicy, storeId }, state: { stores }, disabled: false,
    ready: true, statusLoading: false, saveLock: { current: false }, controller,
    sequence: { current: 0 }, attempt: { current: null }, mounted: { current: true },
    latest: { current: { snapshot: "policy-check", disabled: false } }, snapshot: "policy-check",
    activity: {}, crypto: { randomUUID: () => requestId },
    setError: value => { result.error = value; }, setProposal: value => { result.proposal = value; },
    setConfirmed: value => { result.confirmed = value; }, setThinking: value => { result.thinking = value; },
    onSave: async () => { result.onSave++; return true; },
    tokenCount: value => typeof value === "number" && Number.isSafeInteger(value) && value >= 0,
    beginMerchantAttempt: (_activity, id, kind, body) => {
      result.trace++; assert.equal(id, requestId); assert.equal(kind, "policy"); result.traceBody = body;
      return { finish: (...args) => { result.finishes.push(args); } };
    },
    fetch: async (url, options) => {
      result.fetch++; assert.equal(url, "/api/assistant/policy"); assert.equal(options.method, "POST");
      result.body = options.body;
      const input = JSON.parse(options.body);
      return { ok: true, json: async () => ({ ok: true, id: input.id, generation: input.generation,
        storeId: input.storeId, policyVersion: input.currentPolicy.version, mode: "live", model: "stub-only",
        usage: { inputTokens: 1, outputTokens: 1 }, action: "propose", enabled: null,
        productIds: null, budgetWon: 80000, message: "누적 예산 변경 제안" }) };
    },
  };
  await new Function(...Object.keys(deps), `${compile(code)}\nreturn propose;`)(...Object.values(deps))({
    preventDefault: () => { result.prevented++; },
  });
  assert.equal(result.prevented, 1); assert.equal(result.onSave, 0);
  assert.equal(result.confirmed, false); assert.equal(result.thinking, false); assert.equal(controller.current, null);
  return result;
}
function accepted(result, text, productIds) {
  assert.equal(result.error, ""); assert.equal(result.fetch, 1); assert.equal(result.trace, 1);
  assert.equal(result.body, wire(text, productIds)); assert.equal(result.traceBody, result.body);
  assert.equal(result.proposal.setting.budgetWon, 80000);
  assert.deepEqual(result.proposal.setting.productIds, productIds);
  assert.equal(result.proposal.setting.enabled, false);
  assert.equal(result.finishes.length, 1); assert.equal(result.finishes[0][0], "success");
}
function rejected(result, code) {
  assert.equal(result.error, contracts.errorMessages[code]); assert.equal(result.proposal, null);
  assert.equal(result.fetch, 0); assert.equal(result.trace, 0); assert.equal(result.finishes.length, 0);
}
try {
  const text = "가".repeat(300), before = await run(text, ids, prepatch);
  rejected(before, "BODY_TOO_LARGE");
  assert.throws(() => accepted(before, text, ids), assert.AssertionError);
  console.log(`RED reproduced: in-memory 4096 guard rejects actual 262 targets + 300 Korean chars (${Buffer.byteLength(wire(text, ids))} UTF-8 bytes)`);
  accepted(await run(text), text, ids);
  console.log("GREEN actual 262 targets + 300 Korean chars; proposal only, onSave=0");
  rejected(await run("가".repeat(301)), "INVALID_MERCHANT_INPUT");
  rejected(await run("   "), "INVALID_MERCHANT_INPUT");
  rejected(await run("예산 변경", ["unknown-sku"], callback, ids), "INVALID_MERCHANT_INPUT");
  console.log("GREEN 301 chars / empty input / unknown target rejected before fetch/trace; onSave=0");
  // Separate synthetic catalog: distribute ASCII padding over 262 valid unique IDs.
  // Real catalog above is untouched; only these fixtures target exact wire lengths.
  for (const bytes of [8192, 8193]) {
    const synthetic = Array.from({ length: 262 }, (_, i) => `synthetic-${i}`);
    const padding = bytes - Buffer.byteLength(wire(text, synthetic));
    assert(padding >= 0);
    for (let i = 0; i < padding; i++) synthetic[i % synthetic.length] += "x";
    assert.equal(Buffer.byteLength(wire(text, synthetic)), bytes);
    const result = await run(text, synthetic);
    if (bytes === 8192) accepted(result, text, synthetic);
    else rejected(result, "BODY_TOO_LARGE");
    console.log(`GREEN synthetic catalog ${bytes} UTF-8 bytes: ${bytes === 8192 ? "sent" : "rejected before fetch/trace"}; onSave=0`);
  }
  assert.equal(readFileSync(file, "utf8"), source, "component changed during check; rerun latest source");
  console.log(`Policy source SHA256 ${createHash("sha256").update(source).digest("hex")}`);
  console.log("POLICY-01 narrow callback regression PASS (stubbed network; no browser/live/whole QA claim).");
} finally { globalThis.fetch = originalFetch; }
