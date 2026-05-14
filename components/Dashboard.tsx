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
import { ComingSoon } from "./ComingSoon";
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

const COMING_SOON_COPY: Record<
  Exclude<NavView, "dashboard">,
  { title: string; description: string }
> = {
  shipments: {
    title: "Shipments — coming soon",
    description:
      "A dedicated catalog of every shipment with advanced search, bulk updates, and export.",
  },
  carriers: {
    title: "Carriers — coming soon",
    description:
      "Carrier scorecards, contracted rates, and SLA tracking across each lane.",
  },
  routes: {
    title: "Routes — coming soon",
    description:
      "Lane optimization, on-time performance trends, and route-level cost breakdowns.",
  },
  reports: {
    title: "Reports — coming soon",
    description:
      "Schedule and export delivery, delay, and carrier performance reports.",
  },
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
        {view !== "dashboard" ? (
          <>
            <div className="mb-6 flex flex-col gap-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                {view}
              </p>
              <h1 className="text-2xl font-bold capitalize text-gray-900">
                {view}
              </h1>
            </div>
            <ComingSoon
              title={COMING_SOON_COPY[view].title}
              description={COMING_SOON_COPY[view].description}
              onBack={() => setView("dashboard")}
            />
          </>
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
