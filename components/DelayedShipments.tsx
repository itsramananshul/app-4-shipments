"use client";

import type { Shipment } from "@/lib/types";

interface DelayedShipmentsProps {
  shipments: Shipment[];
  busyId: string | null;
  onResume: (shipment: Shipment) => void;
  onViewAll: () => void;
}

export function DelayedShipments({
  shipments,
  busyId,
  onResume,
  onViewAll,
}: DelayedShipmentsProps) {
  const delayed = shipments.filter((s) => s.status === "DELAYED");
  const visible = delayed.slice(0, 6);

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Attention
          </p>
          <h2 className="text-lg font-semibold text-gray-900">
            Delayed Shipments
          </h2>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded"
        >
          View all
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3"
            aria-hidden
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </header>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((s) => {
          const rowBusy = busyId === s.id;
          return (
            <div
              key={s.id}
              className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 transition-colors hover:border-amber-300"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate rounded-md bg-white px-1.5 py-0.5 font-mono text-[10px] text-gray-700 ring-1 ring-inset ring-amber-200">
                  {s.tracking_number}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-rose-700 ring-1 ring-inset ring-rose-600/20">
                  <span className="h-1 w-1 rounded-full bg-rose-500" />
                  Delayed
                </span>
              </div>
              <p
                className="mt-2 truncate text-sm font-medium text-gray-900"
                title={`${s.origin} → ${s.destination}`}
              >
                {s.origin}
                <span className="mx-1 text-gray-400">→</span>
                {s.destination}
              </p>
              <p className="truncate text-xs text-gray-500">
                {s.carrier}
                <span className="mx-1 text-gray-300">·</span>
                {s.customer}
              </p>
              {s.delay_reason ? (
                <p
                  className="mt-2 line-clamp-2 text-xs text-amber-800"
                  title={s.delay_reason}
                >
                  {s.delay_reason}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => onResume(s)}
                disabled={rowBusy}
                className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Resume
              </button>
            </div>
          );
        })}
        {delayed.length === 0 ? (
          <p className="col-span-full py-8 text-center text-sm text-gray-400">
            No delayed shipments.
          </p>
        ) : null}
      </div>
    </section>
  );
}
