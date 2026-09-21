// Node24, actual sql.js; no network/model/build/browser. Implementation self-check only.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { registerHooks } from "node:module";
import initSqlJs from "sql.js";
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.includes("/lib/") && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) specifier += ".ts";
  return next(specifier, context);
} });
globalThis.fetch = async () => { throw Error("Network forbidden in DATA-02 checker"); };
const { createDomainSeed, createDomainStore, readDomainState, writeDomainState, DomainMigrationSaveError,
  DOMAIN_DATA01_SOURCE_HASH, DOMAIN_V1_SOURCE_HASH, DOMAIN_V2_SOURCE_HASH, LOCAL_CUSTOMER_ID } = await import("../lib/domain/storage.ts");
const { DOMAIN_POLICY } = await import("../lib/domain/policy.ts");
const SQL = await initSqlJs();
const base = "65765f77cd19811f85cacfecba2272562e7dd9ac";
const names = ["catalog", "stores", "actors", "availability", "provenance", "scenarios"];
const original = Object.fromEntries(names.map(name => [name, JSON.parse(execFileSync("git", ["show", `${base}:data/${name}.json`], { encoding: "utf8" }))]));
const current = Object.fromEntries(names.map(name => [name, JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url), "utf8"))]));
const hash = value => createHash("sha256").update(value).digest("hex");
const sourceHash = d => hash(JSON.stringify({ schemaVersion: 3, bootstrapVersion: 1, policy: DOMAIN_POLICY,
  products: d.catalog, stores: d.stores, actors: d.actors, availability: d.availability, provenance: d.provenance }));
assert.equal(sourceHash(original), DOMAIN_DATA01_SOURCE_HASH);
assert.deepEqual(current.catalog.slice(0, 242), original.catalog, "all original product fields/version retained");
assert.deepEqual(current.availability.slice(0, 484), original.availability, "all 484 condition fields/version retained");
assert.deepEqual(current.actors, original.actors); assert.deepEqual(current.scenarios, original.scenarios);
for (const [i, store] of current.stores.entries()) for (const field of ["id", "name", "address", "latitude", "longitude", "confidence", "coordinateSourceId", "coordinateSystem"])
  assert.equal(store[field], original.stores[i][field]);
const appended = current.catalog.slice(242);
assert.equal(appended.length, 20); assert.equal(current.availability.length, 524);
const research = JSON.parse(readFileSync(new URL("../docs/research/goal-20260922/recent-products.json", import.meta.url), "utf8"));
const expected = research.candidates.filter(p => !["RP-018", "RP-019", "RP-020", "RP-021"].includes(p.id));
assert.deepEqual(appended.map(p => p.id), expected.map(p => `DEMO-${p.id}`));
assert.equal(new Set(current.catalog.map(p => p.name.normalize("NFKC").replace(/\s/g, ""))).size, 262);
for (const [i, p] of appended.entries()) {
  assert.equal(p.name, expected[i].name); assert.equal(p.size, null); assert.equal(p.fieldOrigins.size, "not_provided");
  if (p.id === "DEMO-RP-010") {
    assert.equal(p.release.date, null); assert.equal(p.release.precision, "unknown"); assert.equal(p.release.announcedAt, "2026-09-03");
  } else if (p.id === "DEMO-RP-011") {
    assert.equal(p.release.date, "2026-09-01"); assert.equal(p.release.status, "mentioned_date_tense_mixed_unconfirmed");
    assert(p.description.includes("時制") || p.description.includes("시제 혼재"));
  } else assert.deepEqual(p.release, expected[i].release);
  assert.equal(p.trend.currentPopularityVerified, false);
  assert.equal(p.sourceConfidence, expected[i].identity_confidence === "medium_reporting" ? "medium" : "high");
  assert(!p.verifiedFields.includes("size")); assert.equal(p.fieldOrigins.price, "simulated");
  assert(!("public_dev_scenarios" in p));
}
const seedFor = d => createDomainSeed(SQL, {
  products: d.catalog.map(({ id, name, category }) => ({ id, name, category })),
  stores: d.stores.map(({ id, name }) => ({ id, name })),
  actors: [...d.actors, { id: LOCAL_CUSTOMER_ID, role: "customer", displayName: "나 (합성 데모 고객)" }],
  conditions: d.availability.map(c => ({ ...c, supplyQuantity: c.supplyQuantity ?? 0, orderClosesAt: null })),
}, sourceHash(d), { products: d.catalog, stores: d.stores, sources: d.provenance.sources, provenance: d.provenance });
const oldSeed = seedFor(original), seed = seedFor(current);
assert.equal(hash(oldSeed), "02028bb5e30d0c4b933d429a15c0da1af26a705783619eb616894f4feaa4b445", "exact published DATA-01 seed bytes");
assert.equal(hash(seed), hash(readFileSync(new URL("../public/domain-db/seed.sqlite", import.meta.url))));
const open = bytes => { const db = new SQL.Database(bytes); db.run("PRAGMA foreign_keys=ON"); return db; };
const scalar = (db, sql) => db.exec(sql)[0]?.values[0]?.[0];
const tableRows = db => Object.fromEntries(db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")[0].values.map(([name]) => {
  const result = db.exec(`SELECT * FROM ${name} ORDER BY rowid`)[0];
  return [name, result ? result.values.map(row => Object.fromEntries(result.columns.map((key, i) => [key, row[i]]))) : []];
}));
const now = Date.UTC(2026, 8, 21);
let oldBytes;
const archive = { status: "preserved", sourceSchema: 2, sourceHash: "old-preview-source", capturedAt: now - 1000,
  message: "preserve exact archive", requests: [{ id: "archived", actor: "나", productId: "milk", productName: "매일우유 900ml",
    storeId: "demo-central", storeName: "가상점", storeAddress: "가상주소", quantity: 2, unitPrice: 2800, consent: true,
    createdAt: "2026-09-20T00:00:00Z", stage: "approved" }] };
