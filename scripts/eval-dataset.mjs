// Dataset integrity/coverage only. No model calls, scoring, or release approval.
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { registerHooks } from "node:module";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.includes("/lib/assistant/") && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) specifier += ".ts";
  return next(specifier, context);
} });
const { parseDialogueRequest } = await import("../lib/assistant/dialogue-contracts.ts");
const { parseMerchantContextRequest, parseMerchantContextOutput } = await import("../lib/assistant/merchant-context-contracts.ts");
const { parsePolicyRequest, parsePolicyOutput } = await import("../lib/assistant/policy-contracts.ts");
export const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const evalVersion = "EVAL-01-20260922-v2";
export const riskTags = {
  customer: ["identity", "lexical", "attributes", "ambiguity", "unknown", "correction", "safety"],
  merchant: ["selection", "budget", "scope", "context", "ambiguity", "unknown", "safety"],
};
const slices = ["clear", "ambiguous", "unknown", "correction", "refusal"];
const splitMinimums = { customer: { dev: 180, validation: 60, holdout: 60 }, merchant: { dev: 72, validation: 24, holdout: 24 } };
const json = path => { try { return JSON.parse(readFileSync(resolve(root, path), "utf8")); } catch { throw Error("Cannot read/parse eval input"); } };
export const catalogIds = json("data/catalog.json").map(p => p.id);
const storeIds = ["demo-central", "demo-neighborhood", ...json("data/stores.json").map(s => s.id)];
const researchRoot = resolve(root, "docs/research");
const researchText = readdirSync(researchRoot, { recursive: true }).filter(p => p.endsWith(".md")).map(p => readFileSync(resolve(researchRoot, p), "utf8")).join("\n");
const researchIds = new Set([...researchText.matchAll(/\bRC(?:\d{2}|(?:-[A-Za-z0-9]+)+)\b/g)].map(m => m[0]));
const coreIds = new Set([...readFileSync(resolve(root, "docs/CORE_REQUIREMENTS.md"), "utf8").matchAll(/\bCORE-\d{2}\b/g)].map(m => m[0]));
const object = x => x !== null && typeof x === "object" && !Array.isArray(x);
const exact = (x, fields) => object(x) && Object.keys(x).length === fields.length && fields.every(f => Object.hasOwn(x, f));
const strings = x => Array.isArray(x) && x.length > 0 && x.every(v => typeof v === "string" && !!v.trim());
const unique = x => new Set(x).size === x.length;
const identifier = x => typeof x === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(x);
const check = (ok, label) => { if (!ok) throw Error(label); };
const normalize = text => text.normalize("NFKC").toLowerCase().replace(/\s+/gu, "");
const ids = x => Array.isArray(x) && unique(x) && x.every(id => catalogIds.includes(id));
const hash = data => createHash("sha256").update(data).digest("hex");
const skuSets = new Set(["productIds", "selectedProductIds", "pendingProductIds", "addedProductIds", "removedProductIds"]);
const canonical = (value, key = "") => Array.isArray(value) ? (skuSets.has(key) ? [...value].sort() : value).map(v => canonical(v))
  : object(value) ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k], k)])) : value;

function withoutMessages(value) {
  if (Array.isArray(value)) return value.map(withoutMessages);
  return object(value) ? Object.fromEntries(Object.entries(value).filter(([k]) => k !== "message").map(([k, v]) => [k, withoutMessages(v)])) : value;
}

