-- Execute no SQL Editor depois das três migrations. Este arquivo é somente leitura.
with expected_tables(name) as (
  values
    ('roles'), ('permissions'), ('role_permissions'), ('profiles'), ('employees'),
    ('customers'), ('exams'), ('product_categories'), ('products'),
    ('payment_methods'), ('sales'), ('sale_items'), ('sale_payments'),
    ('stock_movements'), ('finance_categories'), ('financial_entries'),
    ('audit_logs'), ('app_settings')
)
select
  name as objeto,
  case when to_regclass('public.' || name) is not null then 'OK' else 'AUSENTE' end as situacao
from expected_tables
order by name;

select
  p.proname as funcao,
  case when p.oid is not null then 'OK' else 'AUSENTE' end as situacao
from (values
  ('current_user_has_permission'), ('complete_sale'), ('cancel_sale'),
  ('adjust_stock'), ('audit_row'), ('handle_new_user')
) expected(name)
left join pg_proc p on p.proname = expected.name
left join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
order by expected.name;

select
  tablename,
  count(*) as quantidade_politicas
from pg_policies
where schemaname = 'public'
group by tablename
order by tablename;

select
  c.relname as tabela,
  c.relrowsecurity as rls_habilitado
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'profiles','employees','customers','exams','products','sales','sale_items',
    'sale_payments','stock_movements','financial_entries','audit_logs','app_settings'
  )
order by c.relname;

select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and schemaname = 'public'
  and tablename in ('exams', 'products')
order by tablename;

