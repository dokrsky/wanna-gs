// Node24: node --conditions=react-server lib/assistant/dialogue.check.mjs
// Offline DTO/grounding checks only. No live NL quality, persistence or UI claim.
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.includes("/lib/assistant/") && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) specifier += ".ts";
  return next(specifier, context);
} });
globalThis.fetch = async () => { throw new Error("Network forbidden in dialogue checker"); };
const { parseDialogueRequest, parseDialogueModelOutput, parseDialogueResponse, catalogEvidenceFor, dialogueOutputSchema, violatesKnownConstraint } = await import("./dialogue-contracts.ts");
const { parseSearchRequest, parseSearchOutput, parseStructuredResponse, errorMessages } = await import("./contracts.ts");
const { readJson } = await import("./server.ts");
const { previewProducts: catalog } = await import("../../app/demo-preview.ts");
const coffee = catalog.find(p => p.id === "coffee"), milk = catalog.find(p => p.id === "milk");
const initialText = `${milk.name} 말고 ${coffee.name} 찾아줘`;
const input = { text: initialText, id: "offline-dialogue", generation: 7, dialogue: { conversationId: "conversation-1", initialText, turns: [] } };
const clue = (p, polarity) => ({ field: "name", value: p.name, polarity, certainty: "explicit", source: "initial", quote: p.name });
const candidate = p => ({ productId: p.id, kind: "exact", reason: "카탈로그의 이름을 확인해주세요.", evidenceCodes: [`${p.id}:name`], checks: ["different", "match"] });
const model = { status: "matched", message: "커피 후보를 확인해주세요.", question: null, clues: [clue(milk, "excluded"), clue(coffee, "required")], candidates: [candidate(coffee)] };
const parse = (v, i = input) => parseDialogueModelOutput(v, i, catalog);
const envelope = (out, i = input) => ({ ok: true, id: i.id, generation: i.generation, mode: "live", model: "offline-model", usage: { inputTokens: 20, outputTokens: 30 }, ...out });
const bad = (fn, code = "MODEL_MALFORMED") => assert.throws(fn, e => e.code === code);
const req = (body, headers = {}) => new Request("http://localhost:3000/api/assistant/search", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body });

assert.deepEqual(parseDialogueRequest(input), input);
const one = { ...input, text: "차가운 것으로", dialogue: { ...input.dialogue, turns: [{ question: "차가운 걸 원하시나요?", answer: "차가운 것으로" }] } };
const two = { ...input, text: "한 병", dialogue: { ...input.dialogue, turns: [...one.dialogue.turns, { question: "어떤 포장인가요?", answer: "한 병" }] } };
for (const i of [one, two]) assert.deepEqual(parseDialogueRequest(i), i);
for (const value of [null, { ...input, extra: 1 }, { ...input, text: "" }, { ...input, text: "changed" }, { ...input, generation: -1 }, { ...input, dialogue: null },
  { ...input, dialogue: { ...input.dialogue, currentText: input.text } }, { ...input, dialogue: { ...input.dialogue, conversationId: "x".repeat(101) } },
  { ...input, dialogue: { ...input.dialogue, initialText: "x".repeat(301) } }, { ...two, dialogue: { ...two.dialogue, turns: [...two.dialogue.turns, one.dialogue.turns[0]] } },
  { ...one, dialogue: { ...one.dialogue, turns: [{ question: "q", answer: "x".repeat(301) }] } }]) bad(() => parseDialogueRequest(value), "INVALID_INPUT");
const output = parse(model);
assert.equal(output.dialogue.clues[0].rawSourceRange.start, 0);
assert.equal(initialText.slice(output.dialogue.clues[1].rawSourceRange.start, output.dialogue.clues[1].rawSourceRange.end), coffee.name);
assert.deepEqual(output.dialogue.candidates[0].catalogEvidence, [{ code: "coffee:name", value: coffee.name }]);
assert.deepEqual(parseDialogueResponse(envelope(output), input, catalog), envelope(output));
assert.deepEqual(parse(model, two).dialogue.clues, output.dialogue.clues); // Initial exclusions survive later answers.