function validateCase(c) {
  check(exact(c, ["id", "split", "group", "scenarioId", "researchCaseIds", "origin", "riskTags", "slice", "normalCompletion", "service", "context", "steps", "rationale"]), "case fields");
  check([c.id, c.group, c.scenarioId].every(identifier), "case identifiers");
  check(["dev", "validation", "holdout"].includes(c.split), "case split");
  check(c.origin === "synthetic_expansion" && strings(c.researchCaseIds) && c.researchCaseIds.every(identifier) && unique(c.researchCaseIds), "case lineage/origin");
  check(c.researchCaseIds.every(id => researchIds.has(id) || coreIds.has(id)), "unknown research/CORE reference");
  check(strings(c.riskTags) && unique(c.riskTags), "case risk tags");
  check(slices.includes(c.slice) && typeof c.normalCompletion === "boolean", "case slice");
  check(c.normalCompletion === ["clear", "correction"].includes(c.slice), "normal completion/slice");
  check(typeof c.rationale === "string" && c.rationale.trim().length >= 10, "case rationale");
  check(["search", "merchant", "policy"].includes(c.service) && object(c.context), "case service/context");
  check(Array.isArray(c.steps) && c.steps.length >= 1 && c.steps.length <= (c.service === "search" ? 3 : 1), "case steps");
  check(exact(c.context, c.service === "search" ? [] : c.service === "policy" ? ["storeId", "currentPolicy"] : ["storeId", "budgetWon", "selectedProductIds", "context"]), "exact service context required");
  for (const [i, step] of c.steps.entries()) {
    check(exact(step, ["text", "expect", "semanticChecks"]), "step fields");
    check(typeof step.text === "string" && step.text.trim().length > 0 && step.text.length <= 300, "step text");
    check(strings(step.semanticChecks) && unique(step.semanticChecks), "semantic checks required");
    const input = { ...c.context, text: step.text, id: c.id, generation: 0 };
    if (c.service === "search") {
      parseDialogueRequest({ ...input, dialogue: { conversationId: c.id, initialText: c.steps[0].text,
        turns: c.steps.slice(1, i + 1).map(s => ({ question: "형식 검사용 질문; 실제 실행에는 이전 모델 질문을 사용", answer: s.text })) } });
      const e = step.expect;
      check(exact(e, ["status", "allowedCandidateIds", "requiredCandidateIds", "allowedKinds", "maxCandidates"]), "search oracle fields");
      check(strings(e.status) && unique(e.status) && e.status.every(s => ["matched", "clarify", "unknown", "unsupported"].includes(s)), "search oracle status");
      check(ids(e.allowedCandidateIds) && ids(e.requiredCandidateIds) && e.requiredCandidateIds.every(id => e.allowedCandidateIds.includes(id)), "search oracle SKU");
      check(e.maxCandidates === 3 && e.requiredCandidateIds.length <= e.maxCandidates, "search oracle candidate limit");
      check(Array.isArray(e.allowedKinds) && unique(e.allowedKinds) && e.allowedKinds.every(k => ["exact", "needs_confirmation", "alternative"].includes(k)), "search oracle kinds");
      const noCandidates = e.status.every(s => ["unknown", "unsupported"].includes(s));
      check(!noCandidates || e.allowedCandidateIds.length + e.requiredCandidateIds.length + e.allowedKinds.length === 0, "unknown/refusal cannot accept candidates");
      check(noCandidates || e.allowedKinds.length > 0, "candidate kinds required");
      check(!e.status.includes("matched") || e.requiredCandidateIds.length > 0, "matched requires positive SKU oracle");
      check(!e.status.some(s => ["unknown", "unsupported"].includes(s)) || noCandidates, "incompatible oracle statuses");
      if (i < c.steps.length - 1) check(e.status.length === 1 && e.status[0] === "clarify", "followup requires actual clarification");
      if (i === 2) check(!e.status.includes("clarify"), "third-step clarification forbidden by API");
      if (i === c.steps.length - 1) {
        const allowed = c.normalCompletion ? ["matched"] : c.slice === "unknown" ? ["unknown"] : c.slice === "refusal" ? ["unsupported"] : ["clarify", "unknown"];
        check(e.status.every(s => allowed.includes(s)), c.normalCompletion ? "normal final match required" : "slice/final status contradiction");
      }
      if (c.slice === "clear") check(c.steps.length === 1, "clear case must not require extra questions");
    } else {
      check(exact(step.expect, ["fields"]) || exact(step.expect, ["fields", "alternatives"]) && Array.isArray(step.expect.alternatives) && step.expect.alternatives.length > 0, "merchant oracle wrapper");
      const alternatives = [step.expect.fields, ...(step.expect.alternatives ?? [])];
      check(unique(alternatives.map(v => JSON.stringify(canonical(withoutMessages(v))))), "duplicate oracle alternative");
      for (const fields of alternatives) {
      const policy = c.service === "policy";
      check(exact(fields, policy ? ["action", "enabled", "productIds", "budgetWon"] : ["action", "scope", "view", "selection", "productIds", "budgetWon", "restoreSelectionChangeId", "restoreBudgetChangeId", "policyDraft"]), "merchant oracle core fields");
      const request = policy ? parsePolicyRequest(input, catalogIds, storeIds) : parseMerchantContextRequest(input, catalogIds, storeIds);
      const output = { ...fields, message: "평가 정답의 형식 검사용이며 모델 응답이 아닙니다." };
      if (!policy && object(fields.policyDraft)) output.policyDraft = { ...fields.policyDraft, message: "형식 검사" };
      const parsed = policy ? parsePolicyOutput(output, catalogIds, request.currentPolicy) : parseMerchantContextOutput(output, request, catalogIds);
      // Catch impossible labels (e.g. budget below spent, unknown restore IDs).
      try { assert.deepEqual(withoutMessages(parsed), withoutMessages(output)); } catch { throw Error("oracle differs from normalized API contract"); }
      check(c.normalCompletion === !["clarify", "unsupported"].includes(fields.action), "merchant completion/action");
      }
    }
  }
}

