import { isObject, parseSearchRequest } from "../../../../lib/assistant/contracts";
import { dialogueLimits, parseDialogueRequest } from "../../../../lib/assistant/dialogue-contracts";
import { searchDialogue } from "../../../../lib/assistant/dialogue";
import { failureResponse, json, limitRequest, readJson, requireLive, requireSameOrigin, searchCatalog } from "../../../../lib/assistant/server";

export const runtime = "nodejs";
export const maxDuration = 40; // Up to 5s receiving JSON + 30s SDK timeout + response handling.

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    requireLive(request);
    limitRequest(request);
    const body = await readJson(request, dialogueLimits.bodyBytes);
    if (isObject(body) && Object.hasOwn(body, "dialogue")) {
      return json(await searchDialogue(parseDialogueRequest(body), request));
    }
    const input = parseSearchRequest(body);
    return json(await searchCatalog(input, request));
  } catch (error) { return failureResponse(error); }
}
