-- APP 4 — Shipments Tracker: schema
-- Paste into the Supabase SQL editor and run once per project.

create extension if not exists "pgcrypto";

create table if not exists public.shipments (
  id                uuid          primary key default gen_random_uuid(),
  instance_name     text          not null,
  tracking_number   text          not null,
  carrier           text          not null,
  origin            text          not null,
  destination       text          not null,
  customer          text          not null,
  order_ref         text          not null,
  items_count       int           not null default 1,
  weight_kg         numeric(10,2) not null default 0,
  status            text          not null default 'PREPARING',
  estimated_arrival date          not null,
  actual_arrival    date,
  delay_reason      text          not null default '',
  notes             text          not null default '',
  created_at        timestamptz   not null default now(),
  updated_at        timestamptz   not null default now(),
  unique (instance_name, tracking_number)
);

create index if not exists shipments_instance_idx
  on public.shipments (instance_name);

create index if not exists shipments_status_idx
  on public.shipments (instance_name, status);

create or replace function update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.shipments;
create trigger set_updated_at
  before update on public.shipments
  for each row execute function update_updated_at_column();

alter table public.shipments disable row level security;
