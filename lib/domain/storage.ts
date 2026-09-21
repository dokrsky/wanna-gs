import type { Database, SqlJsStatic, SqlValue } from "sql.js";
// Node24's checker and Next both use these same pure commands.
// @ts-ignore -- Node24 requires the explicit TS extension; Next supports it.
import { applyCommand, assertState, createInitialState } from "./commands.ts";
// @ts-ignore -- see the shared Node24/Next import above.
import { DOMAIN_POLICY } from "./policy.ts";
import type { Command, CommandOutcome, DomainState, SearchRun, Seed } from "./types";

export const DOMAIN_SCHEMA_VERSION = 3;
export const DOMAIN_V1_SOURCE_HASH = "13bc7a6a7a88bb3d60e80444fa24731b29feeaafc7a0a71c546a19a60014403e";
export const DOMAIN_V2_SOURCE_HASH = "3d15fce9caf74e0293ce5908bb532cbd3dc69e4639df573b5f76553f1fc72bc0";
export const DOMAIN_DATA01_SOURCE_HASH = "b665391bac2a443ae0a42f850828e3c0ceaafaad4c9f7c8058c1b67453f24051";
export const LOCAL_CUSTOMER_ID = "DEMO-CUSTOMER-LOCAL";
export type ArchivedPreviewRequest = {
  id: string; actor: string; productId: string; productName: string; storeId: string;
  storeName: string; storeAddress: string; quantity: number; unitPrice: number;
  consent: boolean; createdAt: string; stage: "requested" | "approved";
};
export type PreviewArchive = {
  status: "none" | "preserved" | "unreadable"; sourceSchema: number | null;
  sourceHash: string | null; capturedAt: number; message: string; requests: ArchivedPreviewRequest[];
};
export type DomainStore = {
  readonly ready: true;
  readonly state: DomainState;
  readonly archive: PreviewArchive;
  execute(command: Command): Promise<CommandOutcome>;
  reset(): Promise<DomainState>;
};