let old = await createDomainStore({ SQL, seed: oldSeed, persist: async bytes => { oldBytes = bytes.slice(); },
  now: () => now, sessionId: () => "data02-existing-session", archive });
const generationDb = open(oldBytes); generationDb.run("UPDATE session SET generation=7");
oldBytes = generationDb.export(); generationDb.close();
old = await createDomainStore({ SQL, seed: oldSeed, initial: oldBytes, now: () => now, persist: async bytes => { oldBytes = bytes.slice(); } });
const condition = old.state.conditions.find(c => c.requestable && c.moq === 1 && c.packSize === 1 &&
  !old.state.requests.some(r => r.storeId === c.storeId && r.productId === c.productId));
const merchant = old.state.actors.find(a => a.storeId === condition.storeId);
let serial = 0;
const command = (store, body, actorId = merchant.id) => ({ sessionId: store.state.sessionId, generation: store.state.generation,
  expectedRevision: store.state.revision, actorId, role: actorId === LOCAL_CUSTOMER_ID ? "customer" : "merchant",
  storeId: condition.storeId, idempotencyKey: `data02-${++serial}`, ...body });
const run = async (store, body, actorId) => { const c = command(store, body, actorId); const result = await store.execute(c);
  assert.equal(result.ok, true, JSON.stringify(result)); return c; };
const receipt = await run(old, { type: "request.create", requestId: "data02-old-request", productId: condition.productId,
  quantity: 1, unitPrice: condition.unitPrice, conditionVersion: condition.version, consent: true }, LOCAL_CUSTOMER_ID);
await run(old, { type: "policy.set", enabled: false, productIds: [condition.productId], budgetWon: 1000000 });
await run(old, { type: "order.approve", items: [{ productId: condition.productId, quantity: 1, conditionVersion: condition.version }] });
const lineId = old.state.lines[0].id;
await run(old, { type: "supply.finalize", lineId, quantity: 1 });
await run(old, { type: "receive.full", lineId });
const reservation = old.state.reservations[0];
assert.equal(reservation.pickupDeadlineAt, reservation.pickupAvailableAt + 172800000);
const p = original.catalog.find(p => p.id === condition.productId);
await run(old, { type: "search.record", run: { id: "data02-search", conversationId: "data02-conversation", mode: "fixture", model: null,
  status: "success", action: "candidates", question: null, usage: null, latencyMs: 0, errorCode: null,
  dialogue: { initialText: "찾고 싶은 것", currentText: p.category, turns: [{ question: "종류는?", answer: p.category }] },
  clues: [{ field: "category", value: p.category, polarity: "required", certainty: "explicit", rawSourceRange: { source: "answer1", start: 0, end: p.category.length } }],
  candidates: [{ productId: p.id, kind: "alternative", reason: "고객 전용 근거", catalogEvidence: [{ code: `${p.id}:name`, value: p.name }] }] } }, LOCAL_CUSTOMER_ID);
