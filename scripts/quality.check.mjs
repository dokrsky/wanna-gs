// Adversarial checks of evidence validation; not application tests.
import assert from "node:assert/strict";
import { definitions, hash, outcome, validate } from "./quality.mjs";
const registry = { version: 1, checks: [{ id: "sample", command: "node", args: ["sample.mjs"],
  marker: "^PASS sample$", minMatches: 1, mode: "offline", scope: "unit", core: ["CORE-17"], limitation: "No live/browser" }] };
const expected = definitions(registry);
const source = { head: "test-head", digest: "test-digest", files: { "sample.mjs": "test-hash" } };
const logs = { sample: JSON.stringify({ stdout: "PASS sample", stderr: "" }), build: JSON.stringify({ stdout: "Route (app)\n/demo", stderr: "" }) };
const child = definition => {
  const result = { id: definition.id, argv: [definition.command, ...definition.args], mode: "offline", exitCode: 0,
    signal: null, timedOut: false, durationMs: 1, logHash: hash(logs[definition.id]) };
  return { ...result, outcome: outcome(definition, result, JSON.parse(logs[definition.id])) };
};
const report = { version: 1, phase: "offline", source, sourceChanged: false, runtime: { node: process.versions.node },
  startedAt: "2026-09-22T00:00:00Z", finishedAt: "2026-09-22T00:00:01Z", results: expected.map(child) };
let count = 0;
function check(name, fn) { fn(); count++; console.log(`PASS ${name}`); }
const errors = (value = report, evidence = logs, current = source) => validate(value, expected, current, id => {
  if (!(id in evidence)) throw Error("Missing log"); return evidence[id];
});
function rejected(name, mutate) { check(name, () => { const copy = structuredClone(report); mutate(copy); assert(errors(copy).length > 0); }); }
check("current complete raw evidence accepted", () => assert.deepEqual(errors(), []));
rejected("arbitrary passed flag cannot replace executions", r => { r.passed = true; r.results = []; });
rejected("missing child rejected", r => r.results.pop());
rejected("duplicate child rejected", r => { r.results[1] = r.results[0]; });
rejected("extra child rejected", r => r.results.push(r.results[0]));
rejected("failed child rejected despite passed flag", r => { r.results[0].exitCode = 1; r.passed = true; });
rejected("timeout rejected", r => { r.results[0].timedOut = true; });
rejected("signal rejected", r => { r.results[0].signal = "SIGTERM"; });
rejected("wrong argv rejected", r => { r.results[0].argv = ["node", "different.mjs"]; });
rejected("fixture child cannot become offline evidence", r => { r.results[0].mode = "fixture"; });
rejected("offline cannot become live gate", r => { r.phase = "live"; });
rejected("offline cannot become G6", r => { r.phase = "G6"; });
rejected("old HEAD rejected", r => { r.source.head = "old"; });
rejected("changed source digest rejected", r => { r.source.digest = "old"; });
rejected("changed file manifest rejected", r => { r.source.files["sample.mjs"] = "old"; });
rejected("mid-run drift rejected", r => { r.sourceChanged = true; });
rejected("unfinished run rejected", r => { r.finishedAt = null; });
rejected("invalid execution interval rejected", r => { r.finishedAt = "2025-01-01"; });
rejected("wrong runtime rejected", r => { r.runtime.node = "20.0.0"; });
rejected("forged completion count rejected", r => { r.results[0].outcome.completedSuites = 5; });
check("missing raw log rejected", () => assert(errors(report, { build: logs.build }).length));
check("changed raw log rejected", () => assert(errors(report, { ...logs, sample: "forged" }).length));
for (const [name, stdout] of [["absent completion marker", ""], ["zero test count", "Ran 0 tests\nPASS sample"],
  ["Python skipped cases", "PASS sample\nOK (skipped=1)"], ["TAP skipped cases", "PASS sample\nok 1 - sample # SKIP"],
  ["explicit failed check", "FAIL hidden\nPASS sample"]]) {
  check(`${name} rejected even with matching log hash`, () => {
    const copy = structuredClone(report), changed = { ...logs, sample: JSON.stringify({ stdout, stderr: "" }) };
    copy.results[0].logHash = hash(changed.sample);
    copy.results[0].outcome = outcome(expected[0], copy.results[0], JSON.parse(changed.sample));
    assert(errors(copy, changed).length);
  });
}
check("empty build cannot pass from exit code alone", () => {
  const copy = structuredClone(report), changed = { ...logs, build: JSON.stringify({ stdout: "", stderr: "" }) };
  copy.results[1].logHash = hash(changed.build);
  copy.results[1].outcome = outcome(expected[1], copy.results[1], JSON.parse(changed.build));
  assert(errors(copy, changed).length);
});
for (const [name, change] of [["empty registry", r => { r.checks = []; }], ["duplicate IDs", r => r.checks.push(r.checks[0])],
  ["unbounded empty marker", r => { r.checks[0].marker = ".*"; }], ["zero required markers", r => { r.checks[0].minMatches = 0; }],
  ["shell command", r => { r.checks[0].command = "sh"; }], ["unknown scope", r => { r.checks[0].scope = "live"; }]]) {
  check(`${name} rejected`, () => { const copy = structuredClone(registry); change(copy); assert.throws(() => definitions(copy)); });
}
console.log(`QUALITY self-check: ${count} cases PASS; validator only, no app/live evidence.`);
