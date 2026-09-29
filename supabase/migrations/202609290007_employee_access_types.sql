begin;

create type public.employee_access_type as enum ('standard', 'salesperson', 'professional');
alter table public.profiles add column access_type public.employee_access_type not null default 'standard';

-- The UI subscribes to these tables. Keep the publication explicit and safe to
-- run on databases where the initial schema was applied before this migration.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'exams') then
    alter publication supabase_realtime add table public.exams;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'products') then
    alter publication supabase_realtime add table public.products;
  end if;
end $$;

create or replace function public.current_employee_access_type() returns public.employee_access_type
language sql stable security definer set search_path = public as $$
  select access_type from profiles where id = auth.uid()
$$;
create or replace function public.current_employee_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from employees where profile_id = auth.uid() and status = 'active'
$$;
revoke all on function public.current_employee_access_type() from public;
revoke all on function public.current_employee_id() from public;
grant execute on function public.current_employee_access_type() to authenticated;
grant execute on function public.current_employee_id() to authenticated;

drop policy sales_read on public.sales;
create policy sales_read_scoped on public.sales for select to authenticated using (
  current_user_has_permission('sales.read')
  and current_employee_access_type() <> 'professional'
  and (current_employee_access_type() <> 'salesperson' or employee_id = current_employee_id())
);
drop policy sale_items_read on public.sale_items;
create policy sale_items_read_scoped on public.sale_items for select to authenticated using (
  exists(select 1 from sales s where s.id = sale_id)
);
drop policy sale_payments_read on public.sale_payments;
create policy sale_payments_read_scoped on public.sale_payments for select to authenticated using (
  exists(select 1 from sales s where s.id = sale_id)
);
drop policy exams_read on public.exams;
create policy exams_read_scoped on public.exams for select to authenticated using (
  current_user_has_permission('exams.read') and current_employee_access_type() <> 'salesperson'
);
drop policy exams_insert on public.exams;
create policy exams_insert_scoped on public.exams for insert to authenticated with check (
  current_user_has_permission('exams.write') and current_employee_access_type() <> 'salesperson' and created_by = auth.uid()
);
drop policy exams_update on public.exams;
create policy exams_update_scoped on public.exams for update to authenticated using (
  current_user_has_permission('exams.write') and current_employee_access_type() <> 'salesperson'
) with check (current_user_has_permission('exams.write') and current_employee_access_type() <> 'salesperson');

create or replace function public.assert_sale_responsible(p_employee_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if current_employee_access_type() = 'professional' then
    raise exception using errcode = '42501', message = 'Profissionais não podem registrar vendas.';
  end if;
  if current_employee_access_type() = 'salesperson' and p_employee_id is distinct from current_employee_id() then
    raise exception using errcode = '42501', message = 'A venda deve ser registrada no próprio nome.';
  end if;
end $$;
revoke all on function public.assert_sale_responsible(uuid) from public;
grant execute on function public.assert_sale_responsible(uuid) to authenticated;

create or replace function public.complete_sale_with_customer(
  p_idempotency_key uuid, p_customer_id uuid, p_customer jsonb, p_employee_id uuid,
  p_discount numeric, p_notes text, p_items jsonb, p_payments jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_customer_id uuid;
begin
  perform assert_sale_responsible(p_employee_id);
  v_customer_id := resolve_sale_customer(p_customer_id, p_customer);
  return complete_sale(p_idempotency_key, v_customer_id, p_employee_id, p_discount, p_notes, p_items, p_payments);
end $$;

create or replace function public.save_sale_lead(
  p_idempotency_key uuid, p_customer_id uuid, p_customer jsonb, p_employee_id uuid,
  p_discount numeric, p_notes text, p_items jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_sale_id uuid; v_customer_id uuid; v_item jsonb; v_product public.products%rowtype; v_subtotal numeric(12,2) := 0; v_total numeric(12,2); v_line_discount numeric(12,2);
begin
  if v_user is null or not current_user_has_permission('sales.create') then raise exception using errcode = '42501', message = 'Você não tem permissão para registrar vendas adiadas.'; end if;
  perform assert_sale_responsible(p_employee_id);
  select id into v_sale_id from sales where idempotency_key = p_idempotency_key; if v_sale_id is not null then return v_sale_id; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception using errcode = '22023', message = 'Adicione ao menos um produto à venda.'; end if;
  if not exists(select 1 from employees where id = p_employee_id and status = 'active') then raise exception using errcode = '23503', message = 'Funcionário responsável inválido ou inativo.'; end if;
  v_customer_id := resolve_sale_customer(p_customer_id, p_customer); if v_customer_id is null then raise exception using errcode = '22023', message = 'Informe os dados do cliente.'; end if;
  for v_item in select value from jsonb_array_elements(p_items) loop select * into strict v_product from products where id = (v_item->>'product_id')::uuid and active; v_line_discount := greatest(0, coalesce((v_item->>'discount')::numeric, 0)); if (v_item->>'quantity')::numeric <= 0 or v_line_discount > ((v_item->>'quantity')::numeric * v_product.sale_price) then raise exception using errcode = '23514', message = 'Itens da venda inválidos.'; end if; v_subtotal := v_subtotal + ((v_item->>'quantity')::numeric * v_product.sale_price) - v_line_discount; end loop;
  if p_discount < 0 or p_discount > v_subtotal then raise exception using errcode = '23514', message = 'Desconto geral inválido.'; end if;
  v_total := v_subtotal - p_discount;
  insert into sales(customer_id, employee_id, status, subtotal, discount, total, idempotency_key, notes, created_by) values(v_customer_id, p_employee_id, 'draft', v_subtotal, p_discount, v_total, p_idempotency_key, nullif(trim(p_notes), ''), v_user) returning id into v_sale_id;
  for v_item in select value from jsonb_array_elements(p_items) loop select * into strict v_product from products where id = (v_item->>'product_id')::uuid; v_line_discount := greatest(0, coalesce((v_item->>'discount')::numeric, 0)); insert into sale_items(sale_id, product_id, quantity, unit_price, unit_cost, discount) values(v_sale_id, v_product.id, (v_item->>'quantity')::numeric, v_product.sale_price, v_product.cost_price, v_line_discount); end loop;
  return v_sale_id;
end $$;

commit;
