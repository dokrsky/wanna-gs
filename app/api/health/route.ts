export function GET() {
  return Response.json({ ok: true, service: "wanna-gs", stage: "ui-preview-01", mode: "local-preview", storage: "memory", liveModelConnected: false });
}
