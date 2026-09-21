import { interpretPolicy, validatePolicyInput } from "../../../../lib/assistant/policy";
import { failureResponse, json, limitRequest, readJson, requireLive, requireSameOrigin } from "../../../../lib/assistant/server";

export const runtime = "nodejs";
export const maxDuration = 40;

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    requireLive(request);
    // Shared per-process 20/IP/minute counter, not a durable/global cost cap.
    limitRequest(request);
    const input = validatePolicyInput(await readJson(request));
    return json(await interpretPolicy(input, request));
  } catch (error) { return failureResponse(error); }
}
