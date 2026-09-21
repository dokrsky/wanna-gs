import { interpretMerchant, validateMerchantInput } from "../../../../lib/assistant/merchant";
import { failureResponse, json, limitRequest, readJson, requireLive, requireSameOrigin } from "../../../../lib/assistant/server";

export const runtime = "nodejs";
export const maxDuration = 40;

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    requireLive(request);
    limitRequest(request);
    const input = validateMerchantInput(await readJson(request));
    return json(await interpretMerchant(input, request));
  } catch (error) { return failureResponse(error); }
}
