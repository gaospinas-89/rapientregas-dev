-- Example seed data (replace values per company instance)
insert into companies (name, code_prefix) values ('Acme Logistics', 'EMP001');

insert into sender_companies (company_id, name, contact_name, contact_phone)
select id, 'Cliente Demo', 'Ana Lopez', '3000000000' from companies where code_prefix = 'EMP001';

-- Example statuses (configurable per company)
insert into package_statuses (company_id, name, is_terminal, sort_order)
select id, 'Recibido', false, 10 from companies where code_prefix = 'EMP001';
insert into package_statuses (company_id, name, is_terminal, sort_order)
select id, 'Asignado', false, 20 from companies where code_prefix = 'EMP001';
insert into package_statuses (company_id, name, is_terminal, sort_order)
select id, 'En ruta', false, 30 from companies where code_prefix = 'EMP001';
insert into package_statuses (company_id, name, is_terminal, sort_order)
select id, 'Entregado', true, 40 from companies where code_prefix = 'EMP001';
insert into package_statuses (company_id, name, is_terminal, sort_order)
select id, 'Devuelto', true, 50 from companies where code_prefix = 'EMP001';

-- Example return reasons
insert into return_reasons (company_id, name)
select id, 'Direccion incorrecta' from companies where code_prefix = 'EMP001';
insert into return_reasons (company_id, name)
select id, 'Destinatario ausente' from companies where code_prefix = 'EMP001';