// Mutable business fields are columns/relations, never a whole-state JSON KV.
// Presentation/provenance on read-only masters may retain the original JSON record.
const SCHEMA = `
 PRAGMA foreign_keys=ON;
 PRAGMA user_version=3;
 CREATE TABLE metadata(key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL) STRICT;
 CREATE TABLE session(
   singleton INTEGER PRIMARY KEY CHECK(singleton=1), sessionId TEXT NOT NULL,
   generation INTEGER NOT NULL CHECK(generation>=1), revision INTEGER NOT NULL CHECK(revision>=0),
   nextSequence INTEGER NOT NULL CHECK(nextSequence>=1), clockOffsetMs INTEGER NOT NULL CHECK(clockOffsetMs>=0),
   lastNow INTEGER NOT NULL CHECK(lastNow>=0)
 ) STRICT;
 CREATE TABLE products(id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL,
   details TEXT NOT NULL CHECK(json_valid(details)), position INTEGER NOT NULL UNIQUE) STRICT;
 CREATE TABLE stores(id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, address TEXT,
   latitude REAL CHECK(latitude BETWEEN -90 AND 90), longitude REAL CHECK(longitude BETWEEN -180 AND 180),
   details TEXT NOT NULL CHECK(json_valid(details)), position INTEGER NOT NULL UNIQUE) STRICT;
 CREATE TABLE actors(id TEXT PRIMARY KEY NOT NULL, role TEXT NOT NULL CHECK(role IN ('customer','merchant')),
   displayName TEXT NOT NULL, storeId TEXT REFERENCES stores(id), position INTEGER NOT NULL UNIQUE,
   CHECK((role='customer' AND storeId IS NULL) OR (role='merchant' AND storeId IS NOT NULL))) STRICT;
 CREATE TABLE sources(id TEXT PRIMARY KEY NOT NULL, url TEXT, checkedAt TEXT NOT NULL,
   publishedAt TEXT, evidenceScope TEXT NOT NULL CHECK(json_valid(evidenceScope)), limitations TEXT NOT NULL) STRICT;
 CREATE TABLE conditions(storeId TEXT NOT NULL REFERENCES stores(id), productId TEXT NOT NULL REFERENCES products(id),
   requestable INTEGER NOT NULL CHECK(requestable IN (0,1)), unitPrice INTEGER NOT NULL CHECK(unitPrice>=0),
   unitCost INTEGER NOT NULL CHECK(unitCost BETWEEN 0 AND 9007199254740991), moq INTEGER NOT NULL CHECK(moq>0),
   packSize INTEGER NOT NULL CHECK(packSize>0), supplyStatus TEXT NOT NULL CHECK(supplyStatus IN ('available','limited','unavailable','unknown')),
   supplyQuantity INTEGER NOT NULL CHECK(supplyQuantity>=0), version TEXT NOT NULL, orderClosesAt INTEGER,
   position INTEGER NOT NULL UNIQUE, PRIMARY KEY(storeId,productId)) STRICT;
 CREATE TABLE requests(id TEXT PRIMARY KEY NOT NULL, actorId TEXT NOT NULL REFERENCES actors(id),
   storeId TEXT NOT NULL, productId TEXT NOT NULL, quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 20),
   unitPrice INTEGER NOT NULL CHECK(unitPrice>=0), consentVersion TEXT NOT NULL, consentAt INTEGER NOT NULL CHECK(consentAt>=0),
   consentExpiresAt INTEGER NOT NULL CHECK(consentExpiresAt>consentAt), sequence INTEGER NOT NULL UNIQUE CHECK(sequence>0),
   createdAt INTEGER NOT NULL CHECK(createdAt>=0), status TEXT NOT NULL CHECK(status IN ('pending','review_required','reserved','cancelled')),
   reason TEXT, position INTEGER NOT NULL UNIQUE, FOREIGN KEY(storeId,productId) REFERENCES conditions(storeId,productId)) STRICT;
 CREATE TABLE orders(id TEXT PRIMARY KEY NOT NULL, storeId TEXT NOT NULL REFERENCES stores(id),
   source TEXT NOT NULL CHECK(source IN ('manual','auto')), createdAt INTEGER NOT NULL CHECK(createdAt>=0),
   costWon INTEGER NOT NULL CHECK(costWon>=0), position INTEGER NOT NULL UNIQUE) STRICT;
 CREATE TABLE lines(id TEXT PRIMARY KEY NOT NULL, orderId TEXT NOT NULL REFERENCES orders(id),
   storeId TEXT NOT NULL, productId TEXT NOT NULL, quantity INTEGER NOT NULL CHECK(quantity>0),
   unitCost INTEGER NOT NULL CHECK(unitCost BETWEEN 0 AND 9007199254740991), conditionVersion TEXT NOT NULL,
   suppliedQuantity INTEGER CHECK(suppliedQuantity BETWEEN 0 AND quantity), suppliedAt INTEGER, receivedAt INTEGER,
   position INTEGER NOT NULL UNIQUE, FOREIGN KEY(storeId,productId) REFERENCES conditions(storeId,productId),
   CHECK((suppliedQuantity IS NULL)=(suppliedAt IS NULL)), CHECK(receivedAt IS NULL OR suppliedAt IS NOT NULL)) STRICT;
 CREATE TABLE links(id TEXT PRIMARY KEY NOT NULL, requestId TEXT NOT NULL REFERENCES requests(id),
   lineId TEXT NOT NULL REFERENCES lines(id), quantity INTEGER NOT NULL CHECK(quantity>0),
   active INTEGER NOT NULL CHECK(active IN (0,1)), position INTEGER NOT NULL UNIQUE) STRICT;
 CREATE TABLE payments(id TEXT PRIMARY KEY NOT NULL, requestId TEXT NOT NULL REFERENCES requests(id),
   amountWon INTEGER NOT NULL CHECK(amountWon>=0), status TEXT NOT NULL CHECK(status IN ('succeeded','failed')),
   createdAt INTEGER NOT NULL CHECK(createdAt>=0), position INTEGER NOT NULL UNIQUE) STRICT;
 CREATE TABLE allocations(id TEXT PRIMARY KEY NOT NULL, requestId TEXT NOT NULL REFERENCES requests(id),
   lineId TEXT NOT NULL REFERENCES lines(id), paymentId TEXT NOT NULL REFERENCES payments(id),
   quantity INTEGER NOT NULL CHECK(quantity>0), releasedAt INTEGER, position INTEGER NOT NULL UNIQUE) STRICT;
 CREATE TABLE reservations(id TEXT PRIMARY KEY NOT NULL, requestId TEXT NOT NULL REFERENCES requests(id),
   paymentId TEXT NOT NULL REFERENCES payments(id), storeId TEXT NOT NULL REFERENCES stores(id), actorId TEXT NOT NULL REFERENCES actors(id),
   code TEXT NOT NULL UNIQUE, status TEXT NOT NULL CHECK(status IN ('confirmed','pickup_ready','collected','pickup_expired')),
   createdAt INTEGER NOT NULL CHECK(createdAt>=0), pickupAvailableAt INTEGER, pickupDeadlineAt INTEGER, collectedAt INTEGER,
   position INTEGER NOT NULL UNIQUE, CHECK((pickupAvailableAt IS NULL)=(pickupDeadlineAt IS NULL)),
   CHECK(pickupDeadlineAt IS NULL OR pickupDeadlineAt=pickupAvailableAt+172800000),
   CHECK(status='confirmed' OR pickupAvailableAt IS NOT NULL), CHECK(status!='collected' OR collectedAt IS NOT NULL)) STRICT;
 CREATE TABLE notifications(id TEXT PRIMARY KEY NOT NULL, actorId TEXT NOT NULL REFERENCES actors(id),
   reservationId TEXT NOT NULL REFERENCES reservations(id), kind TEXT NOT NULL CHECK(kind IN ('reservation_confirmed','pickup_ready')),
   createdAt INTEGER NOT NULL CHECK(createdAt>=0), position INTEGER NOT NULL UNIQUE, UNIQUE(reservationId,kind)) STRICT;
 CREATE TABLE policies(storeId TEXT PRIMARY KEY NOT NULL REFERENCES stores(id), enabled INTEGER NOT NULL CHECK(enabled IN (0,1)),
   budgetWon INTEGER NOT NULL CHECK(budgetWon>=0), spentWon INTEGER NOT NULL CHECK(spentWon BETWEEN 0 AND budgetWon),
   version INTEGER NOT NULL CHECK(version>=0), position INTEGER NOT NULL UNIQUE) STRICT;
 CREATE TABLE policy_products(storeId TEXT NOT NULL REFERENCES policies(storeId), productId TEXT NOT NULL REFERENCES products(id),
   position INTEGER NOT NULL, PRIMARY KEY(storeId,productId), UNIQUE(storeId,position)) STRICT;
 CREATE TABLE receipts(key TEXT PRIMARY KEY NOT NULL, fingerprint TEXT NOT NULL, commandKey TEXT NOT NULL UNIQUE,
   revision INTEGER NOT NULL CHECK(revision>=0), position INTEGER NOT NULL UNIQUE, CHECK(key=commandKey)) STRICT;
 CREATE TABLE receipt_entities(receiptKey TEXT NOT NULL REFERENCES receipts(key), entityId TEXT NOT NULL,
   position INTEGER NOT NULL, PRIMARY KEY(receiptKey,position)) STRICT;
 CREATE TABLE events(id TEXT PRIMARY KEY NOT NULL, commandKey TEXT NOT NULL REFERENCES receipts(key), type TEXT NOT NULL,
   entityId TEXT NOT NULL, storeId TEXT NOT NULL REFERENCES stores(id), at INTEGER NOT NULL CHECK(at>=0), position INTEGER NOT NULL UNIQUE) STRICT;
 CREATE TABLE archive_info(singleton INTEGER PRIMARY KEY CHECK(singleton=1), status TEXT NOT NULL CHECK(status IN ('none','preserved','unreadable')),
   sourceSchema INTEGER, sourceHash TEXT, capturedAt INTEGER NOT NULL, message TEXT NOT NULL) STRICT;
 CREATE TABLE preview_archive(id TEXT PRIMARY KEY NOT NULL, actor TEXT NOT NULL, productId TEXT NOT NULL, productName TEXT NOT NULL,
   storeId TEXT NOT NULL, storeName TEXT NOT NULL, storeAddress TEXT NOT NULL, quantity INTEGER NOT NULL CHECK(quantity>0),
   unitPrice INTEGER NOT NULL CHECK(unitPrice>=0), consent INTEGER NOT NULL CHECK(consent IN (0,1)), createdAt TEXT NOT NULL,
   stage TEXT NOT NULL CHECK(stage IN ('requested','approved')), position INTEGER NOT NULL UNIQUE) STRICT;
`;

