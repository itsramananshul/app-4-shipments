"use client";

import type { ShipmentStatus } from "@/lib/types";

const styles: Record<ShipmentStatus, string> = {
  PREPARING: "bg-amber-50 text-amber-700 ring-amber-600/20",
  IN_TRANSIT: "bg-blue-50 text-blue-700 ring-blue-600/20",
  OUT_FOR_DELIVERY: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  DELIVERED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  DELAYED: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

const labels: Record<ShipmentStatus, string> = {
  PREPARING: "Preparing",
  IN_TRANSIT: "In Transit",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  DELAYED: "Delayed",
};

interface StatusBadgeProps {
  status: ShipmentStatus;
  onClick?: () => void;
  title?: string;
}

export function StatusBadge({ status, onClick, title }: StatusBadgeProps) {
  const base = `inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[status]}`;
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${base} cursor-pointer transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400`}
        title={title}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
        {labels[status]}
      </button>
    );
  }
  return (
    <span className={base} title={title}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {labels[status]}
    </span>
  );
}
