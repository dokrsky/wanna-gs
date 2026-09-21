import type { Database, SqlJsStatic } from "sql.js";
import type { PreviewRequest } from "./demo-preview";

// UI-02: intermediate screen persistence, not the final domain/200-product seed.
export const PREVIEW_SCHEMA_VERSION = 1;
export type PreviewStore = {
  requests: PreviewRequest[];
  save(next: PreviewRequest[]): Promise<void>;
  reset(): Promise<PreviewRequest[]>;
};

const scalar = (db: Database, sql: string) => db.exec(sql)[0]?.values[0]?.[0];
function foreignKeys(db: Database) {
  db.run("PRAGMA foreign_keys=ON");
  if (scalar(db, "PRAGMA foreign_keys") !== 1) throw Error("PREVIEW_FK_DISABLED");
}

function openDatabase(SQL: SqlJsStatic, bytes: Uint8Array, sourceHash?: string) {
  const db = new SQL.Database(bytes);
  try {
    foreignKeys(db);
    if (scalar(db, "PRAGMA user_version") !== PREVIEW_SCHEMA_VERSION ||
      scalar(db, "PRAGMA integrity_check") !== "ok" || db.exec("PRAGMA foreign_key_check").length ||
      (sourceHash !== undefined && scalar(db, "SELECT value FROM metadata WHERE key='source_hash'") !== sourceHash)) {
      throw Error("PREVIEW_SNAPSHOT_INCOMPATIBLE");
    }
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

function readRequests(db: Database): PreviewRequest[] {
  const rows = db.exec(`SELECT id, actor, product_id, store_id, quantity, unit_price,
    consent, created_at, stage FROM requests ORDER BY position`)[0]?.values ?? [];
  return rows.map(row => ({
    id: String(row[0]), actor: String(row[1]), productId: String(row[2]), storeId: String(row[3]),
    quantity: Number(row[4]), unitPrice: Number(row[5]), consent: row[6] === 1,
    createdAt: String(row[7]), stage: row[8] as PreviewRequest["stage"],
  }));
}

// Shared by the builder and save path; SQL owns FK, uniqueness and value constraints.
export function replacePreviewRequests(db: Database, next: PreviewRequest[]) {
  db.run("BEGIN");
  try {
    db.run("DELETE FROM requests");
    next.forEach((request, position) => {
      if (typeof request.consent !== "boolean" || !Number.isSafeInteger(request.quantity) ||
        !Number.isSafeInteger(request.unitPrice) || !Number.isFinite(Date.parse(request.createdAt))) {
        throw Error("PREVIEW_INVALID_REQUEST");
      }
      db.run("INSERT INTO requests VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
        request.id, request.actor, request.productId, request.storeId, request.quantity,
        request.unitPrice, Number(request.consent), request.createdAt, request.stage, position,
        // Reserved constant marks all transactions as simulated, including restored rows.
        1,
      ]);
    });
    db.run("COMMIT");
  } catch (error) {
    db.run("ROLLBACK");
    throw error;
  }
}

// Exported only as the small runnable check's persistence-failure injection seam.
export function createPreviewStore(
  SQL: SqlJsStatic, seed: Uint8Array, initial: Uint8Array,
  persist: (bytes: Uint8Array) => Promise<void>,
): PreviewStore {
  const seedDb = openDatabase(SQL, seed);
  const sourceHash = String(scalar(seedDb, "SELECT value FROM metadata WHERE key='source_hash'"));
  seedDb.close();
  let db = openDatabase(SQL, initial, sourceHash);
  let committed: Uint8Array = initial.slice();
  let requests: PreviewRequest[];
  try { requests = readRequests(db); }
  catch (error) { db.close(); throw error; }
  let queue: Promise<unknown> = Promise.resolve();
  let generation = 0;
  let resetting = false;
  const serialize = <T,>(work: () => Promise<T>) => {
    const result = queue.then(work);
    queue = result.catch(() => undefined);
    return result;
  };

  async function commit(bytes: Uint8Array, next?: PreviewRequest[]) {
    const candidate = openDatabase(SQL, bytes, sourceHash);
    let saved: Uint8Array;
    let view: PreviewRequest[];
    try {
      if (next !== undefined) replacePreviewRequests(candidate, next);
      view = readRequests(candidate);
      try { saved = candidate.export(); }
      finally { foreignKeys(candidate); } // export closes/reopens sql.js and resets PRAGMAs.
      await persist(saved); // IDB transaction completion, not just put() success.
    } catch (error) {
      candidate.close();
      throw error; // The old committed DB and visible requests have not changed.
    }
    const previous = db;
    db = candidate;
    committed = saved;
    requests = view;
    previous.close();
  }

  // ponytail: full-array replacement for this small one-tab preview; domain commands come later.
  return {
    get requests() { return structuredClone(requests); },
    async save(next) {
      if (resetting) throw Error("PREVIEW_RESET_IN_PROGRESS");
      const expectedGeneration = generation;
      const copy = structuredClone(next);
      await serialize(async () => {
        if (expectedGeneration !== generation) throw Error("PREVIEW_STALE_SAVE");
        await commit(committed, copy);
      });
    },
    async reset() {
      if (resetting) throw Error("PREVIEW_RESET_IN_PROGRESS");
      resetting = true;
      generation += 1; // Invalidate queued pre-reset saves, never silently wipe a snapshot.
      try {
        await serialize(() => commit(seed));
        return structuredClone(requests);
      } finally { resetting = false; }
    },
  };
}

// If opening a saved snapshot fails, UI may offer this ONLY after explicit reset confirmation.
export class PreviewSnapshotError extends Error {
  readonly reset: () => Promise<PreviewRequest[]>;
  constructor(reset: () => Promise<PreviewRequest[]>) {
    super("저장된 Preview 데이터가 손상되었거나 버전이 다릅니다. 기존 사본은 보존했습니다. 명시적으로 초기화해 주세요.");
    this.name = "PreviewSnapshotError";
    this.reset = reset;
  }
}

type InitSqlJs = (options: { locateFile: (file: string) => string }) => Promise<SqlJsStatic>;
let sqlReady: Promise<SqlJsStatic> | undefined;
function loadSql() {
  if (!sqlReady) {
    sqlReady = new Promise<SqlJsStatic>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/preview-db/sql-wasm.js";
      script.onload = () => {
        const init = (window as Window & { initSqlJs?: InitSqlJs }).initSqlJs;
        if (!init) { reject(Error("PREVIEW_SQL_LOADER_FAILED")); return; }
        init({ locateFile: file => `/preview-db/${file}` }).then(resolve, reject);
      };
      script.onerror = () => { script.remove(); reject(Error("PREVIEW_SQL_LOADER_FAILED")); };
      document.head.appendChild(script);
    }).catch(error => { sqlReady = undefined; throw error; });
  }
  return sqlReady;
}

