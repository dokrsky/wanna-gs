export function GET() {
  return Response.json({ ok: true, service: "wanna-gs", stage: "ui-preview-07-policy-ai", storage: "browser-sqlite", assistant: "server-openai", modelConnection: "requires-assistant-request" });
}
