import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-helpers";
import { StoreError, getShipment } from "@/lib/shipments-store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
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