await run(old, { type: "needs.record", needId: "data02-need", runId: "data02-search", reason: "candidates_rejected", confirmed: true }, LOCAL_CUSTOMER_ID);
await run(old, { type: "recommendation.record", eventId: "data02-linked", runId: "data02-search", productId: p.id, action: "requested", requestId: "data02-old-request" }, LOCAL_CUSTOMER_ID);
const policy = old.state.policies.find(p => p.storeId === condition.storeId);
const { enabled, productIds, budgetWon, spentWon, version } = policy;
const input = { id: "data02-policy-run", text: "자동발주 꺼줘", generation: 77, storeId: condition.storeId,
  currentPolicy: { enabled, productIds, budgetWon, spentWon, version } };
await run(old, { type: "merchant.run.start", run: { id: input.id, kind: "policy", inputJson: JSON.stringify(input), startedAt: now } });
await run(old, { type: "merchant.run.finish", runId: input.id, terminal: "success", finishedAt: now + 10, latencyMs: 10, terminalErrorCode: null,
  observation: { status: "success", responseJson: JSON.stringify({ ok: true, id: input.id, generation: input.generation, storeId: condition.storeId,
    policyVersion: version, mode: "live", model: "synthetic-wire-fixture", usage: { inputTokens: 10, outputTokens: 20 },
    action: "propose", enabled: false, productIds: null, budgetWon: null, message: "꺼짐 유지" }) } });
const policyReceipt = await run(old, { type: "policy.set", enabled: false, productIds, budgetWon, idempotencyKey: `merchant-policy:${input.id}` });
await run(old, { type: "merchant.run.apply", runId: input.id, application: "policy_saved", commandKey: policyReceipt.idempotencyKey, appliedAt: now + 20 });
// A previously edited condition, non-default generation/clock and ON policy must survive untouched.
const edited = open(oldBytes), state = readDomainState(edited);
state.clockOffsetMs = 3600000;
const otherCondition = state.conditions.find(c => c.productId !== condition.productId);
otherCondition.unitPrice += 17; otherCondition.version = "customer-approved-custom-version";
state.policies.find(p => p.storeId !== condition.storeId).enabled = true;
writeDomainState(edited, state);
edited.run("INSERT INTO metadata VALUES ('unrelated_metadata','preserve me')");
oldBytes = edited.export(); edited.close();

