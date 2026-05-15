"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  NewShipmentInput,
  Shipment,
  ShipmentStatus,
} from "@/lib/types";
import { ActiveShipments, type StatusTransition } from "./ActiveShipments";
import { ActivityFeed, type ActivityEntry } from "./ActivityFeed";
import { ApiKeyManager } from "./ApiKeyManager";
import { DelayedShipments } from "./DelayedShipments";
import { DonutChart } from "./DonutChart";
import { FilterDropdown, type StatusFilter } from "./FilterDropdown";
import { MetricCard } from "./MetricCard";
import { NewShipmentModal } from "./NewShipmentModal";
import { Toast, type ToastState } from "./Toast";
import { TopNav, type NavView } from "./TopNav";

interface DashboardProps {
  instanceName: string;
}

const POLL_INTERVAL_MS = 5000;
const ACTIVITY_MAX = 50;

function newActivityId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const STATUS_LABEL: Record<ShipmentStatus, string> = {
  PREPARING: "Preparing",
  IN_TRANSIT: "In Transit",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  DELAYED: "Delayed",
};


function scrollToShipments() {
  const el = document.getElementById("active-shipments");
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function Dashboard({ instanceName }: DashboardProps) {
  const [shipments, setShipments] = useState<Shipment[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [view, setView] = useState<NavView>("dashboard");
  const [filter, setFilter] = useState<StatusFilter>("ALL");
  const [expanded, setExpanded] = useState(false);

  const [newOpen, setNewOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);

  const [toast, setToast] = useState<ToastState | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [apiKeysOpen, setApiKeysOpen] = useState(false);

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
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return;
      setLoadError(
        err instanceof Error ? err.message : "Failed to load shipments",
      );
    }
  }, []);

  useEffect(() => {
    void fetchShipments();
    const id = setInterval(() => {
      void fetchShipments();
    }, POLL_INTERVAL_MS);
    return () => {
      clearInterval(id);
      abortRef.current?.abort();
    };
  }, [fetchShipments]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  const stats = useMemo(() => {
    const list = shipments ?? [];
    const total = list.length;
    const preparing = list.filter((s) => s.status === "PREPARING").length;
    const inTransitOnly = list.filter((s) => s.status === "IN_TRANSIT").length;
    const outForDelivery = list.filter(
      (s) => s.status === "OUT_FOR_DELIVERY",
    ).length;
    const delivered = list.filter((s) => s.status === "DELIVERED").length;
    const delayed = list.filter((s) => s.status === "DELAYED").length;
    const inTransitCombined = inTransitOnly + outForDelivery;
    return {
      total,
      preparing,
      inTransitOnly,
      outForDelivery,
      delivered,
      delayed,
      inTransitCombined,
    };
  }, [shipments]);

  const filterCounts: Record<StatusFilter, number> = useMemo(
    () => ({
      ALL: stats.total,
      PREPARING: stats.preparing,
      IN_TRANSIT: stats.inTransitOnly,
      OUT_FOR_DELIVERY: stats.outForDelivery,
      DELIVERED: stats.delivered,
      DELAYED: stats.delayed,
    }),
    [stats],
  );

  const appendActivity = useCallback((entry: ActivityEntry) => {
    setActivity((prev) => [entry, ...prev].slice(0, ACTIVITY_MAX));
  }, []);

  const showToast = useCallback(
    (kind: "success" | "error", message: string) => {
      setToast({ id: Date.now(), kind, message });
    },
    [],
  );

  const performStatusChange = useCallback(
    async (
      shipment: Shipment,
      nextStatus: ShipmentStatus,
      delayReason?: string,
    ) => {
      setBusyId(shipment.id);
      try {
        const body: { status: ShipmentStatus; delayReason?: string } = {
          status: nextStatus,
        };
        if (delayReason !== undefined) body.delayReason = delayReason;

        const res = await fetch(`/api/shipments/${shipment.id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json().catch(() => null)) as
          | { success?: boolean; error?: string; shipment?: Shipment }
          | null;
        const ok = res.ok && data?.success === true;
        if (!ok) {
          throw new Error(data?.error ?? `Request failed (HTTP ${res.status})`);
        }
        const activityAction =
          nextStatus === "DELAYED" ? "delayed" : "status_change";
        appendActivity({
          id: newActivityId(),
          timestamp: new Date(),
          action: activityAction,
          trackingNumber: shipment.tracking_number,
          customer: shipment.customer,
          detail:
            nextStatus === "DELAYED" && delayReason
              ? `${STATUS_LABEL[shipment.status]} → ${STATUS_LABEL[nextStatus]} (${delayReason})`
              : `${STATUS_LABEL[shipment.status]} → ${STATUS_LABEL[nextStatus]}`,
          result: "success",
        });
        showToast(
          "success",
          `${shipment.tracking_number} → ${STATUS_LABEL[nextStatus]}`,
        );
        void fetchShipments();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Action failed";
        appendActivity({
          id: newActivityId(),
          timestamp: new Date(),
          action:
            nextStatus === "DELAYED" ? "delayed" : "status_change",
          trackingNumber: shipment.tracking_number,
          customer: shipment.customer,
          detail: `${STATUS_LABEL[shipment.status]} → ${STATUS_LABEL[nextStatus]}`,
          result: "failure",
          message,
        });
        showToast("error", `Status change failed: ${message}`);
      } finally {
        setBusyId(null);
      }
    },
    [appendActivity, fetchShipments, showToast],
  );

  const handleTransition = useCallback(
    (shipment: Shipment, transition: StatusTransition) => {
      if (busyId) return;
      if (transition.kind === "advance") {
        void performStatusChange(shipment, transition.to);
        return;
      }
      if (transition.kind === "delay") {
        const reason =
          typeof window !== "undefined"
            ? window.prompt(
                `Reason for delaying ${shipment.tracking_number}?`,
                shipment.delay_reason || "",
              )
            : null;
        if (reason === null) return;
        const trimmed = reason.trim();
        if (!trimmed) {
          showToast("error", "A delay reason is required.");
          return;
        }
        void performStatusChange(shipment, "DELAYED", trimmed);
        return;
      }
      // resume
      void performStatusChange(shipment, "IN_TRANSIT");
    },
    [busyId, performStatusChange, showToast],
  );

  const handleResume = useCallback(
    (shipment: Shipment) => {
      handleTransition(shipment, { kind: "resume" });
    },
    [handleTransition],
  );

  const handleNewShipmentSubmit = useCallback(
    async (input: NewShipmentInput) => {
      setCreateBusy(true);
      setCreateError(null);
      try {
        const res = await fetch("/api/shipments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const data = (await res.json().catch(() => null)) as
          | { success?: boolean; error?: string; shipment?: Shipment }
          | null;
        const ok = res.ok && data?.success === true;
        if (!ok) {
          throw new Error(data?.error ?? `Request failed (HTTP ${res.status})`);
        }
        appendActivity({
          id: newActivityId(),
          timestamp: new Date(),
          action: "created",
          trackingNumber: input.tracking_number,
          customer: input.customer,
          detail: `${input.carrier} · ${input.items_count} items`,
          result: "success",
        });
        showToast("success", `Created shipment ${input.tracking_number}`);
        setNewOpen(false);
        void fetchShipments();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Create failed";
        appendActivity({
          id: newActivityId(),
          timestamp: new Date(),
          action: "created",
          trackingNumber: input.tracking_number,
          customer: input.customer,
          detail: `${input.carrier} · ${input.items_count} items`,
          result: "failure",
          message,
        });
        setCreateError(message);
        showToast("error", `Create failed: ${message}`);
      } finally {
        setCreateBusy(false);
      }
    },
    [appendActivity, fetchShipments, showToast],
  );

  const handleViewDelayed = useCallback(() => {
    setFilter("DELAYED");
    setExpanded(true);
    setTimeout(scrollToShipments, 50);
  }, []);

  const handleViewInTransit = useCallback(() => {
    setFilter("IN_TRANSIT");
    setExpanded(true);
    setTimeout(scrollToShipments, 50);
  }, []);

  const handleViewDelivered = useCallback(() => {
    setFilter("DELIVERED");
    setExpanded(true);
    setTimeout(scrollToShipments, 50);
  }, []);

  const handleViewAll = useCallback(() => {
    setFilter("ALL");
    setExpanded(true);
    setTimeout(scrollToShipments, 50);
  }, []);

  return (
    <div>
      <TopNav
        instanceName={instanceName}
        currentView={view}
        onChangeView={(v) => {
          setView(v);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onOpenApiKeys={() => setApiKeysOpen(true)}
      />

      <main className="mx-auto max-w-7xl px-6 py-6">
        {view === "shipments" ? (
          <ShipmentsListView
            shipments={shipments}
            onTransition={handleTransition}
            busyId={busyId}
          />
        ) : view === "carriers" ? (
          <CarriersView shipments={shipments} />
        ) : view === "routes" ? (
          <RoutesView shipments={shipments} />
        ) : view === "reports" ? (
          <ReportsView shipments={shipments} />
        ) : (
          <>
            <div className="mb-6 flex items-end justify-between gap-3">
              <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Overview
                </p>
                <h1 className="text-2xl font-bold text-gray-900">
                  {instanceName} Dashboard
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <FilterDropdown
                  value={filter}
                  counts={filterCounts}
                  onChange={setFilter}
                />
                <button
                  type="button"
                  onClick={() => {
                    setCreateError(null);
                    setNewOpen(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-teal-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5"
                    aria-hidden
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  New shipment
                </button>
              </div>
            </div>

            {loadError ? (
              <div className="mb-6 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">
                Failed to load shipments: {loadError}
              </div>
            ) : null}

            <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Total Shipments"
                value={stats.total}
                onViewDetail={handleViewAll}
              />
              <MetricCard
                label="In Transit"
                value={stats.inTransitCombined}
                hint="Includes out for delivery"
                onViewDetail={handleViewInTransit}
              />
              <MetricCard
                label="Delivered"
                value={stats.delivered}
                hint={
                  stats.delivered > 0 ? "Completed" : "Nothing delivered yet"
                }
                onViewDetail={handleViewDelivered}
              />
              <MetricCard
                label="Delayed"
                value={stats.delayed}
                hint={
                  stats.delayed > 0 ? "Needs attention" : "All on schedule"
                }
                onViewDetail={handleViewDelayed}
              />
            </section>

            <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <ActiveShipments
                  shipments={shipments ?? []}
                  loading={shipments === null}
                  filter={filter}
                  expanded={expanded}
                  busyId={busyId}
                  onTransition={handleTransition}
                  onToggleExpand={() => setExpanded((v) => !v)}
                />
              </div>
              <div className="flex flex-col gap-4 lg:col-span-2">
                <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                  <header className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Distribution
                      </p>
                      <h2 className="text-lg font-semibold text-gray-900">
                        Status Breakdown
                      </h2>
                    </div>
                  </header>
                  <DonutChart
                    total={stats.total}
                    centerLabel="Shipments"
                    slices={[
                      {
                        label: "Preparing",
                        value: stats.preparing,
                        hex: "#f59e0b",
                      },
                      {
                        label: "In Transit",
                        value: stats.inTransitOnly,
                        hex: "#3b82f6",
                      },
                      {
                        label: "Out for Delivery",
                        value: stats.outForDelivery,
                        hex: "#6366f1",
                      },
                      {
                        label: "Delivered",
                        value: stats.delivered,
                        hex: "#10b981",
                      },
                      {
                        label: "Delayed",
                        value: stats.delayed,
                        hex: "#ef4444",
                      },
                    ].filter((s) => s.value > 0)}
                  />
                </section>
                <ActivityFeed entries={activity} />
              </div>
            </section>

            <section className="mb-6">
              <DelayedShipments
                shipments={shipments ?? []}
                busyId={busyId}
                onResume={handleResume}
                onViewAll={handleViewDelayed}
              />
            </section>
          </>
        )}
      </main>

      <NewShipmentModal
        open={newOpen}
        busy={createBusy}
        errorMessage={createError}
        onCancel={() => {
          if (createBusy) return;
          setNewOpen(false);
          setCreateError(null);
        }}
        onSubmit={handleNewShipmentSubmit}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />

      <ApiKeyManager
        open={apiKeysOpen}
        onClose={() => setApiKeysOpen(false)}
      />
    </div>
  );
}

// ─── Derived views ────────────────────────────────────────────────────────

const STATUS_DOT_HEX: Record<ShipmentStatus, string> = {
  PREPARING: "#94a3b8",
  IN_TRANSIT: "#3b82f6",
  OUT_FOR_DELIVERY: "#6366f1",
  DELIVERED: "#10b981",
  DELAYED: "#ef4444",
};

function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-3">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          {subtitle ?? title}
        </p>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      </div>
      {right}
    </div>
  );
}

function ShipmentsListView({
  shipments,
  onTransition,
  busyId,
}: {
  shipments: Shipment[] | null;
  onTransition: (s: Shipment, t: StatusTransition) => void;
  busyId: string | null;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | ShipmentStatus>("ALL");
  const list = shipments ?? [];
  const q = search.trim().toLowerCase();
  const filtered = list.filter((s) => {
    if (statusFilter !== "ALL" && s.status !== statusFilter) return false;
    if (!q) return true;
    return (
      s.tracking_number.toLowerCase().includes(q) ||
      s.customer.toLowerCase().includes(q) ||
      s.carrier.toLowerCase().includes(q) ||
      s.origin.toLowerCase().includes(q) ||
      s.destination.toLowerCase().includes(q)
    );
  });
  return (
    <>
      <PageHeader
        title="All Shipments"
        subtitle="Shipments"
        right={
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "ALL" | ShipmentStatus)
              }
              className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700"
            >
              <option value="ALL">All statuses</option>
              {(["PREPARING", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "DELAYED"] as ShipmentStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
            <input
              type="search"
              placeholder="Search tracking, customer, carrier…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-800 placeholder:text-gray-400"
            />
          </div>
        }
      />
      <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="overflow-x-auto">
          {shipments === null ? (
            <div className="p-6 text-center text-sm text-gray-400">Loading shipments…</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">
              {list.length === 0
                ? "No shipments yet for this instance."
                : "No shipments match the current filters."}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">Tracking</th>
                  <th className="px-4 py-2 text-left">Carrier</th>
                  <th className="px-4 py-2 text-left">Route</th>
                  <th className="px-4 py-2 text-left">Customer</th>
                  <th className="px-4 py-2 text-right">Items</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">ETA</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const busy = busyId === s.id;
                  const next: ShipmentStatus | null =
                    s.status === "PREPARING"
                      ? "IN_TRANSIT"
                      : s.status === "IN_TRANSIT"
                        ? "OUT_FOR_DELIVERY"
                        : s.status === "OUT_FOR_DELIVERY"
                          ? "DELIVERED"
                          : null;
                  return (
                    <tr key={s.id} className="border-t border-gray-100">
                      <td className="px-4 py-2 font-mono text-xs text-gray-700">{s.tracking_number}</td>
                      <td className="px-4 py-2 text-gray-700">{s.carrier}</td>
                      <td className="px-4 py-2 text-gray-600">{s.origin} → {s.destination}</td>
                      <td className="px-4 py-2 text-gray-700">{s.customer}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-gray-700">{s.items_count}</td>
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center gap-1.5 text-xs text-gray-700">
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_DOT_HEX[s.status] }} />
                          {STATUS_LABEL[s.status]}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-600">
                        {s.estimated_arrival ? new Date(s.estimated_arrival).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        {s.status === "DELAYED" ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onTransition(s, { kind: "resume" })}
                            className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 disabled:opacity-60"
                          >
                            {busy ? "…" : "Resume"}
                          </button>
                        ) : next ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => onTransition(s, { kind: "advance", to: next, label: STATUS_LABEL[next] })}
                            className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700 disabled:opacity-60"
                          >
                            {busy ? "…" : `→ ${STATUS_LABEL[next]}`}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  );
}

function CarriersView({ shipments }: { shipments: Shipment[] | null }) {
  const list = shipments ?? [];
  const groups = useMemo(() => {
    const m = new Map<
      string,
      {
        carrier: string;
        total: number;
        delivered: number;
        delayed: number;
        items: number;
        weight: number;
        routes: Set<string>;
      }
    >();
    for (const s of list) {
      const g = m.get(s.carrier) ?? {
        carrier: s.carrier,
        total: 0,
        delivered: 0,
        delayed: 0,
        items: 0,
        weight: 0,
        routes: new Set<string>(),
      };
      g.total += 1;
      if (s.status === "DELIVERED") g.delivered += 1;
      if (s.status === "DELAYED") g.delayed += 1;
      g.items += s.items_count;
      g.weight += s.weight_kg;
      g.routes.add(`${s.origin}→${s.destination}`);
      m.set(s.carrier, g);
    }
    return Array.from(m.values()).sort((a, b) => b.total - a.total);
  }, [list]);

  return (
    <>
      <PageHeader title="Carriers" />
      <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        {groups.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400">
            No carrier data yet — shipments will populate this view as they are created.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">Carrier</th>
                <th className="px-4 py-2 text-right">Shipments</th>
                <th className="px-4 py-2 text-right">Delivered</th>
                <th className="px-4 py-2 text-right">Delayed</th>
                <th className="px-4 py-2 text-right">On-time %</th>
                <th className="px-4 py-2 text-right">Items</th>
                <th className="px-4 py-2 text-right">Weight (kg)</th>
                <th className="px-4 py-2 text-right">Routes</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => {
                const pct = g.total === 0 ? 0 : Math.round(((g.total - g.delayed) / g.total) * 100);
                return (
                  <tr key={g.carrier} className="border-t border-gray-100">
                    <td className="px-4 py-2 font-medium text-gray-900">{g.carrier}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-700">{g.total}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-emerald-700">{g.delivered}</td>
                    <td className={`px-4 py-2 text-right tabular-nums ${g.delayed > 0 ? "text-rose-700 font-semibold" : "text-gray-700"}`}>{g.delayed}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-700">{pct}%</td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-700">{g.items}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-700">{Math.round(g.weight)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-700">{g.routes.size}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

function RoutesView({ shipments }: { shipments: Shipment[] | null }) {
  const list = shipments ?? [];
  const groups = useMemo(() => {
    const m = new Map<
      string,
      {
        origin: string;
        destination: string;
        total: number;
        delivered: number;
        delayed: number;
        carriers: Set<string>;
      }
    >();
    for (const s of list) {
      const key = `${s.origin}→${s.destination}`;
      const g = m.get(key) ?? {
        origin: s.origin,
        destination: s.destination,
        total: 0,
        delivered: 0,
        delayed: 0,
        carriers: new Set<string>(),
      };
      g.total += 1;
      if (s.status === "DELIVERED") g.delivered += 1;
      if (s.status === "DELAYED") g.delayed += 1;
      g.carriers.add(s.carrier);
      m.set(key, g);
    }
    return Array.from(m.values()).sort((a, b) => b.total - a.total);
  }, [list]);

  return (
    <>
      <PageHeader title="Routes" />
      <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        {groups.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400">
            No routes yet — shipments will populate this view.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">Origin</th>
                <th className="px-4 py-2 text-left">Destination</th>
                <th className="px-4 py-2 text-right">Shipments</th>
                <th className="px-4 py-2 text-right">Delivered</th>
                <th className="px-4 py-2 text-right">Delayed</th>
                <th className="px-4 py-2 text-right">Carriers</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={`${g.origin}-${g.destination}`} className="border-t border-gray-100">
                  <td className="px-4 py-2 text-gray-700">{g.origin}</td>
                  <td className="px-4 py-2 text-gray-700">{g.destination}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-700">{g.total}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-emerald-700">{g.delivered}</td>
                  <td className={`px-4 py-2 text-right tabular-nums ${g.delayed > 0 ? "text-rose-700 font-semibold" : "text-gray-700"}`}>{g.delayed}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-700">{g.carriers.size}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

function ReportsView({ shipments }: { shipments: Shipment[] | null }) {
  const list = shipments ?? [];
  const total = list.length;
  const statusCounts: Record<ShipmentStatus, number> = {
    PREPARING: 0,
    IN_TRANSIT: 0,
    OUT_FOR_DELIVERY: 0,
    DELIVERED: 0,
    DELAYED: 0,
  };
  for (const s of list) statusCounts[s.status] += 1;

  // Weekly volume: group by ISO week of created_at
  const weekly = (() => {
    const map = new Map<string, number>();
    for (const s of list) {
      const d = new Date(s.created_at);
      if (Number.isNaN(d.getTime())) continue;
      // Week starting Monday (label as YYYY-MM-DD of Monday)
      const day = (d.getUTCDay() + 6) % 7;
      const monday = new Date(d);
      monday.setUTCDate(d.getUTCDate() - day);
      const key = monday.toISOString().slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-8);
  })();
  const wkMax = weekly.reduce((m, [, c]) => Math.max(m, c), 0) || 1;

  const topCarriers = (() => {
    const m = new Map<string, number>();
    for (const s of list) m.set(s.carrier, (m.get(s.carrier) ?? 0) + 1);
    return Array.from(m.entries())
      .map(([carrier, count]) => ({ carrier, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  })();

  return (
    <>
      <PageHeader title="Reports" />
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Shipments by Status</h3>
          <ul className="flex flex-col gap-2 text-sm">
            {(Object.keys(statusCounts) as ShipmentStatus[]).map((k) => {
              const pct = total === 0 ? 0 : (statusCounts[k] / total) * 100;
              return (
                <li key={k}>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-700">{STATUS_LABEL[k]}</span>
                    <span className="text-gray-500 tabular-nums">{statusCounts[k]}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded bg-gray-100">
                    <div style={{ width: `${pct}%`, background: STATUS_DOT_HEX[k], height: "100%" }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Shipments by Week</h3>
          {weekly.length === 0 ? (
            <div className="text-xs text-gray-400">No data.</div>
          ) : (
            <>
              <div className="flex items-end gap-1.5" style={{ height: 100 }}>
                {weekly.map(([wk, c]) => (
                  <div
                    key={wk}
                    title={`${wk}: ${c}`}
                    style={{
                      flex: 1,
                      height: `${Math.max(6, (c / wkMax) * 100)}%`,
                      background: "#6366f1",
                      borderTopLeftRadius: 3,
                      borderTopRightRadius: 3,
                    }}
                  />
                ))}
              </div>
              <div className="mt-1 flex gap-1.5">
                {weekly.map(([wk]) => (
                  <div key={wk} className="flex-1 truncate text-center text-[9px] text-gray-400">{wk.slice(5)}</div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Top Carriers by Volume</h3>
          {topCarriers.length === 0 ? (
            <div className="text-xs text-gray-400">No data.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-gray-500">
                <tr>
                  <th className="py-2 text-left">Carrier</th>
                  <th className="py-2 text-right">Shipments</th>
                  <th className="py-2 text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {topCarriers.map((c) => (
                  <tr key={c.carrier} className="border-t border-gray-100">
                    <td className="py-2 text-gray-700">{c.carrier}</td>
                    <td className="py-2 text-right tabular-nums text-gray-700">{c.count}</td>
                    <td className="py-2 text-right tabular-nums text-gray-500">
                      {total === 0 ? "0%" : `${Math.round((c.count / total) * 100)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  );
}
