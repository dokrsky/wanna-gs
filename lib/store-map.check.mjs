// Offline pure-helper checks only; no map network calls or browser-render claim.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const source = readFileSync(new URL("./store-map.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
const module = { exports: {} };
new Function("require", "module", "exports", output)(createRequire(import.meta.url), module, module.exports);
const { getStoreMap, validMapBounds, distanceFromSimulatedPoint, SIMULATED_CUSTOMER_POINT } = module.exports;
const stores = JSON.parse(readFileSync(new URL("../data/stores.json", import.meta.url), "utf8"));

for (const store of stores) {
  const map = getStoreMap(store);
  assert.ok(map && Number.isInteger(map.distanceMeters) && map.distanceMeters >= 0);
  const url = new URL(map.url);
  assert.equal(url.origin, "https://www.openstreetmap.org");
  assert.equal(url.pathname, "/export/embed.html");
  assert.deepEqual([...url.searchParams.keys()], ["bbox", "layer", "marker"]);
  assert.equal(url.searchParams.get("marker"), `${store.latitude},${store.longitude}`);
  assert.equal(url.searchParams.get("layer"), "mapnik");
  const bounds = url.searchParams.get("bbox").split(",").map(Number);
  assert.ok(validMapBounds(bounds));
  assert.ok(bounds[0] < store.longitude && bounds[2] > store.longitude && bounds[1] < store.latitude && bounds[3] > store.latitude);
  assert.equal(getStoreMap({ ...store, name: "private-name", text: "private-utterance", consent: true, actorId: "private-actor" }).url, map.url);
}
const store = stores[0];
for (const bad of [undefined, null, "37.5", "", false, NaN, Infinity, -Infinity, 91, -91, 181, -181]) {
  assert.equal(getStoreMap({ ...store, latitude: bad }), null);
  assert.equal(getStoreMap({ ...store, longitude: bad }), null);
}
for (const patch of [{ id: "demo-central" }, { id: "unknown" }, { identityOrigin: "synthetic" }, { identityOrigin: "reference_unverified" }, { identityOrigin: undefined }, { latitude: store.longitude, longitude: store.latitude }, { latitude: 37.5045, longitude: 127.041 }]) {
  assert.equal(getStoreMap({ ...store, ...patch }), null);
}
assert.ok(validMapBounds([-180, -85, 180, 85]));
for (const bad of [null, [], [1, 2, 3], ["1", 2, 3, 4], [NaN, 2, 3, 4], [1, 2, Infinity, 4], [3, 2, 1, 4], [1, 4, 3, 2], [1, 2, 1, 4], [-181, -1, 0, 1], [-1, -1, 181, 1], [-1, -86, 1, 1], [-1, -1, 1, 86]]) assert.equal(validMapBounds(bad), false);
assert.equal(distanceFromSimulatedPoint(SIMULATED_CUSTOMER_POINT.latitude, SIMULATED_CUSTOMER_POINT.longitude), 0);
assert.ok(Math.abs(distanceFromSimulatedPoint(SIMULATED_CUSTOMER_POINT.latitude + 1, SIMULATED_CUSTOMER_POINT.longitude) - 111195) <= 1);
assert.equal(distanceFromSimulatedPoint(NaN, 127), null);
assert.equal(distanceFromSimulatedPoint(91, 127), null);
assert.ok(Object.isFrozen(SIMULATED_CUSTOMER_POINT));
console.log(`PASS: ${stores.length} public stores; strict coordinates/bounds, public-only URLs, simulated distances. No network/browser execution.`);

// Render the actual React component: no eager external request, and the manual
// escape hatch uses exactly the same public point, with no trade action.
const require = createRequire(import.meta.url);
const { createElement } = require("react"), { renderToStaticMarkup } = require("react-dom/server");
const uiSource = readFileSync(new URL("../app/components/store-map.tsx", import.meta.url), "utf8");
const uiOutput = ts.transpileModule(uiSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const uiModule = { exports: {} };
new Function("require", "module", "exports", uiOutput)(id => id.endsWith(".module.css") ? {} : id === "../../lib/store-map" ? module.exports : require(id), uiModule, uiModule.exports);
for (const store of stores) {
  const html = renderToStaticMarkup(createElement(uiModule.exports.default, { store }));
  assert(!html.includes("<iframe"), "map loads only after explicit action");
  const expected = getStoreMap(store).url.replaceAll("&", "&amp;");
  assert(html.includes(`href="${expected}" target="_blank" rel="noopener">지도를 새 탭에서 보기</a>`));
  assert(html.includes("지도 보기") && html.includes("OpenStreetMap contributors"));
  assert(!html.includes("noreferrer"), "retain ordinary browser referer for the map provider");
}
const unknownHtml = renderToStaticMarkup(createElement(uiModule.exports.default, { store: { ...stores[0], id: "unknown" } }));
assert(!unknownHtml.includes("지도를 새 탭에서 보기"));
console.log("PASS UI10 actual React markup: 8 matching manual map links, noopener/default Referer, no eager iframe, unknown point has no map link. Not browser-render evidence.");
