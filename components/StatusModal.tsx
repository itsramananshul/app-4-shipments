"use client";

import { useEffect, useState } from "react";
import { SHIPMENT_STATUSES, type ShipmentStatus } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

interface StatusModalProps {
  open: boolean;
  trackingNumber: string;
  currentStatus: ShipmentStatus;
  currentDelayReason: string;
  busy?: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onSubmit: (status: ShipmentStatus, delayReason?: string) => void;
}

export function StatusModal({
  open,
  trackingNumber,
  currentStatus,
  currentDelayReason,
  busy = false,
  errorMessage,
  onCancel,
  onSubmit,
}: StatusModalProps) {
  const [selected, setSelected] = useState<ShipmentStatus>(currentStatus);
  const [delayReason, setDelayReason] = useState<string>(currentDelayReason);

  useEffect(() => {
    if (open) {
      setSelected(currentStatus);
      setDelayReason(currentDelayReason);
    }
  }, [open, currentStatus, currentDelayReason, trackingNumber]);

  if (!open) return null;

  const reasonTrimmed = delayReason.trim();
  const reasonRequired = selected === "DELAYED";
  const reasonValid = !reasonRequired || reasonTrimmed.length > 0;
  const unchanged =
    selected === currentStatus && reasonTrimmed === currentDelayReason.trim();
  const canSubmit = !busy && reasonValid && !unchanged;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-xl bg-slate-900 p-6 shadow-2xl ring-1 ring-slate-700">
        <h2 className="text-lg font-semibold text-slate-100">Update status</h2>
        <p className="mt-1 text-sm text-slate-400">
          Shipment{" "}
          <span className="font-mono text-slate-300">{trackingNumber}</span>
        </p>

        <div className="mt-4 flex items-center gap-2 rounded-md bg-slate-800/60 px-3 py-2 ring-1 ring-inset ring-slate-700">
          <span className="text-xs text-slate-400">Current:</span>
          <StatusBadge status={currentStatus} />
          {currentDelayReason ? (
            <span className="ml-2 truncate text-xs text-rose-300/80">
              · {currentDelayReason}
            </span>
          ) : null}
        </div>

        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSubmit) return;
            onSubmit(
              selected,
              reasonTrimmed.length > 0 ? reasonTrimmed : undefined,
            );
          }}
        >
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
              New status
            </span>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value as ShipmentStatus)}
              disabled={busy}
              className="mt-2 w-full rounded-lg border-0 bg-slate-800 px-3 py-2 text-slate-100 ring-1 ring-inset ring-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-60"
            >
              {SHIPMENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>

          {reasonRequired ? (
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Delay reason <span className="text-rose-400">*</span>
              </span>
              <input
                type="text"
                value={delayReason}
                onChange={(e) => setDelayReason(e.target.value)}
                disabled={busy}
                placeholder="e.g. Carrier capacity shortage"
                className="mt-2 w-full rounded-lg border-0 bg-slate-800 px-3 py-2 text-slate-100 ring-1 ring-inset ring-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-60"
              />
              <span className="mt-1 block text-[11px] text-slate-500">
                Required when status is DELAYED.
              </span>
            </label>
          ) : null}

          {selected === "DELIVERED" ? (
            <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
              actual_arrival will be set to today on the server.
            </p>
          ) : null}

          {errorMessage ? (
            <p className="rounded-md bg-rose-500/10 px-3 py-2 text-sm text-rose-300 ring-1 ring-inset ring-rose-500/30">
              {errorMessage}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Saving…" : "Update status"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
