// UI07 / ADR-005. Browser-safe API DTO; storage DTO has a separate single owner.
// Raw dialogue, clue values/ranges and free-text reasons are CUSTOMER ONLY.
// Never spread these into a merchant view; use its catalog-only projection.
import { AssistantError, isObject, parseSearchRequest, parseSearchOutput, type SearchRequest, type SearchResponse, type SearchStatus } from "./contracts";

export const clueFields = ["name", "brand", "category", "flavor", "size", "feature"] as const;
export const cluePolarities = ["required", "excluded", "preferred"] as const;
export const clueSources = ["initial", "answer1", "answer2"] as const;
export const candidateKinds = ["exact", "needs_confirmation", "alternative"] as const;
export type DialogueRequest = SearchRequest & {
  dialogue: { conversationId: string; initialText: string; turns: { question: string; answer: string }[] };
};
export type DialogueClue = {
  field: typeof clueFields[number]; value: string; polarity: typeof cluePolarities[number];
  certainty: "explicit" | "inferred";
  // UTF-16 offsets, end exclusive, in the specified original customer input.
  rawSourceRange: { source: typeof clueSources[number]; start: number; end: number };
};
export type CatalogEvidence = { code: string; value: string };
export type DialogueCandidate = {
  productId: string; kind: typeof candidateKinds[number]; reason: string; catalogEvidence: CatalogEvidence[];
};
export type DialogueResponse = SearchResponse & {
  dialogue: { conversationId: string; question: string | null; candidates: DialogueCandidate[]; clues: DialogueClue[] };
};
export type DialogueCatalogProduct = { id: string; name: string; category: string; description: string; aliases: string[]; size?: string | null };

export const dialogueLimits = { bodyBytes: 8192, text: 300, turns: 2, candidates: 3, clues: 6, evidence: 3, clueValue: 80, quote: 120, reason: 160 } as const;
const exact = (v: Record<string, unknown>, keys: string[]) => Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k));
const bounded = (v: unknown, max: number): v is string => typeof v === "string" && !!v.trim() && v.length <= max;
function malformed(): never { throw new AssistantError("MODEL_MALFORMED", 502); }
const normal = (value: string) => value.normalize("NFKC").toLowerCase().replace(/\s+/g, "");

export function parseDialogueRequest(value: unknown): DialogueRequest {
  if (!isObject(value) || !exact(value, ["text", "id", "generation", "dialogue"]) || !isObject(value.dialogue)) throw new AssistantError("INVALID_INPUT");
  const base = parseSearchRequest({ text: value.text, id: value.id, generation: value.generation });
  const d = value.dialogue;
  if (!exact(d, ["conversationId", "initialText", "turns"]) || typeof d.conversationId !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(d.conversationId) ||
      !bounded(d.initialText, 300) || !Array.isArray(d.turns) || d.turns.length > 2 ||
      !d.turns.every(t => isObject(t) && exact(t, ["question", "answer"]) && bounded(t.question, 300) && bounded(t.answer, 300))) throw new AssistantError("INVALID_INPUT");
  const turns = d.turns as { question: string; answer: string }[];
  if (base.text !== (turns.length ? turns[turns.length - 1].answer : d.initialText)) throw new AssistantError("INVALID_INPUT");
  return { ...base, dialogue: { conversationId: d.conversationId, initialText: d.initialText, turns: turns.map(t => ({ ...t })) } };
}

export function dialogueSource(input: DialogueRequest, source: DialogueClue["rawSourceRange"]["source"]): string | undefined {
  return source === "initial" ? input.dialogue.initialText : input.dialogue.turns[source === "answer1" ? 0 : 1]?.answer;
}

export function catalogEvidenceFor(product: DialogueCatalogProduct): CatalogEvidence[] {
  return ["name", "category", "description", "aliases", "size"].flatMap(field => {
    const value = field === "aliases" ? product.aliases.join(" · ") : product[field as "name" | "category" | "description" | "size"];
    return typeof value === "string" && value.trim() ? [{ code: `${product.id}:${field}`, value }] : [];
  });
}

function parseClue(value: unknown, input: DialogueRequest): DialogueClue {
  if (!isObject(value) || !exact(value, ["field", "value", "polarity", "certainty", "rawSourceRange"]) ||
      !clueFields.includes(value.field as DialogueClue["field"]) || !bounded(value.value, 80) ||
      !cluePolarities.includes(value.polarity as DialogueClue["polarity"]) || !["explicit", "inferred"].includes(String(value.certainty)) || !isObject(value.rawSourceRange)) malformed();
  const range = value.rawSourceRange;
  if (!exact(range, ["source", "start", "end"]) || !clueSources.includes(range.source as typeof clueSources[number]) ||
      !Number.isSafeInteger(range.start) || !Number.isSafeInteger(range.end)) malformed();
  const source = dialogueSource(input, range.source as typeof clueSources[number]);
  const start = range.start as number, end = range.end as number;
  if (source === undefined || start < 0 || end <= start || end > source.length || end - start > 120 || !source.slice(start, end).trim()) malformed();
  // Do not permit half of a surrogate pair as evidence.
  if ([start, end].some(i => i > 0 && i < source.length && /[\uD800-\uDBFF]/.test(source[i - 1]) && /[\uDC00-\uDFFF]/.test(source[i]))) malformed();
  return { field: value.field as DialogueClue["field"], value: value.value as string, polarity: value.polarity as DialogueClue["polarity"], certainty: value.certainty as DialogueClue["certainty"], rawSourceRange: { source: range.source as typeof clueSources[number], start, end } };
}

