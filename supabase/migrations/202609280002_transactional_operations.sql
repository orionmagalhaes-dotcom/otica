begin;

create or replace function public.protect_stock_balance() returns trigger language plpgsql as $$
begin
  if new.stock_quantity is distinct from old.stock_quantity
     and current_setting('app.stock_operation', true) is distinct from 'on' then
    raise exception using errcode = '42501', message = 'O saldo de estoque só pode ser alterado por uma movimentação.';
  end if;
  return new;
end $$;
create trigger products_protect_stock before update of stock_quantity on public.products
for each row execute function public.protect_stock_balance();

create or replace function public.complete_sale(
  p_idempotency_key uuid,
  p_customer_id uuid,
  p_employee_id uuid,
  p_discount numeric,
  p_notes text,
  p_items jsonb,
  p_payments jsonb
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_sale_id uuid;
  v_existing public.sales%rowtype;
  v_item jsonb;
  v_payment jsonb;
  v_product public.products%rowtype;
  v_subtotal numeric(12,2) := 0;
  v_total numeric(12,2);
  v_payment_total numeric(12,2) := 0;
  v_income_category uuid;
  v_line_discount numeric(12,2);
begin
  if v_user is null or not current_user_has_permission('sales.create') then
    raise exception using errcode = '42501', message = 'Você não tem permissão para concluir vendas.';
  end if;
  select * into v_existing from sales where idempotency_key = p_idempotency_key;
  if found then return v_existing.id; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception using errcode = '22023', message = 'Adicione ao menos um produto à venda.';
  end if;
  if jsonb_typeof(p_payments) <> 'array' or jsonb_array_length(p_payments) = 0 then
    raise exception using errcode = '22023', message = 'Informe a forma de pagamento.';
  end if;
  if not exists(select 1 from employees where id = p_employee_id and status = 'active') then
    raise exception using errcode = '23503', message = 'Funcionário responsável inválido ou inativo.';
  end if;
  if p_customer_id is not null and not exists(select 1 from customers where id = p_customer_id and active) then
    raise exception using errcode = '23503', message = 'Cliente inválido ou inativo.';
  end if;

  -- Lock in stable order to avoid overselling and reduce deadlocks.
  perform 1 from products p
  join (select distinct value->>'product_id' id from jsonb_array_elements(p_items)) i on i.id::uuid = p.id
  order by p.id for update of p;

  for v_item in select value from jsonb_array_elements(p_items) loop
    select * into strict v_product from products where id = (v_item->>'product_id')::uuid and active;
    if (v_item->>'quantity')::numeric <= 0 then
      raise exception using errcode = '22023', message = 'A quantidade deve ser maior que zero.';
    end if;
    if v_product.stock_quantity < (v_item->>'quantity')::numeric then
      raise exception using errcode = '23514', message = format('Estoque insuficiente para %s.', v_product.name);
    end if;
    v_line_discount := greatest(0, coalesce((v_item->>'discount')::numeric, 0));
    if v_line_discount > ((v_item->>'quantity')::numeric * v_product.sale_price) then
      raise exception using errcode = '23514', message = 'O desconto do item ultrapassa seu valor.';
    end if;
    v_subtotal := v_subtotal + ((v_item->>'quantity')::numeric * v_product.sale_price) - v_line_discount;
  end loop;
  if p_discount < 0 or p_discount > v_subtotal then
    raise exception using errcode = '23514', message = 'Desconto geral inválido.';
  end if;
  if p_discount > 0 and not current_user_has_permission('sales.cancel') then
    raise exception using errcode = '42501', message = 'Somente gerentes podem aplicar desconto geral.';
  end if;
  v_total := v_subtotal - p_discount;
  for v_payment in select value from jsonb_array_elements(p_payments) loop
    if not exists(select 1 from payment_methods where id = (v_payment->>'payment_method_id')::uuid and active) then
      raise exception using errcode = '23503', message = 'Forma de pagamento inválida.';
    end if;
    v_payment_total := v_payment_total + (v_payment->>'amount')::numeric;
  end loop;
  if v_payment_total <> v_total then
    raise exception using errcode = '23514', message = 'A soma dos pagamentos deve ser igual ao total da venda.';
  end if;

  insert into sales(customer_id, employee_id, status, subtotal, discount, total, idempotency_key, notes, completed_at, created_by)
  values (p_customer_id, p_employee_id, 'completed', v_subtotal, p_discount, v_total, p_idempotency_key, nullif(trim(p_notes),''), now(), v_user)
  returning id into v_sale_id;

  perform set_config('app.stock_operation','on',true);
  for v_item in select value from jsonb_array_elements(p_items) loop
    select * into strict v_product from products where id = (v_item->>'product_id')::uuid;
    v_line_discount := greatest(0, coalesce((v_item->>'discount')::numeric, 0));
    insert into sale_items(sale_id, product_id, quantity, unit_price, unit_cost, discount)
    values (v_sale_id, v_product.id, (v_item->>'quantity')::numeric, v_product.sale_price, v_product.cost_price, v_line_discount);
    update products set stock_quantity = stock_quantity - (v_item->>'quantity')::numeric where id = v_product.id
    returning * into v_product;
    insert into stock_movements(product_id, movement_type, quantity_delta, balance_after, sale_id, reason, created_by)
    values (v_product.id, 'sale', -(v_item->>'quantity')::numeric, v_product.stock_quantity, v_sale_id, 'Venda concluída', v_user);
  end loop;
  for v_payment in select value from jsonb_array_elements(p_payments) loop
    insert into sale_payments(sale_id, payment_method_id, amount, installments)
    values (v_sale_id, (v_payment->>'payment_method_id')::uuid, (v_payment->>'amount')::numeric, coalesce((v_payment->>'installments')::integer,1));
  end loop;
  select id into strict v_income_category from finance_categories where name = 'Vendas' and type = 'income';
  insert into financial_entries(type, status, category_id, payment_method_id, sale_id, amount, occurred_on, description, source, created_by)
  select 'income', 'paid', v_income_category,
    case when jsonb_array_length(p_payments) = 1 then (p_payments->0->>'payment_method_id')::uuid else null end,
    v_sale_id, v_total, current_date, 'Venda #' || (select number from sales where id = v_sale_id), 'sale', v_user;
  return v_sale_id;
exception
  when unique_violation then
    select id into v_sale_id from sales where idempotency_key = p_idempotency_key;
    if v_sale_id is not null then return v_sale_id; end if;
    raise;
end $$;

create or replace function public.cancel_sale(p_sale_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare v_sale public.sales%rowtype; v_item record; v_product public.products%rowtype; v_user uuid := auth.uid(); v_cat uuid;
begin
  if v_user is null or not current_user_has_permission('sales.cancel') then
    raise exception using errcode = '42501', message = 'Você não tem permissão para cancelar vendas.';
  end if;
  if char_length(trim(coalesce(p_reason,''))) < 5 then
    raise exception using errcode = '22023', message = 'Informe o motivo do cancelamento.';
  end if;
  select * into strict v_sale from sales where id = p_sale_id for update;
  if v_sale.status = 'cancelled' then return; end if;
  if v_sale.status <> 'completed' then raise exception 'Somente vendas concluídas podem ser canceladas.'; end if;
  perform 1 from products p join sale_items si on si.product_id = p.id where si.sale_id = p_sale_id order by p.id for update of p;
  perform set_config('app.stock_operation','on',true);
  for v_item in select * from sale_items where sale_id = p_sale_id loop
    update products set stock_quantity = stock_quantity + v_item.quantity where id = v_item.product_id returning * into v_product;
    insert into stock_movements(product_id,movement_type,quantity_delta,balance_after,sale_id,reason,created_by)
    values(v_item.product_id,'sale_reversal',v_item.quantity,v_product.stock_quantity,p_sale_id,p_reason,v_user);
  end loop;
  update sales set status='cancelled', cancelled_at=now(), cancellation_reason=trim(p_reason) where id=p_sale_id;
  update financial_entries set status='cancelled' where sale_id=p_sale_id and source='sale';
  select id into strict v_cat from finance_categories where name='Estornos' and type='expense';
  insert into financial_entries(type,status,category_id,sale_id,amount,occurred_on,description,source,created_by)
  values('expense','paid',v_cat,p_sale_id,v_sale.total,current_date,'Estorno da venda #'||v_sale.number,'sale_reversal',v_user);
end $$;

create or replace function public.adjust_stock(p_product_id uuid, p_quantity_delta numeric, p_reason text) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_product products%rowtype; v_id uuid; v_user uuid := auth.uid();
begin
  if v_user is null or not current_user_has_permission('stock.adjust') then raise exception using errcode='42501', message='Sem permissão para ajustar estoque.'; end if;
  if p_quantity_delta = 0 then raise exception 'A quantidade não pode ser zero.'; end if;
  if char_length(trim(coalesce(p_reason,''))) < 5 then raise exception 'Informe o motivo do ajuste.'; end if;
  select * into strict v_product from products where id=p_product_id for update;
  if v_product.stock_quantity + p_quantity_delta < 0 then raise exception 'O ajuste deixaria o estoque negativo.'; end if;
  perform set_config('app.stock_operation','on',true);
  update products set stock_quantity=stock_quantity+p_quantity_delta where id=p_product_id returning * into v_product;
  insert into stock_movements(product_id,movement_type,quantity_delta,balance_after,reason,created_by)
  values(p_product_id,case when p_quantity_delta > 0 then 'adjustment_in'::stock_movement_type else 'adjustment_out'::stock_movement_type end,p_quantity_delta,v_product.stock_quantity,trim(p_reason),v_user)
  returning id into v_id;
  return v_id;
end $$;

revoke all on function public.complete_sale(uuid,uuid,uuid,numeric,text,jsonb,jsonb) from public;
revoke all on function public.cancel_sale(uuid,text) from public;
revoke all on function public.adjust_stock(uuid,numeric,text) from public;
grant execute on function public.complete_sale(uuid,uuid,uuid,numeric,text,jsonb,jsonb) to authenticated;
grant execute on function public.cancel_sale(uuid,text) to authenticated;
grant execute on function public.adjust_stock(uuid,numeric,text) to authenticated;

create or replace view public.dashboard_summary with (security_invoker = true) as
select
  coalesce((select count(*) from sales where status='completed' and completed_at::date=current_date),0) sales_today,
  coalesce((select sum(total) from sales where status='completed' and completed_at::date=current_date),0) revenue_today,
  coalesce((select count(*) from exams where status in ('scheduled','confirmed') and scheduled_at::date=current_date),0) exams_today,
  coalesce((select count(*) from products where active and stock_quantity <= minimum_stock),0) low_stock_count,
  coalesce((select sum(case when type='income' then amount else -amount end) from financial_entries where status='paid' and occurred_on=date_trunc('month',current_date)::date),0) month_balance;

create or replace view public.report_sales_daily with (security_invoker = true) as
select completed_at::date report_date, count(*) sale_count, sum(total) revenue,
  sum((select coalesce(sum(si.quantity*si.unit_cost),0) from sale_items si where si.sale_id=s.id)) cost,
  sum(total)-sum((select coalesce(sum(si.quantity*si.unit_cost),0) from sale_items si where si.sale_id=s.id)) gross_profit
from sales s where status='completed' group by completed_at::date;

grant select on public.dashboard_summary to authenticated;
grant select on public.report_sales_daily to authenticated;

commit;