const clarify = { ...model, status: "clarify", question: "어떤 포장인가요?" };
assert.equal(parse(clarify, one).status, "clarify");
assert.equal(parse(clarify, two).status, "matched");
assert.equal(parse(clarify, two).dialogue.question, null);
assert.equal(parse({ ...clarify, candidates: [] }, two).status, "unknown");
assert.deepEqual(parse({ ...model, candidates: [candidate(milk), candidate(coffee)] }).candidateIds, ["coffee"]); // Bad sibling must not erase valid candidate.
assert.equal(parse({ ...model, candidates: [candidate(milk)] }).status, "unknown");
assert.equal(parse({ ...model, candidates: [{ ...candidate(coffee), checks: ["different", "unknown"] }] }).status, "unknown");
for (const status of ["unknown", "unsupported"]) assert.equal(parse({ ...model, status, candidates: [] }).status, status);
const alternativeText = `${milk.name} 같은 마실 것 찾아줘`;
const alternativeInput = { ...input, text: alternativeText, dialogue: { ...input.dialogue, initialText: alternativeText } };
const alternative = { ...model, clues: [{ ...clue(milk, "preferred") }, { field: "feature", value: "마실 것", polarity: "preferred", certainty: "inferred", source: "initial", quote: "마실 것" }],
  candidates: [{ ...candidate(coffee), kind: "alternative", reason: "찾던 우유와 다른 커피예요. 이름과 음료 종류를 확인해주세요.", evidenceCodes: ["coffee:name", "coffee:category"] }] };
assert.equal(parse(alternative, alternativeInput).dialogue.candidates[0].kind, "alternative");
bad(() => parse({ ...alternative, candidates: [{ ...alternative.candidates[0], kind: "exact" }] }, alternativeInput));
assert.equal(parse({ ...model, candidates: [{ ...candidate(coffee), kind: "needs_confirmation" }] }).dialogue.candidates[0].kind, "needs_confirmation");
for (const patch of [{ productId: "foreign" }, { evidenceCodes: ["milk:name"] }, { evidenceCodes: ["coffee:stock"] }, { evidenceCodes: ["coffee:name", "coffee:name"] }, { checks: [] }, { kind: "confirmed" }, { reason: "x".repeat(161) }, { approved: true }]) bad(() => parse({ ...model, candidates: [{ ...candidate(coffee), ...patch }] }));
for (const patch of [{ quote: "invented quote" }, { source: "answer2" }, { certainty: "user_confirmed" }, { field: "phone" }, { value: "x".repeat(81) }, { source: "question1" }]) bad(() => parse({ ...model, clues: [{ ...model.clues[0], ...patch }, model.clues[1]] }));
bad(() => parse({ ...model, candidates: [candidate(coffee), candidate(coffee)] }));
bad(() => parse({ ...model, transaction: "saved" }));
bad(() => parse({ ...model, clues: Array(7).fill(model.clues[0]) }));
bad(() => parse({ ...model, status: "unknown" }));
bad(() => parse({ ...model, candidates: [] }));
bad(() => parse({ ...model, candidates: [{ ...candidate(coffee), kind: "alternative" }] }));
for (const patch of [{ id: "stale" }, { generation: 8 }, { mode: "fixture" }, { usage: null }, { candidateIds: ["milk"] }, { message: "" }]) bad(() => parseDialogueResponse({ ...envelope(output), ...patch }, input, catalog));
for (const patch of [{ conversationId: "stale" }, { question: "third question" }, { extra: true }]) bad(() => parseDialogueResponse({ ...envelope(output), dialogue: { ...output.dialogue, ...patch } }, input, catalog));
bad(() => parseDialogueResponse({ ...envelope(output), dialogue: { ...output.dialogue, candidates: [{ ...output.dialogue.candidates[0], catalogEvidence: [{ code: "coffee:name", value: "invented" }] }] } }, input, catalog));
for (const range of [{ source: "initial", start: -1, end: 1 }, { source: "answer2", start: 0, end: 1 }, { source: "initial", start: 0, end: 301 }]) bad(() => parseDialogueResponse({ ...envelope(output), dialogue: { ...output.dialogue, clues: [{ ...output.dialogue.clues[0], rawSourceRange: range }] } }, input, catalog));

