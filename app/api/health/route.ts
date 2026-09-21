export function GET() {
  return Response.json({ ok: true, service: "wanna-gs", stage: "ui-preview-03", storage: "browser-sqlite", assistant: "server-openai", modelConnection: "requires-search-request" });
}
