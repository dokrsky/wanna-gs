export function GET() {
  return Response.json({ ok: true, service: "wanna-gs", mode: process.env.LLM_MODE ?? "live" });
}
