// Pure service-response matching. No transport, model call, semantic or release approval.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { inspectPack, evalVersion, catalogIds, root } from "./eval-dataset.mjs";

// eval-dataset installs the existing Node24 TypeScript resolution hook.
const { parseDialogueRequest, parseDialogueResponse } = await import("../lib/assistant/dialogue-contracts.ts");
const { parseMerchantContextRequest, parseMerchantContextResponse } = await import("../lib/assistant/merchant-context-contracts.ts");
const { parsePolicyRequest, parsePolicyOutput } = await import("../lib/assistant/policy-contracts.ts");
const catalog = JSON.parse(readFileSync(resolve(root, "data/catalog.json"), "utf8"));
const stores = ["demo-central", "demo-neighborhood", ...JSON.parse(readFileSync(resolve(root, "data/stores.json"), "utf8")).map(s => s.id)];
const policyFields = ["action", "enabled", "productIds", "budgetWon"];
const merchantFields = ["action", "scope", "view", "selection", "productIds", "budgetWon", "restoreSelectionChangeId", "restoreBudgetChangeId", "policyDraft"];
const object = v => v !== null && typeof v === "object" && !Array.isArray(v);
const exact = (v, keys) => object(v) && Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k));
const counter = n => Number.isSafeInteger(n) && n >= 0;
const pick = (v, keys) => Object.fromEntries(keys.map(k => [k, v[k]]));
const skuSets = new Set(["productIds", "selectedProductIds", "pendingProductIds", "addedProductIds", "removedProductIds"]);
function canonical(v, omitMessages = false, field = "") {
  if (Array.isArray(v)) return (skuSets.has(field) ? [...v].sort() : v).map(x => canonical(x, omitMessages));
  return object(v) ? Object.fromEntries(Object.keys(v).filter(k => !omitMessages || k !== "message").sort().map(k => [k, canonical(v[k], omitMessages, k)])) : v;
}
const same = (a, b, omitMessages = false) => isDeepStrictEqual(canonical(a, omitMessages), canonical(b, omitMessages));
const require = ok => { if (!ok) throw Error("Invalid response evidence"); };

function parsePolicyResponse(response, input) {
  // The app has a pure policy output parser, but no exported envelope parser.
  require(exact(response, [...policyFields, "message", "ok", "id", "generation", "storeId", "policyVersion", "mode", "model", "usage"]));
  require(response.ok === true && response.id === input.id && response.generation === input.generation && response.storeId === input.storeId &&
    response.policyVersion === input.currentPolicy.version && response.mode === "live" && typeof response.model === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(response.model));
  require(exact(response.usage, ["inputTokens", "outputTokens"]) && counter(response.usage.inputTokens) && counter(response.usage.outputTokens));
  return { ...response, ...parsePolicyOutput(pick(response, [...policyFields, "message"]), catalogIds, input.currentPolicy) };
}

/**
 * c is one validated authored case; exchanges are actual request/wire-response pairs.
 * Synthetic pairs are useful ONLY for unit tests. This unsigned matcher cannot
 * establish transport provenance, provider-raw behavior, latency or usage totals.
 * Returned data is safe aggregate/per-step diagnostics, never protected case text.
 */
export function matchCaseResponses(c, exchanges) {
  try {
    inspectPack({ version: 1, evalVersion, role: c?.service === "search" ? "customer" : "merchant", cases: [c] }, [c?.split]);
  } catch { throw Error("Invalid evaluation case"); }
  require(Array.isArray(exchanges) && exchanges.length <= c.steps.length && exchanges.every(e => exact(e, ["request", "response"])));
  const parsedResponses = [], parsedRequests = [], steps = [];
  for (let i = 0; i < c.steps.length; i++) {
    const step = c.steps[i], exchange = exchanges[i];
    const result = { index: i, status: "missing", responseParsed: false, mechanicalMatch: false, recallAt3: null, exactKindRecallAt3: null };
    if (i > 0 && parsedResponses[i - 1]?.status !== "clarify") {
      steps.push({ ...result, status: "unreachable_after_terminal_or_invalid_response" });
      continue;
    }
    if (!exchange) { steps.push(result); continue; }
    let input;
    try {
      const request = exchange.request;
      const base = { ...c.context, text: step.text, id: request?.id, generation: request?.generation };
      if (c.service === "search") {
        input = parseDialogueRequest(request);
        const expected = parseDialogueRequest({ ...base, dialogue: {
          conversationId: i ? parsedRequests[0].dialogue.conversationId : input.dialogue.conversationId,
          initialText: c.steps[0].text,
          turns: c.steps.slice(1, i + 1).map((s, index) => ({ question: parsedResponses[index].dialogue.question, answer: s.text })),
        } });
        require(same(input, expected) && (!i || input.generation === parsedRequests[0].generation));
      } else {
        const parser = c.service === "policy" ? parsePolicyRequest : parseMerchantContextRequest;
        input = parser(request, catalogIds, stores);
        require(same(input, parser(base, catalogIds, stores)));
      }
      parsedRequests[i] = input;
    } catch { steps.push({ ...result, status: "request_mismatch" }); continue; }
    let parsed;
    try {
      parsed = c.service === "search" ? parseDialogueResponse(exchange.response, input, catalog)
        : c.service === "merchant" ? parseMerchantContextResponse(exchange.response, input, catalogIds)
        : parsePolicyResponse(exchange.response, input);
      parsedResponses[i] = parsed;
      result.responseParsed = true;
    } catch { steps.push({ ...result, status: "invalid_response" }); continue; }
    if (c.service === "search") {
      const expected = step.expect, ids = parsed.candidateIds;
      const required = expected.requiredCandidateIds;
      result.recallAt3 = required.length ? required.filter(id => ids.includes(id)).length / required.length : null;
      result.exactKindRecallAt3 = required.length ? required.filter(id => parsed.dialogue.candidates.some(p => p.productId === id && p.kind === "exact")).length / required.length : null;
      result.mechanicalMatch = expected.status.includes(parsed.status) && ids.length <= expected.maxCandidates &&
        ids.every(id => expected.allowedCandidateIds.includes(id)) && required.every(id => ids.includes(id)) &&
        parsed.dialogue.candidates.every(p => expected.allowedKinds.includes(p.kind));
    } else {
      const fields = c.service === "policy" ? policyFields : merchantFields;
      const actual = pick(parsed, fields);
      // A wire payload that needs another safety normalization is NOT a match,
      // even if that normalization happens to produce an allowed oracle tuple.
      if (!same(actual, pick(exchange.response, fields), true)) {
        steps.push({ ...result, status: "response_not_normalized" }); continue;
      }
      result.mechanicalMatch = [step.expect.fields, ...(step.expect.alternatives ?? [])].some(expected => same(actual, expected, true));
    }
    steps.push({ ...result, status: result.mechanicalMatch ? "match" : "oracle_mismatch" });
  }
  const failed = steps.some(s => !["match", "missing", "unreachable_after_terminal_or_invalid_response"].includes(s.status));
  return { scope: "service_response_only", plannedSteps: c.steps.length, observedSteps: exchanges.length, steps,
    mechanicalStatus: failed ? "mismatch" : steps.every(s => s.mechanicalMatch) ? "match" : "incomplete",
    semanticStatus: "pending", providerRawStatus: "unobserved", qualityStatus: "not_evaluated",
    limitation: "No transport/live provenance, semantic grading, UI/transaction/latency/cost or release approval." };
}
