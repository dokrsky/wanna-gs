// Node24: generate local SQL/WASM assets; --check adds bounded SQL/adapter tests.
// No app imports, network, browser/Next build, or claim of final data validation.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire, registerHooks } from "node:module";
import { dirname, resolve } from "node:path";
import initSqlJs from "sql.js";
import products from "../data/catalog.json" with { type: "json" };
import stores from "../data/stores.json" with { type: "json" };
import actors from "../data/actors.json" with { type: "json" };
import availability from "../data/availability.json" with { type: "json" };
import provenance from "../data/provenance.json" with { type: "json" };

// Match the pure-domain Node24 checker without changing its Next-compatible imports.
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.includes("/lib/domain/") && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) specifier += ".ts";
  return next(specifier, context);
} });
const { DOMAIN_SCHEMA_VERSION, LOCAL_CUSTOMER_ID, createDomainSeed, createDomainStore, readDomainState, writeDomainState, readPreviewArchive } = await import("../lib/domain/storage.ts");
const { DOMAIN_POLICY } = await import("../lib/domain/policy.ts");
const SQL = await initSqlJs();
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const seedInput = {
  products: products.map(({ id, name }) => ({ id, name })),
  stores: stores.map(({ id, name }) => ({ id, name })),
  actors: [...actors.map(({ id, role, displayName, storeId }) => ({ id, role, displayName, ...(storeId ? { storeId } : {}) })),
    { id: LOCAL_CUSTOMER_ID, role: "customer", displayName: "나 (합성 데모 고객)" }],
  conditions: availability.map(c => ({ storeId: c.storeId, productId: c.productId,
    requestable: c.requestable && c.supplyStatus !== "unknown", unitPrice: c.unitPrice, unitCost: c.unitCost,
    moq: c.moq, packSize: c.packSize, supplyStatus: c.supplyStatus,
    // Unknown remains unknown/non-requestable, never inferred available from catalog membership.
    supplyQuantity: c.supplyQuantity ?? 0, version: c.version, orderClosesAt: null })),
};
const sourceHash = hash(JSON.stringify({ schemaVersion: DOMAIN_SCHEMA_VERSION, bootstrapVersion: 1,
  policy: DOMAIN_POLICY, products, stores, actors, availability, provenance }));
const seed = createDomainSeed(SQL, seedInput, sourceHash, { products, stores, sources: provenance.sources, provenance });
const output = new URL("../public/domain-db/", import.meta.url);
await mkdir(output, { recursive: true });
const dist = dirname(createRequire(import.meta.url).resolve("sql.js"));
const assets = {
  "seed.sqlite": seed,
  "sql-wasm.js": await readFile(resolve(dist, "sql-wasm.js")),
  "sql-wasm.wasm": await readFile(resolve(dist, "sql-wasm.wasm")),
  "LICENSE.sql.js": await readFile(resolve(dist, "../LICENSE")),
};
for (const [name, bytes] of Object.entries(assets)) await writeFile(new URL(name, output), bytes);
const counts = { products: products.length, realStores: stores.length, conditions: availability.length,
  seedActors: actors.length, actorsWithLocalCustomer: seedInput.actors.length, pendingRequests: 20, sources: provenance.sources.length };
await writeFile(new URL("manifest.json", output), JSON.stringify({ schemaVersion: DOMAIN_SCHEMA_VERSION, sourceHash,
  policyVersion: DOMAIN_POLICY.version, dataVersion: provenance.version, counts,
  files: Object.fromEntries(Object.entries(assets).map(([name, bytes]) => [name, hash(bytes)])),
  clock: "Seed is a deterministic time-zero template. First confirmed initialization/reset rebases consent to current wall clock.",
  limitations: "One tab local simulated transactions. DATA-01 facts not finally verified. All prices, availability, people and transactions simulated; missing availability remains unknown. Original Preview is read-only archive, never upgraded into orders.",
}, null, 2) + "\n");
console.log("Generated domain-db", JSON.stringify({ ...counts, sourceHash }));

