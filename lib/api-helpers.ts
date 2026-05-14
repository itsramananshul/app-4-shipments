import { NextResponse } from "next/server";
import { StoreError } from "./shipments-store";
import {
  CARRIERS,
  SHIPMENT_STATUSES,
  type ApiErrorBody,
  type Carrier,
  type MutationSuccessBody,
  type NewShipmentInput,
  type Shipment,
  type ShipmentStatus,
} from "./types";

export function errorResponse(status: number, message: string) {
  return NextResponse.json<ApiErrorBody>(
    { success: false, error: message },
    { status },
  );
}

export function mutationSuccessResponse(shipment: Shipment) {
  return NextResponse.json<MutationSuccessBody>({
    success: true,
    shipment,
  });
}

export function mapStoreError(e: StoreError) {
  switch (e.kind) {
    case "not_found":
      return errorResponse(404, e.message || "Shipment not found");
    case "validation_error":
      return errorResponse(400, e.message || "Validation failed");
    case "db_error":
      return errorResponse(500, e.message || "Database error");
  }
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function runMutation(
  fn: () => Promise<Shipment>,
): Promise<Response> {
  try {
    const shipment = await fn();
    return mutationSuccessResponse(shipment);
  } catch (e) {
    if (e instanceof StoreError) return mapStoreError(e);
    const message = e instanceof Error ? e.message : "Server error";
    return errorResponse(500, message);
  }
}

export type FieldParse<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; message: string };

export interface StatusUpdatePayload {
  status: ShipmentStatus;
  delayReason?: string;
}

export function parseStatusUpdate(
  body: unknown,
): FieldParse<StatusUpdatePayload> {
  if (typeof body !== "object" || body === null) {
    return { ok: false, status: 400, message: "Invalid JSON body" };
  }
  const b = body as { status?: unknown; delayReason?: unknown };
  if (typeof b.status !== "string") {
    return { ok: false, status: 400, message: "status must be a string" };
  }
  if (!SHIPMENT_STATUSES.includes(b.status as ShipmentStatus)) {
    return {
      ok: false,
      status: 400,
      message: `status must be one of: ${SHIPMENT_STATUSES.join(", ")}`,
    };
  }
  const status = b.status as ShipmentStatus;

  let delayReason: string | undefined;
  if (b.delayReason !== undefined) {
    if (typeof b.delayReason !== "string") {
      return {
        ok: false,
        status: 400,
        message: "delayReason must be a string when provided",
      };
    }
    delayReason = b.delayReason;
  }

  if (status === "DELAYED" && (!delayReason || delayReason.trim() === "")) {
    return {
      ok: false,
      status: 400,
      message: "delayReason is required when status is DELAYED.",
    };
  }

  return { ok: true, value: { status, delayReason } };
}

export function parseNote(body: unknown): FieldParse<string> {
  if (typeof body !== "object" || body === null) {
    return { ok: false, status: 400, message: "Invalid JSON body" };
  }
  const value = (body as { note?: unknown }).note;
  if (typeof value !== "string" || value.trim() === "") {
    return {
      ok: false,
      status: 400,
      message: "note must be a non-empty string",
    };
  }
  return { ok: true, value };
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim() !== "";
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseNewShipment(
  body: unknown,
): FieldParse<NewShipmentInput> {
  if (typeof body !== "object" || body === null) {
    return { ok: false, status: 400, message: "Invalid JSON body" };
  }
  const b = body as Record<string, unknown>;

  if (!isNonEmptyString(b.tracking_number)) {
    return { ok: false, status: 400, message: "tracking_number is required" };
  }
  if (
    typeof b.carrier !== "string" ||
    !CARRIERS.includes(b.carrier as Carrier)
  ) {
    return {
      ok: false,
      status: 400,
      message: `carrier must be one of: ${CARRIERS.join(", ")}`,
    };
  }
  if (!isNonEmptyString(b.origin)) {
    return { ok: false, status: 400, message: "origin is required" };
  }
  if (!isNonEmptyString(b.destination)) {
    return { ok: false, status: 400, message: "destination is required" };
  }
  if (!isNonEmptyString(b.customer)) {
    return { ok: false, status: 400, message: "customer is required" };
  }
  if (!isNonEmptyString(b.order_ref)) {
    return { ok: false, status: 400, message: "order_ref is required" };
  }
  if (
    typeof b.items_count !== "number" ||
    !Number.isFinite(b.items_count) ||
    !Number.isInteger(b.items_count) ||
    b.items_count <= 0
  ) {
    return {
      ok: false,
      status: 400,
      message: "items_count must be a positive integer",
    };
  }
  if (
    typeof b.weight_kg !== "number" ||
    !Number.isFinite(b.weight_kg) ||
    b.weight_kg < 0
  ) {
    return {
      ok: false,
      status: 400,
      message: "weight_kg must be a non-negative number",
    };
  }
  if (
    typeof b.estimated_arrival !== "string" ||
    !ISO_DATE_RE.test(b.estimated_arrival)
  ) {
    return {
      ok: false,
      status: 400,
      message: "estimated_arrival must be a date string in YYYY-MM-DD format",
    };
  }
  const notes = typeof b.notes === "string" ? b.notes : "";

  return {
    ok: true,
    value: {
      tracking_number: b.tracking_number,
      carrier: b.carrier,
      origin: b.origin,
      destination: b.destination,
      customer: b.customer,
      order_ref: b.order_ref,
      items_count: b.items_count,
      weight_kg: b.weight_kg,
      estimated_arrival: b.estimated_arrival,
      notes,
    },
  };
}
