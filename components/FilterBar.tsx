"use client";

import { SHIPMENT_STATUSES, type ShipmentStatus } from "@/lib/types";

export type StatusFilter = ShipmentStatus | "ALL";

interface FilterBarProps {
  statusFilter: StatusFilter;
  search: string;
  delayedOnly: boolean;
  onStatusChange: (value: StatusFilter) => void;
  onSearchChange: (value: string) => void;
  onDelayedChange: (value: boolean) => void;
  resultCount: number;
  totalCount: number;
  onReset: () => void;
}

const selectClass =
  "rounded-md border-0 bg-slate-800 px-2.5 py-1.5 text-sm text-slate-100 ring-1 ring-inset ring-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500";

export function FilterBar({
  statusFilter,
  search,
  delayedOnly,
  onStatusChange,
  onSearchChange,
  onDelayedChange,
  resultCount,
  totalCount,
  onReset,
}: FilterBarProps) {
  const hasFilters =
    statusFilter !== "ALL" || search.trim() !== "" || delayedOnly;

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl bg-slate-900/40 p-3 ring-1 ring-slate-800">
      <label className="flex flex-col text-xs text-slate-400">
        <span className="mb-1 font-medium uppercase tracking-wider">
          Status
        </span>
        <select
          className={selectClass}
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value as StatusFilter)}
        >
          <option value="ALL">All statuses</option>
          {SHIPMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-1 min-w-[240px] flex-col text-xs text-slate-400">
        <span className="mb-1 font-medium uppercase tracking-wider">
          Search
        </span>
        <input
          type="text"
          placeholder="Tracking #, customer, order ref, or carrier"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`${selectClass} w-full`}
        />
      </label>

      <label className="flex items-center gap-2 self-end pb-1.5 text-xs text-slate-300">
        <input
          type="checkbox"
          checked={delayedOnly}
          onChange={(e) => onDelayedChange(e.target.checked)}
          className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-rose-500 focus:ring-rose-500"
        />
        Delayed only
      </label>

      <div className="ml-auto flex items-center gap-3 self-end pb-1 text-xs text-slate-400">
        <span className="tabular-nums">
          Showing <span className="text-slate-200">{resultCount}</span> of{" "}
          {totalCount}
        </span>
        {hasFilters ? (
          <button
            type="button"
            onClick={onReset}
            className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300 ring-1 ring-inset ring-slate-700 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
          >
            Clear filters
          </button>
        ) : null}
      </div>
    </div>
  );
}
