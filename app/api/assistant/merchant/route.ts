import { interpretMerchant, interpretMerchantContext, validateMerchantContextInput, validateMerchantInput } from "../../../../lib/assistant/merchant";
import { MERCHANT_CONTEXT_BODY_BYTES } from "../../../../lib/assistant/merchant-context-contracts";
import { AssistantError } from "../../../../lib/assistant/contracts";
import { failureResponse, json, limitRequest, readJson, requireLive, requireSameOrigin } from "../../../../lib/assistant/server";

export const runtime = "nodejs";
export const maxDuration = 40;

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    requireLive(request);
    limitRequest(request);
    const version = request.headers.get("x-wanna-merchant-version");
    if (version === "2") {
      const input = validateMerchantContextInput(await readJson(request, MERCHANT_CONTEXT_BODY_BYTES));
      return json(await interpretMerchantContext(input, request));
    }
    if (version !== null) throw new AssistantError("INVALID_MERCHANT_INPUT");
    const input = validateMerchantInput(await readJson(request));
    return json(await interpretMerchant(input, request));
  } catch (error) { return failureResponse(error); }
}