// Exact structured size/category contradictions, without blanket keyword rejection.
const smallCatalog = [{ id: "a", name: "A", aliases: [], description: "sample", category: "milk", size: "900ml" }, { id: "b", name: "B", aliases: [], description: "sample", category: "coffee", size: "200ml" }];
assert.equal(violatesKnownConstraint(smallCatalog[1], [{ ...output.dialogue.clues[0], field: "size", value: "900ml", polarity: "required" }], smallCatalog), true);
assert.equal(violatesKnownConstraint(smallCatalog[1], [{ ...output.dialogue.clues[0], field: "category", value: "coffee", polarity: "excluded" }], smallCatalog), true);
assert.equal(violatesKnownConstraint(smallCatalog[1], [{ ...output.dialogue.clues[0], field: "feature", value: "refreshing", polarity: "required" }], smallCatalog), false); // Semantic unknown isn't a hardcoded query rejection.

const body = JSON.stringify(two), bytes = Buffer.byteLength(body);
assert.deepEqual(await readJson(req(body + " ".repeat(8192 - bytes)), 8192), two);
await assert.rejects(readJson(req(body + " ".repeat(8193 - bytes)), 8192), e => e.code === "BODY_TOO_LARGE" && e.httpStatus === 413);
await assert.rejects(readJson(req(body + " ".repeat(4097 - bytes))), e => e.code === "BODY_TOO_LARGE"); // Other endpoints stay 4KB.
await assert.rejects(readJson(req("{}", { "Content-Length": "8193" }), 8192), e => e.code === "BODY_TOO_LARGE");
await assert.rejects(readJson(req(JSON.stringify({ text: "가".repeat(2800) })), 8192), e => e.code === "BODY_TOO_LARGE");
await assert.rejects(readJson(req("{"), 8192), e => e.code === "INVALID_JSON");
assert.ok(!errorMessages.BODY_TOO_LARGE.includes("4KB"));
// v1 remains strict and unchanged. A dialogue request must take the v2 branch.
const v1 = { text: "coffee", id: "legacy", generation: 0 };
assert.deepEqual(parseSearchRequest(v1), v1);
bad(() => parseSearchRequest(input), "INVALID_INPUT");
assert.deepEqual(parseSearchOutput({ candidateIds: ["coffee"], message: "확인해주세요", status: "matched" }, catalog.map(p => p.id)).candidateIds, ["coffee"]);
const provider = { status: "completed", output: [], output_text: JSON.stringify(model), usage: { input_tokens: 22, output_tokens: 33 } };
assert.deepEqual(parseStructuredResponse(provider).usage, { inputTokens: 22, outputTokens: 33 });
bad(() => parseStructuredResponse({ ...provider, status: "incomplete" }), "MODEL_INCOMPLETE");
bad(() => parseStructuredResponse({ ...provider, output: [{ type: "message", content: [{ type: "refusal" }] }] }), "MODEL_REFUSAL");
bad(() => parseStructuredResponse({ ...provider, output_text: "x".repeat(4097) }), "MODEL_MALFORMED");
const schema = dialogueOutputSchema(catalog.map(p => p.id));
assert.equal(schema.additionalProperties, false);
assert.equal(schema.properties.candidates.maxItems, 3);
assert.equal(schema.properties.clues.maxItems, 6);
assert.equal(catalogEvidenceFor(coffee).some(e => e.code.includes("price")), false);
console.log(`PASS dialogue offline checker: ${catalog.length} server SKUs, initial/0..2 QA, grounded codes/ranges, candidate kinds/constraints, valid sibling retention, v1, 8KB/4KB boundaries, usage/refusal/incomplete. Live calls: 0.`);