// The same additive DDL is used for new seeds and the one supported v1 upgrade.
const RECORD_SCHEMA = `
 CREATE TABLE search_runs(id TEXT PRIMARY KEY NOT NULL, actorId TEXT NOT NULL REFERENCES actors(id),
   conversationId TEXT NOT NULL, initialText TEXT NOT NULL CHECK(length(initialText) BETWEEN 1 AND 300),
   currentText TEXT NOT NULL CHECK(length(currentText) BETWEEN 1 AND 300), mode TEXT NOT NULL CHECK(mode IN ('live','local','fixture')),
   model TEXT, status TEXT NOT NULL CHECK(status IN ('success','error')),
   action TEXT CHECK(action IN ('candidates','clarify','unidentified','unsupported')), question TEXT,
   inputTokens INTEGER CHECK(inputTokens>=0), outputTokens INTEGER CHECK(outputTokens>=0),
   latencyMs INTEGER NOT NULL CHECK(latencyMs>=0), errorCode TEXT, createdAt INTEGER NOT NULL CHECK(createdAt>=0),
   position INTEGER NOT NULL UNIQUE, UNIQUE(id,actorId,conversationId), UNIQUE(id,actorId),
   CHECK((inputTokens IS NULL)=(outputTokens IS NULL)),
   CHECK(mode!='local' OR (model IS NULL AND inputTokens IS NULL)),
   CHECK(mode!='live' OR status!='success' OR (model IS NOT NULL AND inputTokens IS NOT NULL)),
   CHECK((status='error' AND action IS NULL AND errorCode IS NOT NULL AND question IS NULL) OR
         (status='success' AND action IS NOT NULL AND errorCode IS NULL)),
   CHECK((action='clarify' AND question IS NOT NULL) OR (action IS NOT 'clarify' AND question IS NULL))) STRICT;
 CREATE TABLE search_turns(runId TEXT NOT NULL REFERENCES search_runs(id), position INTEGER NOT NULL CHECK(position BETWEEN 0 AND 1),
   question TEXT NOT NULL, answer TEXT NOT NULL, PRIMARY KEY(runId,position)) STRICT;
 CREATE TABLE search_clues(runId TEXT NOT NULL REFERENCES search_runs(id), position INTEGER NOT NULL CHECK(position BETWEEN 0 AND 5),
   field TEXT NOT NULL CHECK(field IN ('name','brand','category','flavor','size','feature')), value TEXT NOT NULL,
   polarity TEXT NOT NULL CHECK(polarity IN ('required','excluded','preferred')), certainty TEXT NOT NULL CHECK(certainty IN ('explicit','inferred')),
   source TEXT NOT NULL CHECK(source IN ('initial','answer1','answer2')), start INTEGER NOT NULL CHECK(start>=0),
   end INTEGER NOT NULL CHECK(end>start), PRIMARY KEY(runId,position)) STRICT;
 CREATE TABLE search_candidates(runId TEXT NOT NULL REFERENCES search_runs(id), position INTEGER NOT NULL CHECK(position BETWEEN 0 AND 2),
   productId TEXT NOT NULL REFERENCES products(id), kind TEXT NOT NULL CHECK(kind IN ('exact','needs_confirmation','alternative')),
   reason TEXT NOT NULL, PRIMARY KEY(runId,position), UNIQUE(runId,productId)) STRICT;
 CREATE TABLE search_candidate_evidence(runId TEXT NOT NULL, candidatePosition INTEGER NOT NULL, position INTEGER NOT NULL CHECK(position BETWEEN 0 AND 2),
   code TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY(runId,candidatePosition,position),
   FOREIGN KEY(runId,candidatePosition) REFERENCES search_candidates(runId,position)) STRICT;
 CREATE TABLE needs(id TEXT PRIMARY KEY NOT NULL, actorId TEXT NOT NULL REFERENCES actors(id), storeId TEXT NOT NULL REFERENCES stores(id),
   conversationId TEXT NOT NULL, runId TEXT NOT NULL, reason TEXT NOT NULL CHECK(reason IN ('unidentified','clarification_stopped','candidates_rejected','condition_unknown','not_requestable')),
   createdAt INTEGER NOT NULL CHECK(createdAt>=0), position INTEGER NOT NULL UNIQUE, UNIQUE(actorId,conversationId),
   FOREIGN KEY(runId,actorId,conversationId) REFERENCES search_runs(id,actorId,conversationId)) STRICT;
 CREATE TABLE recommendation_events(id TEXT PRIMARY KEY NOT NULL, actorId TEXT NOT NULL REFERENCES actors(id), runId TEXT NOT NULL,
   productId TEXT NOT NULL, action TEXT NOT NULL CHECK(action IN ('shown','selected','rejected','requested')),
   requestId TEXT REFERENCES requests(id), createdAt INTEGER NOT NULL CHECK(createdAt>=0), position INTEGER NOT NULL UNIQUE,
   FOREIGN KEY(runId,actorId) REFERENCES search_runs(id,actorId), FOREIGN KEY(runId,productId) REFERENCES search_candidates(runId,productId),
   CHECK((action='requested' AND requestId IS NOT NULL) OR (action!='requested' AND requestId IS NULL))) STRICT;
`;
const recordTables = ["recommendation_events", "needs", "search_candidate_evidence", "search_candidates", "search_clues", "search_turns", "search_runs"];
const MERCHANT_SCHEMA = `
 CREATE TABLE merchant_runs(id TEXT PRIMARY KEY NOT NULL, actorId TEXT NOT NULL REFERENCES actors(id),
   storeId TEXT NOT NULL REFERENCES stores(id), kind TEXT NOT NULL CHECK(kind IN ('batch','policy')),
   inputJson TEXT NOT NULL CHECK(json_valid(inputJson) AND length(CAST(inputJson AS BLOB))<=65536),
   startedAt INTEGER NOT NULL CHECK(startedAt BETWEEN 0 AND 9007199254740991), terminal TEXT NOT NULL CHECK(terminal IN ('running','success','error','cancelled','stale','interrupted')),
   finishedAt INTEGER CHECK(finishedAt BETWEEN startedAt AND 9007199254740991), latencyMs INTEGER CHECK(latencyMs BETWEEN 0 AND 9007199254740991), terminalErrorCode TEXT,
   observationStatus TEXT CHECK(observationStatus IN ('success','error')), responseJson TEXT CHECK(json_valid(responseJson) AND length(CAST(responseJson AS BLOB))<=16384), observationErrorCode TEXT,
   model TEXT, inputTokens INTEGER CHECK(inputTokens BETWEEN 0 AND 9007199254740991), outputTokens INTEGER CHECK(outputTokens BETWEEN 0 AND 9007199254740991),
   application TEXT NOT NULL CHECK(application IN ('not_applied','screen_applied','policy_saved')),
   applicationCommandKey TEXT REFERENCES receipts(key), appliedAt INTEGER CHECK(appliedAt BETWEEN finishedAt AND 9007199254740991), position INTEGER NOT NULL UNIQUE,
   CHECK((terminal='running' AND finishedAt IS NULL AND latencyMs IS NULL AND terminalErrorCode IS NULL AND observationStatus IS NULL) OR
         (terminal!='running' AND finishedAt IS NOT NULL AND latencyMs IS NOT NULL)),
   CHECK((observationStatus IS NULL AND responseJson IS NULL AND observationErrorCode IS NULL AND model IS NULL AND inputTokens IS NULL AND outputTokens IS NULL) OR
         (observationStatus IS 'success' AND responseJson IS NOT NULL AND observationErrorCode IS NULL AND model IS NOT NULL AND inputTokens IS NOT NULL AND outputTokens IS NOT NULL) OR
         (observationStatus IS 'error' AND responseJson IS NULL AND observationErrorCode IS NOT NULL AND model IS NULL AND inputTokens IS NULL AND outputTokens IS NULL)),
   CHECK(terminal!='success' OR (observationStatus IS 'success' AND terminalErrorCode IS NULL)),
   CHECK(terminal!='error' OR terminalErrorCode IS NOT NULL),
   CHECK((application='not_applied' AND applicationCommandKey IS NULL AND appliedAt IS NULL) OR
         (application='screen_applied' AND terminal='success' AND applicationCommandKey IS NULL AND appliedAt IS NOT NULL) OR
         (application='policy_saved' AND terminal='success' AND applicationCommandKey IS NOT NULL AND appliedAt IS NOT NULL))) STRICT;
`;
const merchantColumns = "id,actorId,storeId,kind,inputJson,startedAt,terminal,finishedAt,latencyMs,terminalErrorCode,observationStatus,responseJson,observationErrorCode,model,inputTokens,outputTokens,application,applicationCommandKey,appliedAt";