// A small deterministic contradiction check, NOT a semantic/NL guarantee.
// Exact catalog names/categories/sizes are checkable; unknown attributes are
// not invented. Initial semantic extraction and paraphrases still need live QA.
export function violatesKnownConstraint(product: DialogueCatalogProduct, clues: readonly DialogueClue[], catalog: readonly DialogueCatalogProduct[]): boolean {
  return clues.some(clue => {
    if (clue.certainty !== "explicit" || clue.polarity === "preferred") return false;
    const v = normal(clue.value);
    const values = (p: DialogueCatalogProduct) => clue.field === "name" ? [p.name, ...p.aliases] : clue.field === "category" ? [p.category] : clue.field === "size" && p.size ? [p.size] : [];
    // Only exact structured vocabulary; no fixed query keyword filter.
    if (!catalog.some(p => values(p).some(x => normal(x) === v))) return false;
    const actual = values(product);
    const match = actual.some(x => normal(x) === v);
    return clue.polarity === "excluded" ? match : actual.length > 0 && !match;
  });
}

export function parseDialogueResponse(value: unknown, input: DialogueRequest, catalog: readonly DialogueCatalogProduct[]): DialogueResponse {
  if (!isObject(value) || !exact(value, ["ok", "id", "generation", "mode", "model", "usage", "candidateIds", "status", "message", "dialogue"]) ||
      value.ok !== true || value.id !== input.id || value.generation !== input.generation || value.mode !== "live" || !bounded(value.model, 120) ||
      !isObject(value.usage) || !exact(value.usage, ["inputTokens", "outputTokens"]) ||
      ![value.usage.inputTokens, value.usage.outputTokens].every(n => Number.isSafeInteger(n) && Number(n) >= 0) || !isObject(value.dialogue)) malformed();
  const base = parseSearchOutput({ candidateIds: value.candidateIds, status: value.status, message: value.message }, catalog.map(p => p.id));
  const d = value.dialogue;
  if (!exact(d, ["conversationId", "question", "candidates", "clues"]) || d.conversationId !== input.dialogue.conversationId ||
      !Array.isArray(d.candidates) || d.candidates.length > 3 || !Array.isArray(d.clues) || d.clues.length > 6 ||
      (base.status === "clarify" ? !bounded(d.question, 300) || input.dialogue.turns.length >= 2 : d.question !== null)) malformed();
  const clues = d.clues.map(c => parseClue(c, input));
  const candidates: DialogueCandidate[] = d.candidates.map(c => {
    if (!isObject(c) || !exact(c, ["productId", "kind", "reason", "catalogEvidence"]) || !candidateKinds.includes(c.kind as DialogueCandidate["kind"]) ||
        !bounded(c.reason, 160) || !Array.isArray(c.catalogEvidence) || c.catalogEvidence.length < 1 || c.catalogEvidence.length > 3) malformed();
    const product = catalog.find(p => p.id === c.productId);
    if (!product || violatesKnownConstraint(product, clues, catalog)) malformed();
    const actual = catalogEvidenceFor(product);
    const evidence: CatalogEvidence[] = c.catalogEvidence.map(e => {
      if (!isObject(e) || !exact(e, ["code", "value"]) || !actual.some(a => a.code === e.code && a.value === e.value)) malformed();
      return { code: e.code as string, value: e.value as string };
    });
    if (new Set(evidence.map(e => e.code)).size !== evidence.length) malformed();
    return { productId: product.id, kind: c.kind as DialogueCandidate["kind"], reason: c.reason as string, catalogEvidence: evidence };
  });
  if (JSON.stringify(candidates.map(c => c.productId)) !== JSON.stringify(base.candidateIds)) malformed();
  return { ok: true, id: input.id, generation: input.generation, mode: "live", model: value.model as string,
    usage: { inputTokens: value.usage.inputTokens as number, outputTokens: value.usage.outputTokens as number }, ...base,
    dialogue: { conversationId: input.dialogue.conversationId, question: d.question as string | null, candidates, clues } };
}