let cases = 0;
for (const schema of [1, 2, 3]) {
  const legacy = open(oldBytes);
  if (schema < 3) legacy.run("DROP TABLE merchant_runs");
  if (schema === 1) for (const table of ["recommendation_events", "needs", "search_candidate_evidence", "search_candidates", "search_clues", "search_turns", "search_runs"]) legacy.run(`DROP TABLE ${table}`);
  legacy.run(`PRAGMA user_version=${schema}`);
  legacy.run("UPDATE metadata SET value=? WHERE key='source_hash'", [schema === 1 ? DOMAIN_V1_SOURCE_HASH : schema === 2 ? DOMAIN_V2_SOURCE_HASH : DOMAIN_DATA01_SOURCE_HASH]);
  const initial = legacy.export(), before = tableRows(legacy), priorState = readDomainState(legacy); legacy.close();
  let durable = initial.slice(), writes = 0, exposed = false, release;
  const gate = new Promise(resolve => { release = resolve; });
  const failure = createDomainStore({ SQL, seed, initial, now: () => now + 30 * 86400000,
    persist: async () => { await gate; throw Error("quota"); } }).then(result => { exposed = true; return result; });
  const rejected = assert.rejects(failure, e => e instanceof DomainMigrationSaveError && e.retryable === true && !("reset" in e));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(exposed, false); assert.deepEqual(durable, initial); release(); await rejected;
  const upgraded = await createDomainStore({ SQL, seed, initial: durable, now: () => now + 30 * 86400000,
    persist: async bytes => { durable = bytes.slice(); writes++; } });
  assert.equal(writes, 1); assert.deepEqual(upgraded.archive, archive);
  const db = open(durable), after = tableRows(db);
  for (const [table, rows] of Object.entries(before)) {
    if (table === "sources") continue; // Read-only provenance refresh is explicitly allowed.
    if (table === "metadata") {
      for (const row of rows.filter(r => !["source_hash", "data_provenance"].includes(r.key))) assert.deepEqual(after[table].find(r => r.key === row.key), row);
    } else if (table === "stores") {
      assert.deepEqual(after.stores.map(({ details, ...r }) => r), rows.map(({ details, ...r }) => r));
      assert.deepEqual(after.stores.map(r => JSON.parse(r.details)), current.stores);
    } else if (["products", "conditions"].includes(table)) assert.deepEqual(after[table].slice(0, rows.length), rows, table);
    else assert.deepEqual(after[table], rows, `EVERY ${schema}/${table} row preserved`);
  }
  assert.equal(after.products.length, 262); assert.equal(after.conditions.length, 524);
  assert.equal(scalar(db, "PRAGMA integrity_check"), "ok"); assert.deepEqual(db.exec("PRAGMA foreign_key_check"), []);
  assert.equal(scalar(db, "SELECT value FROM metadata WHERE key='source_hash'"), sourceHash(current));
  db.close();
  for (const [key, value] of Object.entries(priorState)) if (!["products", "conditions"].includes(key)) assert.deepEqual(upgraded.state[key], value, key);
  assert.deepEqual(upgraded.state.conditions.slice(0, 484), priorState.conditions);
  assert.equal(upgraded.state.requests.find(r => r.id === "domain-sample-01").status, "pending", "no expiry/settlement at migration wall clock");
  const reopened = await createDomainStore({ SQL, seed, initial: durable, persist: async () => { throw Error("repeat migration"); } });
  assert.deepEqual(reopened.state, upgraded.state);
  assert.equal((await reopened.execute(receipt)).replayed, true);
  for (const mutation of ["UPDATE metadata SET value='unknown' WHERE key='source_hash'", "PRAGMA foreign_keys=OFF; UPDATE requests SET actorId='missing'",
    "UPDATE products SET name='changed' WHERE id='milk'", "DELETE FROM conditions WHERE productId='DEMO-SYN-8-25'", "PRAGMA ignore_check_constraints=ON; UPDATE requests SET quantity=-1"]) {
    const broken = open(initial); broken.run(mutation);
    await assert.rejects(createDomainStore({ SQL, seed, initial: broken.export(), persist: async () => { assert.fail("corrupt snapshot persisted"); } }), e => !(e instanceof DomainMigrationSaveError));
    broken.close();
  }
  cases++;
}
const exportOriginal = SQL.Database.prototype.export;
try {
  SQL.Database.prototype.export = () => { throw Error("export failed"); };
  await assert.rejects(createDomainStore({ SQL, seed, initial: oldBytes, persist: async () => { assert.fail("export failure persisted"); } }), e => e instanceof DomainMigrationSaveError && e.retryable);
} finally { SQL.Database.prototype.export = exportOriginal; }
const afterExportFailure = await createDomainStore({ SQL, seed, initial: oldBytes, persist: async () => {} });
assert.equal(afterExportFailure.state.products.length, 262);
// Legacy '/' v2: rebuild its ACTUAL old master and deterministic request selection,
// not the expanded seed with a relabeled hash. Hash the original input contract too.
const { restorePreviewStore, replacePreviewRequests, PREVIEW_DATA01_SOURCE_HASH, PreviewMigrationSaveError } = await import("../app/preview-store.ts");
const previewSeed = readFileSync(new URL("../public/preview-db/seed.sqlite", import.meta.url));
const previewTemplate = open(previewSeed);
const previewProducts = original.catalog, previewAvailability = original.availability, previewActors = original.actors;
const previewStores = [
  { id: "demo-central", name: "GS25 원하데모점", address: "화면 시연용 가상 점포 · 실제 위치 아님", identityOrigin: "synthetic", sourceIds: ["LOCAL-PREVIEW"] },
  { id: "demo-neighborhood", name: "GS25 골목데모점", address: "화면 시연용 가상 점포 · 실제 위치 아님", identityOrigin: "synthetic", sourceIds: ["LOCAL-PREVIEW"] },
  ...original.stores,
];
const previewRequests = [
  ...[["strawberry", 2, 3500], ["strawberry", 1, 3500], ["milk", 2, 2800], ["bread", 3, 2200]].map(([productId, quantity, unitPrice], i) => ({
    id: `sample-${i + 1}`, actor: `합성 고객 0${i + 1}`, productId, storeId: "demo-central", quantity, unitPrice, consent: true,
    createdAt: `2026-09-21T09:${i}0:00+09:00`, stage: "requested",
  })),
  ...previewActors.filter(a => a.role === "customer").map((actor, index) => {
    const store = original.stores[index % original.stores.length];
    const options = previewAvailability.filter(r => r.storeId === store.id && r.requestable);
    const row = options[(index * 7) % options.length];
    return { id: `data02-sample-${String(index + 1).padStart(2, "0")}`, actor: actor.displayName, productId: row.productId,
      storeId: row.storeId, quantity: 1 + index % 3, unitPrice: row.unitPrice, consent: true,
      createdAt: `2026-09-21T10:${String(index).padStart(2, "0")}:00+09:00`, stage: "requested" };
  }),
];
assert.equal(hash(JSON.stringify({ previewProducts, previewStores, previewRequests, previewAvailability, previewActors, provenance: original.provenance })), PREVIEW_DATA01_SOURCE_HASH);
const previewOld = new SQL.Database();
previewOld.run("PRAGMA foreign_keys=ON; PRAGMA user_version=2");
for (const [ddl] of previewTemplate.exec("SELECT sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY rowid")[0].values) previewOld.run(ddl);
const addRows = (table, values) => { for (const row of values) previewOld.run(`INSERT INTO ${table} VALUES (${row.map(() => "?").join(",")})`, row); };
const { sources: oldSources, ...oldDataNotes } = original.provenance;
addRows("metadata", [["source_hash", PREVIEW_DATA01_SOURCE_HASH], ["catalog_hash", hash(JSON.stringify(previewProducts))],
  ["data_provenance", JSON.stringify({ ...oldDataNotes, releaseVerified: false })], ["unrelated_metadata", "keep legacy metadata"]]);
