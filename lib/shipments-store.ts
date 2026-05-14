import {
  SHIPMENTS_TABLE,
  getInstanceName,
  getSupabase,
} from "./supabase";
import type { NewShipmentInput, Shipment, ShipmentStatus } from "./types";

export type StoreErrorKind = "not_found" | "db_error" | "validation_error";

export class StoreError extends Error {
  readonly kind: StoreErrorKind;
  constructor(kind: StoreErrorKind, message?: string) {
    super(message ?? kind);
    this.kind = kind;
    this.name = "StoreError";
  }
}

interface DbRow {
  id: string;
  instance_name: string;
  tracking_number: string;
  carrier: string;
  origin: string;
  destination: string;
  customer: string;
  order_ref: string;
  items_count: number;
  weight_kg: number | string;
  status: string;
  estimated_arrival: string;
  actual_arrival: string | null;
  delay_reason: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

function n(value: number | string): number {
  return typeof value === "number" ? value : Number(value);
}

function toShipment(row: DbRow): Shipment {
  return {
    id: row.id,
    instance_name: row.instance_name,
    tracking_number: row.tracking_number,
    carrier: row.carrier,
    origin: row.origin,
    destination: row.destination,
    customer: row.customer,
    order_ref: row.order_ref,
    items_count: row.items_count,
    weight_kg: n(row.weight_kg),
    status: row.status as ShipmentStatus,
    estimated_arrival: row.estimated_arrival,
    actual_arrival: row.actual_arrival,
    delay_reason: row.delay_reason,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function listShipments(): Promise<Shipment[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(SHIPMENTS_TABLE)
    .select("*")
    .eq("instance_name", getInstanceName())
    .order("estimated_arrival", { ascending: true });

  if (error) throw new StoreError("db_error", error.message);
  return ((data as DbRow[] | null) ?? []).map(toShipment);
}

export async function getShipment(id: string): Promise<Shipment | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(SHIPMENTS_TABLE)
    .select("*")
    .eq("instance_name", getInstanceName())
    .eq("id", id)
    .maybeSingle();

  if (error) throw new StoreError("db_error", error.message);
  return data ? toShipment(data as DbRow) : null;
}

export async function shipmentCount(): Promise<number> {
  const supabase = getSupabase();
  const { count, error } = await supabase
    .from(SHIPMENTS_TABLE)
    .select("*", { count: "exact", head: true })
    .eq("instance_name", getInstanceName());

  if (error) throw new StoreError("db_error", error.message);
  return count ?? 0;
}

export async function delayedCount(): Promise<number> {
  const supabase = getSupabase();
  const { count, error } = await supabase
    .from(SHIPMENTS_TABLE)
    .select("*", { count: "exact", head: true })
    .eq("instance_name", getInstanceName())
    .eq("status", "DELAYED");

  if (error) throw new StoreError("db_error", error.message);
  return count ?? 0;
}

interface StatusPatch {
  status: ShipmentStatus;
  delay_reason?: string;
  actual_arrival?: string | null;
}

async function patchById(
  id: string,
  patch: StatusPatch | { notes: string },
): Promise<Shipment> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from(SHIPMENTS_TABLE)
    .update(patch)
    .eq("instance_name", getInstanceName())
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw new StoreError("db_error", error.message);
  if (!data) throw new StoreError("not_found", "Shipment not found");
  return toShipment(data as DbRow);
}

export async function updateStatus(
  id: string,
  status: ShipmentStatus,
  delayReason?: string,
): Promise<Shipment> {
  const patch: StatusPatch = { status };

  if (status === "DELAYED") {
    const reason = delayReason?.trim() ?? "";
    if (reason === "") {
      throw new StoreError(
        "validation_error",
        "delay_reason is required when status is DELAYED.",
      );
    }
    patch.delay_reason = reason;
  } else if (delayReason !== undefined && delayReason.trim() !== "") {
    // Allow an explicit delay_reason update alongside a non-DELAYED status
    // (e.g., recording the resolution).
    patch.delay_reason = delayReason.trim();
  }

  if (status === "DELIVERED") {
    patch.actual_arrival = todayISO();
  }

  return patchById(id, patch);
}

export async function addNote(id: string, note: string): Promise<Shipment> {
  const current = await getShipment(id);
  if (!current) throw new StoreError("not_found", "Shipment not found");
  const stamped = `[${new Date().toISOString()}] ${note.trim()}`;
  const existing = current.notes?.trim() ?? "";
  const merged = existing.length > 0 ? `${existing}\n${stamped}` : stamped;
  return patchById(id, { notes: merged });
}

export async function createShipment(
  data: NewShipmentInput,
): Promise<Shipment> {
  const supabase = getSupabase();
  const row = {
    instance_name: getInstanceName(),
    tracking_number: data.tracking_number,
    carrier: data.carrier,
    origin: data.origin,
    destination: data.destination,
    customer: data.customer,
    order_ref: data.order_ref,
    items_count: data.items_count,
    weight_kg: data.weight_kg,
    status: "PREPARING" as ShipmentStatus,
    estimated_arrival: data.estimated_arrival,
    actual_arrival: null,
    delay_reason: "",
    notes: data.notes,
  };
  const { data: inserted, error } = await supabase
    .from(SHIPMENTS_TABLE)
    .insert(row)
    .select("*")
    .maybeSingle();
  if (error) throw new StoreError("db_error", error.message);
  if (!inserted) throw new StoreError("db_error", "Insert returned no row");
  return toShipment(inserted as DbRow);
}