if (process.argv.includes("--check")) {
  globalThis.fetch = async () => { throw Error("Network forbidden in SQL checker"); };
  const scalar = (db, sql) => db.exec(sql)[0]?.values[0]?.[0];
  const open = bytes => { const db = new SQL.Database(bytes); db.run("PRAGMA foreign_keys=ON"); return db; };
  const inspect = (bytes, check) => { const db = open(bytes); try { check(db); } finally { db.close(); } };
  inspect(seed, db => {
    assert.equal(scalar(db, "PRAGMA integrity_check"), "ok");
    assert.deepEqual(db.exec("PRAGMA foreign_key_check"), []);
    for (const [table, count] of Object.entries({ products: 242, stores: 8, actors: 29, conditions: 484, requests: 20, sources: provenance.sources.length }))
      assert.equal(scalar(db, `SELECT count(*) FROM ${table}`), count);
    assert.equal(scalar(db, "SELECT count(*) FROM stores WHERE latitude IS NOT NULL AND longitude IS NOT NULL"), 8);
  });

  // Small old-Preview fixture exercises preservation, not a migration into orders.
  const old = new SQL.Database();
  old.run(`PRAGMA user_version=2;
    CREATE TABLE metadata(key TEXT,value TEXT); INSERT INTO metadata VALUES ('source_hash','archive-check-v2');
    CREATE TABLE products(id TEXT,name TEXT); INSERT INTO products VALUES ('milk','모의 우유');
    CREATE TABLE stores(id TEXT,name TEXT,address TEXT); INSERT INTO stores VALUES ('demo-central','이전 가상 중앙점','가상 주소');
    CREATE TABLE requests(id TEXT,actor TEXT,product_id TEXT,store_id TEXT,quantity INTEGER,unit_price INTEGER,consent INTEGER,created_at TEXT,stage TEXT,position INTEGER);
    INSERT INTO requests VALUES ('old-approved','나','milk','demo-central',2,2800,1,'2026-09-21T00:00:00.000Z','approved',0);`);
  const oldBytes = old.export(); old.close();
  const oldHash = hash(oldBytes);
  let wallNow = Date.UTC(2026, 8, 21), writes = 0, serial = 0, session = 0;
  let persisted, fail = false, hold;
  const archive = readPreviewArchive(SQL, oldBytes, wallNow);
  assert.equal(archive.status, "preserved"); assert.equal(archive.requests[0].stage, "approved");
  assert.equal(archive.requests[0].storeId, "demo-central"); assert.equal(hash(oldBytes), oldHash);
  const persist = async bytes => {
    if (hold) await hold;
    if (fail) throw Error("injected persistence failure");
    persisted = bytes.slice(); writes++;
  };
  const store = await createDomainStore({ SQL, seed, persist, archive, now: () => wallNow, sessionId: () => `check-session-${++session}` });
  assert.equal(writes, 1); assert.equal(store.ready, true);
  assert.equal(store.state.requests.length, 20);
  assert.ok(store.state.requests.every(r => r.status === "pending" && r.consentAt === wallNow && r.consentExpiresAt === wallNow + DOMAIN_POLICY.consentMs));
  assert.ok(store.state.policies.every(p => !p.enabled && p.budgetWon === 0));
  assert.equal(store.state.orders.length, 0); assert.deepEqual(store.archive, archive);
  const condition = store.state.conditions.find(c => c.requestable && c.moq === 1 && c.packSize === 1 && c.supplyQuantity >= 1 &&
    !store.state.requests.some(r => r.storeId === c.storeId && r.productId === c.productId));
  assert.ok(condition);
  const merchant = store.state.actors.find(a => a.role === "merchant" && a.storeId === condition.storeId);
  const local = store.state.actors.find(a => a.id === LOCAL_CUSTOMER_ID);
  const command = (action, actor = merchant) => ({ sessionId: store.state.sessionId, generation: store.state.generation,
    expectedRevision: store.state.revision, actorId: actor.id, role: actor.role, storeId: condition.storeId,
    idempotencyKey: `sql-check-${++serial}`, ...action });
  const execute = async (action, actor) => {
    const c = command(action, actor), outcome = await store.execute(c);
    assert.equal(outcome.ok, true, JSON.stringify(outcome)); return c;
  };
  const requestAction = { type: "request.create", requestId: "sql-local-request", productId: condition.productId,
    quantity: 1, consent: true, unitPrice: condition.unitPrice, conditionVersion: condition.version };

  // SQL CHECK/FK reject invalid writes; no hidden margin floor; failed whole transaction rolls back.
  inspect(persisted, db => {
    assert.throws(() => db.run("UPDATE conditions SET unitCost=-1"), /CHECK/);
    assert.throws(() => db.run("UPDATE conditions SET unitCost=9007199254740992"), /CHECK/);
    db.run("UPDATE conditions SET unitCost=unitPrice+1");
    assert.throws(() => db.run("UPDATE requests SET actorId='not-an-actor'"), /FOREIGN KEY/);
    const before = readDomainState(db), bad = structuredClone(before);
    bad.events.push({ id: "bad-fk-event", commandKey: "missing-receipt", type: "check", entityId: condition.productId, storeId: condition.storeId, at: wallNow });
    assert.throws(() => writeDomainState(db, bad), /FOREIGN_KEY|FOREIGN KEY/);
    assert.deepEqual(readDomainState(db), before);
  });

  // Nothing observable changes before durable completion; next command cannot interleave.
  const before = store.state, beforeBytes = persisted.slice();
  let release;
  hold = new Promise(resolve => { release = resolve; });
  const create = command(requestAction, local);
  const saving = store.execute(create);
  const queued = store.execute(command({ type: "clock.tick" }));
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(store.state, before); assert.deepEqual(persisted, beforeBytes);
  hold = undefined; release();
  assert.equal((await saving).ok, true);
  const stale = await queued; assert.equal(stale.ok, false); assert.equal(stale.error.code, "STALE_REVISION");
  const replayWrites = writes;
  assert.equal((await store.execute(create)).replayed, true); assert.equal(writes, replayWrites);

  await execute({ type: "policy.set", enabled: false, productIds: [condition.productId], budgetWon: 1000000 });
  await execute({ type: "order.approve", items: [{ productId: condition.productId, quantity: 1, conditionVersion: condition.version }] });
  const lineId = store.state.lines[0].id;
  await execute({ type: "supply.finalize", lineId, quantity: 1 });
  await execute({ type: "receive.full", lineId });
  const reservation = store.state.reservations[0];
  assert.equal(reservation.pickupDeadlineAt, wallNow + DOMAIN_POLICY.pickupMs);
  await execute({ type: "reservation.collect", reservationId: reservation.id, code: reservation.code });
  assert.equal(store.state.reservations[0].status, "collected");
  inspect(persisted, db => {
    for (const table of ["orders", "lines", "links", "payments", "allocations", "reservations", "notifications", "events", "receipts", "receipt_entities", "policy_products"])
      assert.ok(scalar(db, `SELECT count(*) FROM ${table}`) > 0, `${table} is normalized SQL`);
    assert.equal(scalar(db, "PRAGMA foreign_keys"), 1);
    assert.deepEqual(db.exec("PRAGMA foreign_key_check"), []);
    assert.deepEqual(readDomainState(db), store.state);
  });

  // Save/reset rejection must preserve both previous durable bytes and published state.
  const saved = persisted.slice(), committed = store.state;
  fail = true;
  await assert.rejects(store.execute(command({ type: "clock.advance", milliseconds: 1000 })), /injected persistence/);
  assert.deepEqual(persisted, saved); assert.deepEqual(store.state, committed);
  await assert.rejects(store.reset(), /injected persistence/);
  assert.deepEqual(persisted, saved); assert.deepEqual(store.state, committed);
  fail = false;
  let restoreWrites = 0;
  const restored = await createDomainStore({ SQL, seed, initial: saved, persist: async () => { restoreWrites++; } });
  assert.equal(restoreWrites, 0); assert.deepEqual(restored.state, committed); assert.deepEqual(restored.archive, archive);
  assert.equal((await restored.execute(create)).replayed, true); assert.equal(restoreWrites, 0);
  for (const variant of ["version", "hash", "corrupt"]) {
    let bytes;
    if (variant === "corrupt") bytes = new Uint8Array([1, 2, 3]);
    else {
      const db = open(saved);
      db.run(variant === "version" ? "PRAGMA user_version=999" : "UPDATE metadata SET value='unknown' WHERE key='source_hash'");
      bytes = db.export(); db.close();
    }
    await assert.rejects(createDomainStore({ SQL, seed, initial: bytes, persist: async () => { restoreWrites++; } }));
  }
  assert.equal(restoreWrites, 0, "unknown/corrupt snapshots never silently reset");
  wallNow += 1000;
  const queuedBeforeReset = store.execute(command({ type: "clock.tick" }));
  const staleCheck = assert.rejects(queuedBeforeReset, /DOMAIN_STALE_COMMAND/);
  const reset = await store.reset(); await staleCheck;
  assert.equal(reset.generation, committed.generation + 1); assert.equal(reset.orders.length, 0);
  assert.equal(reset.requests.length, 20); assert.ok(reset.requests.every(r => r.consentAt === wallNow));
  assert.deepEqual(store.archive, archive); assert.equal(hash(oldBytes), oldHash);
  assert.equal((await store.execute(create)).ok, false, "old generation/session command rejected after reset");
  console.log("PASS domain-store SQL: 242/8/484/29 masters, 20 current-clock pending; normalized request→order→supply→payment→pickup; CHECK/FK + rollback, delayed/failed save/reset, queue/stale/replay, restore, unknown schema/hash rejection, legacy approved archive unchanged. Node persistence seam only; browser IndexedDB/UI not exercised.");
}
