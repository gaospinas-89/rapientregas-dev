-- RLS: bloquear devoluciones si el paquete está eliminado
create or replace function is_package_deleted(pkg_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from packages p
    join package_statuses s on s.id = p.current_status_id
    where p.id = pkg_id and s.name = 'Eliminado'
  )
$$;

-- Ajuste de policy: solo permitir insert si el paquete NO está eliminado
-- (si la policy ya existe, elimínala primero)

-- drop policy if exists returns_insert on returns;

create policy returns_insert on returns
for insert
with check (
  company_id = current_company_id()
  and not is_package_deleted(package_id)
  and (
    current_user_role() = 'admin'
    or courier_id in (select id from couriers where user_id = auth.uid())
  )
);
