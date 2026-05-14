import type { ShipmentStatus } from "@/lib/types";

const styles: Record<ShipmentStatus, string> = {
  PREPARING: "bg-slate-500/15 text-slate-300 ring-slate-500/30",
  IN_TRANSIT: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  OUT_FOR_DELIVERY: "bg-violet-500/15 text-violet-300 ring-violet-500/30",
  DELIVERED: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  DELAYED: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
};

const labels: Record<ShipmentStatus, string> = {
  PREPARING: "PREPARING",
  IN_TRANSIT: "IN TRANSIT",
  OUT_FOR_DELIVERY: "OUT FOR DELIVERY",
  DELIVERED: "DELIVERED",
  DELAYED: "DELAYED",
};

export function StatusBadge({ status }: { status: ShipmentStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${styles[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {labels[status]}
    </span>
  );
}
