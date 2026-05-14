# APP 4 — Shipments Tracker

Standalone Next.js 14 + TypeScript app for tracking outbound shipments at a
factory or warehouse, backed by Supabase Postgres. Same codebase runs as
Factory 1–4 and Warehouse 1–2 with per-instance isolation via the
`instance_name` column.

The `/api/status` endpoint reports `health: "degraded"` when any shipments
are DELAYED — that's the signal Nexus will read in a later phase of the demo.

## Stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- `@supabase/supabase-js`
- Vercel-ready (no custom port handling)

## Supabase setup

1. Paste `supabase/schema.sql` into the Supabase SQL editor and run (once).
2. Paste `supabase/seed.sql` and run. It upserts 60 rows — 10 per instance
   across Factory 1–4 and Warehouse 1–2. Each instance has at least one
   DELAYED shipment so the dashboards always have something to react to.
   Re-running the seed acts as a demo reset.

`order_ref` values in the seed match real order numbers from app-3 so the
demo feels operationally coherent across the apps.

## Environment

`.env.local` (copied from app-1, same Supabase project):

```env
INSTANCE_NAME=Factory 1
NEXT_PUBLIC_INSTANCE_NAME=Factory 1

SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...   # preferred (bypasses RLS)
SUPABASE_ANON_KEY=...           # fallback
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Switch instance locally by changing `INSTANCE_NAME` and
`NEXT_PUBLIC_INSTANCE_NAME` and restarting `npm run dev`.

## Local dev

```bash
npm install
npm run dev          # http://localhost:3000
```

## API

| Method | Path                                | Body                                              | Notes                                            |
| ------ | ----------------------------------- | ------------------------------------------------- | ------------------------------------------------ |
| GET    | `/api/shipments`                    | —                                                 | List, sorted by `estimated_arrival` ASC          |
| POST   | `/api/shipments`                    | new-shipment fields (no `status`, `actual_arrival`, `delay_reason`) | Creates row in PREPARING status |
| GET    | `/api/shipments/[id]`               | —                                                 | Single shipment                                  |
| PATCH  | `/api/shipments/[id]/status`        | `{ "status": "...", "delayReason"?: "..." }`      | DELAYED requires non-empty `delayReason`; DELIVERED auto-sets `actual_arrival` to today on the server |
| POST   | `/api/shipments/[id]/note`          | `{ "note": "..." }`                               | Appends timestamped note                         |
| GET    | `/api/status`                       | —                                                 | health is `degraded` if `delayedCount > 0`       |

All errors → `{ "success": false, "error": "..." }`.
All mutation successes → `{ "success": true, "shipment": { ... } }`.

`delayReason` is validated both **client-side** (StatusModal disables submit
until the reason is non-empty) and **server-side** (`parseStatusUpdate`
returns a 400, and the store re-checks for defense in depth).

## UI

- Header with instance chip, connection status, **+ New shipment** button.
- Four stat cards: Total Shipments, Delayed (danger when > 0), In Transit
  (info), On-Time Delivered (success — count where status=DELIVERED and
  `actual_arrival <= estimated_arrival`).
- Filter bar: status, free-text search across tracking/customer/order
  ref/carrier/origin/destination, "Delayed only" toggle.
- Shipments table — wide. DELAYED rows tinted rose, DELIVERED rows tinted
  emerald, overdue non-DELIVERED rows tinted amber. Estimated Arrival shows
  in rose when overdue, emerald with `actual` line when delivered.
- Per-row actions: Status / Note → modal.
- Toast for every mutation. Bottom **Recent Activity** panel logs the last
  50 attempts client-side.

## Deploy to Vercel

One Vercel project per instance, all pointing at the same git repo with
**Root Directory** = `app-4-shipments`. Same Supabase env vars across
projects; only `INSTANCE_NAME` / `NEXT_PUBLIC_INSTANCE_NAME` differ.

## curl smoke test

```bash
BASE=http://localhost:3000

curl $BASE/api/shipments
curl $BASE/api/status

# Use an id from the list above.
curl -X PATCH $BASE/api/shipments/<uuid>/status \
  -H "Content-Type: application/json" \
  -d '{"status":"IN_TRANSIT"}'

# 400 — DELAYED without a reason
curl -X PATCH $BASE/api/shipments/<uuid>/status \
  -H "Content-Type: application/json" \
  -d '{"status":"DELAYED"}'

# 200 — DELAYED with reason
curl -X PATCH $BASE/api/shipments/<uuid>/status \
  -H "Content-Type: application/json" \
  -d '{"status":"DELAYED","delayReason":"Weather delay"}'

# 200 — DELIVERED auto-sets actual_arrival on the server
curl -X PATCH $BASE/api/shipments/<uuid>/status \
  -H "Content-Type: application/json" \
  -d '{"status":"DELIVERED"}'

curl -X POST $BASE/api/shipments/<uuid>/note \
  -H "Content-Type: application/json" \
  -d '{"note":"Driver confirmed delivery"}'

curl -X POST $BASE/api/shipments \
  -H "Content-Type: application/json" \
  -d '{
    "tracking_number":"TRK-F1-9999",
    "carrier":"FedEx Freight",
    "origin":"Dearborn, MI",
    "destination":"Detroit, MI",
    "customer":"Acme Test",
    "order_ref":"ORD-F1-TEST",
    "items_count":10,
    "weight_kg":250.0,
    "estimated_arrival":"2026-06-30",
    "notes":""
  }'

# 400 — invalid carrier (not in allowed set)
curl -X POST $BASE/api/shipments \
  -H "Content-Type: application/json" \
  -d '{...,"carrier":"Mom & Pop Shipping",...}'

# 404 — unknown id
curl $BASE/api/shipments/00000000-0000-0000-0000-000000000000
```