// Static mappings for the canonical DTO; no ORM, migrations framework or dynamic schema.
const COLUMNS = {
  conditions: "storeId,productId,requestable,unitPrice,unitCost,moq,packSize,supplyStatus,supplyQuantity,version,orderClosesAt",
  requests: "id,actorId,storeId,productId,quantity,unitPrice,consentVersion,consentAt,consentExpiresAt,sequence,createdAt,status,reason",
  orders: "id,storeId,source,createdAt,costWon",
  lines: "id,orderId,storeId,productId,quantity,unitCost,conditionVersion,suppliedQuantity,suppliedAt,receivedAt",
  links: "id,requestId,lineId,quantity,active", payments: "id,requestId,amountWon,status,createdAt",
  allocations: "id,requestId,lineId,paymentId,quantity,releasedAt",
  reservations: "id,requestId,paymentId,storeId,actorId,code,status,createdAt,pickupAvailableAt,pickupDeadlineAt,collectedAt",
  notifications: "id,actorId,reservationId,kind,createdAt", policies: "storeId,enabled,budgetWon,spentWon,version",
  receipts: "key,fingerprint,commandKey,revision", events: "id,commandKey,type,entityId,storeId,at",
} as const;
const archiveColumns = "id,actor,productId,productName,storeId,storeName,storeAddress,quantity,unitPrice,consent,createdAt,stage";
const scalar = (db: Database, sql: string) => db.exec(sql)[0]?.values[0]?.[0];
function rows(db: Database, sql: string): Record<string, SqlValue>[] {
  const result = db.exec(sql)[0];
  return result ? result.values.map(values => Object.fromEntries(result.columns.map((name, i) => [name, values[i]]))) : [];
}
function insert(db: Database, table: string, columns: string, record: object, position: number) {
  const data = record as Record<string, unknown>;
  const values = columns.split(",").map(key => typeof data[key] === "boolean" ? Number(data[key]) : data[key] ?? null);
  db.run(`INSERT INTO ${table} (${columns},position) VALUES (${[...values, position].map(() => "?").join(",")})`, [...values, position] as SqlValue[]);
}
function foreignKeys(db: Database) {
  db.run("PRAGMA foreign_keys=ON");
  if (scalar(db, "PRAGMA foreign_keys") !== 1) throw Error("DOMAIN_FK_DISABLED");
}
function openDatabase(SQL: SqlJsStatic, bytes: Uint8Array, sourceHash?: string, allowLegacy = false) {
  const db = new SQL.Database(bytes);
  try {
    foreignKeys(db);
    const version = scalar(db, "PRAGMA user_version");
    const observedHash = scalar(db, "SELECT value FROM metadata WHERE key='source_hash'");
    const knownLegacy = allowLegacy && ((version === 1 && observedHash === DOMAIN_V1_SOURCE_HASH) ||
      (version === 2 && observedHash === DOMAIN_V2_SOURCE_HASH) || (version === 3 && observedHash === DOMAIN_DATA01_SOURCE_HASH));
    if ((!knownLegacy && (version !== DOMAIN_SCHEMA_VERSION || (sourceHash !== undefined && observedHash !== sourceHash))) ||
      scalar(db, "PRAGMA integrity_check") !== "ok" || db.exec("PRAGMA foreign_key_check").length) {
      throw Error("DOMAIN_SNAPSHOT_INCOMPATIBLE");
    }
    return db;
  } catch (error) { db.close(); throw error; }
}

