alter table public.zones
add column if not exists is_active boolean not null default true;

create index if not exists idx_zones_company_active
on public.zones(company_id, is_active);
