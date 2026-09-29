begin;

create extension if not exists pgcrypto;
create extension if not exists unaccent;
create extension if not exists pg_trgm;

-- Supabase can leave enum types behind when an interrupted first deployment is
-- retried.  Make the schema bootstrap safe to rerun in that partial state.
do $$
begin
  if to_regtype('public.app_role') is null then create type public.app_role as enum ('admin', 'manager', 'employee'); end if;
  if to_regtype('public.employee_status') is null then create type public.employee_status as enum ('active', 'inactive'); end if;
  if to_regtype('public.exam_status') is null then create type public.exam_status as enum ('scheduled', 'confirmed', 'completed', 'no_show', 'cancelled', 'external'); end if;
  if to_regtype('public.stock_movement_type') is null then create type public.stock_movement_type as enum ('purchase', 'sale', 'sale_reversal', 'adjustment_in', 'adjustment_out', 'return'); end if;
  if to_regtype('public.sale_status') is null then create type public.sale_status as enum ('draft', 'completed', 'cancelled'); end if;
  if to_regtype('public.finance_type') is null then create type public.finance_type as enum ('income', 'expense'); end if;
  if to_regtype('public.finance_status') is null then create type public.finance_status as enum ('pending', 'paid', 'cancelled'); end if;
end $$;

create table public.roles (
  id public.app_role primary key,
  name text not null unique,
  description text not null
);

create table public.permissions (
  key text primary key check (key ~ '^[a-z_]+\.[a-z_]+$'),
  description text not null
);

create table public.role_permissions (
  role_id public.app_role not null references public.roles(id) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  primary key (role_id, permission_key)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) >= 2),
  role public.app_role not null default 'employee',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  full_name text not null check (char_length(trim(full_name)) >= 2),
  job_title text not null,
  phone text,
  email text,
  document_number text,
  hire_date date,
  status public.employee_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(trim(full_name)) >= 2),
  birth_date date check (birth_date is null or birth_date <= current_date),
  cpf text,
  phone text,
  email text,
  address_line text,
  city text,
  state text check (state is null or char_length(state) = 2),
  postal_code text,
  notes text,
  active boolean not null default true,
  search_text text generated always as (
    lower(coalesce(full_name, '') || ' ' || coalesce(cpf, '') || ' ' || coalesce(phone, '') || ' ' || coalesce(email, ''))
  ) stored,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_cpf_format check (cpf is null or cpf ~ '^\d{11}$'),
  constraint customers_email_format check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);
create unique index customers_cpf_unique on public.customers(cpf) where cpf is not null;
create index customers_search_idx on public.customers using gin (search_text gin_trgm_ops);

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  status public.exam_status not null,
  scheduled_at timestamptz,
  duration_minutes integer not null default 30 check (duration_minutes between 10 and 240),
  professional_name text,
  source_name text,
  prescription jsonb,
  notes text,
  cancellation_reason text,
  completed_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exam_schedule_required check (
    (status = 'external' and scheduled_at is null) or
    (status <> 'external' and scheduled_at is not null)
  ),
  constraint exam_completion_valid check (
    (status = 'completed' and completed_at is not null) or status <> 'completed'
  )
);
create index exams_schedule_idx on public.exams(scheduled_at) where status in ('scheduled', 'confirmed');
create index exams_customer_idx on public.exams(customer_id, created_at desc);

