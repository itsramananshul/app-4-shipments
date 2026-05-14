"use client";

import { useEffect, useState } from "react";
import {
  CARRIERS,
  type Carrier,
  type NewShipmentInput,
} from "@/lib/types";

interface NewShipmentModalProps {
  open: boolean;
  busy?: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onSubmit: (input: NewShipmentInput) => void;
}

interface FormState {
  tracking_number: string;
  carrier: Carrier;
  origin: string;
  destination: string;
  customer: string;
  order_ref: string;
  items_count: string;
  weight_kg: string;
  estimated_arrival: string;
  notes: string;
}

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const emptyForm = (): FormState => ({
  tracking_number: "",
  carrier: CARRIERS[0],
  origin: "",
  destination: "",
  customer: "",
  order_ref: "",
  items_count: "1",
  weight_kg: "0",
  estimated_arrival: todayISO(),
  notes: "",
});

const inputClass =
  "w-full rounded-lg border-0 bg-slate-800 px-3 py-2 text-sm text-slate-100 ring-1 ring-inset ring-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-60";

const labelText = "text-xs font-medium uppercase tracking-wider text-slate-400";

export function NewShipmentModal({
  open,
  busy = false,
  errorMessage,
  onCancel,
  onSubmit,
}: NewShipmentModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(emptyForm());
      setTouched(false);
    }
  }, [open]);

  if (!open) return null;

  const items = Number.parseInt(form.items_count, 10);
  const weight = Number.parseFloat(form.weight_kg);

  const errors: Partial<Record<keyof FormState, string>> = {};
  if (!form.tracking_number.trim()) errors.tracking_number = "Required";
  if (!form.origin.trim()) errors.origin = "Required";
  if (!form.destination.trim()) errors.destination = "Required";
  if (!form.customer.trim()) errors.customer = "Required";
  if (!form.order_ref.trim()) errors.order_ref = "Required";
  if (!Number.isInteger(items) || items <= 0)
    errors.items_count = "Must be a positive integer";
  if (!Number.isFinite(weight) || weight < 0)
    errors.weight_kg = "Must be non-negative";
  if (!form.estimated_arrival) errors.estimated_arrival = "Required";

  const isValid = Object.keys(errors).length === 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div className="w-full max-w-2xl rounded-xl bg-slate-900 p-6 shadow-2xl ring-1 ring-slate-700">
        <h2 className="text-lg font-semibold text-slate-100">
          Create new shipment
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Shipment is scoped to the current instance. New shipments start in
          PREPARING.
        </p>

        <form
          className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (!isValid || busy) return;
            onSubmit({
              tracking_number: form.tracking_number.trim(),
              carrier: form.carrier,
              origin: form.origin.trim(),
              destination: form.destination.trim(),
              customer: form.customer.trim(),
              order_ref: form.order_ref.trim(),
              items_count: items,
              weight_kg: weight,
              estimated_arrival: form.estimated_arrival,
              notes: form.notes.trim(),
            });
          }}
        >
          <label className="block">
            <span className={labelText}>Tracking Number</span>
            <input
              className={inputClass}
              value={form.tracking_number}
              onChange={(e) =>
                setForm((s) => ({ ...s, tracking_number: e.target.value }))
              }
              disabled={busy}
              placeholder="TRK-F1-9999"
            />
            {touched && errors.tracking_number ? (
              <span className="mt-1 block text-xs text-rose-300">
                {errors.tracking_number}
              </span>
            ) : null}
          </label>

          <label className="block">
            <span className={labelText}>Carrier</span>
            <select
              className={inputClass}
              value={form.carrier}
              onChange={(e) =>
                setForm((s) => ({ ...s, carrier: e.target.value as Carrier }))
              }
              disabled={busy}
            >
              {CARRIERS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={labelText}>Origin</span>
            <input
              className={inputClass}
              value={form.origin}
              onChange={(e) =>
                setForm((s) => ({ ...s, origin: e.target.value }))
              }
              disabled={busy}
              placeholder="City, ST"
            />
            {touched && errors.origin ? (
              <span className="mt-1 block text-xs text-rose-300">
                {errors.origin}
              </span>
            ) : null}
          </label>

          <label className="block">
            <span className={labelText}>Destination</span>
            <input
              className={inputClass}
              value={form.destination}
              onChange={(e) =>
                setForm((s) => ({ ...s, destination: e.target.value }))
              }
              disabled={busy}
              placeholder="City, ST"
            />
            {touched && errors.destination ? (
              <span className="mt-1 block text-xs text-rose-300">
                {errors.destination}
              </span>
            ) : null}
          </label>

          <label className="block">
            <span className={labelText}>Customer</span>
            <input
              className={inputClass}
              value={form.customer}
              onChange={(e) =>
                setForm((s) => ({ ...s, customer: e.target.value }))
              }
              disabled={busy}
            />
            {touched && errors.customer ? (
              <span className="mt-1 block text-xs text-rose-300">
                {errors.customer}
              </span>
            ) : null}
          </label>

          <label className="block">
            <span className={labelText}>Order Ref</span>
            <input
              className={inputClass}
              value={form.order_ref}
              onChange={(e) =>
                setForm((s) => ({ ...s, order_ref: e.target.value }))
              }
              disabled={busy}
              placeholder="ORD-F1-001"
            />
            {touched && errors.order_ref ? (
              <span className="mt-1 block text-xs text-rose-300">
                {errors.order_ref}
              </span>
            ) : null}
          </label>

          <label className="block">
            <span className={labelText}>Items Count</span>
            <input
              className={inputClass}
              type="number"
              min={1}
              step={1}
              value={form.items_count}
              onChange={(e) =>
                setForm((s) => ({ ...s, items_count: e.target.value }))
              }
              disabled={busy}
            />
            {touched && errors.items_count ? (
              <span className="mt-1 block text-xs text-rose-300">
                {errors.items_count}
              </span>
            ) : null}
          </label>

          <label className="block">
            <span className={labelText}>Weight (kg)</span>
            <input
              className={inputClass}
              type="number"
              min={0}
              step="0.01"
              value={form.weight_kg}
              onChange={(e) =>
                setForm((s) => ({ ...s, weight_kg: e.target.value }))
              }
              disabled={busy}
            />
            {touched && errors.weight_kg ? (
              <span className="mt-1 block text-xs text-rose-300">
                {errors.weight_kg}
              </span>
            ) : null}
          </label>

          <label className="block sm:col-span-2">
            <span className={labelText}>Estimated Arrival</span>
            <input
              className={inputClass}
              type="date"
              value={form.estimated_arrival}
              onChange={(e) =>
                setForm((s) => ({ ...s, estimated_arrival: e.target.value }))
              }
              disabled={busy}
            />
            {touched && errors.estimated_arrival ? (
              <span className="mt-1 block text-xs text-rose-300">
                {errors.estimated_arrival}
              </span>
            ) : null}
          </label>

          <label className="block sm:col-span-2">
            <span className={labelText}>Notes (optional)</span>
            <textarea
              className={inputClass}
              rows={3}
              value={form.notes}
              onChange={(e) =>
                setForm((s) => ({ ...s, notes: e.target.value }))
              }
              disabled={busy}
            />
          </label>

          {errorMessage ? (
            <p className="sm:col-span-2 rounded-md bg-rose-500/10 px-3 py-2 text-sm text-rose-300 ring-1 ring-inset ring-rose-500/30">
              {errorMessage}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
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
              disabled={busy || (touched && !isValid)}
              className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Creating…" : "Create shipment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
