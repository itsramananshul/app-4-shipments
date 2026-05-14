import { NextResponse } from "next/server";
import { authenticate } from "@/lib/authenticate";
import {
  CORS_HEADERS,
  errorResponse,
  optionsResponse,
} from "@/lib/api-helpers";
import {
  StoreError,
  delayedCount,
  shipmentCount,
} from "@/lib/shipments-store";
import type { StatusResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authError = await authenticate(request);
  if (authError) return authError;
  try {
    const [count, delayed] = await Promise.all([
      shipmentCount(),
      delayedCount(),
    ]);
    const payload: StatusResponse = {
      instanceName: process.env.INSTANCE_NAME?.trim() ?? "Unknown Instance",
      type: "shipments",
      shipmentCount: count,
      delayedCount: delayed,
      health: delayed > 0 ? "degraded" : "ok",
      timestamp: new Date().toISOString(),
    };
    return NextResponse.json(payload, { headers: CORS_HEADERS });
  } catch (e) {
    if (e instanceof StoreError) {
      return errorResponse(500, e.message || "Status check failed");
    }
    return errorResponse(
      500,
      e instanceof Error ? e.message : "Status check failed",
    );
  }
}

export const OPTIONS = optionsResponse;
