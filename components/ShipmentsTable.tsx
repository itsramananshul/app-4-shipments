"use client";

import type { Shipment } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

export type ShipmentActionKind = "status" | "note";

interface ShipmentsTableProps {
  shipments: Shipment[];
  today: string;
  onAction: (shipment: Shipment, action: ShipmentActionKind) => void;
}

function isOverdue(shipment: Shipment, today: string): boolean {
  return (
    shipment.estimated_arrival < today && shipment.status !== "DELIVERED"
  );
}

function formatNumber(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatWeight(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function ShipmentsTable({
  shipments,
  today,
  onAction,
}: ShipmentsTableProps) {
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-slate-800 bg-slate-900/40">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th scope="col" className="px-3 py-3 text-left font-medium">Tracking #</th>
              <th scope="col" className="px-3 py-3 text-left font-medium">Carrier</th>
              <th scope="col" className="px-3 py-3 text-left font-medium">Customer</th>
              <th scope="col" className="px-3 py-3 text-left font-medium">Order Ref</th>
              <th scope="col" className="px-3 py-3 text-left font-medium">Origin → Destination</th>
              <th scope="col" className="px-3 py-3 text-right font-medium">Items</th>
              <th scope="col" className="px-3 py-3 text-right font-medium">Weight (kg)</th>
              <th scope="col" className="px-3 py-3 text-left font-medium">Status</th>
              <th scope="col" className="px-3 py-3 text-left font-medium">Est. Arrival</th>
              <th scope="col" className="px-3 py-3 text-left font-medium">Delay Reason</th>
              <th scope="col" className="px-3 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {shipments.map((s) => {
              const overdue = isOverdue(s, today);
              return (
                <tr
                  key={s.id}
                  className={`transition-colors ${
                    s.status === "DELAYED"
                      ? "bg-rose-500/5 hover:bg-rose-500/10"
                      : s.status === "DELIVERED"
                        ? "bg-emerald-500/5 hover:bg-emerald-500/10"
                        : overdue
                          ? "bg-amber-500/5 hover:bg-amber-500/10"
                          : "hover:bg-slate-800/40"
                  }`}
                >
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-slate-300">
                    {s.tracking_number}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-300">
                    {s.carrier}
                  </td>
                  <td className="px-3 py-3 text-slate-200">{s.customer}</td>
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-slate-400">
                    {s.order_ref}
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-300">
                    <span className="text-slate-400">{s.origin}</span>
                    <span className="mx-1 text-slate-600">→</span>
                    <span className="text-slate-100">{s.destination}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-slate-300">
                    {formatNumber(s.items_count)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-slate-300">
                    {formatWeight(s.weight_kg)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <StatusBadge status={s.status} />
                  </td>
                  <td
                    className={`whitespace-nowrap px-3 py-3 tabular-nums ${
                      overdue
                        ? "text-rose-300 font-semibold"
                        : s.status === "DELIVERED"
                          ? "text-emerald-300"
                          : "text-slate-300"
                    }`}
                    title={overdue ? "Past estimated arrival" : undefined}
                  >
                    {s.estimated_arrival}
                    {s.actual_arrival ? (
                      <div className="text-[10px] uppercase tracking-wider text-emerald-300/80">
                        actual {s.actual_arrival}
                      </div>
                    ) : overdue ? (
                      <span className="ml-1 text-[10px] uppercase tracking-wider">
                        · overdue
                      </span>
                    ) : null}
                  </td>
                  <td
                    className="max-w-[260px] truncate px-3 py-3 text-xs text-slate-400"
                    title={s.delay_reason || undefined}
                  >
                    {s.delay_reason ? (
                      <span className="text-rose-300/80">{s.delay_reason}</span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        type="button"
                        onClick={() => onAction(s, "status")}
                        className="rounded-md bg-sky-500/10 px-2 py-1 text-xs font-medium text-sky-300 ring-1 ring-inset ring-sky-500/30 hover:bg-sky-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                      >
                        Status
                      </button>
                      <button
                        type="button"
                        onClick={() => onAction(s, "note")}
                        className="rounded-md bg-slate-700/30 px-2 py-1 text-xs font-medium text-slate-200 ring-1 ring-inset ring-slate-600/50 hover:bg-slate-700/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                      >
                        Note
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {shipments.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
                  className="px-4 py-12 text-center text-sm text-slate-500"
                >
                  No shipments match the current filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
