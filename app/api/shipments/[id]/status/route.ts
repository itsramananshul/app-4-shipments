import { authenticate } from "@/lib/authenticate";
import {
  errorResponse,
  optionsResponse,
  parseStatusUpdate,
  readJsonBody,
  runMutation,
} from "@/lib/api-helpers";
import { updateStatus } from "@/lib/shipments-store";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const authError = await authenticate(request);
  if (authError) return authError;
  const body = await readJsonBody(request);
  if (body === null) return errorResponse(400, "Invalid JSON body");
  const parsed = parseStatusUpdate(body);
  if (!parsed.ok) return errorResponse(parsed.status, parsed.message);
  return runMutation(() =>
    updateStatus(params.id, parsed.value.status, parsed.value.delayReason),
  );
}

export const OPTIONS = optionsResponse;
