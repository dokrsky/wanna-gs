import { parseSearchRequest } from "../../../../lib/assistant/contracts";
import { failureResponse, json, limitRequest, readJson, requireLive, requireSameOrigin, searchCatalog } from "../../../../lib/assistant/server";

export const runtime = "nodejs";
export const maxDuration = 40; // Up to 5s receiving JSON + 30s SDK timeout + response handling.

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    requireLive(request);
    limitRequest(request);
    const input = parseSearchRequest(await readJson(request));
    return json(await searchCatalog(input, request));
  } catch (error) { return failureResponse(error); }
}
