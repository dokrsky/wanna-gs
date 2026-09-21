// Node 24 local build: DATA-01 draft catalog, not final domain or fact-verified GS data.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import initSqlJs from "sql.js";
import { previewProducts, previewStores, previewRequests, previewAvailability, previewActors } from "../app/demo-preview.ts";
import provenance from "../data/provenance.json" with { type: "json" };
import { PREVIEW_SCHEMA_VERSION, PREVIEW_LEGACY_SOURCE_HASH, createPreviewStore, restorePreviewStore, replacePreviewRequests } from "../app/preview-store.ts";

const require = createRequire(import.meta.url);
const SQL = await initSqlJs();
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const catalogHash = hash(JSON.stringify(previewProducts));
const sourceHash = hash(JSON.stringify({ previewProducts, previewStores, previewRequests, previewAvailability, previewActors, provenance }));
// v1 DDL retained here for the bounded upgrade check; requests keep their original contract.
const baseSchema = `
  PRAGMA foreign_keys=ON;
  PRAGMA user_version=1;
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
`;
const db = new SQL.Database();
db.run(baseSchema);
db.run(`
  PRAGMA user_version=${PREVIEW_SCHEMA_VERSION};
  ALTER TABLE products ADD COLUMN details TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(details) AND json_type(details)='object');
  ALTER TABLE stores ADD COLUMN latitude REAL CHECK(latitude BETWEEN -90 AND 90);
  ALTER TABLE stores ADD COLUMN longitude REAL CHECK(longitude BETWEEN -180 AND 180);
  ALTER TABLE stores ADD COLUMN identity_origin TEXT NOT NULL DEFAULT 'synthetic' CHECK(identity_origin IN ('synthetic','reference_verified'));
  ALTER TABLE stores ADD COLUMN details TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(details) AND json_type(details)='object');
  CREATE TABLE sources (
    id TEXT PRIMARY KEY NOT NULL,
    url TEXT, checked_at TEXT NOT NULL, published_at TEXT,
    evidence_scope TEXT NOT NULL CHECK(json_valid(evidence_scope) AND json_type(evidence_scope)='array'),
    limitations TEXT NOT NULL, type TEXT NOT NULL
  ) STRICT;
  CREATE TABLE actors (
    id TEXT PRIMARY KEY NOT NULL, role TEXT NOT NULL CHECK(role IN ('customer','merchant')),
    display_name TEXT NOT NULL, store_id TEXT REFERENCES stores(id),
    details TEXT NOT NULL CHECK(json_valid(details) AND json_type(details)='object'),
    CHECK((role='merchant' AND store_id IS NOT NULL) OR (role='customer' AND store_id IS NULL)),
    CHECK(json_extract(details,'$.origin')='synthetic' AND json_extract(details,'$.realPerson')=0)
  ) STRICT;
  CREATE TABLE availability (
    store_id TEXT NOT NULL REFERENCES stores(id), product_id TEXT NOT NULL REFERENCES products(id),
    requestable INTEGER NOT NULL CHECK(requestable IN (0,1)),
    unit_price INTEGER NOT NULL CHECK(unit_price BETWEEN 0 AND 9007199254740991),
    unit_cost INTEGER NOT NULL CHECK(unit_cost BETWEEN 0 AND unit_price),
    moq INTEGER NOT NULL CHECK(moq>0), pack_size INTEGER NOT NULL CHECK(pack_size>0),
    supply_status TEXT NOT NULL CHECK(supply_status IN ('available','limited','unavailable','unknown')),
    simulated INTEGER NOT NULL CHECK(simulated=1),
    details TEXT NOT NULL CHECK(json_valid(details) AND json_type(details)='object'),
    PRIMARY KEY(store_id, product_id),
    CHECK(requestable=0 OR supply_status IN ('available','limited'))
  ) STRICT;
  CREATE TRIGGER real_store_availability BEFORE INSERT ON availability
    WHEN (SELECT identity_origin FROM stores WHERE id=NEW.store_id) != 'reference_verified'
    BEGIN SELECT RAISE(ABORT, 'availability is only configured for real reference stores'); END;
`);
db.run("INSERT INTO metadata VALUES ('source_hash', ?)", [sourceHash]);
db.run("INSERT INTO metadata VALUES ('catalog_hash', ?)", [catalogHash]);
const { sources, ...dataNotes } = provenance;
db.run("INSERT INTO metadata VALUES ('data_provenance', ?)", [JSON.stringify({ ...dataNotes, releaseVerified: false })]);
for (const p of previewProducts) db.run("INSERT INTO products VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [
  p.id, p.name, p.category, p.description, p.price, p.emoji, p.color, JSON.stringify(p.aliases), JSON.stringify(p),
]);
for (const s of previewStores) db.run("INSERT INTO stores VALUES (?, ?, ?, ?, ?, ?, ?)", [
  s.id, s.name, s.address, s.latitude ?? null, s.longitude ?? null, s.identityOrigin, JSON.stringify(s),
]);
for (const s of sources) db.run("INSERT INTO sources VALUES (?, ?, ?, ?, ?, ?, ?)", [
  s.id, s.url, s.checkedAt, s.publishedAt, JSON.stringify(s.evidenceScope), s.limitations, s.type,
]);
for (const a of previewActors) db.run("INSERT INTO actors VALUES (?, ?, ?, ?, ?)", [
  a.id, a.role, a.displayName, a.storeId ?? null, JSON.stringify(a),
]);
for (const a of previewAvailability) db.run("INSERT INTO availability VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
  a.storeId, a.productId, Number(a.requestable), a.unitPrice, a.unitCost, a.moq, a.packSize, a.supplyStatus, 1, JSON.stringify(a),
]);
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
  scope: "intermediate-data01-preview-not-final-domain-or-fact-verified",
  schemaVersion: PREVIEW_SCHEMA_VERSION,
  sourceHash, catalogHash, dataVersion: provenance.version, releaseVerified: false,
  counts: { products: previewProducts.length, stores: previewStores.length, requests: previewRequests.length,
    availability: previewAvailability.length, actors: previewActors.length, sources: sources.length },
  files: Object.fromEntries(Object.entries(assets).map(([name, bytes]) => [name, hash(bytes)])),
}, null, 2) + "\n");
console.log(`Preview SQLite prepared: ${previewProducts.length} products, ${previewStores.length} stores, ${previewRequests.length} requests.`);