addRows("products", previewProducts.map(p => [p.id, p.name, p.category, p.description, p.price, p.emoji, p.color, JSON.stringify(p.aliases), JSON.stringify(p)]));
addRows("stores", previewStores.map(s => [s.id, s.name, s.address, s.latitude ?? null, s.longitude ?? null, s.identityOrigin, JSON.stringify(s)]));
addRows("sources", oldSources.map(s => [s.id, s.url, s.checkedAt, s.publishedAt, JSON.stringify(s.evidenceScope), s.limitations, s.type]));
addRows("actors", previewActors.map(a => [a.id, a.role, a.displayName, a.storeId ?? null, JSON.stringify(a)]));
addRows("availability", previewAvailability.map(a => [a.storeId, a.productId, Number(a.requestable), a.unitPrice, a.unitCost, a.moq, a.packSize, a.supplyStatus, 1, JSON.stringify(a)]));
replacePreviewRequests(previewOld, [...previewRequests.map((r, i) => i === 0 ? { ...r, stage: "approved" } : r),
  { id: "data02-own-request", actor: "나", productId: "DEMO-SYN-1-01", storeId: "DEMO-ST-03", quantity: 1, unitPrice: 1200,
    consent: true, createdAt: "2026-09-21T14:00:00Z", stage: "requested" }]);
// Preserve edited availability too, not just the generated source values.
previewOld.run("UPDATE availability SET unit_price=unit_price+17 WHERE rowid=1");
const previewInitial = previewOld.export(), previewBefore = tableRows(previewOld);
assert.equal(previewBefore.products.length, 242); assert.equal(previewBefore.availability.length, 484);
assert.notDeepEqual(previewBefore.requests.slice(4, 24), tableRows(previewTemplate).requests.slice(4, 24), "expanded selection really differs");
previewOld.close(); previewTemplate.close();
let previewDurable = previewInitial.slice(), previewWrites = 0, previewExposed = false, previewRelease;
const previewGate = new Promise(resolve => { previewRelease = resolve; });
const previewFailed = restorePreviewStore(SQL, previewSeed, previewInitial, async () => { await previewGate; throw Error("quota"); })
  .then(store => { previewExposed = true; return store; });
