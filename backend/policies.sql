-- Enable RLS
alter table companies enable row level security;
alter table app_users enable row level security;
alter table sender_companies enable row level security;
alter table couriers enable row level security;
alter table zones enable row level security;
alter table package_statuses enable row level security;
alter table return_reasons enable row level security;
alter table packages enable row level security;
alter table package_assignments enable row level security;
alter table returns enable row level security;
alter table accounting_entries enable row level security;

-- Helper functions (security definer to avoid RLS recursion)
create or replace function current_company_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select company_id from app_users where id = auth.uid()
$$;

create or replace function current_user_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from app_users where id = auth.uid()
$$;

-- Companies: admin can read own company
create policy companies_read on companies
for select
using (id = current_company_id());

-- app_users: admin read/write own company, couriers read self
create policy app_users_read on app_users
for select
using (
  company_id = current_company_id()
  and (current_user_role() = 'admin' or id = auth.uid())
);

create policy app_users_write on app_users
for insert with check (current_user_role() = 'admin');
create policy app_users_update on app_users
for update using (current_user_role() = 'admin');

-- sender_companies: admin read/write own company
create policy sender_companies_read on sender_companies
for select using (company_id = current_company_id());
create policy sender_companies_write on sender_companies
for insert with check (current_user_role() = 'admin');
create policy sender_companies_update on sender_companies
for update using (current_user_role() = 'admin');

-- couriers: admin read/write own company, courier read self
create policy couriers_read on couriers
for select
using (
  company_id = current_company_id()
  and (current_user_role() = 'admin' or user_id = auth.uid())
);

create policy couriers_write on couriers
for insert with check (current_user_role() = 'admin');
create policy couriers_update on couriers
for update using (current_user_role() = 'admin');

-- zones, statuses, return reasons: admin read/write own company
create policy zones_read on zones
for select using (company_id = current_company_id());
create policy zones_write on zones
for insert with check (current_user_role() = 'admin');
create policy zones_update on zones
for update using (current_user_role() = 'admin');

create policy statuses_read on package_statuses
for select using (company_id = current_company_id());
create policy statuses_write on package_statuses
for insert with check (current_user_role() = 'admin');
create policy statuses_update on package_statuses
for update using (current_user_role() = 'admin');

create policy reasons_read on return_reasons
for select using (company_id = current_company_id());
create policy reasons_write on return_reasons
for insert with check (current_user_role() = 'admin');
create policy reasons_update on return_reasons
for update using (current_user_role() = 'admin');

-- packages: admin read/write, courier read if assigned
create policy packages_read on packages
for select
using (
  company_id = current_company_id()
  and (
    current_user_role() = 'admin'
    or exists (
      select 1 from package_assignments pa
      join couriers c on c.id = pa.courier_id
      where pa.package_id = packages.id
        and c.user_id = auth.uid()
        and pa.unassigned_at is null
    )
  )
);

create policy packages_write on packages
for insert with check (current_user_role() = 'admin');
create policy packages_update on packages
for update using (current_user_role() = 'admin');

-- package_assignments: admin only
create policy assignments_read on package_assignments
for select using (company_id = current_company_id());
create policy assignments_write on package_assignments
for insert with check (current_user_role() = 'admin');
create policy assignments_update on package_assignments
for update using (current_user_role() = 'admin');

-- returns: admin read/write; courier can insert/read own
create policy returns_read on returns
for select
using (
  company_id = current_company_id()
  and (
    current_user_role() = 'admin'
    or courier_id in (select id from couriers where user_id = auth.uid())
  )
);

create policy returns_insert on returns
for insert with check (
  company_id = current_company_id()
  and (
    current_user_role() = 'admin'
    or courier_id in (select id from couriers where user_id = auth.uid())
  )
);

-- accounting_entries: admin read; courier read own
create policy accounting_read on accounting_entries
for select
using (
  company_id = current_company_id()
  and (
    current_user_role() = 'admin'
    or courier_id in (select id from couriers where user_id = auth.uid())
  )
);

create policy accounting_insert on accounting_entries
for insert with check (current_user_role() = 'admin');
