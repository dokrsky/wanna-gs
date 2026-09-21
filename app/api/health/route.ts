export function GET() {
  return Response.json({ ok: true, service: "wanna-gs", stage: "ui-preview-08-search-needs", storage: "browser-sqlite", assistant: "server-openai", modelConnection: "requires-assistant-request" });
}
