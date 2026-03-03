-- Agrega estado "Recogido" para todas las compañías activas
-- Ejecutar una vez en SQL Editor (PROD y DEV si aplica)

insert into package_statuses (company_id, name, sort_order, is_active)
select c.id, 'Recogido', 15, true
from companies c
where c.is_active = true
  and not exists (
    select 1
    from package_statuses ps
    where ps.company_id = c.id
      and lower(ps.name) = 'recogido'
  );

