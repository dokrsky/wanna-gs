import { assistantStatus, json } from "../../../../lib/assistant/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  // configured is local readiness only, not evidence of API access or model quality.
  return json(assistantStatus(request));
}