function readSearchState(db: Database): Pick<DomainState, "searchRuns" | "needs" | "recommendationEvents"> {
  if (scalar(db, "PRAGMA user_version") === 1) return { searchRuns: [], needs: [], recommendationEvents: [] };
  const searchRuns = rows(db, "SELECT * FROM search_runs ORDER BY position").map(row => {
    const runId = row.id;
    const owned = (table: string) => rows(db, `SELECT * FROM ${table} ORDER BY position`).filter(r => r.runId === runId);
    return { id: row.id, actorId: row.actorId, conversationId: row.conversationId, mode: row.mode, model: row.model,
      status: row.status, action: row.action, question: row.question, latencyMs: row.latencyMs, errorCode: row.errorCode, createdAt: row.createdAt,
      usage: row.inputTokens === null ? null : { inputTokens: row.inputTokens, outputTokens: row.outputTokens },
      dialogue: { initialText: row.initialText, currentText: row.currentText, turns: owned("search_turns").map(r => ({ question: r.question, answer: r.answer })) },
      clues: owned("search_clues").map(r => ({ field: r.field, value: r.value, polarity: r.polarity, certainty: r.certainty,
        rawSourceRange: { source: r.source, start: r.start, end: r.end } })),
      candidates: owned("search_candidates").map(r => ({ productId: r.productId, kind: r.kind, reason: r.reason,
        catalogEvidence: owned("search_candidate_evidence").filter(e => e.candidatePosition === r.position).map(e => ({ code: e.code, value: e.value })) })),
    };
  }) as SearchRun[];
  return { searchRuns, needs: rows(db, "SELECT id,actorId,storeId,conversationId,runId,reason,createdAt FROM needs ORDER BY position") as DomainState["needs"],
    recommendationEvents: rows(db, "SELECT id,actorId,runId,productId,action,requestId,createdAt FROM recommendation_events ORDER BY position") as DomainState["recommendationEvents"] };
}
function writeSearchState(db: Database, state: DomainState) {
  state.searchRuns.forEach((run, position) => {
    insert(db, "search_runs", "id,actorId,conversationId,initialText,currentText,mode,model,status,action,question,inputTokens,outputTokens,latencyMs,errorCode,createdAt",
      { ...run, ...run.dialogue, ...run.usage }, position);
    run.dialogue.turns.forEach((turn, i) => insert(db, "search_turns", "runId,question,answer", { runId: run.id, ...turn }, i));
    run.clues.forEach((clue, i) => insert(db, "search_clues", "runId,field,value,polarity,certainty,source,start,end", { runId: run.id, ...clue, ...clue.rawSourceRange }, i));
    run.candidates.forEach((candidate, i) => {
      insert(db, "search_candidates", "runId,productId,kind,reason", { runId: run.id, ...candidate }, i);
      candidate.catalogEvidence.forEach((evidence, j) => insert(db, "search_candidate_evidence", "runId,candidatePosition,code,value", { runId: run.id, candidatePosition: i, ...evidence }, j));
    });
  });
  state.needs.forEach((need, i) => insert(db, "needs", "id,actorId,storeId,conversationId,runId,reason,createdAt", need, i));
  state.recommendationEvents.forEach((event, i) => insert(db, "recommendation_events", "id,actorId,runId,productId,action,requestId,createdAt", event, i));
}

export function readDomainState(db: Database): DomainState {
  const session = rows(db, "SELECT sessionId,generation,revision,nextSequence,clockOffsetMs,lastNow FROM session")[0];
  if (!session) throw Error("DOMAIN_SESSION_MISSING");
  const arrays: Record<string, unknown> = {};
  for (const [table, columns] of Object.entries(COLUMNS)) {
    arrays[table] = rows(db, `SELECT ${columns} FROM ${table} ORDER BY position`).map(row => {
      for (const key of ["requestable", "active", "enabled"]) if (key in row) row[key] = Boolean(row[key]) as unknown as SqlValue;
      return row;
    });
  }
  const policies = (arrays.policies as DomainState["policies"]).map(policy => ({ ...policy,
    productIds: rows(db, "SELECT storeId,productId FROM policy_products ORDER BY position").filter(row => row.storeId === policy.storeId).map(row => String(row.productId)),
  }));
  const receipts = (arrays.receipts as { key: string; fingerprint: string; commandKey: string; revision: number }[]).map(receipt => ({
    key: receipt.key, fingerprint: receipt.fingerprint, result: { commandKey: receipt.commandKey, revision: receipt.revision,
      entityIds: rows(db, "SELECT receiptKey,entityId FROM receipt_entities ORDER BY position").filter(row => row.receiptKey === receipt.key).map(row => String(row.entityId)) },
  }));
  const merchantRuns = scalar(db, "PRAGMA user_version") === 3 ? rows(db, `SELECT ${merchantColumns} FROM merchant_runs ORDER BY position`).map(row => {
    const { observationStatus, responseJson, observationErrorCode, inputTokens, outputTokens, ...run } = row;
    return { ...run, observation: observationStatus === null ? null : observationStatus === "success" ? { status: "success", responseJson } : { status: "error", errorCode: observationErrorCode },
      usage: inputTokens === null ? null : { inputTokens, outputTokens } };
  }) : [];
  const state = { ...session, ...arrays, policies, receipts, ...readSearchState(db), merchantRuns,
    products: rows(db, "SELECT id,name,json_extract(details,'$.category') AS category FROM products ORDER BY position").map(p => p.category === null ? { id: p.id, name: p.name } : p),
    stores: rows(db, "SELECT id,name FROM stores ORDER BY position"),
    actors: rows(db, "SELECT id,role,displayName,storeId FROM actors ORDER BY position").map(row => row.storeId === null
      ? { id: row.id, role: row.role, displayName: row.displayName } : row),
  } as DomainState;
  assertState(state);
  return state;
}

export function writeDomainState(db: Database, state: DomainState) {
  assertState(state);
  db.run("BEGIN");
  try {
    db.run("PRAGMA defer_foreign_keys=ON");
    db.run("DELETE FROM merchant_runs");
    for (const table of recordTables) db.run(`DELETE FROM ${table}`);
    db.run("DELETE FROM policy_products; DELETE FROM receipt_entities;");
    for (const table of Object.keys(COLUMNS).reverse()) db.run(`DELETE FROM ${table}`);
    db.run("DELETE FROM session");
    db.run("INSERT INTO session VALUES (1,?,?,?,?,?,?)", [state.sessionId, state.generation, state.revision,
      state.nextSequence, state.clockOffsetMs, state.lastNow]);
    for (const [table, columns] of Object.entries(COLUMNS)) {
      const records = table === "receipts" ? state.receipts.map(receipt => ({ ...receipt, ...receipt.result })) : state[table as keyof typeof COLUMNS];
      records.forEach((record, position) => insert(db, table, columns, record, position));
    }
    for (const policy of state.policies) policy.productIds.forEach((productId, position) =>
      db.run("INSERT INTO policy_products VALUES (?,?,?)", [policy.storeId, productId, position]));
    for (const receipt of state.receipts) receipt.result.entityIds.forEach((entityId, position) =>
      db.run("INSERT INTO receipt_entities VALUES (?,?,?)", [receipt.key, entityId, position]));
    writeSearchState(db, state);
    state.merchantRuns.forEach((run, i) => insert(db, "merchant_runs", merchantColumns, { ...run, ...run.usage,
      observationStatus: run.observation?.status ?? null,
      responseJson: run.observation?.status === "success" ? run.observation.responseJson : null,
      observationErrorCode: run.observation?.status === "error" ? run.observation.errorCode : null }, i));
    if (db.exec("PRAGMA foreign_key_check").length) throw Error("DOMAIN_FOREIGN_KEY_CHECK");
    db.run("COMMIT");
  } catch (error) { db.run("ROLLBACK"); throw error; }
}

const emptyArchive = (now: number): PreviewArchive => ({ status: "none", sourceSchema: null, sourceHash: null,
  capturedAt: now, message: "이전 Preview 사본 없음. 새 거래 데모는 별도 namespace입니다.", requests: [] });