// Strict provider schema stays compact within the shared 1200-token cap.
// checks has one entry per clue: match/different/unknown describes the ATTRIBUTE,
// so excluded requires different and required requires match. Not chain-of-thought.
export function dialogueOutputSchema(ids: readonly string[]) {
  const object = (properties: Record<string, unknown>) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });
  const string = (maxLength: number) => ({ type: "string", minLength: 1, maxLength });
  return object({
    status: { type: "string", enum: ["matched", "clarify", "unknown", "unsupported"] },
    message: string(300), question: { type: ["string", "null"], minLength: 1, maxLength: 300 },
    clues: { type: "array", maxItems: 6, items: object({ field: { type: "string", enum: [...clueFields] }, value: string(80),
      polarity: { type: "string", enum: [...cluePolarities] }, certainty: { type: "string", enum: ["explicit", "inferred"] },
      source: { type: "string", enum: [...clueSources] }, quote: string(120) }) },
    candidates: { type: "array", maxItems: 3, items: object({ productId: { type: "string", enum: [...ids] }, kind: { type: "string", enum: [...candidateKinds] },
      reason: string(160), evidenceCodes: { type: "array", minItems: 1, maxItems: 3, items: string(160) },
      checks: { type: "array", maxItems: 6, items: { type: "string", enum: ["match", "different", "unknown"] } } }) },
  });
}

export function parseDialogueModelOutput(value: unknown, input: DialogueRequest, catalog: readonly DialogueCatalogProduct[]) {
  if (!isObject(value) || !exact(value, ["status", "message", "question", "clues", "candidates"]) ||
      !["matched", "clarify", "unknown", "unsupported"].includes(String(value.status)) || !bounded(value.message, 300) ||
      (value.status === "clarify" ? !bounded(value.question, 300) : value.question !== null) ||
      !Array.isArray(value.clues) || value.clues.length > 6 || !Array.isArray(value.candidates) || value.candidates.length > 3) malformed();
  const clues = value.clues.map(c => {
    if (!isObject(c) || !exact(c, ["field", "value", "polarity", "certainty", "source", "quote"]) ||
        !clueSources.includes(c.source as typeof clueSources[number]) || !bounded(c.quote, 120)) malformed();
    const source = dialogueSource(input, c.source as typeof clueSources[number]);
    const start = source?.indexOf(c.quote) ?? -1;
    if (start < 0) malformed();
    return parseClue({ field: c.field, value: c.value, polarity: c.polarity, certainty: c.certainty,
      rawSourceRange: { source: c.source, start, end: start + c.quote.length } }, input);
  });
  const seen = new Set<string>();
  const candidates = value.candidates.flatMap(c => {
    if (!isObject(c) || !exact(c, ["productId", "kind", "reason", "evidenceCodes", "checks"]) ||
        typeof c.productId !== "string" || seen.has(c.productId) || !candidateKinds.includes(c.kind as DialogueCandidate["kind"]) || !bounded(c.reason, 160) ||
        !Array.isArray(c.evidenceCodes) || c.evidenceCodes.length < 1 || c.evidenceCodes.length > 3 || new Set(c.evidenceCodes).size !== c.evidenceCodes.length ||
        !Array.isArray(c.checks) || c.checks.length !== clues.length || !c.checks.every(v => ["match", "different", "unknown"].includes(String(v)))) malformed();
    seen.add(c.productId);
    const product = catalog.find(p => p.id === c.productId);
    if (!product) malformed();
    const evidence = catalogEvidenceFor(product);
    const catalogEvidence = c.evidenceCodes.map(code => { const e = evidence.find(e => e.code === code); return e ?? malformed(); });
    // Keep valid siblings when one proposal conflicts. Never drop all candidates
    // merely because a third question was attempted or a preferred trait differs.
    const checks = c.checks as string[];
    if (violatesKnownConstraint(product, clues, catalog) || clues.some((clue, i) =>
      clue.polarity === "required" && checks[i] !== "match" || clue.polarity === "excluded" && checks[i] !== "different")) return [];
    const kind = c.kind as DialogueCandidate["kind"];
    if (kind === "alternative" && !clues.some((clue, i) => clue.polarity === "preferred" && checks[i] === "different")) malformed();
    if (kind === "exact" && clues.some((clue, i) => clue.polarity !== "excluded" && checks[i] !== "match")) malformed();
    return [{ productId: product.id, kind, reason: c.reason as string, catalogEvidence }];
  });
  if (["unknown", "unsupported"].includes(String(value.status)) && value.candidates.length) malformed();
  if (value.status === "matched" && value.candidates.length === 0) malformed();
  let status = value.status as SearchStatus, message = value.message as string, question = value.question as string | null;
  if (status === "clarify" && input.dialogue.turns.length === 2) {
    status = candidates.length ? "matched" : "unknown"; question = null;
    message = candidates.length ? "추가 질문은 여기까지예요. 조건을 통과한 후보를 직접 확인해주세요." : "두 번의 답변으로도 조건에 맞는 후보를 식별하지 못했어요. 니즈 기록이나 새 검색을 선택할 수 있어요.";
  } else if (status === "matched" && candidates.length === 0) {
    status = "unknown"; question = null; message = "제안된 상품이 입력 조건을 통과하지 못했어요. 조건에 맞는 후보를 식별하지 못했어요.";
  }
  return { candidateIds: candidates.map(c => c.productId), status, message,
    dialogue: { conversationId: input.dialogue.conversationId, question, candidates, clues } };
}
