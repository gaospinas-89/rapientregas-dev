create extension if not exists "uuid-ossp";

-- Tenant (your company instance)
create table companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  code_prefix text not null unique,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now()
);

-- App users (linked to Supabase auth.users)
create table app_users (
  id uuid primary key,
  company_id uuid not null references companies(id) on delete cascade,
  role text not null check (role in ('admin','courier')),
  full_name text not null,
  phone text,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now()
);

-- Sender companies (companies that give you packages)
create table sender_companies (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  contact_name text,
  contact_phone text,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  unique (company_id, name)
);

-- Couriers (mensajeros)
create table couriers (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid unique references app_users(id) on delete set null,
  code text not null,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  unique (company_id, code)
);

-- Zones (municipios/barrios)
create table zones (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  parent_id uuid references zones(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  unique (company_id, name)
);

-- Package statuses (configurable)
create table package_statuses (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  is_terminal boolean not null default false,
  sort_order int not null default 0,
  created_at timestamp with time zone not null default now(),
  unique (company_id, name)
);

-- Return reasons (catalog + free text)
create table return_reasons (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  unique (company_id, name)
);

-- Packages
create table packages (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  sender_company_id uuid references sender_companies(id) on delete set null,
  public_code text not null,
  sender_name text not null,
  recipient_name text not null,
  destination_address text not null,
  zone_id uuid references zones(id) on delete set null,
  current_status_id uuid references package_statuses(id) on delete set null,
  notes text,
  created_at timestamp with time zone not null default now(),
  unique (company_id, public_code)
);

-- Package assignments (history)
create table package_assignments (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  package_id uuid not null references packages(id) on delete cascade,
  courier_id uuid not null references couriers(id) on delete restrict,
  assigned_at timestamp with time zone not null default now(),
  unassigned_at timestamp with time zone,
  assigned_by uuid references app_users(id) on delete set null
);

-- Returns (devoluciones)
create table returns (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  package_id uuid not null references packages(id) on delete cascade,
  courier_id uuid references couriers(id) on delete set null,
  reason_id uuid references return_reasons(id) on delete set null,
  reason_text text,
  created_at timestamp with time zone not null default now()
);

-- Accounting entries (operational, no money yet)
create table accounting_entries (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  courier_id uuid references couriers(id) on delete set null,
  package_id uuid references packages(id) on delete set null,
  entry_type text not null check (entry_type in ('assigned','delivered','returned')),
  created_at timestamp with time zone not null default now()
);
