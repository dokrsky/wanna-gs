export function GET() {
  return Response.json({ ok: true, service: "wanna-gs", stage: "ui-preview-02", mode: "local-preview", storage: "browser-sqlite", liveModelConnected: false });
}
