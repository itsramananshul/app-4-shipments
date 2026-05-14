"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  NewShipmentInput,
  Shipment,
  ShipmentStatus,
} from "@/lib/types";
import {
  ActivityFeed,
  type ActivityAction,
  type ActivityEntry,
} from "./ActivityFeed";
import { ApiKeyManager } from "./ApiKeyManager";
import { ConnectionStatus, type ConnectionState } from "./ConnectionStatus";
import { FilterBar, type StatusFilter } from "./FilterBar";
import { NewShipmentModal } from "./NewShipmentModal";
import { NoteModal } from "./NoteModal";
import { ShipmentsTable, type ShipmentActionKind } from "./ShipmentsTable";
import { StatCard } from "./StatCard";
import { StatusModal } from "./StatusModal";
import { Toast, type ToastState } from "./Toast";

interface DashboardProps {
  instanceName: string;
}

const POLL_INTERVAL_MS = 5000;
const STALE_THRESHOLD_MS = 15000;
const ACTIVITY_MAX = 50;

type ActionModal =
  | { kind: "status"; shipment: Shipment }
  | { kind: "note"; shipment: Shipment }
  | { kind: "new" }
  | null;

function todayLocalISO(now: Date): string {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function newActivityId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function Dashboard({ instanceName }: DashboardProps) {
  const [shipments, setShipments] = useState<Shipment[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [actionModal, setActionModal] = useState<ActionModal>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [lastSuccessAt, setLastSuccessAt] = useState<Date | null>(null);
  const [lastFetchOk, setLastFetchOk] = useState<boolean>(true);
  const [now, setNow] = useState<Date>(new Date());

  const [toast, setToast] = useState<ToastState | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [apiKeysOpen, setApiKeysOpen] = useState(false);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState<string>("");
  const [delayedOnly, setDelayedOnly] = useState<boolean>(false);

  const abortRef = useRef<AbortController | null>(null);

  const fetchShipments = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/shipments", {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const data: Shipment[] = await res.json();
      setShipments(data);
      setLoadError(null);
      setLastFetchOk(true);
      setLastSuccessAt(new Date());
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return;
      setLastFetchOk(false);
      setLoadError(
        err instanceof Error ? err.message : "Failed to load shipments",
      );
    }
  }, []);

  useEffect(() => {
    void fetchShipments();
    const pollId = setInterval(() => {
      void fetchShipments();
    }, POLL_INTERVAL_MS);
    const tickId = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearInterval(pollId);
      clearInterval(tickId);
      abortRef.current?.abort();
    };
  }, [fetchShipments]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  const connectionState: ConnectionState = useMemo(() => {
    if (!lastSuccessAt) return "connecting";
    const age = now.getTime() - lastSuccessAt.getTime();
    if (age > STALE_THRESHOLD_MS) return "stale";
    if (!lastFetchOk) return "reconnecting";
    return "live";
  }, [lastSuccessAt, lastFetchOk, now]);

  const today = useMemo(() => todayLocalISO(now), [now]);

  const stats = useMemo(() => {
    const list = shipments ?? [];
    const totalShipments = list.length;
    const delayed = list.filter((s) => s.status === "DELAYED").length;
    const inTransit = list.filter((s) => s.status === "IN_TRANSIT").length;
    const onTimeDelivered = list.filter(
      (s) =>
        s.status === "DELIVERED" &&
        s.actual_arrival !== null &&
        s.actual_arrival <= s.estimated_arrival,
    ).length;
    return { totalShipments, delayed, inTransit, onTimeDelivered };
  }, [shipments]);

  const filtered = useMemo(() => {
    const list = shipments ?? [];
    const term = search.trim().toLowerCase();
    return list.filter((s) => {
      if (statusFilter !== "ALL" && s.status !== statusFilter) return false;
      if (delayedOnly && s.status !== "DELAYED") return false;
      if (term) {
        const hay =
          `${s.tracking_number} ${s.customer} ${s.order_ref} ${s.carrier} ${s.origin} ${s.destination}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [shipments, statusFilter, search, delayedOnly]);

  const appendActivity = useCallback((entry: ActivityEntry) => {
    setActivity((prev) => [entry, ...prev].slice(0, ACTIVITY_MAX));
  }, []);

  const handleAction = useCallback(
    (shipment: Shipment, action: ShipmentActionKind) => {
      setActionError(null);
      setActionModal({ kind: action, shipment });
    },
    [],
  );

  const handleCloseModal = useCallback(() => {
    if (actionBusy) return;
    setActionModal(null);
    setActionError(null);
  }, [actionBusy]);

  const handleResetFilters = useCallback(() => {
    setStatusFilter("ALL");
    setSearch("");
    setDelayedOnly(false);
  }, []);

  const submitMutation = useCallback(
    async (params: {
      url: string;
      method: "POST" | "PATCH";
      body: unknown;
      action: ActivityAction;
      trackingNumber: string;
      customer: string;
      detail: string;
      successMessage: string;
      failurePrefix: string;
    }) => {
      setActionBusy(true);
      setActionError(null);
      try {
        const res = await fetch(params.url, {
          method: params.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params.body),
        });
        const body = (await res.json().catch(() => null)) as
          | { success?: boolean; error?: string; shipment?: Shipment }
          | null;
        const ok = res.ok && body?.success === true;
        if (!ok) {
          throw new Error(body?.error ?? `Request failed (HTTP ${res.status})`);
        }

        appendActivity({
          id: newActivityId(),
          timestamp: new Date(),
          action: params.action,
          trackingNumber: params.trackingNumber,
          customer: params.customer,
          detail: params.detail,
          result: "success",
        });
        setToast({
          id: Date.now(),
          kind: "success",
          message: params.successMessage,
        });
        setActionModal(null);
        void fetchShipments();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Action failed";
        appendActivity({
          id: newActivityId(),
          timestamp: new Date(),
          action: params.action,
          trackingNumber: params.trackingNumber,
          customer: params.customer,
          detail: params.detail,
          result: "failure",
          message,
        });
        setActionError(message);
        setToast({
          id: Date.now(),
          kind: "error",
          message: `${params.failurePrefix}: ${message}`,
        });
      } finally {
        setActionBusy(false);
      }
    },
    [appendActivity, fetchShipments],
  );

  const handleStatusSubmit = useCallback(
    (newStatus: ShipmentStatus, delayReason?: string) => {
      if (actionModal?.kind !== "status") return;
      const s = actionModal.shipment;
      const body: { status: ShipmentStatus; delayReason?: string } = {
        status: newStatus,
      };
      if (delayReason !== undefined) body.delayReason = delayReason;
      void submitMutation({
        url: `/api/shipments/${s.id}/status`,
        method: "PATCH",
        body,
        action: "status_change",
        trackingNumber: s.tracking_number,
        customer: s.customer,
        detail:
          newStatus === "DELAYED" && delayReason
            ? `${s.status} → ${newStatus} (${delayReason})`
            : `${s.status} → ${newStatus}`,
        successMessage: `${s.tracking_number} → ${newStatus.replace(/_/g, " ")}`,
        failurePrefix: "Status change failed",
      });
    },
    [actionModal, submitMutation],
  );

  const handleNoteSubmit = useCallback(
    (note: string) => {
      if (actionModal?.kind !== "note") return;
      const s = actionModal.shipment;
      void submitMutation({
        url: `/api/shipments/${s.id}/note`,
        method: "POST",
        body: { note },
        action: "note_added",
        trackingNumber: s.tracking_number,
        customer: s.customer,
        detail:
          note.length > 50 ? `note: ${note.slice(0, 50)}…` : `note: ${note}`,
        successMessage: `Note added to ${s.tracking_number}`,
        failurePrefix: "Note failed",
      });
    },
    [actionModal, submitMutation],
  );

  const handleNewShipmentSubmit = useCallback(
    (input: NewShipmentInput) => {
      void submitMutation({
        url: "/api/shipments",
        method: "POST",
        body: input,
        action: "create",
        trackingNumber: input.tracking_number,
        customer: input.customer,
        detail: `${input.carrier} · ${input.items_count} items`,
        successMessage: `Created shipment ${input.tracking_number}`,
        failurePrefix: "Create failed",
      });
    },
    [submitMutation],
  );

  const lastRefreshedAgo = useMemo(() => {
    if (!lastSuccessAt) return null;
    return Math.max(
      0,
      Math.floor((now.getTime() - lastSuccessAt.getTime()) / 1000),
    );
  }, [lastSuccessAt, now]);

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-8">
      <header className="flex flex-col gap-4 border-b border-slate-800 pb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">
              Shipments Tracker
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-slate-50">
              {instanceName}{" "}
              <span className="text-slate-500">— Shipments Tracker</span>
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Standalone shipments instance. Auto-refreshes every 5 seconds.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-2 rounded-full bg-slate-800/80 px-3 py-1 text-xs font-medium text-slate-300 ring-1 ring-inset ring-slate-700"
              title="Set via INSTANCE_NAME env var. Read-only in the UI."
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5 text-slate-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V8a4 4 0 1 1 8 0v3" />
              </svg>
              Current Instance: {instanceName}
            </span>
            <ConnectionStatus state={connectionState} />
            <button
              type="button"
              onClick={() => setApiKeysOpen(true)}
              className="inline-flex items-center gap-1 rounded-full bg-slate-800/80 px-3 py-1 text-xs font-medium text-slate-200 ring-1 ring-inset ring-slate-700 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
            >
              <span aria-hidden>🔑</span> API Keys
            </button>
            <button
              type="button"
              onClick={() => {
                setActionError(null);
                setActionModal({ kind: "new" });
              }}
              className="inline-flex items-center gap-1 rounded-full bg-teal-500 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-teal-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
            >
              + New shipment
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span>
            <span className="text-slate-500">Last refreshed:</span>{" "}
            <span className="text-slate-300 tabular-nums">
              {lastSuccessAt ? lastSuccessAt.toLocaleTimeString() : "—"}
            </span>
            {lastRefreshedAgo !== null ? (
              <span className="ml-1 text-slate-500">
                ({lastRefreshedAgo}s ago)
              </span>
            ) : null}
          </span>
          <span className="text-slate-700">·</span>
          <span>
            Polling every {Math.round(POLL_INTERVAL_MS / 1000)} s · stale after{" "}
            {Math.round(STALE_THRESHOLD_MS / 1000)} s
          </span>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Shipments" value={stats.totalShipments} />
        <StatCard
          label="Delayed"
          value={stats.delayed}
          tone={stats.delayed > 0 ? "danger" : "default"}
          hint={
            stats.delayed > 0
              ? "Health is degraded while > 0"
              : "Nothing delayed"
          }
        />
        <StatCard
          label="In Transit"
          value={stats.inTransit}
          tone="info"
          hint="Currently moving"
        />
        <StatCard
          label="On-Time Delivered"
          value={stats.onTimeDelivered}
          tone="success"
          hint="Delivered ≤ estimated arrival"
        />
      </section>

      {loadError ? (
        <div className="mt-6 rounded-md bg-rose-500/10 px-4 py-3 text-sm text-rose-300 ring-1 ring-inset ring-rose-500/30">
          Failed to load shipments: {loadError}
        </div>
      ) : null}

      <section className="mt-6">
        <FilterBar
          statusFilter={statusFilter}
          search={search}
          delayedOnly={delayedOnly}
          onStatusChange={setStatusFilter}
          onSearchChange={setSearch}
          onDelayedChange={setDelayedOnly}
          resultCount={filtered.length}
          totalCount={shipments?.length ?? 0}
          onReset={handleResetFilters}
        />
      </section>

      <section className="mt-4">
        {shipments === null && !loadError ? (
          <div className="rounded-xl bg-slate-900/40 px-4 py-12 text-center text-sm text-slate-500 ring-1 ring-slate-800">
            Loading shipments…
          </div>
        ) : (
          <ShipmentsTable
            shipments={filtered}
            today={today}
            onAction={handleAction}
          />
        )}
      </section>

      <section className="mt-6">
        <ActivityFeed entries={activity} />
      </section>

      <StatusModal
        open={actionModal?.kind === "status"}
        trackingNumber={
          actionModal?.kind === "status"
            ? actionModal.shipment.tracking_number
            : ""
        }
        currentStatus={
          actionModal?.kind === "status"
            ? actionModal.shipment.status
            : "PREPARING"
        }
        currentDelayReason={
          actionModal?.kind === "status"
            ? actionModal.shipment.delay_reason
            : ""
        }
        busy={actionBusy}
        errorMessage={actionError}
        onCancel={handleCloseModal}
        onSubmit={handleStatusSubmit}
      />

      <NoteModal
        open={actionModal?.kind === "note"}
        trackingNumber={
          actionModal?.kind === "note"
            ? actionModal.shipment.tracking_number
            : ""
        }
        existingNotes={
          actionModal?.kind === "note" ? actionModal.shipment.notes : ""
        }
        busy={actionBusy}
        errorMessage={actionError}
        onCancel={handleCloseModal}
        onSubmit={handleNoteSubmit}
      />

      <NewShipmentModal
        open={actionModal?.kind === "new"}
        busy={actionBusy}
        errorMessage={actionError}
        onCancel={handleCloseModal}
        onSubmit={handleNewShipmentSubmit}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />

      <ApiKeyManager
        open={apiKeysOpen}
        onClose={() => setApiKeysOpen(false)}
      />
    </main>
  );
}
