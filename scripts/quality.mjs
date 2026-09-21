// Offline execution evidence, not a product/live/browser release approval.
import { spawnSync, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, lstatSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const hash = value => createHash("sha256").update(value).digest("hex");
const build = { id: "build", command: "npm", args: ["run", "build"], mode: "offline", scope: "build", marker: "^Route \\(app\\)" };
const sourcePaths = ["app", "lib", "data", "evals", "scripts", "quality", ".github", ".agents/skills/wanna-gs-preflight/scripts", "package.json", "package-lock.json", "tsconfig.json", "next.config.*", ".nvmrc", ".gitignore", "card.md", "docs/CORE_REQUIREMENTS.md", "docs/decisions", "docs/research", "docs/context/GATE-01.md", "docs/context/EVAL-01.md", "docs/09-verification-and-evals.md", "docs/14-agent-development-loop.md"];
const git = args => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
export function fingerprint() {
  const paths = git(["ls-files", "--cached", "--others", "--exclude-standard", "-z", "--", ...sourcePaths]).split("\0").filter(Boolean);
  const files = Object.fromEntries([...new Set(paths)].sort().map(path => [path, hash(readFileSync(join(root, path)))]));
  return { head: git(["rev-parse", "HEAD"]), files, digest: hash(JSON.stringify(files)) };
}
export function definitions(registry) {
  if (registry?.version !== 1 || !Array.isArray(registry.checks) || registry.checks.length === 0) throw Error("Empty/unsupported check registry");
  const ids = new Set(["build"]);
  for (const item of registry.checks) {
    if (!/^[a-z][a-z0-9-]*$/.test(item.id) || ids.has(item.id) || !["node", "python3"].includes(item.command)
      || !Array.isArray(item.args) || !item.args.length || item.args.some(x => typeof x !== "string")
      || item.mode !== "offline" || !["unit", "integration", "static"].includes(item.scope)
      || typeof item.marker !== "string" || !item.marker || !Number.isSafeInteger(item.minMatches) || item.minMatches < 1
      || !Array.isArray(item.core) || !item.core.length || item.core.some(x => !/^CORE-\d{2}$/.test(x))
      || typeof item.limitation !== "string" || !item.limitation.trim()) throw Error(`Invalid check definition: ${item.id}`);
    if (new RegExp(item.marker, "m").test("")) throw Error(`Empty success marker: ${item.id}`);
    ids.add(item.id);
  }
  return [...registry.checks, build];
}
export function outcome(definition, result, log) {
  if (typeof log?.stdout !== "string" || typeof log?.stderr !== "string") throw Error("Invalid raw process log");
  const text = `${log.stdout}\n${log.stderr}`;
  const zero = /\b(?:Ran 0 tests|0 (?:checks|tests|cases))\b/.test(text);
  const skipped = /\bskipped\s*[=:]\s*[1-9]\d*\b|^\s*# SKIP\b|^\s*ok\b.*#\s*SKIP\b/im.test(text);
  const failed = /^\s*(?:FAIL(?:ED)?(?:\b|:)|not ok\b)/m.test(text);
  const matches = [...text.matchAll(new RegExp(definition.marker, "gm"))].length;
  const ok = result.exitCode === 0 && result.signal === null && result.timedOut === false && !zero && !skipped && !failed
    && matches >= (definition.scope === "build" ? 1 : definition.minMatches);
  return { ok, completedSuites: definition.scope === "build" ? 0 : matches,
    buildCompleted: definition.scope === "build" && ok, failedExecution: !ok, skipped, zero };
}
export function validate(report, expected, current, readLog) {
  const errors = [];
  if (report?.version !== 1 || report.phase !== "offline") errors.push("Unsupported phase: offline evidence is not live/G1–G6 approval");
  if (report?.runtime?.node !== process.versions.node || process.versions.node.split(".")[0] !== "24") errors.push("Runtime differs/requires Node24");
  if (report?.source?.head !== current.head || report?.source?.digest !== current.digest
    || JSON.stringify(report?.source?.files) !== JSON.stringify(current.files) || report?.sourceChanged !== false) errors.push("Stale source/HEAD");
  if (!Number.isFinite(Date.parse(report?.startedAt)) || !Number.isFinite(Date.parse(report?.finishedAt))
    || Date.parse(report.finishedAt) < Date.parse(report.startedAt)) errors.push("Incomplete execution");
  const results = report?.results;
  if (!Array.isArray(results) || results.length !== expected.length) errors.push("Missing/extra child execution");
  for (const definition of expected) {
    const matches = Array.isArray(results) ? results.filter(x => x.id === definition.id) : [];
    if (matches.length !== 1) { errors.push(`Missing/duplicate ${definition.id}`); continue; }
    const result = matches[0];
    if (JSON.stringify(result.argv) !== JSON.stringify([definition.command, ...definition.args]) || result.mode !== "offline"
      || !Number.isFinite(result.durationMs) || result.durationMs < 0) errors.push(`Invalid execution ${definition.id}`);
    try {
      const raw = readLog(definition.id);
      if (hash(raw) !== result.logHash) throw Error("Raw log changed");
      const actual = outcome(definition, result, JSON.parse(raw));
      if (!actual.ok || JSON.stringify(actual) !== JSON.stringify(result.outcome)) throw Error("Failed/zero/skipped or changed result");
    } catch (error) { errors.push(`${definition.id}: ${error.message}`); }
  }
  return errors;
}
function loadDefinitions() { return definitions(JSON.parse(readFileSync(join(root, "quality/checks.json"), "utf8"))); }
function readEvidenceLog(directory, id) {
  const file = join(directory, `${id}.json`);
  if (!lstatSync(file).isFile()) throw Error("Evidence must be a regular file");
  return readFileSync(file, "utf8");
}
export function verifyFile(file) {
  const report = JSON.parse(readFileSync(file, "utf8"));
  const errors = validate(report, loadDefinitions(), fingerprint(), id => readEvidenceLog(dirname(file), id));
  if (errors.length) throw Error(errors.join("\n"));
  return report;
}
function run() {
  if (process.versions.node.split(".")[0] !== "24") throw Error("Use Node24: nvm use");
  const expected = loadDefinitions(), source = fingerprint();
  // Each run has its own immutable directory; no old evidence/log is overwritten.
  const directory = join(root, "test-results/quality", `${new Date().toISOString().replace(/[:.]/g, "-")}-${process.pid}`);
  mkdirSync(directory, { recursive: true });
  const file = join(directory, "report.json");
  const report = { version: 1, phase: "offline", source, sourceChanged: false,
    runtime: { node: process.versions.node, platform: process.platform },
    ci: { runId: process.env.GITHUB_RUN_ID ?? null, runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
      prHead: process.env.QUALITY_PR_HEAD ?? null, prBase: process.env.QUALITY_PR_BASE ?? null },
    startedAt: new Date().toISOString(), finishedAt: null, results: [] };
  const save = () => writeFileSync(file, `${JSON.stringify(report, null, 2)}\n`);
  save();
  const env = { ...process.env };
  for (const name of ["OPENAI_API_KEY", "OPENAI_MODEL", "LLM_MODE", "GH_TOKEN", "GITHUB_TOKEN"]) delete env[name];
  for (const definition of expected) {
    const started = Date.now();
    const execution = spawnSync(definition.command === "node" ? process.execPath : definition.command, definition.args,
      { cwd: root, env, encoding: "utf8", timeout: 300_000, maxBuffer: 16 * 1024 * 1024 });
    const raw = JSON.stringify({ stdout: execution.stdout ?? "", stderr: execution.stderr ?? "" });
    writeFileSync(join(directory, `${definition.id}.json`), raw);
    const result = { id: definition.id, argv: [definition.command, ...definition.args], mode: "offline",
      exitCode: execution.status, signal: execution.signal, timedOut: execution.error?.code === "ETIMEDOUT",
      durationMs: Date.now() - started, logHash: hash(raw) };
    result.outcome = outcome(definition, result, JSON.parse(raw));
    report.results.push(result); save();
    console.log(`${result.outcome.ok ? "PASS" : "FAIL"} ${definition.id} (${result.durationMs}ms; ${result.outcome.completedSuites} suite completion markers)`);
    if (!result.outcome.ok) console.error(`See ${join(directory, `${definition.id}.json`)}`);
  }
  report.finishedAt = new Date().toISOString();
  report.sourceChanged = fingerprint().digest !== source.digest || fingerprint().head !== source.head;
  save();
  // CI receives only a repository-local report path, never raw output or secrets.
  if (process.env.GITHUB_OUTPUT) writeFileSync(process.env.GITHUB_OUTPUT, `report=${file}\n`, { flag: "a" });
  console.log(`Offline evidence: ${file}`);
  verifyFile(file);
  console.log("Offline checks/build PASS. Not a live/browser/product release gate.");
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length === 0) run();
    else if (args.length === 2 && args[0] === "--verify") {
      verifyFile(resolve(args[1])); console.log("Offline evidence verified; no G1–G6/live approval implied.");
    } else throw Error("Usage: node scripts/quality.mjs [--verify report.json]; only offline phase is implemented");
  } catch (error) { console.error(`Quality gate rejected: ${error.message}`); process.exitCode = 1; }
}