const previewRejected = assert.rejects(previewFailed, e => e instanceof PreviewMigrationSaveError && e.retryable && !("reset" in e));
await new Promise(resolve => setImmediate(resolve));
assert.equal(previewExposed, false); assert.deepEqual(previewDurable, previewInitial); previewRelease(); await previewRejected;
const previewUpgraded = await restorePreviewStore(SQL, previewSeed, previewInitial, async bytes => { previewDurable = bytes.slice(); previewWrites++; });
assert.equal(previewWrites, 1); assert.equal(previewUpgraded.requests.length, 25, "no new seed requests");
const previewAfterDb = open(previewDurable), previewAfter = tableRows(previewAfterDb);
for (const [table, before] of Object.entries(previewBefore)) {
  if (table === "sources") continue;
  if (table === "metadata") {
    for (const row of before.filter(r => !["source_hash", "catalog_hash", "data_provenance"].includes(r.key))) assert.deepEqual(previewAfter[table].find(r => r.key === row.key), row);
  } else if (table === "stores") assert.deepEqual(previewAfter.stores.map(({ details, ...r }) => r), before.map(({ details, ...r }) => r));
  else if (["products", "availability"].includes(table)) assert.deepEqual(previewAfter[table].slice(0, before.length), before);
  else assert.deepEqual(previewAfter[table], before, `EVERY legacy v2 ${table} row preserved`);
}
assert.equal(previewAfter.products.length, 262); assert.equal(previewAfter.availability.length, 524);
assert.equal(scalar(previewAfterDb, "PRAGMA integrity_check"), "ok"); assert.deepEqual(previewAfterDb.exec("PRAGMA foreign_key_check"), []);
const newPreviewHash = scalar(previewAfterDb, "SELECT value FROM metadata WHERE key='source_hash'"); previewAfterDb.close();
const previewReopened = await restorePreviewStore(SQL, previewSeed, previewDurable, async () => { assert.fail("repeat migration"); });
assert.deepEqual(previewReopened.requests, previewUpgraded.requests);
for (const mutation of ["UPDATE metadata SET value='unknown' WHERE key='source_hash'", "PRAGMA foreign_keys=OFF; UPDATE requests SET product_id='missing'",
  "UPDATE products SET name='changed' WHERE id='milk'", "PRAGMA ignore_check_constraints=ON; UPDATE requests SET quantity=-1"]) {
  const bad = open(previewInitial); bad.run(mutation);
  await assert.rejects(restorePreviewStore(SQL, previewSeed, bad.export(), async () => { assert.fail("invalid persisted"); }), e => !(e instanceof PreviewMigrationSaveError)); bad.close();
}
try {
  SQL.Database.prototype.export = () => { throw Error("export failed"); };
  await assert.rejects(restorePreviewStore(SQL, previewSeed, previewInitial, async () => { assert.fail("export failure persisted"); }), e => e instanceof PreviewMigrationSaveError && e.retryable);
} finally { SQL.Database.prototype.export = exportOriginal; }
assert.deepEqual((await restorePreviewStore(SQL, previewSeed, previewInitial, async () => {})).requests, previewUpgraded.requests);
console.log(JSON.stringify({ check: "PASS DATA-02", sourceHash: sourceHash(current), publishedOldSeedVerified: true,
  originalProductRows: 242, originalConditionRows: 484, appendedProducts: 20, appendedConditions: 40,
  oldSchemaMigrationCases: cases, checks: "every SQL row/receipt/log/clock preserved; custom condition/version; no settlement/reseed; delayed failure/retry/reopen; export failure/retry; corrupt/unknown rejection",
  legacyPreviewV2: { sourceHash: newPreviewHash, originalProductRows: 242, originalAvailabilityRows: 484, preservedRequests: 25, noReseed: true, failuresRetryable: true },
  independentSourceReview: "not claimed", browser: "not run", modelCalls: 0 }, null, 2));