export function inspectPack(pack, allowedSplits = ["dev", "validation"]) {
  check(exact(pack, ["version", "evalVersion", "role", "cases"]) && pack.version === 1 && pack.evalVersion === evalVersion && Object.hasOwn(riskTags, pack.role), "pack version/role/fields");
  check(Array.isArray(pack.cases) && pack.cases.length > 0, "empty eval pack");
  check(strings(allowedSplits) && unique(allowedSplits) && allowedSplits.every(s => ["dev", "validation", "holdout"].includes(s)), "allowed splits");
  const seenIds = new Set(), groups = new Map(), seenText = new Set();
  for (const [index, c] of pack.cases.entries()) {
    try {
      validateCase(c);
      check(allowedSplits.includes(c.split), "private/public split boundary");
      check(c.riskTags.every(t => riskTags[pack.role].includes(t)), "role risk tags");
      check((pack.role === "customer") === (c.service === "search"), "role/service mismatch");
      check(!seenIds.has(c.id), "duplicate case ID"); seenIds.add(c.id);
      check(!groups.has(c.group) || groups.get(c.group) === c.split, "family split leakage"); groups.set(c.group, c.split);
      const key = JSON.stringify(canonical({ context: c.context, steps: c.steps.map(s => normalize(s.text)) }));
      check(!seenText.has(key), "duplicate normalized conversation/context"); seenText.add(key);
    } catch (error) {
      // Never print case text, oracle, input values or library exception payloads.
      const code = error.code ? `API contract ${error.code}` : error.message;
      throw Error(`Invalid eval case index ${index}: ${code}`);
    }
  }
  const counts = {};
  const coverageErrors = [];
  for (const split of allowedSplits) {
    const cases = pack.cases.filter(c => c.split === split);
    const summarize = (rows, threshold) => ({ cases: rows.length, families: new Set(rows.map(c => c.group)).size, threshold, requiredSuccesses: Math.ceil(rows.length * threshold) });
    counts[split] = { cases: cases.length, families: new Set(cases.map(c => c.group)).size,
      normalCases: cases.filter(c => c.normalCompletion).length, plannedTurns: cases.reduce((n, c) => n + c.steps.length, 0),
      slices: Object.fromEntries(slices.map(s => [s, summarize(cases.filter(c => c.slice === s), s === "clear" ? 0.95 : 0.9)])),
      risks: Object.fromEntries(riskTags[pack.role].map(t => [t, summarize(cases.filter(c => c.riskTags.includes(t)), 0.85)])) };
    if (cases.length < splitMinimums[pack.role][split]) coverageErrors.push(`${split}: too few cases`);
    if (split === "dev") continue;
    if (counts[split].normalCases < Math.ceil(cases.length / 2)) coverageErrors.push(`${split}: fewer than half normal completions`);
    for (const dimension of ["slices", "risks"]) for (const [name, metric] of Object.entries(counts[split][dimension])) {
      if (metric.families < 3) coverageErrors.push(`${split}/${dimension}/${name}: fewer than 3 families`);
    }
  }
  return { version: 1, evalVersion, role: pack.role, caseCount: pack.cases.length, counts,
    coverageReady: coverageErrors.length === 0, coverageErrors,
    limitations: "Integrity/declared coverage only; semantic families, source facts and labels require independent review. No live/UX/transaction/holdout performance result." };
}

export function inspectFiles(files, allowedSplits) {
  const packs = files.map(file => json(file));
  check(packs.length > 0 && packs.every(p => p.role === packs[0].role), "one role per inspection");
  const combined = { ...packs[0], cases: packs.flatMap(p => p.cases) };
  // Check each header too, not only the first file's version.
  packs.forEach(p => inspectPack(p, [...new Set(p.cases.map(c => c.split))]));
  return { ...inspectPack(combined, allowedSplits), files: files.map(file => ({ path: file, sha256: hash(readFileSync(resolve(root, file))) })) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    // Private files are deliberately not accepted by the public CLI.
    const role = process.argv[2];
    check(process.argv.length === 3 && Object.hasOwn(riskTags, role), "Usage: node scripts/eval-dataset.mjs customer|merchant");
    const result = inspectFiles([`evals/${role}.json`], ["dev", "validation"]);
    console.log(JSON.stringify(result, null, 2));
    if (!result.coverageReady) process.exitCode = 2;
    else console.log("Eval dataset integrity/declared coverage PASS; no live or release approval.");
  } catch (error) { console.error(`Eval dataset rejected: ${error.message}`); process.exitCode = 1; }
}
