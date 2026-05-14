import { NextResponse } from "next/server";
import { authenticate } from "@/lib/authenticate";
import { errorResponse } from "@/lib/api-helpers";
import { StoreError, getShipment } from "@/lib/shipments-store";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
) {
  const authError = await authenticate(request);
  if (authError) return authError;
  try {
    const shipment = await getShipment(params.id);
    if (!shipment) return errorResponse(404, "Shipment not found");
    return NextResponse.json(shipment);
  } catch (e) {
    if (e instanceof StoreError) {
      return errorResponse(500, e.message || "Failed to load shipment");
    }
    return errorResponse(
      500,
      e instanceof Error ? e.message : "Failed to load shipment",
    );
  }
}
