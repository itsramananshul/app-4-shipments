export type ShipmentStatus =
  | "PREPARING"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "DELAYED";

export interface Shipment {
  id: string;
  instance_name: string;
  tracking_number: string;
  carrier: string;
  origin: string;
  destination: string;
  customer: string;
  order_ref: string;
  items_count: number;
  weight_kg: number;
  status: ShipmentStatus;
  estimated_arrival: string;
  actual_arrival: string | null;
  delay_reason: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface StatusResponse {
  instanceName: string;
  type: "shipments";
  shipmentCount: number;
  delayedCount: number;
  health: "ok" | "degraded";
  timestamp: string;
}

export interface ApiErrorBody {
  success: false;
  error: string;
}

export interface MutationSuccessBody {
  success: true;
  shipment: Shipment;
}

export const SHIPMENT_STATUSES: readonly ShipmentStatus[] = [
  "PREPARING",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "DELAYED",
];

export const CARRIERS = [
  "FedEx Freight",
  "UPS Supply Chain",
  "DHL Industrial",
  "XPO Logistics",
  "J.B. Hunt",
] as const;

export type Carrier = (typeof CARRIERS)[number];

export type NewShipmentInput = Omit<
  Shipment,
  | "id"
  | "instance_name"
  | "actual_arrival"
  | "delay_reason"
  | "status"
  | "created_at"
  | "updated_at"
>;
