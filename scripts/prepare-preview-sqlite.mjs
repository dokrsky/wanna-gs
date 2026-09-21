// Node 24 local build: intermediate screen seed, not final domain data or the 200-product catalog.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import initSqlJs from "sql.js";
import { previewProducts, previewStores, previewRequests } from "../app/demo-preview.ts";
import { PREVIEW_SCHEMA_VERSION, createPreviewStore, replacePreviewRequests } from "../app/preview-store.ts";

const require = createRequire(import.meta.url);
const SQL = await initSqlJs();
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const sourceHash = hash(JSON.stringify({ previewProducts, previewStores, previewRequests }));
const db = new SQL.Database();
db.run(`
  PRAGMA foreign_keys=ON;
  PRAGMA user_version=${PREVIEW_SCHEMA_VERSION};
  CREATE TABLE metadata (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL) STRICT;
  CREATE TABLE products (
    id TEXT PRIMARY KEY NOT NULL CHECK(length(trim(id)) > 0),
    name TEXT NOT NULL CHECK(length(trim(name)) > 0),
    category TEXT NOT NULL, description TEXT NOT NULL,
    price INTEGER NOT NULL CHECK(price BETWEEN 0 AND 9007199254740991),
    emoji TEXT NOT NULL, color TEXT NOT NULL,
    aliases TEXT NOT NULL CHECK(json_valid(aliases) AND json_type(aliases)='array')
  ) STRICT;
  CREATE TABLE stores (
    id TEXT PRIMARY KEY NOT NULL CHECK(length(trim(id)) > 0),
    name TEXT NOT NULL CHECK(length(trim(name)) > 0), address TEXT NOT NULL
  ) STRICT;
  CREATE TABLE requests (
    id TEXT PRIMARY KEY NOT NULL CHECK(length(trim(id)) > 0),
    actor TEXT NOT NULL CHECK(length(trim(actor)) > 0),
    product_id TEXT NOT NULL REFERENCES products(id),
    store_id TEXT NOT NULL REFERENCES stores(id),
    quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 20),
    unit_price INTEGER NOT NULL CHECK(unit_price BETWEEN 0 AND 9007199254740991),
    consent INTEGER NOT NULL CHECK(consent IN (0,1)),
    created_at TEXT NOT NULL CHECK(julianday(created_at) IS NOT NULL),
    stage TEXT NOT NULL CHECK(stage IN ('requested','approved')),
    position INTEGER UNIQUE NOT NULL CHECK(position >= 0),
    simulated INTEGER NOT NULL CHECK(simulated=1),
    CHECK(stage != 'approved' OR consent=1)
  ) STRICT;
`);
db.run("INSERT INTO metadata VALUES ('source_hash', ?)", [sourceHash]);
for (const p of previewProducts) db.run("INSERT INTO products VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
  p.id, p.name, p.category, p.description, p.price, p.emoji, p.color, JSON.stringify(p.aliases),
]);
for (const s of previewStores) db.run("INSERT INTO stores VALUES (?, ?, ?)", [s.id, s.name, s.address]);
replacePreviewRequests(db, previewRequests);
assert.equal(db.exec("PRAGMA integrity_check")[0].values[0][0], "ok");
assert.equal(db.exec("PRAGMA foreign_key_check").length, 0);
const seed = db.export();
db.close();
const assets = {
  "seed.sqlite": seed,
  "sql-wasm.js": await readFile(require.resolve("sql.js/dist/sql-wasm.js")),
  "sql-wasm.wasm": await readFile(require.resolve("sql.js/dist/sql-wasm.wasm")),
  "sql.js-LICENSE.txt": await readFile(resolve(dirname(require.resolve("sql.js/dist/sql-wasm.js")), "../LICENSE")),
};
const output = new URL("../public/preview-db/", import.meta.url);
await mkdir(output, { recursive: true });
for (const [name, bytes] of Object.entries(assets)) await writeFile(new URL(name, output), bytes);
await writeFile(new URL("manifest.json", output), JSON.stringify({
  scope: "intermediate-ui-preview-not-final-domain-or-200-product-seed",
  schemaVersion: PREVIEW_SCHEMA_VERSION,
  sourceHash,
  counts: { products: previewProducts.length, stores: previewStores.length, requests: previewRequests.length },
  files: Object.fromEntries(Object.entries(assets).map(([name, bytes]) => [name, hash(bytes)])),
}, null, 2) + "\n");
console.log(`Preview SQLite prepared: ${previewProducts.length} products, ${previewStores.length} stores, ${previewRequests.length} requests.`);

if (process.argv.includes("--check")) {
  // One runnable SQL/save-failure check; persistence is injected, not a browser IndexedDB test.
  let snapshot = seed.slice();
  let rejectSave = false;
  let finishSave;
  let holdSave = false;
  const store = createPreviewStore(SQL, seed, snapshot, async bytes => {
    if (rejectSave) throw Error("injected storage failure");
    if (holdSave) await new Promise(resolve => { finishSave = resolve; });
    snapshot = bytes.slice();
  });
  const next = [...previewRequests, { ...previewRequests[0], id: "check-new-request" }];
  holdSave = true;
  const saving = store.save(next);
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(store.requests, previewRequests, "must not publish before persistence completes");
  finishSave();
  await saving;
  holdSave = false;
  assert.deepEqual(store.requests, next);
  const restored = createPreviewStore(SQL, seed, snapshot, async () => {});
  assert.deepEqual(restored.requests, next, "actual SQLite export/import round trip");
  const beforeFailure = snapshot.slice();
  rejectSave = true;
  await assert.rejects(store.save(previewRequests), /injected storage failure/);
  await assert.rejects(store.reset(), /injected storage failure/);
  assert.deepEqual(store.requests, next);
  assert.deepEqual(snapshot, beforeFailure);
  rejectSave = false;
  for (const invalid of [
    { productId: "missing-product" }, { storeId: "missing-store" },
    { quantity: 0 }, { quantity: 1.5 }, { unitPrice: -1 },
    { stage: "approved", consent: false }, { stage: "pickup" },
  ]) {
    await assert.rejects(store.save([{ ...previewRequests[0], ...invalid }]));
    assert.deepEqual(store.requests, next);
    assert.deepEqual(snapshot, beforeFailure);
  }
  await assert.rejects(store.save([previewRequests[0], previewRequests[0]]), /UNIQUE/);
  assert.throws(() => createPreviewStore(SQL, seed, new Uint8Array([1, 2, 3]), async () => {}));
  const wrongVersion = new SQL.Database(snapshot);
  wrongVersion.run("PRAGMA user_version=999");
  assert.throws(() => createPreviewStore(SQL, seed, wrongVersion.export(), async () => {}));
  wrongVersion.close();
  assert.deepEqual(await store.reset(), previewRequests);
  await assert.rejects(store.save([{ ...previewRequests[0], productId: "missing-after-reset" }]), /FOREIGN KEY/);
  assert.deepEqual(store.requests, previewRequests);
  console.log("PASS preview-store: SQL constraints, delayed publish, save/reset failure preservation, restore, incompatible snapshot rejection, explicit reset + FK.");
}
