// Node24: node app/components/customer-layout.check.mjs
// Actual React markup with state overrides; no browser, network, persistence or independent UX claim.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
const require = createRequire(import.meta.url), ts = require("typescript"), React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const source = readFileSync(new URL("./customer-workspace.tsx", import.meta.url), "utf8");
// UI-11 changes JSX/styles only. Pin the unchanged imports/state/handlers/derived values.
assert.equal(createHash("sha256").update(source.slice(0, source.indexOf("  return <div className={styles.workspace}"))).digest("hex"),
  "bfdd3aeb8f0773a313ecc12f7551222e6a39a3259a7b7e96e9d7f2a5465af3bd");
const ast = ts.createSourceFile("customer-workspace.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const stateNames = [], handlers = [];
function visit(node) {
  if (ts.isVariableDeclaration(node) && ts.isArrayBindingPattern(node.name)
    && ts.isCallExpression(node.initializer) && node.initializer.expression.getText(ast) === "useState") stateNames.push(node.name.elements[0].name.text);
  if (ts.isJsxAttribute(node) && /^on[A-Z]/.test(node.name.getText(ast))) handlers.push(node.getText(ast));
  ts.forEachChild(node, visit);
}
visit(ast);
assert.equal(handlers.length, 27);
assert.equal(createHash("sha256").update(handlers.sort().join("\n")).digest("hex"), "32108f251d79ac7b29509569b1a782f499e71e3c501ac735cc092318719ca5d6");
let overrides = {}, index = 0;
const originalRequire = Module.prototype.require;
const hooks = { ...React, useState(initial) {
  const name = stateNames[index++];
  return React.useState(Object.hasOwn(overrides, name) ? overrides[name] : initial);
} };
Module.prototype.require = function (id) { return id === "react" ? hooks : originalRequire.call(this, id); };
for (const ext of [".ts", ".tsx"]) require.extensions[ext] = (m, file) => m._compile(ts.transpileModule(readFileSync(file, "utf8"), {
  fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, file);
require.extensions[".css"] = m => { m.exports = { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) }; };
globalThis.fetch = () => { throw Error("Network forbidden in this checker"); };
const Customer = require("./customer-workspace.tsx").default;
const { previewProducts, previewAvailability } = require("../demo-preview.ts");
const props = { requests: [], busy: false, onRequest: () => { throw Error("No transaction expected"); },
  consentDurationDays: 7, activity: { contextKey: "layout-only", onRecord: () => { throw Error("No recording expected"); } } };
const ready = { statusLoading: false, assistantStatus: { configured: true, mode: "live", model: "test-model" } };
function render(state = {}, changes = {}) {
  index = 0; overrides = { ...ready, ...state };
  return renderToStaticMarkup(React.createElement(Customer, { ...props, ...changes }));
}
const outsideDetails = html => html.replace(/<details\b[^>]*>[\s\S]*?<\/details>/g, "");
function visible(html, ...messages) { const text = outsideDetails(html); for (const message of messages) assert(text.includes(message), `visible: ${message}`); }
function before(html, first, second) { assert(html.indexOf(first) >= 0 && html.indexOf(first) < html.indexOf(second), `${first} before ${second}`); }
let checks = 0;
function check(name, fn) { fn(); checks++; console.log(`PASS ${name}`); }
try {
  check("input and primary CTA precede optional helpers", () => {
    const html = render();
    for (const auxiliary of ["이렇게 말해보세요", "검색 모드·대화 도움", "대화 새로 시작", "모의 데이터·브라우저 저장 안내"]) {
      before(html, 'id="customer-query"', auxiliary); before(html, 'data-testid="customer-search"', auxiliary);
    }
    visible(html, "원하지쓰", "실제 AI 검색", "상품 이름이나 특징", "AI로 상품 찾기", "설정 확인됨", "test-model");
    assert(!html.match(/<button[^>]*data-testid="customer-search"[^>]*disabled/));
    for (const example of ["딸기랑 크림", "라라스윗 그릭 복숭아", "유어스로얄밀크티"]) visible(html, example);
  });
  check("loading, unconfigured and status error keep explanation and retry visible", () => {
    for (const [state, message] of [[{ statusLoading: true }, "서버의 AI 설정을 확인하고 있어요"],
      [{ assistantStatus: null }, "실제 AI 검색이 설정되지 않았어요"],
      [{ assistantStatus: null, statusError: "상태 연결 실패" }, "상태 연결 실패"]]) {
      const html = render(state); visible(html, message, "AI 설정 다시 확인");
      assert(html.match(/<button[^>]*data-testid="customer-search"[^>]*disabled/));
    }
  });
  check("local mode is explicit and examples keep undo", () => {
    visible(render({ searchMode: "local", undo: "이전 입력" }), "로컬 예시 검색 · AI 아님", "로컬 예시 상품 찾기", "입력 되돌리기", "AI를 호출하지 않고");
  });
  check("follow-up stays visible before answer input", () => {
    const html = render({ conversation: { initialText: "빵", turns: [], question: "어떤 맛을 원하세요?", questionCount: 1, finished: false } });
    visible(html, "어떤 맛을 원하세요?", "위 질문에 대한 답변", "이 답변으로 AI 상품 찾기"); before(html, "어떤 맛을 원하세요?", 'id="customer-query"');
  });
  check("search cancel and errors never sit in closed details", () => {
    visible(render({ searching: true }), "검색 취소", "검색 중이에요");
    visible(render({ searchError: "검색 연결 실패", error: "요청 저장 실패" }), "검색 연결 실패", "입력은 그대로", "요청 저장 실패");
    visible(render({ pendingRecords: [{ key: "retry" }], recordError: "기록 저장 실패" }), "기록 저장 실패", "같은 기록 저장만 재시도 · AI 재호출 없음");
  });
  check("candidate result and final consent remain present and unchecked", () => {
    const row = previewAvailability.find(row => row.requestable), product = previewProducts.find(product => product.id === row.productId);
    const html = render({ productId: product.id, storeId: row.storeId, result: { status: "matched", candidateIds: [product.id], message: "상품 후보 확인", mode: "local" } });
    visible(html, "상품 후보 확인", product.name, "이 조건으로 요청할까요?", "물량 확보 후 자동 구매에 동의해요", "픽업 가능 알림이 생성된 시각부터 정확히 48시간");
    const consent = html.match(/<input[^>]*data-testid="customer-consent"[^>]*>/)?.[0];
    assert(consent && !consent.includes("checked"));
    assert(html.match(/<button[^>]*data-testid="customer-request"[^>]*disabled/));
  });
  check("request/pickup content and finished-dialogue recovery stay reachable", () => {
    visible(render({ tab: "requests" }, { requestContent: React.createElement("p", null, "기존 요청 상태") }), "기존 요청 상태");
    visible(render({ tab: "pickup" }, { pickupContent: React.createElement("p", null, "기존 픽업 마감") }), "기존 픽업 마감");
    visible(render({ conversation: { initialText: "빵", turns: [], question: null, questionCount: 0, finished: true } }), "후보를 확인하거나 새 상품 찾기를 눌러주세요", "대화 새로 시작");
  });
} finally { Module.prototype.require = originalRequire; }
console.log(`UI11 customer layout ${checks} checks PASS; static React/state overrides only, browser measurements pending.`);
