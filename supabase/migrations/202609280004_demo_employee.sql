begin;

insert into public.employees (id, full_name, job_title, status, notes)
values (
  md5('demo-employee')::uuid,
  'demo',
  'Funcionário de teste',
  'active',
  '[DEMO] Funcionário temporário para testes'
)
on conflict (id) do update
set full_name = excluded.full_name,
    job_title = excluded.job_title,
    status = 'active',
    notes = excluded.notes;

commit;