export function readPreviewArchive(SQL: SqlJsStatic, bytes: Uint8Array | undefined, now = Date.now()): PreviewArchive {
  const archive = emptyArchive(now);
  if (bytes === undefined) return archive;
  let db: Database | undefined;
  try {
    db = new SQL.Database(bytes);
    archive.sourceSchema = Number(scalar(db, "PRAGMA user_version"));
    archive.sourceHash = String(scalar(db, "SELECT value FROM metadata WHERE key='source_hash'"));
    if (![1, 2].includes(archive.sourceSchema) || scalar(db, "PRAGMA integrity_check") !== "ok" || db.exec("PRAGMA foreign_key_check").length) throw Error("UNKNOWN_PREVIEW");
    const observed = rows(db, `SELECT r.id,r.actor,r.product_id AS productId,p.name AS productName,
      r.store_id AS storeId,s.name AS storeName,s.address AS storeAddress,r.quantity,r.unit_price AS unitPrice,
      r.consent,r.created_at AS createdAt,r.stage FROM requests r JOIN products p ON p.id=r.product_id
      JOIN stores s ON s.id=r.store_id ORDER BY r.position`);
    if (observed.some(row => row.stage !== "requested" && row.stage !== "approved")) throw Error("UNKNOWN_PREVIEW_STAGE");
    archive.requests = observed.map(row => ({ ...row, consent: row.consent === 1 })) as ArchivedPreviewRequest[];
    archive.status = "preserved";
    archive.message = "이전 Preview 요청/승인 보관 이력입니다. 실제 발주·결제 상태가 아니며 새 거래로 자동 전환하지 않았습니다. 원 사본도 유지됩니다.";
  } catch {
    archive.status = "unreadable";
    archive.message = "이전 Preview 사본을 읽지 못했습니다. 원 사본은 삭제·변경하지 않았으며 이전 화면에서 복구할 수 있습니다.";
  } finally { db?.close(); }
  return archive;
}
function writeArchive(db: Database, archive: PreviewArchive) {
  db.run("INSERT INTO archive_info VALUES (1,?,?,?,?,?)", [archive.status, archive.sourceSchema, archive.sourceHash, archive.capturedAt, archive.message]);
  archive.requests.forEach((request, position) => insert(db, "preview_archive", archiveColumns, request, position));
}
function readArchive(db: Database): PreviewArchive {
  const info = rows(db, "SELECT status,sourceSchema,sourceHash,capturedAt,message FROM archive_info")[0];
  if (!info) throw Error("DOMAIN_ARCHIVE_MISSING");
  return { ...info, requests: rows(db, `SELECT ${archiveColumns} FROM preview_archive ORDER BY position`)
    .map(row => ({ ...row, consent: row.consent === 1 })) } as PreviewArchive;
}

export function bootstrapDomainState(seed: Seed, now: number, sessionId: string, generation = 1): DomainState {
  const state = createInitialState(seed, { sessionId, generation, now });
  seed.actors.filter(actor => actor.role === "customer" && actor.id !== LOCAL_CUSTOMER_ID).slice(0, 20).forEach((actor, index) => {
    const store = seed.stores[index % seed.stores.length];
    const options = seed.conditions.filter(condition => condition.storeId === store.id && condition.requestable);
    const condition = options[(index * 7) % options.length];
    if (!condition) throw Error("DOMAIN_SEED_REQUESTABLE_CONDITION_MISSING");
    state.requests.push({ id: `domain-sample-${String(index + 1).padStart(2, "0")}`, actorId: actor.id,
      storeId: condition.storeId, productId: condition.productId, quantity: 1 + index % 3, unitPrice: condition.unitPrice,
      consentVersion: condition.version, consentAt: now, consentExpiresAt: now + DOMAIN_POLICY.consentMs,
      sequence: state.nextSequence++, createdAt: now, status: "pending", reason: null });
  });
  return state;
}

export function createDomainSeed(SQL: SqlJsStatic, seed: Seed, sourceHash: string,
  masters: { products: object[]; stores: object[]; sources: { id: string; url: string | null; checkedAt: string; publishedAt: string | null; evidenceScope: string[]; limitations: string }[]; provenance: object },
): Uint8Array {
  const db = new SQL.Database();
  try {
    db.run(SCHEMA);
    db.run(RECORD_SCHEMA);
    db.run(MERCHANT_SCHEMA);
    db.run("INSERT INTO metadata VALUES ('source_hash',?),('data_provenance',?)", [sourceHash, JSON.stringify(masters.provenance)]);
    seed.products.forEach((product, position) => insert(db, "products", "id,name,details", { ...product, details: JSON.stringify(masters.products[position]) }, position));
    seed.stores.forEach((store, position) => insert(db, "stores", "id,name,address,latitude,longitude,details",
      { ...masters.stores[position], ...store, details: JSON.stringify(masters.stores[position]) }, position));
    seed.actors.forEach((actor, position) => insert(db, "actors", "id,role,displayName,storeId", actor, position));
    for (const source of masters.sources) db.run("INSERT INTO sources VALUES (?,?,?,?,?,?)", [source.id, source.url, source.checkedAt,
      source.publishedAt, JSON.stringify(source.evidenceScope), source.limitations]);
    // Deterministic template only. First browser initialization/reset rebases all pending consent to init clock.
    writeDomainState(db, bootstrapDomainState(seed, 0, "domain-seed-template"));
    writeArchive(db, emptyArchive(0));
    return db.export();
  } finally { db.close(); }
}