create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.product_categories(id) on delete restrict,
  sku text,
  name text not null,
  description text,
  cost_price numeric(12,2) not null default 0 check (cost_price >= 0),
  sale_price numeric(12,2) not null check (sale_price >= 0),
  stock_quantity numeric(12,3) not null default 0 check (stock_quantity >= 0),
  minimum_stock numeric(12,3) not null default 0 check (minimum_stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index products_sku_unique on public.products(lower(sku)) where sku is not null;
create index products_category_idx on public.products(category_id) where active;
create index products_low_stock_idx on public.products(stock_quantity, minimum_stock) where active;

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity unique,
  customer_id uuid references public.customers(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  status public.sale_status not null default 'draft',
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  total numeric(12,2) not null default 0 check (total >= 0 and total = subtotal - discount),
  idempotency_key uuid not null unique,
  notes text,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sales_completed_idx on public.sales(completed_at desc) where status = 'completed';
create index sales_customer_idx on public.sales(customer_id, created_at desc);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric(12,3) not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  unit_cost numeric(12,2) not null check (unit_cost >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  line_total numeric(12,2) generated always as ((quantity * unit_price) - discount) stored,
  unique (sale_id, product_id),
  constraint sale_item_discount_valid check (discount <= quantity * unit_price)
);

create table public.sale_payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete restrict,
  payment_method_id uuid not null references public.payment_methods(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  installments integer not null default 1 check (installments between 1 and 48),
  created_at timestamptz not null default now()
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  movement_type public.stock_movement_type not null,
  quantity_delta numeric(12,3) not null check (quantity_delta <> 0),
  balance_after numeric(12,3) not null check (balance_after >= 0),
  sale_id uuid references public.sales(id) on delete restrict,
  reason text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint stock_direction_valid check (
    (movement_type in ('purchase', 'sale_reversal', 'adjustment_in', 'return') and quantity_delta > 0) or
    (movement_type in ('sale', 'adjustment_out') and quantity_delta < 0)
  )
);
create index stock_movements_product_idx on public.stock_movements(product_id, created_at desc);
create unique index stock_sale_once_idx on public.stock_movements(sale_id, product_id, movement_type) where sale_id is not null;

create table public.finance_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.finance_type not null,
  active boolean not null default true,
  unique(name, type)
);

create table public.financial_entries (
  id uuid primary key default gen_random_uuid(),
  type public.finance_type not null,
  status public.finance_status not null default 'paid',
  category_id uuid not null references public.finance_categories(id) on delete restrict,
  payment_method_id uuid references public.payment_methods(id) on delete restrict,
  sale_id uuid references public.sales(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  occurred_on date not null default current_date,
  due_on date,
  description text not null,
  source text not null default 'manual' check (source in ('manual', 'sale', 'sale_reversal')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_sale_origin check ((source = 'manual' and sale_id is null) or (source <> 'manual' and sale_id is not null))
);
create unique index finance_sale_source_unique on public.financial_entries(sale_id, source) where sale_id is not null;
create index finance_period_idx on public.financial_entries(occurred_on, type, status);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  table_name text not null,
  record_id text,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'EXPORT')),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_lookup_idx on public.audit_logs(table_name, record_id, created_at desc);

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.roles values
  ('admin', 'Administrador', 'Acesso completo ao sistema'),
  ('manager', 'Gerente', 'Operação e gestão, sem administração de usuários'),
  ('employee', 'Funcionário', 'Rotinas operacionais autorizadas');

insert into public.permissions(key, description) values
  ('dashboard.view','Visualizar indicadores'), ('customers.read','Consultar clientes'), ('customers.write','Cadastrar e atualizar clientes'),
  ('exams.read','Consultar exames'), ('exams.write','Agendar e atualizar exames'), ('products.read','Consultar produtos'),
  ('products.write','Cadastrar e editar produtos'), ('stock.read','Consultar estoque'), ('stock.adjust','Realizar ajustes de estoque'),
  ('sales.read','Consultar vendas'), ('sales.create','Realizar vendas'), ('sales.cancel','Cancelar vendas'),
  ('finance.read','Consultar financeiro'), ('finance.write','Lançar receitas e despesas'), ('employees.read','Consultar funcionários'),
  ('employees.write','Gerenciar funcionários'), ('reports.view','Visualizar relatórios'), ('users.manage','Gerenciar acessos'),
  ('audit.read','Consultar auditoria'), ('settings.manage','Alterar configurações');

insert into public.role_permissions
select r.id, p.key from public.roles r cross join public.permissions p where r.id = 'admin';
insert into public.role_permissions(role_id, permission_key) values
  ('manager','dashboard.view'),('manager','customers.read'),('manager','customers.write'),('manager','exams.read'),('manager','exams.write'),
  ('manager','products.read'),('manager','products.write'),('manager','stock.read'),('manager','stock.adjust'),('manager','sales.read'),
  ('manager','sales.create'),('manager','sales.cancel'),('manager','finance.read'),('manager','finance.write'),('manager','employees.read'),
  ('manager','employees.write'),('manager','reports.view'),('manager','audit.read'),
  ('employee','dashboard.view'),('employee','customers.read'),('employee','customers.write'),('employee','exams.read'),('employee','exams.write'),
  ('employee','products.read'),('employee','stock.read'),('employee','sales.read'),('employee','sales.create');

insert into public.payment_methods(name) values ('Dinheiro'),('PIX'),('Cartão de débito'),('Cartão de crédito'),('Boleto');
insert into public.finance_categories(name, type) values ('Vendas','income'),('Outras receitas','income'),('Estornos','expense'),('Fornecedores','expense'),('Despesas operacionais','expense');
insert into public.product_categories(name) values ('Armações'),('Lentes'),('Óculos de sol'),('Acessórios'),('Materiais');

create or replace function public.current_user_has_permission(requested text)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (
  select 1 from profiles pr join role_permissions rp on rp.role_id = pr.role
  where pr.id = auth.uid() and pr.active and rp.permission_key = requested
) $$;
revoke all on function public.current_user_has_permission(text) from public;
grant execute on function public.current_user_has_permission(text) to authenticated;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger employees_updated before update on public.employees for each row execute function public.set_updated_at();
create trigger customers_updated before update on public.customers for each row execute function public.set_updated_at();
create trigger exams_updated before update on public.exams for each row execute function public.set_updated_at();
create trigger products_updated before update on public.products for each row execute function public.set_updated_at();
create trigger sales_updated before update on public.sales for each row execute function public.set_updated_at();
create trigger finance_updated before update on public.financial_entries for each row execute function public.set_updated_at();

create or replace function public.audit_row() returns trigger language plpgsql security definer set search_path = public as $$
declare old_safe jsonb; new_safe jsonb; rid text;
begin
  old_safe := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) - array['document_number','notes'] else null end;
  new_safe := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) - array['document_number','notes'] else null end;
  rid := coalesce(new_safe->>'id', old_safe->>'id');
  insert into audit_logs(actor_id, table_name, record_id, action, old_data, new_data)
  values (auth.uid(), tg_table_name, rid, tg_op, old_safe, new_safe);
  return null;
