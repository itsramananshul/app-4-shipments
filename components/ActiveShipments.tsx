"use client";

import { useMemo } from "react";
import type { Shipment, ShipmentStatus } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import type { StatusFilter } from "./FilterDropdown";

export type StatusTransition =
  | { kind: "advance"; to: ShipmentStatus; label: string }
  | { kind: "delay" }
  | { kind: "resume" };

interface ActiveShipmentsProps {
  shipments: Shipment[];
  loading: boolean;
  filter: StatusFilter;
  expanded: boolean;
  busyId: string | null;
  onTransition: (shipment: Shipment, transition: StatusTransition) => void;
  onToggleExpand: () => void;
}

const PROGRESS: Record<ShipmentStatus, number> = {
  PREPARING: 20,
  IN_TRANSIT: 60,
  OUT_FOR_DELIVERY: 85,
  DELIVERED: 100,
  DELAYED: 50,
};

function progressColor(status: ShipmentStatus): string {
  return status === "DELAYED" ? "bg-rose-500" : "bg-teal-500";
}

function getTransitions(status: ShipmentStatus): StatusTransition[] {
  switch (status) {
    case "PREPARING":
      return [{ kind: "advance", to: "IN_TRANSIT", label: "Dispatch" }];
    case "IN_TRANSIT":
      return [
        {
          kind: "advance",
          to: "OUT_FOR_DELIVERY",
          label: "Out for delivery",
        },
        { kind: "delay" },
      ];
    case "OUT_FOR_DELIVERY":
      return [{ kind: "advance", to: "DELIVERED", label: "Mark delivered" }];
    case "DELIVERED":
      return [];
    case "DELAYED":
      return [{ kind: "resume" }];
  }
}

const filterLabel: Record<StatusFilter, string> = {
  ALL: "All",
  PREPARING: "Preparing",
  IN_TRANSIT: "In Transit",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  DELAYED: "Delayed",
};

export function ActiveShipments({
  shipments,
  loading,
  filter,
  expanded,
  busyId,
  onTransition,
  onToggleExpand,
}: ActiveShipmentsProps) {
  const filtered = useMemo(() => {
    if (filter === "ALL") return shipments;
    return shipments.filter((s) => s.status === filter);
  }, [shipments, filter]);

  const visible = expanded ? filtered : filtered.slice(0, 6);

  return (
    <section
      id="active-shipments"
      className="h-full rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100"
    >
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Shipments
          </p>
          <h2 className="text-lg font-semibold text-gray-900">
            Active Shipments
          </h2>
          {filter !== "ALL" ? (
            <p className="mt-0.5 text-xs text-gray-400">
              Filtered to{" "}
              <span className="font-medium text-teal-600">
                {filterLabel[filter]}
              </span>
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onToggleExpand}
          className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded"
        >
          {expanded ? "Show less" : "View detail"}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`}
            aria-hidden
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </header>

      {loading && shipments.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-400">
          Loading shipments…
        </div>
      ) : null}

      <ul className="divide-y divide-gray-100">
        {visible.map((s) => {
          const pct = PROGRESS[s.status];
          const transitions = getTransitions(s.status);
          const rowBusy = busyId === s.id;
          return (
            <li key={s.id} className="py-3.5">
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-600">
                      {s.tracking_number}
                    </span>
                    <span className="truncate text-sm font-medium text-gray-900">
                      {s.origin}
                      <span className="mx-1 text-gray-400">→</span>
                      {s.destination}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {s.carrier}
                    <span className="mx-1 text-gray-300">·</span>
                    {s.customer}
                  </p>
                  {s.status === "DELAYED" && s.delay_reason ? (
                    <p className="mt-1 inline-flex max-w-full items-center gap-1 truncate rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                      <span className="h-1 w-1 rounded-full bg-amber-500" />
                      <span className="truncate">{s.delay_reason}</span>
                    </p>
                  ) : null}
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full transition-all ${progressColor(s.status)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-xs tabular-nums text-gray-500">
                      {pct}%
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <StatusBadge status={s.status} />
                  <div className="flex flex-wrap justify-end gap-1">
                    {transitions.length === 0 ? (
                      <span className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                        Done
                      </span>
                    ) : null}
                    {transitions.map((t) => {
                      if (t.kind === "advance") {
                        return (
                          <button
                            key={t.label}
                            type="button"
                            disabled={rowBusy}
                            onClick={() => onTransition(s, t)}
                            className="rounded-md bg-teal-50 px-2 py-1 text-[10px] font-medium text-teal-700 hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {t.label}
                          </button>
                        );
                      }
                      if (t.kind === "delay") {
                        return (
                          <button
                            key="delay"
                            type="button"
                            disabled={rowBusy}
                            onClick={() => onTransition(s, t)}
                            className="rounded-md bg-rose-50 px-2 py-1 text-[10px] font-medium text-rose-700 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Mark delayed
                          </button>
                        );
                      }
                      return (
                        <button
                          key="resume"
                          type="button"
                          disabled={rowBusy}
                          onClick={() => onTransition(s, t)}
                          className="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Resume
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
        {!loading && filtered.length === 0 ? (
          <li className="py-10 text-center text-sm text-gray-400">
            {filter === "ALL"
              ? "No shipments yet."
              : `No shipments match the ${filterLabel[filter]} filter.`}
          </li>
        ) : null}
      </ul>
      {filtered.length > 6 ? (
        <p className="mt-3 text-center text-xs text-gray-400">
          {expanded
            ? `Showing all ${filtered.length}`
            : `Showing 6 of ${filtered.length}`}
        </p>
      ) : null}
    </section>
  );
}
