import { NextResponse } from "next/server";
import { authenticate } from "@/lib/authenticate";
import {
  CORS_HEADERS,
  errorResponse,
  optionsResponse,
  parseNewShipment,
  readJsonBody,
  runMutation,
} from "@/lib/api-helpers";
import {
  StoreError,
  createShipment,
  listShipments,
} from "@/lib/shipments-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authError = await authenticate(request);
  if (authError) return authError;
  try {
    const shipments = await listShipments();
    return NextResponse.json(shipments, { headers: CORS_HEADERS });
  } catch (e) {
    if (e instanceof StoreError) {
      return errorResponse(500, e.message || "Failed to load shipments");
    }
    return errorResponse(
      500,
      e instanceof Error ? e.message : "Failed to load shipments",
    );
  }
}

export async function POST(request: Request) {
  const authError = await authenticate(request);
  if (authError) return authError;
  const body = await readJsonBody(request);
  if (body === null) return errorResponse(400, "Invalid JSON body");
  const parsed = parseNewShipment(body);
  if (!parsed.ok) return errorResponse(parsed.status, parsed.message);
  return runMutation(() => createShipment(parsed.value));
}

export const OPTIONS = optionsResponse;