// Caller owns one SQL transaction. No bootstrap, business-row rewrite, clock or settlement.
function appendReferenceData(db: Database, template: Database) {
  const existingProducts = new Map(rows(db, "SELECT * FROM products").map(p => [p.id, p]));
  const incomingProducts = rows(template, "SELECT * FROM products ORDER BY position");
  if (incomingProducts.slice(0, 242).some(p => !existingProducts.has(p.id))) throw Error("DOMAIN_ORIGINAL_PRODUCT_MISSING");
  // Exact old identity/position must still exist. A known hash is not a corruption bypass.
  for (const old of existingProducts.values()) {
    const next = incomingProducts.find(p => p.id === old.id);
    if (!next || Object.keys(old).some(key => old[key] !== next[key])) throw Error("DOMAIN_MASTER_IDENTITY_MISMATCH");
  }
  for (const product of incomingProducts) if (!existingProducts.has(product.id)) {
    insert(db, "products", "id,name,details", product, Number(product.position));
  }
  const existingConditions = new Set(rows(db, "SELECT storeId,productId FROM conditions").map(c => `${c.storeId}:${c.productId}`));
  let position = Number(scalar(db, "SELECT COALESCE(MAX(position),-1) FROM conditions")) + 1;
  for (const condition of rows(template, "SELECT * FROM conditions ORDER BY position")) {
    // Existing conditions may have been deliberately edited in the demo; preserve all values/version.
    if (existingConditions.has(`${condition.storeId}:${condition.productId}`)) continue;
    if (existingProducts.has(condition.productId)) throw Error("DOMAIN_EXISTING_CONDITION_MISSING");
    insert(db, "conditions", COLUMNS.conditions, condition, position++);
  }
  const oldStores = rows(db, "SELECT * FROM stores");
  const incomingStores = rows(template, "SELECT * FROM stores ORDER BY position");
  if (oldStores.length !== incomingStores.length) throw Error("DOMAIN_STORE_IDENTITY_MISMATCH");
  for (const store of incomingStores) {
    const old = oldStores.find(s => s.id === store.id);
    if (!old || ["name", "address", "latitude", "longitude", "position"].some(key => old[key] !== store[key])) throw Error("DOMAIN_STORE_IDENTITY_MISMATCH");
    db.run("UPDATE stores SET details=? WHERE id=?", [store.details, store.id]);
  }
  for (const s of rows(template, "SELECT * FROM sources")) db.run(`INSERT INTO sources VALUES (?,?,?,?,?,?)
    ON CONFLICT(id) DO UPDATE SET url=excluded.url,checkedAt=excluded.checkedAt,publishedAt=excluded.publishedAt,
      evidenceScope=excluded.evidenceScope,limitations=excluded.limitations`,
    [s.id, s.url, s.checkedAt, s.publishedAt, s.evidenceScope, s.limitations]);
  db.run("UPDATE metadata SET value=? WHERE key='data_provenance'", [String(scalar(template, "SELECT value FROM metadata WHERE key='data_provenance'"))]);
}

export async function createDomainStore(options: {
  SQL: SqlJsStatic; seed: Uint8Array; initial?: Uint8Array; persist: (bytes: Uint8Array) => Promise<void>;
  archive?: PreviewArchive; now?: () => number; sessionId?: () => string;
}): Promise<DomainStore> {
  const { SQL, seed, persist } = options;
  const now = options.now ?? Date.now;
  const sessionId = options.sessionId ?? (() => crypto.randomUUID());
  const template = openDatabase(SQL, seed);
  let sourceHash: string;
  let seedState: DomainState;
  try {
    sourceHash = String(scalar(template, "SELECT value FROM metadata WHERE key='source_hash'"));
    seedState = readDomainState(template);
  } finally { template.close(); }
  let db = openDatabase(SQL, options.initial ?? seed, sourceHash, true);
  let committed: Uint8Array = (options.initial ?? seed).slice();
  let published: DomainState;
  let archive: PreviewArchive;
  try {
    const previousVersion = scalar(db, "PRAGMA user_version");
    const previousHash = scalar(db, "SELECT value FROM metadata WHERE key='source_hash'");
    if (previousVersion === 1 || previousVersion === 2 || previousHash !== sourceHash) {
      // Validate the old state before DDL. Never bootstrap or rewrite old business rows.
      readDomainState(db); readArchive(db);
      db.run("BEGIN");
      try {
        if (previousVersion === 1) db.run(RECORD_SCHEMA);
        if (previousVersion === 1 || previousVersion === 2) db.run(MERCHANT_SCHEMA);
        const incoming = openDatabase(SQL, seed, sourceHash);
        try { appendReferenceData(db, incoming); } finally { incoming.close(); }
        db.run("UPDATE metadata SET value=? WHERE key='source_hash'", [sourceHash]);
        db.run("PRAGMA user_version=3");
        readDomainState(db);
        if (db.exec("PRAGMA foreign_key_check").length) throw Error("DOMAIN_FOREIGN_KEY_CHECK");
        db.run("COMMIT");
      } catch (error) { db.run("ROLLBACK"); throw error; }
      try {
        try { committed = db.export(); } finally { foreignKeys(db); }
        await persist(committed);
      } catch { throw new DomainMigrationSaveError(); }
    }
    if (options.initial === undefined) {
      const initNow = now();
      archive = options.archive ?? emptyArchive(initNow);
      writeDomainState(db, bootstrapDomainState(seedState, initNow, sessionId()));
      db.run("DELETE FROM preview_archive; DELETE FROM archive_info");
      writeArchive(db, archive);
      try { committed = db.export(); } finally { foreignKeys(db); }
      await persist(committed);
    } else archive = readArchive(db);
    published = readDomainState(db);
  } catch (error) { db.close(); throw error; }
  let queue: Promise<unknown> = Promise.resolve();
  let epoch = 0;
  let resetting = false;
  function serialize<T>(work: () => Promise<T>) {
    const task = queue.then(work);
    queue = task.catch(() => undefined);
    return task;
  }
  async function publish(candidate: Database) {
    let bytes: Uint8Array;
    const next = readDomainState(candidate);
    try { bytes = candidate.export(); } finally { foreignKeys(candidate); }
    await persist(bytes); // IndexedDB transaction complete, not put request success.
    db.close();
    db = candidate;
    committed = bytes;
    published = next;
  }
  return {
    ready: true,
    get state() { return structuredClone(published); },
    get archive() { return structuredClone(archive); },
    async execute(command) {
      if (resetting) throw Error("DOMAIN_RESET_IN_PROGRESS");
      const commandEpoch = epoch;
      const copy = structuredClone(command);
      return serialize(async () => {
        if (commandEpoch !== epoch) throw Error("DOMAIN_STALE_COMMAND");
        const outcome: CommandOutcome = applyCommand(readDomainState(db), copy, now());
        if (!outcome.ok || outcome.replayed) return structuredClone(outcome);
        const candidate = openDatabase(SQL, committed, sourceHash);
        try {
          writeDomainState(candidate, outcome.state);
          await publish(candidate);
        } catch (error) { candidate.close(); throw error; }
        return { ...structuredClone(outcome), state: structuredClone(published) };
      });
    },
    async reset() {
      if (resetting) throw Error("DOMAIN_RESET_IN_PROGRESS");
      resetting = true;
      epoch += 1; // Invalidate already queued work even if this explicit reset later fails.
      try {
        return await serialize(async () => {
          const candidate = openDatabase(SQL, seed, sourceHash);
          try {
            writeDomainState(candidate, bootstrapDomainState(seedState, now(), sessionId(), published.generation + 1));
            candidate.run("DELETE FROM preview_archive; DELETE FROM archive_info");
            writeArchive(candidate, archive); // Reset only domain transactions, never the old Preview archive.
            await publish(candidate);
          } catch (error) { candidate.close(); throw error; }
          return structuredClone(published);
        });
      } finally { resetting = false; }
    },
  };
}