end $$;

do $$ declare t text; begin
  foreach t in array array['profiles','employees','products','sales','stock_movements','financial_entries','app_settings'] loop
    execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.audit_row()', t, t);
  end loop;
end $$;

alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.profiles enable row level security;
alter table public.employees enable row level security;
alter table public.customers enable row level security;
alter table public.exams enable row level security;
alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.payment_methods enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.sale_payments enable row level security;
alter table public.stock_movements enable row level security;
alter table public.finance_categories enable row level security;
alter table public.financial_entries enable row level security;
alter table public.audit_logs enable row level security;
alter table public.app_settings enable row level security;

create policy roles_read on public.roles for select to authenticated using (true);
create policy permissions_read on public.permissions for select to authenticated using (true);
create policy own_profile_read on public.profiles for select to authenticated using (id = auth.uid() or current_user_has_permission('users.manage'));
create policy profiles_admin_write on public.profiles for all to authenticated using (current_user_has_permission('users.manage')) with check (current_user_has_permission('users.manage'));

create policy employees_read on public.employees for select to authenticated using (current_user_has_permission('employees.read'));
create policy employees_write on public.employees for all to authenticated using (current_user_has_permission('employees.write')) with check (current_user_has_permission('employees.write'));
create policy customers_read on public.customers for select to authenticated using (current_user_has_permission('customers.read'));
create policy customers_insert on public.customers for insert to authenticated with check (current_user_has_permission('customers.write') and created_by = auth.uid());
create policy customers_update on public.customers for update to authenticated using (current_user_has_permission('customers.write')) with check (current_user_has_permission('customers.write'));
create policy exams_read on public.exams for select to authenticated using (current_user_has_permission('exams.read'));
create policy exams_insert on public.exams for insert to authenticated with check (current_user_has_permission('exams.write') and created_by = auth.uid());
create policy exams_update on public.exams for update to authenticated using (current_user_has_permission('exams.write')) with check (current_user_has_permission('exams.write'));

create policy categories_read on public.product_categories for select to authenticated using (current_user_has_permission('products.read'));
create policy categories_write on public.product_categories for all to authenticated using (current_user_has_permission('products.write')) with check (current_user_has_permission('products.write'));
create policy products_read on public.products for select to authenticated using (current_user_has_permission('products.read'));
create policy products_write on public.products for insert to authenticated with check (current_user_has_permission('products.write') and stock_quantity = 0);
create policy products_update on public.products for update to authenticated using (current_user_has_permission('products.write')) with check (current_user_has_permission('products.write'));
create policy payment_methods_read on public.payment_methods for select to authenticated using (true);
create policy finance_categories_read on public.finance_categories for select to authenticated using (current_user_has_permission('finance.read'));

create policy sales_read on public.sales for select to authenticated using (current_user_has_permission('sales.read'));
create policy sale_items_read on public.sale_items for select to authenticated using (current_user_has_permission('sales.read'));
create policy sale_payments_read on public.sale_payments for select to authenticated using (current_user_has_permission('sales.read'));
create policy stock_read on public.stock_movements for select to authenticated using (current_user_has_permission('stock.read'));
create policy finance_read on public.financial_entries for select to authenticated using (current_user_has_permission('finance.read'));
create policy finance_manual_insert on public.financial_entries for insert to authenticated with check (current_user_has_permission('finance.write') and source = 'manual' and sale_id is null and created_by = auth.uid());
create policy finance_manual_update on public.financial_entries for update to authenticated using (current_user_has_permission('finance.write') and source = 'manual') with check (current_user_has_permission('finance.write') and source = 'manual');
create policy audit_read on public.audit_logs for select to authenticated using (current_user_has_permission('audit.read'));
create policy settings_read on public.app_settings for select to authenticated using (current_user_has_permission('settings.manage'));
create policy settings_write on public.app_settings for all to authenticated using (current_user_has_permission('settings.manage')) with check (current_user_has_permission('settings.manage'));

-- Only agenda and stock operational changes need immediate propagation.
alter publication supabase_realtime add table public.exams;
alter publication supabase_realtime add table public.products;

commit;
