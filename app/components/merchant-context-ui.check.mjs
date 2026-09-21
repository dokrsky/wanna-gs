// Run: node app/components/merchant-context-ui.check.mjs
// Narrow callback regression using real component/domain code in memory.
// No browser, live AI, persistence, or independent UX evidence.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ts = require("typescript"), react = require("react");
let active;
const hooks = {
  ...react,
  useState(initial) {
    const h = active, i = h.index++;
    if (!(i in h.slots)) h.slots[i] = typeof initial === "function" ? initial() : initial;
    return [h.slots[i], value => { h.slots[i] = typeof value === "function" ? value(h.slots[i]) : value; }];
  },
  useRef(initial) { const h = active, i = h.index++; return h.slots[i] ?? (h.slots[i] = { current: initial }); },
};
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) { return id === "react" ? hooks : originalRequire.call(this, id); };
const compile = (source, fileName) => ts.transpileModule(source, { fileName, compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
} }).outputText;
for (const ext of [".ts", ".tsx"]) require.extensions[ext] = (m, file) => m._compile(compile(readFileSync(file, "utf8"), file), file);
require.extensions[".css"] = m => { m.exports = { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) }; };
globalThis.fetch = async () => { throw new Error("Network forbidden in this checker"); };

const file = fileURLToPath(new URL("./domain-workspace.tsx", import.meta.url));
const source = readFileSync(file, "utf8"), componentModule = new Module(file);
componentModule.filename = file; componentModule.paths = Module._nodeModulePaths(dirname(file));
componentModule._compile(compile(source, file) + "\nexports.test = { MerchantDemand, MerchantAssistant };", file);
const { MerchantDemand, MerchantAssistant } = componentModule.exports.test;
const { createInitialState, applyCommand, getView } = require("../../lib/domain/commands.ts");
const now = Date.UTC(2026, 8, 21, 12), originalNow = Date.now;
Date.now = () => now;
const actor = { id: "merchant", role: "merchant", displayName: "모의 경영주", storeId: "store" };
const customer = { id: "customer", role: "customer", displayName: "합성 고객" };
let state = createInitialState({ products: [{ id: "milk", name: "우유" }], stores: [{ id: "store", name: "모의 점포" }], actors: [actor, customer],
  conditions: [{ storeId: "store", productId: "milk", requestable: true, unitPrice: 1000, unitCost: 500, moq: 1, packSize: 1, supplyStatus: "available", supplyQuantity: 100, version: "v1" }],
}, { sessionId: "filter-check", generation: 1, now });
const context = who => ({ sessionId: state.sessionId, generation: 1, actorId: who.id, role: who.role, storeId: "store" });
let key = 0, commandsSent = 0;
function command(payload, who = actor) {
  const result = applyCommand(state, { ...context(who), expectedRevision: state.revision, idempotencyKey: `check-${++key}`, ...payload }, now);
  assert(result.ok, JSON.stringify(result)); state = result.state;
}
command({ type: "policy.set", enabled: false, productIds: ["milk"], budgetWon: 50000 });
command({ type: "request.create", requestId: "request", productId: "milk", quantity: 1, consent: true, unitPrice: 1000, conditionVersion: "v1" }, customer);
function render(h) {
  h.index = 0; active = h;
  h.tree = MerchantDemand({ state, view: getView(state, context(actor), now), actorId: actor.id, storeId: "store", disabled: false, send: async () => { commandsSent++; return true; } });
  active = null;
}
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return tree && typeof tree === "object" ? [tree, ...nodes(tree.props?.children)] : [];
}
const text = tree => Array.isArray(tree) ? tree.map(text).join("") : tree && typeof tree === "object" ? text(tree.props?.children) : String(tree ?? "");
const button = (h, label) => nodes(h.tree).find(n => n.type === "button" && text(n).includes(label));
const ai = h => nodes(h.tree).find(n => n.type === MerchantAssistant).props;
const budgetInput = h => nodes(h.tree).find(n => n.type === "input" && n.props.type === "number");
function start() { const h = { slots: [] }; render(h); button(h, "현재 발주 가능 상품 전체 선택").props.onClick(); render(h); return h; }
function filter(h, view = "requested") {
  const current = ai(h).getCurrent();
  ai(h).onApply({ view, selectedProductIds: current.selectedProductIds, budgetWon: current.budgetWon, policyDraft: null }, "filter");
  render(h);
}
const failures = [];
function check(name, fn) { try { fn(); console.log(`PASS ${name}`); } catch (error) { failures.push(name); console.error(`FAIL ${name}: ${error.message}`); } }

try {
  const h = start();
  command({ type: "policy.set", enabled: false, productIds: ["milk"], budgetWon: 60000 });
  render(h);
  assert(text(h.tree).includes("목록이 바뀌었어요"));
  const before = structuredClone(ai(h).getCurrent());
  filter(h);
  check("filter preserves blank remaining-budget mode", () => assert.equal(budgetInput(h).props.value, ""));
  check("filter preserves stale selection review", () => assert(text(h.tree).includes("목록이 바뀌었어요")));
  check("filter preserves selection and applied history", () => {
    assert.deepEqual(ai(h).getCurrent().selectedProductIds, before.selectedProductIds);
    assert.deepEqual(ai(h).getCurrent().context.changes, before.context.changes);
  });
  check("changed filter bumps UI context once", () => assert.equal(ai(h).getCurrent().context.uiSeq, before.context.uiSeq + 1));
  const seq = ai(h).getCurrent().context.uiSeq;
  filter(h);
  check("same filter does not bump UI context", () => assert.equal(ai(h).getCurrent().context.uiSeq, seq));

  const editing = start();
  budgetInput(editing).props.onFocus();
  budgetInput(editing).props.onChange({ target: { value: "20000" } }); render(editing);
  const history = structuredClone(ai(editing).getCurrent().context.changes);
  filter(editing);
  check("filter does not finish an uncommitted budget edit", () => assert.deepEqual(ai(editing).getCurrent().context.changes, history));
  check("filter preserves budget draft text", () => assert.equal(budgetInput(editing).props.value, "20000"));
  check("filter sends no domain command", () => assert.equal(commandsSent, 0));

  // Callback behavior above is runtime-tested; additionally pin the action wiring.
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let actionForwarded = false;
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === "onApply" && node.arguments[1]?.getText(ast) === "proposal.output.action") actionForwarded = true;
    ts.forEachChild(node, visit);
  }
  visit(ast);
  check("assistant forwards the parsed action to its callback", () => assert(actionForwarded));
} finally { Date.now = originalNow; Module.prototype.require = originalRequire; }
assert.equal(failures.length, 0, failures.join("; "));
console.log("Merchant filter callback regression PASS (in-memory only).");
