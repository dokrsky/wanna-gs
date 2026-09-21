export function GET() {
  return Response.json({ ok: true, service: "wanna-gs", stage: "ui-preview-06-store-map", storage: "browser-sqlite", assistant: "server-openai", modelConnection: "requires-assistant-request" });
}
