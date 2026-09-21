// Node 24: node --conditions=react-server lib/assistant/check.mjs
// One offline validation check, not live-model evidence or a product quality gate.
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// Node's native TS stripping handles the types; adapt this folder's Next-style
// extensionless imports without emitting files or adding a test dependency.
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.includes("/lib/assistant/") && specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) specifier += ".ts";
  return next(specifier, context);
} });
globalThis.fetch = async () => { throw new Error("Network calls are forbidden in the assistant checker"); };

const { parseSearchRequest, parseSearchOutput, parseModelResponse } = await import("./contracts.ts");
const { assistantStatus, environmentEnabled, requireLive, requireSameOrigin, readJson, IpLimiter, providerError, failureResponse } = await import("./server.ts");
const { default: OpenAI } = await import("openai");
const { previewProducts } = await import("../../app/demo-preview.ts");
const ids = previewProducts.map(product => product.id);
const input = { text: "속이 편한 차가운 음료를 찾고 있어", id: "offline-check", generation: 0 };
const request = (body, headers = {}, url = "http://localhost:3000/api/assistant/search") => new Request(url, { method: "POST", headers: { Origin: new URL(url).origin, "Content-Type": "application/json", ...headers }, body });
const local = request(JSON.stringify(input));
const preview = request(JSON.stringify(input), {}, "https://example.vercel.app/api/assistant/search");
const env = { LLM_MODE: "live", OPENAI_MODEL: "gpt-5-mini", OPENAI_API_KEY: "offline-placeholder-never-used" };
const throwsCode = (fn, code) => assert.throws(fn, error => error.code === code);

assert.deepEqual(parseSearchRequest(input), input);
for (const text of ["우유 말고 차가운 커피", "morning coffee please", "x".repeat(300), "카탈로그에 없는 상품", "사진 속 상품을 찾아줘"]) {
  assert.equal(parseSearchRequest({ ...input, text }).text, text); // No keyword rejection.
}
for (const value of [null, [], { ...input, text: "" }, { ...input, text: "  " }, { ...input, text: "x".repeat(301) }, { ...input, generation: -1 }, { ...input, generation: 1.5 }, { ...input, model: "caller-model" }, { ...input, id: "x".repeat(101) }]) {
  throwsCode(() => parseSearchRequest(value), "INVALID_INPUT");
}
const match = { candidateIds: [ids[0]], message: "상품 이름과 용량을 확인해주세요.", status: "matched" };
assert.deepEqual(parseSearchOutput(match, ids), match);
for (const status of ["clarify", "unknown", "unsupported"]) assert.equal(parseSearchOutput({ candidateIds: [], message: "어떤 상품인지 조금 더 알려주세요.", status }, ids).status, status);
for (const output of [{ ...match, candidateIds: ["external-sku"] }, { ...match, candidateIds: [ids[0], ids[0]] }, { ...match, candidateIds: ids.slice(0, 4) }, { ...match, candidateIds: [] }, { ...match, status: "unknown" }, { ...match, message: "x".repeat(301) }, { ...match, price: 1 }]) {
  throwsCode(() => parseSearchOutput(output, ids), "MODEL_MALFORMED");
}
const response = { status: "completed", output: [], output_text: JSON.stringify(match), usage: { input_tokens: 12, output_tokens: 8 } };
assert.deepEqual(parseModelResponse(response, ids).usage, { inputTokens: 12, outputTokens: 8 });
throwsCode(() => parseModelResponse({ ...response, output_text: "{" }, ids), "MODEL_MALFORMED");
throwsCode(() => parseModelResponse({ ...response, status: "incomplete" }, ids), "MODEL_INCOMPLETE");
throwsCode(() => parseModelResponse({ ...response, output: [{ type: "message", content: [{ type: "refusal", refusal: "untrusted upstream text" }] }] }, ids), "MODEL_REFUSAL");
throwsCode(() => parseModelResponse({ ...response, usage: null }, ids), "MODEL_MALFORMED");

assert.equal(assistantStatus(local, env).configured, true);
assert.equal(assistantStatus(local, { ...env, OPENAI_API_KEY: undefined }).configured, false);
assert.equal(assistantStatus(local, { ...env, LLM_MODE: "fixture" }).configured, false);
assert.equal(assistantStatus(preview, { ...env, VERCEL_ENV: "preview", ASSISTANT_PREVIEW_ENABLED: "true" }).configured, true);
assert.equal(environmentEnabled(preview, { VERCEL_ENV: "preview" }), false);
assert.equal(environmentEnabled(local, { VERCEL_ENV: "production", ASSISTANT_PREVIEW_ENABLED: "true" }), false);
assert.equal(environmentEnabled(preview, {}), false);
throwsCode(() => requireLive(local, { ...env, LLM_MODE: "fixture" }), "ASSISTANT_DISABLED");
throwsCode(() => requireSameOrigin(request("{}", { Origin: "https://elsewhere.example" })), "ORIGIN_REJECTED");
throwsCode(() => requireSameOrigin(request("{}", { "Sec-Fetch-Site": "cross-site" })), "ORIGIN_REJECTED");
requireSameOrigin(local);
assert.deepEqual(await readJson(local), input);
await assert.rejects(readJson(request("{")), error => error.code === "INVALID_JSON");
await assert.rejects(readJson(request("{}", { "Content-Type": "text/plain" })), error => error.code === "JSON_REQUIRED");
await assert.rejects(readJson(request(" ".repeat(4097))), error => error.code === "BODY_TOO_LARGE");

const limiter = new IpLimiter();
for (let i = 0; i < 20; i++) limiter.take("one-ip", 1000);
throwsCode(() => limiter.take("one-ip", 1001), "RATE_LIMITED");
limiter.take("other-ip", 1001);
limiter.take("one-ip", 61000);
for (const [status, body, expected] of [[429, { code: "insufficient_quota" }, "MODEL_QUOTA"], [429, { code: "project_spend_limit_exceeded" }, "MODEL_QUOTA"], [429, { code: "rate_limit_exceeded" }, "MODEL_RATE_LIMIT"], [401, {}, "MODEL_AUTH"], [403, {}, "MODEL_PERMISSION"], [404, {}, "MODEL_UNAVAILABLE"]]) {
  const error = OpenAI.APIError.generate(status, { error: { ...body, message: "UPSTREAM_BODY_MUST_NOT_ESCAPE" } }, undefined, new Headers());
  assert.equal(providerError(error).code, expected);
  assert.equal((await failureResponse(error).text()).includes("UPSTREAM_BODY_MUST_NOT_ESCAPE"), false);
}
assert.equal(providerError(new OpenAI.APIConnectionError({ message: "offline" })).code, "MODEL_NETWORK");
assert.equal(providerError(new OpenAI.APIConnectionTimeoutError()).code, "MODEL_TIMEOUT");
console.log("PASS assistant offline checker: input/output schemas, catalog IDs, response failures, environment/origin, 4KB body, IP limiter, sanitized provider errors. Live calls: 0.");