export class DomainTransitionRequiredError extends Error {
  constructor() {
    super("새 거래 데모를 시작하려면 확인해 주세요. 이전 Preview는 영구 삭제하지 않고 읽기 전용 이력으로 보관합니다. 기존 승인도 새 발주로 변환하지 않습니다.");
    this.name = "DomainTransitionRequiredError";
  }
}
export class DomainSnapshotError extends Error {
  readonly reset: () => Promise<DomainStore>;
  constructor(reset: () => Promise<DomainStore>) {
    super("거래 사본의 버전이 다르거나 손상되었습니다. 기존 사본은 보존했습니다. 명시적으로 새 거래 데모를 초기화할 수 있습니다.");
    this.name = "DomainSnapshotError";
    this.reset = reset;
  }
}
export class DomainMigrationSaveError extends Error {
  readonly retryable = true;
  constructor() {
    super("기존 거래는 보존했지만 데모 데이터 업그레이드를 저장하지 못했습니다. 초기화하지 말고 저장소를 다시 열어 재시도해주세요.");
    this.name = "DomainMigrationSaveError";
  }
}

let sqlReady: Promise<SqlJsStatic> | undefined;
function loadSql() {
  if (!sqlReady) sqlReady = new Promise<SqlJsStatic>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/domain-db/sql-wasm.js";
    script.onload = () => {
      const init = (window as Window & { initSqlJs?: (options: { locateFile: (file: string) => string }) => Promise<SqlJsStatic> }).initSqlJs;
      if (!init) { reject(Error("DOMAIN_SQL_LOADER_FAILED")); return; }
      init({ locateFile: file => `/domain-db/${file}` }).then(resolve, reject);
    };
    script.onerror = () => { script.remove(); reject(Error("DOMAIN_SQL_LOADER_FAILED")); };
    document.head.appendChild(script);
  }).catch(error => { sqlReady = undefined; throw error; });
  return sqlReady;
}

// The legacy database is opened read-only when it exists; abort its creation when absent.
async function snapshotConnection(name: string, create: boolean): Promise<IDBDatabase | undefined> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    let absent = false;
    let abandoned = false;
    request.onupgradeneeded = () => {
      if (!create) { absent = true; request.transaction?.abort(); }
      else request.result.createObjectStore("snapshots");
    };
    request.onerror = () => absent ? resolve(undefined) : reject(request.error);
    request.onblocked = () => { abandoned = true; reject(Error("DOMAIN_STORAGE_BLOCKED")); };
    request.onsuccess = () => {
      if (abandoned) { request.result.close(); return; }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  });
}
function snapshotTransaction(connection: IDBDatabase, bytes?: Uint8Array): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const tx = connection.transaction("snapshots", bytes === undefined ? "readonly" : "readwrite");
    const store = tx.objectStore("snapshots");
    const request = bytes === undefined ? store.get("committed") : store.put(bytes, "committed");
    let result: unknown;
    request.onsuccess = () => { result = request.result; };
    tx.oncomplete = () => resolve(result);
    tx.onabort = () => reject(tx.error ?? Error("DOMAIN_STORAGE_ABORTED"));
    tx.onerror = () => reject(tx.error ?? Error("DOMAIN_STORAGE_FAILED"));
  });
}
async function legacyArchive(SQL: SqlJsStatic): Promise<PreviewArchive> {
  let connection: IDBDatabase | undefined;
  try {
    connection = await snapshotConnection("wanna-gs-preview", false);
    if (!connection) return emptyArchive(Date.now());
    const bytes = await snapshotTransaction(connection); // No writes to this namespace, ever.
    return readPreviewArchive(SQL, bytes === undefined ? undefined : bytes instanceof Uint8Array ? bytes : new Uint8Array());
  } catch {
    return { ...emptyArchive(Date.now()), status: "unreadable",
      message: "이전 Preview 저장소를 읽지 못했습니다. 원 사본은 삭제·변경하지 않았으며 이전 화면에서 확인할 수 있습니다." };
  } finally { connection?.close(); }
}

let opened: Promise<DomainStore> | undefined;
async function loadDomainStore(confirmNewDomain: boolean): Promise<DomainStore> {
  const [SQL, seedResponse, manifestResponse] = await Promise.all([
    loadSql(), fetch("/domain-db/seed.sqlite"), fetch("/domain-db/manifest.json"),
  ]);
  if (!seedResponse.ok || !manifestResponse.ok) throw Error("DOMAIN_SEED_LOAD_FAILED");
  const seed = new Uint8Array(await seedResponse.arrayBuffer());
  const manifest = await manifestResponse.json();
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", seed))).map(byte => byte.toString(16).padStart(2, "0")).join("");
  if (manifest.schemaVersion !== DOMAIN_SCHEMA_VERSION || manifest.files?.["seed.sqlite"] !== digest) throw Error("DOMAIN_SEED_VERSION_OR_HASH_MISMATCH");
  const validSeed = openDatabase(SQL, seed, manifest.sourceHash);
  validSeed.close();
  const connection = (await snapshotConnection("wanna-gs-domain", true))!;
  const persist = async (bytes: Uint8Array) => { await snapshotTransaction(connection, bytes); };
  try {
    const initial = await snapshotTransaction(connection);
    if (initial === undefined) {
      if (!confirmNewDomain) throw new DomainTransitionRequiredError();
      return await createDomainStore({ SQL, seed, persist, archive: await legacyArchive(SQL) });
    }
    try {
      if (!(initial instanceof Uint8Array)) throw Error("DOMAIN_INVALID_SNAPSHOT");
      return await createDomainStore({ SQL, seed, initial, persist });
    } catch (error) {
      if (error instanceof DomainMigrationSaveError) throw error;
      let recovery: Promise<DomainStore> | undefined;
      throw new DomainSnapshotError(() => {
        // Double-clicking explicit recovery must not race two new sessions into IDB.
        if (!recovery) recovery = (async () => {
          const recovered = await createDomainStore({ SQL, seed, persist, archive: await legacyArchive(SQL) });
          opened = Promise.resolve(recovered);
          return recovered;
        })().catch(error => { recovery = undefined; throw error; });
        return recovery;
      });
    }
  } catch (error) {
    if (!(error instanceof DomainSnapshotError)) connection.close();
    throw error;
  }
}

// One tab only. Promise resolution means ready/durable; no cross-tab/server auth guarantee.
// UI must explicitly confirm the first transition and explicit reset; discard stale model results.
export function openDomainStore(options: { confirmNewDomain?: boolean } = {}): Promise<DomainStore> {
  if (!opened) opened = loadDomainStore(options.confirmNewDomain === true).catch(error => {
    if (!(error instanceof DomainSnapshotError)) opened = undefined;
    throw error;
  });
  return opened;
}