async function snapshots() {
  const connection = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("wanna-gs-preview", 1);
    let abandoned = false;
    request.onupgradeneeded = () => request.result.createObjectStore("snapshots");
    request.onerror = () => reject(request.error);
    request.onblocked = () => { abandoned = true; reject(Error("PREVIEW_STORAGE_BLOCKED")); };
    request.onsuccess = () => {
      if (abandoned) { request.result.close(); return; }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  });
  function transact(bytes?: Uint8Array) {
    return new Promise<unknown>((resolve, reject) => {
      const tx = connection.transaction("snapshots", bytes ? "readwrite" : "readonly");
      const store = tx.objectStore("snapshots");
      const request = bytes ? store.put(bytes, "committed") : store.get("committed");
      let value: unknown;
      request.onsuccess = () => { value = request.result; };
      tx.oncomplete = () => resolve(value);
      tx.onabort = () => reject(tx.error ?? Error("PREVIEW_STORAGE_ABORTED"));
      tx.onerror = () => reject(tx.error ?? Error("PREVIEW_STORAGE_FAILED"));
    });
  }
  return {
    read: () => transact(),
    write: async (bytes: Uint8Array) => { await transact(bytes); },
    close: () => connection.close(),
  };
}

let opened: Promise<PreviewStore> | undefined;
async function loadStore(): Promise<PreviewStore> {
  const [SQL, seedResponse, manifestResponse] = await Promise.all([
    loadSql(), fetch("/preview-db/seed.sqlite"), fetch("/preview-db/manifest.json"),
  ]);
  if (!seedResponse.ok || !manifestResponse.ok) throw Error("PREVIEW_SEED_LOAD_FAILED");
  const seed = new Uint8Array(await seedResponse.arrayBuffer());
  const manifest = await manifestResponse.json();
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", seed)))
    .map(byte => byte.toString(16).padStart(2, "0")).join("");
  if (manifest.schemaVersion !== PREVIEW_SCHEMA_VERSION || manifest.files?.["seed.sqlite"] !== hash) {
    throw Error("PREVIEW_SEED_VERSION_OR_HASH_MISMATCH");
  }
  const storage = await snapshots();
  try {
    const initial = await storage.read();
    if (initial === undefined) {
      const store = createPreviewStore(SQL, seed, seed, storage.write);
      await store.reset(); // First run has no user snapshot to overwrite.
      return store;
    }
    try {
      if (!(initial instanceof Uint8Array)) throw Error("PREVIEW_INVALID_SNAPSHOT");
      return createPreviewStore(SQL, seed, initial, storage.write);
    } catch {
      // A valid seed is required even for explicit recovery. Never overwrite on open failure.
      const recovery = createPreviewStore(SQL, seed, seed, storage.write);
      throw new PreviewSnapshotError(async () => {
        const requests = await recovery.reset();
        opened = Promise.resolve(recovery);
        return requests;
      });
    }
  } catch (error) {
    if (!(error instanceof PreviewSnapshotError)) storage.close();
    throw error;
  }
}

// Call in a client effect/event. Await save/reset BEFORE publishing UI success.
// One instance per tab; no cross-tab synchronization or server-side authentication.
// The caller must discard stale async/model responses across reset and serialize UI mutations.
export async function openPreviewStore(): Promise<{
  requests: PreviewRequest[];
  save(next: PreviewRequest[]): Promise<void>;
  reset(): Promise<PreviewRequest[]>;
}> {
  if (!opened) opened = loadStore().catch(error => {
    if (!(error instanceof PreviewSnapshotError)) opened = undefined;
    throw error;
  });
  return opened;
}
