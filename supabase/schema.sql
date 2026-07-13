-- ============================================================
-- AregAI MRP — Supabase Schema
-- Run this in the Supabase SQL editor to set up your database.
-- ============================================================

-- Robot models
create table if not exists robot_models (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz default now()
);

-- Parts / inventory
create table if not exists parts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  stock_level integer not null default 0,
  lead_time_days integer not null default 0,
  reorder_threshold integer not null default 0,
  unit text not null default 'pcs',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Bill of Materials (robot model → parts with qty per unit)
create table if not exists bom_items (
  id uuid primary key default gen_random_uuid(),
  robot_model_id uuid not null references robot_models(id) on delete cascade,
  part_id uuid not null references parts(id) on delete cascade,
  quantity_per_unit integer not null default 1 check (quantity_per_unit > 0),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(robot_model_id, part_id)
);

-- ============================================================
-- Row-Level Security
-- ============================================================

alter table robot_models enable row level security;
alter table parts enable row level security;
alter table bom_items enable row level security;

-- Allow authenticated users full access to all tables
create policy "authenticated_all" on robot_models for all to authenticated using (true) with check (true);
create policy "authenticated_all" on parts for all to authenticated using (true) with check (true);
create policy "authenticated_all" on bom_items for all to authenticated using (true) with check (true);

-- Assembly stages (mechanical + electrical breakdown per robot model)
create table if not exists assembly_stages (
  id uuid primary key default gen_random_uuid(),
  robot_model_id uuid not null references robot_models(id) on delete cascade,
  category text not null check (category in ('mechanical', 'electrical')),
  name text not null,
  duration_days numeric(5,1) not null default 0,
  order_index integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table assembly_stages enable row level security;
create policy "authenticated_all" on assembly_stages for all to authenticated using (true) with check (true);

-- Saved production plans
create table if not exists production_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  target_date date not null,
  batch jsonb not null,
  feasible boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table production_plans enable row level security;
create policy "authenticated_all" on production_plans for all to authenticated using (true) with check (true);

-- Purchasing tracker status per part
alter table parts add column if not exists purchasing_status text not null default 'To be Sourced';

alter table parts drop constraint if exists parts_purchasing_status_check;
alter table parts add constraint parts_purchasing_status_check
  check (purchasing_status in (
    'In-house Build', 'Local Store', 'To be Sourced', 'Negotiating w/Supplier',
    'Test Sample Ordered', 'To be Ordered', 'Ordered', 'Shipped', 'Received'
  ));

-- Quantity currently on order for each part
alter table parts add column if not exists qty_on_order integer not null default 0;

-- Logistics tracker: standalone shipment tracking (not linked to parts inventory)
create table if not exists logistics (
  id uuid primary key default gen_random_uuid(),
  product_name text not null,
  status text not null default 'Awaiting Dispatch',
  eta date,
  quantity numeric,
  supplier text,
  unit_price numeric,
  invoice_number text,
  invoice_amount numeric,
  currency text,
  order_date date,
  responsible_person text,
  department text,
  lead_time_days integer,
  payment_method text,
  invoice_status text,
  invoice_status_date date,
  source_of_procurement text,
  delivery_term text,
  actual_arrival_date date,
  transportation_cost numeric,
  transportation_payment text,
  custom_clearance_cost numeric,
  custom_clearance_status text,
  expertise_service_fee numeric,
  expertise_fee_payment_status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table logistics add constraint logistics_status_check
  check (status in (
    'Order Received','Source Chosen','Invoice Issued','Invoice Passed to Finance Dep',
    'Invoice Paid','In Lead Time','Ready To Pickup','Picked Up / On The Way',
    'Arrived to Armenia','In Custom Clearance','Delivered / Received'
  ));

alter table logistics enable row level security;
create policy "authenticated_all" on logistics for all to authenticated using (true) with check (true);

-- Logistics file attachments
create table if not exists logistics_attachments (
  id uuid primary key default gen_random_uuid(),
  logistics_id uuid not null references logistics(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size bigint,
  mime_type text,
  uploaded_by text,
  created_at timestamptz default now()
);

alter table logistics_attachments enable row level security;
create policy "authenticated_all" on logistics_attachments for all to authenticated using (true) with check (true);

-- Logistics change history (auto-populated by trigger)
create table if not exists logistics_history (
  id uuid primary key default gen_random_uuid(),
  logistics_id uuid not null references logistics(id) on delete cascade,
  field_name text not null,
  old_value text,
  new_value text,
  changed_by text,
  changed_at timestamptz default now()
);

alter table logistics_history enable row level security;
create policy "authenticated_all" on logistics_history for all to authenticated using (true) with check (true);

-- Trigger function: log every changed field to logistics_history
create or replace function log_logistics_changes()
returns trigger language plpgsql security definer as $$
declare
  excluded_cols text[] := array['id','created_at','updated_at'];
  col text;
  old_val text;
  new_val text;
begin
  foreach col in array (
    select array_agg(column_name::text)
    from information_schema.columns
    where table_name = 'logistics'
      and table_schema = 'public'
      and column_name <> all(excluded_cols)
  ) loop
    old_val := (to_jsonb(OLD) ->> col);
    new_val := (to_jsonb(NEW) ->> col);
    if old_val is distinct from new_val then
      insert into logistics_history (logistics_id, field_name, old_value, new_value, changed_by)
      values (NEW.id, col, old_val, new_val, auth.email());
    end if;
  end loop;
  return NEW;
end;
$$;

drop trigger if exists logistics_audit on logistics;
create trigger logistics_audit
  after update on logistics
  for each row execute function log_logistics_changes();

-- ============================================================
-- Seed Data
-- ============================================================

insert into robot_models (name, description) values
  ('SOBOT', 'Social interaction robot'),
  ('MOWBOT', 'Autonomous lawn mowing robot'),
  ('CBOT', 'Commercial cleaning robot')
on conflict (name) do nothing;