if (process.argv.includes("--check")) {
  // One runnable SQL/save-failure check; persistence is injected, not a browser IndexedDB test.
  const readDb = new SQL.Database(seed);
  const scalar = sql => readDb.exec(sql)[0].values[0][0];
  assert.equal(scalar("SELECT count(*) FROM products"), 242);
  assert.equal(scalar("SELECT count(*) FROM stores WHERE identity_origin='reference_verified' AND latitude IS NOT NULL AND longitude IS NOT NULL"), 8);
  assert.equal(scalar("SELECT count(*) FROM stores WHERE identity_origin='synthetic' AND latitude IS NULL AND longitude IS NULL"), 2);
  assert.equal(scalar("SELECT count(*) FROM availability"), 484);
  assert.equal(scalar("SELECT count(*) FROM availability WHERE store_id IN ('demo-central','demo-neighborhood')"), 0, "legacy availability stays unknown");
  assert.equal(scalar("SELECT count(*) FROM actors WHERE role='customer'"), 20);
  assert.equal(scalar("SELECT count(*) FROM actors WHERE role='merchant'"), 8);
  assert.equal(scalar("SELECT count(*) FROM sources"), sources.length);
  assert.equal(scalar("SELECT count(*) FROM requests WHERE stage='requested' AND simulated=1"), 24);
  assert.equal(scalar("SELECT count(DISTINCT actor) FROM requests WHERE id LIKE 'data02-%'"), 20);
  const sqlProducts = readDb.exec("SELECT details FROM products ORDER BY rowid")[0].values.map(([json]) => JSON.parse(json));
  assert.equal(hash(JSON.stringify(sqlProducts)), catalogHash, "SQLite and model share the same full master");
  readDb.close();

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

  // Actual v1 table shape + known source marker, not a browser user's private snapshot.
  const legacyDb = new SQL.Database();
  legacyDb.run(baseSchema);
  legacyDb.run("INSERT INTO metadata VALUES ('source_hash', ?)", [PREVIEW_LEGACY_SOURCE_HASH]);
  for (const p of previewProducts.slice(0, 6)) legacyDb.run("INSERT INTO products VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
    p.id, p.name, p.category, p.description, p.price, p.emoji, p.color, JSON.stringify(p.aliases),
  ]);
  for (const s of previewStores.slice(0, 2)) legacyDb.run("INSERT INTO stores VALUES (?, ?, ?)", [s.id, s.name, s.address]);
  const legacyRequests = previewRequests.slice(0, 4).map((request, index) => index === 0
    ? { ...request, stage: "approved", quantity: 4, unitPrice: 3300 } : request);
  legacyRequests.push({ ...legacyRequests[1], id: "saved-user-request", actor: "추가 합성 요청", storeId: "demo-neighborhood", quantity: 5, consent: false });
  replacePreviewRequests(legacyDb, legacyRequests);
  const legacyBytes = legacyDb.export();
  legacyDb.close();
  let persisted = legacyBytes.slice();
  let finishUpgrade;
  let exposed = false;
  const upgrading = restorePreviewStore(SQL, seed, legacyBytes, async bytes => {
    await new Promise(resolve => { finishUpgrade = resolve; });
    persisted = bytes.slice();
  }).then(result => { exposed = true; return result; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(exposed, false);
  assert.deepEqual(persisted, legacyBytes, "v1 remains committed while upgrade persistence is pending");
  finishUpgrade();
  const upgraded = await upgrading;
  assert.deepEqual(upgraded.requests.slice(0, legacyRequests.length), legacyRequests, "existing order, approved results, consent, prices and stores survive");
  assert.equal(upgraded.requests.length, 25);
  assert.equal(new Set(upgraded.requests.map(row => row.id)).size, 25, "sample IDs merge once");
  let repeatWrites = 0;
  const reopened = await restorePreviewStore(SQL, seed, persisted, async () => { repeatWrites += 1; });
  assert.equal(repeatWrites, 0, "v2 reopening never repeats migration");
  assert.deepEqual(reopened.requests, upgraded.requests);
  await assert.rejects(reopened.save([{ ...legacyRequests[0], productId: "unknown-after-upgrade" }]), /FOREIGN KEY/);

  let failedSnapshot = legacyBytes.slice();
  await assert.rejects(restorePreviewStore(SQL, seed, failedSnapshot, async () => {
    throw Error("injected upgrade storage failure");
  }), { name: "PreviewMigrationSaveError" });
  assert.deepEqual(failedSnapshot, legacyBytes, "upgrade failure retains old bytes");
  const retryUpgrade = await restorePreviewStore(SQL, seed, failedSnapshot, async bytes => { failedSnapshot = bytes.slice(); });
  assert.deepEqual(retryUpgrade.requests, upgraded.requests, "retry after storage failure preserves the same merge");
  let unexpectedWrites = 0;
  for (const [version, marker] of [[1, "unknown-v1"], [2, PREVIEW_LEGACY_SOURCE_HASH], [999, PREVIEW_LEGACY_SOURCE_HASH]]) {
    const unknown = new SQL.Database(legacyBytes);
    unknown.run(`PRAGMA user_version=${version}`);
    unknown.run("UPDATE metadata SET value=? WHERE key='source_hash'", [marker]);
    await assert.rejects(restorePreviewStore(SQL, seed, unknown.export(), async () => { unexpectedWrites += 1; }));
    unknown.close();
  }
  await assert.rejects(restorePreviewStore(SQL, seed, new Uint8Array([1, 2, 3]), async () => { unexpectedWrites += 1; }));
  assert.equal(unexpectedWrites, 0, "unknown/corrupt snapshots require explicit recovery, never auto-reset");
  console.log("PASS preview-store: 242 shared products, 8 real + 2 legacy stores, 484 availability, 28 actors, 24 requests; SQL/FK, delayed save/reset, v1 upgrade/approval preservation/deduplication, upgrade failure + retry, unknown snapshot rejection.");
}
