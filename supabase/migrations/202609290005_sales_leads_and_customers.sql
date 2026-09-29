begin;

create or replace function public.resolve_sale_customer(p_customer_id uuid, p_customer jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_customer_id uuid := p_customer_id;
  v_full_name text;
  v_cpf text;
  v_phone text;
  v_email text;
begin
  if v_customer_id is not null then
    if not exists(select 1 from customers where id = v_customer_id and active) then
      raise exception using errcode = '23503', message = 'Cliente inválido ou inativo.';
    end if;
    return v_customer_id;
  end if;
  if p_customer is null then return null; end if;
  if v_user is null or not current_user_has_permission('customers.write') then
    raise exception using errcode = '42501', message = 'Você não tem permissão para cadastrar clientes.';
  end if;
  v_full_name := nullif(trim(p_customer->>'full_name'), '');
  v_cpf := nullif(regexp_replace(coalesce(p_customer->>'cpf', ''), '\D', '', 'g'), '');
  v_phone := nullif(regexp_replace(coalesce(p_customer->>'phone', ''), '\D', '', 'g'), '');
  v_email := nullif(trim(p_customer->>'email'), '');
  if char_length(coalesce(v_full_name, '')) < 2 then
    raise exception using errcode = '22023', message = 'Informe o nome do cliente.';
  end if;
  if v_cpf is not null and v_cpf !~ '^\d{11}$' then
    raise exception using errcode = '22023', message = 'Informe um CPF com 11 dígitos.';
  end if;
  insert into customers(full_name, cpf, phone, email, created_by)
  values(v_full_name, v_cpf, v_phone, v_email, v_user)
  returning id into v_customer_id;
  return v_customer_id;
end $$;

create or replace function public.complete_sale_with_customer(
  p_idempotency_key uuid, p_customer_id uuid, p_customer jsonb, p_employee_id uuid,
  p_discount numeric, p_notes text, p_items jsonb, p_payments jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_customer_id uuid;
begin
  v_customer_id := resolve_sale_customer(p_customer_id, p_customer);
  return complete_sale(p_idempotency_key, v_customer_id, p_employee_id, p_discount, p_notes, p_items, p_payments);
end $$;

create or replace function public.save_sale_lead(
  p_idempotency_key uuid, p_customer_id uuid, p_customer jsonb, p_employee_id uuid,
  p_discount numeric, p_notes text, p_items jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_sale_id uuid;
  v_customer_id uuid;
  v_item jsonb;
  v_product public.products%rowtype;
  v_subtotal numeric(12,2) := 0;
  v_total numeric(12,2);
  v_line_discount numeric(12,2);
begin
  if v_user is null or not current_user_has_permission('sales.create') then
    raise exception using errcode = '42501', message = 'Você não tem permissão para registrar vendas não concluídas.';
  end if;
  select id into v_sale_id from sales where idempotency_key = p_idempotency_key;
  if v_sale_id is not null then return v_sale_id; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception using errcode = '22023', message = 'Adicione ao menos um produto à venda.';
  end if;
  if not exists(select 1 from employees where id = p_employee_id and status = 'active') then
    raise exception using errcode = '23503', message = 'Funcionário responsável inválido ou inativo.';
  end if;
  v_customer_id := resolve_sale_customer(p_customer_id, p_customer);
  if v_customer_id is null then
    raise exception using errcode = '22023', message = 'Informe os dados do possível comprador para acompanhamento.';
  end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    select * into strict v_product from products where id = (v_item->>'product_id')::uuid and active;
    if (v_item->>'quantity')::numeric <= 0 then
      raise exception using errcode = '22023', message = 'A quantidade deve ser maior que zero.';
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
  v_total := v_subtotal - p_discount;
  insert into sales(customer_id, employee_id, status, subtotal, discount, total, idempotency_key, notes, created_by)
  values(v_customer_id, p_employee_id, 'draft', v_subtotal, p_discount, v_total, p_idempotency_key, nullif(trim(p_notes), ''), v_user)
  returning id into v_sale_id;
  for v_item in select value from jsonb_array_elements(p_items) loop
    select * into strict v_product from products where id = (v_item->>'product_id')::uuid;
    v_line_discount := greatest(0, coalesce((v_item->>'discount')::numeric, 0));
    insert into sale_items(sale_id, product_id, quantity, unit_price, unit_cost, discount)
    values(v_sale_id, v_product.id, (v_item->>'quantity')::numeric, v_product.sale_price, v_product.cost_price, v_line_discount);
  end loop;
  return v_sale_id;
end $$;

revoke all on function public.resolve_sale_customer(uuid,jsonb) from public;
revoke all on function public.complete_sale_with_customer(uuid,uuid,jsonb,uuid,numeric,text,jsonb,jsonb) from public;
revoke all on function public.save_sale_lead(uuid,uuid,jsonb,uuid,numeric,text,jsonb) from public;
grant execute on function public.complete_sale_with_customer(uuid,uuid,jsonb,uuid,numeric,text,jsonb,jsonb) to authenticated;
grant execute on function public.save_sale_lead(uuid,uuid,jsonb,uuid,numeric,text,jsonb) to authenticated;

commit;
