-- Dados demonstrativos integrados para os últimos 15 dias.
-- Seguro para reexecução: usa IDs, SKUs e chaves de idempotência estáveis.
-- Execute no SQL Editor do projeto Supabase usado pela aplicação.

begin;

do $$
declare
  v_actor uuid;
  v_employee uuid;
  v_income_category uuid;
  v_payment_methods uuid[];
  v_customers uuid[] := array[
    md5('demo-customer-01')::uuid, md5('demo-customer-02')::uuid,
    md5('demo-customer-03')::uuid, md5('demo-customer-04')::uuid,
    md5('demo-customer-05')::uuid, md5('demo-customer-06')::uuid,
    md5('demo-customer-07')::uuid, md5('demo-customer-08')::uuid,
    md5('demo-customer-09')::uuid, md5('demo-customer-10')::uuid,
    md5('demo-customer-11')::uuid, md5('demo-customer-12')::uuid
  ];
  v_products uuid[] := array[
    md5('demo-product-01')::uuid, md5('demo-product-02')::uuid,
    md5('demo-product-03')::uuid, md5('demo-product-04')::uuid,
    md5('demo-product-05')::uuid, md5('demo-product-06')::uuid,
    md5('demo-product-07')::uuid, md5('demo-product-08')::uuid,
    md5('demo-product-09')::uuid, md5('demo-product-10')::uuid,
    md5('demo-product-11')::uuid, md5('demo-product-12')::uuid
  ];
  v_day integer;
  v_slot integer;
  v_index integer;
  v_product_index integer;
  v_second_product_index integer;
  v_sale_id uuid;
  v_sale_key uuid;
  v_customer_id uuid;
  v_product_id uuid;
  v_second_product_id uuid;
  v_payment_method_id uuid;
  v_sale_date date;
  v_sale_time timestamptz;
  v_price numeric(12,2);
  v_cost numeric(12,2);
  v_second_price numeric(12,2);
  v_second_cost numeric(12,2);
  v_quantity numeric(12,3);
  v_second_quantity numeric(12,3);
  v_subtotal numeric(12,2);
  v_discount numeric(12,2);
  v_total numeric(12,2);
  v_balance numeric(12,3);
  v_inserted integer;
  v_product record;
begin
  select id into v_actor
  from public.profiles
  where active and role = 'admin'
  order by created_at
  limit 1;

  if v_actor is null then
    raise exception 'Crie ou ative um perfil administrador antes de executar o seed demo.';
  end if;

  perform set_config('request.jwt.claim.sub', v_actor::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  select id into v_employee
  from public.employees
  where status = 'active'
  order by (profile_id = v_actor) desc nulls last, created_at
  limit 1;

  if v_employee is null then
    v_employee := md5('demo-employee')::uuid;
    insert into public.employees(id, full_name, job_title, status, notes)
    values (v_employee, 'Atendente Demo', 'Consultor óptico', 'active', '[DEMO] Funcionário usado nas vendas demonstrativas')
    on conflict (id) do update set status = 'active';
  end if;

  select id into strict v_income_category
  from public.finance_categories
  where name = 'Vendas' and type = 'income' and active;

  select array_agg(id order by name) into v_payment_methods
  from public.payment_methods
  where active and name in ('Dinheiro', 'PIX', 'Cartão de débito', 'Cartão de crédito');

  if coalesce(array_length(v_payment_methods, 1), 0) = 0 then
    raise exception 'Nenhuma forma de pagamento ativa foi encontrada.';
  end if;

  insert into public.customers(id, full_name, birth_date, phone, email, city, state, notes, created_by, created_at)
  values
    (v_customers[1],  'Ana Souza (Demo)',       '1988-03-14', '11990001001', 'ana.demo@example.com',       'São Paulo',    'SP', '[DEMO] Cliente fictício', v_actor, current_date - 40),
    (v_customers[2],  'Bruno Martins (Demo)',   '1992-07-22', '11990001002', 'bruno.demo@example.com',     'São Paulo',    'SP', '[DEMO] Cliente fictício', v_actor, current_date - 38),
    (v_customers[3],  'Carla Mendes (Demo)',    '1979-11-05', '11990001003', 'carla.demo@example.com',     'Osasco',       'SP', '[DEMO] Cliente fictício', v_actor, current_date - 36),
    (v_customers[4],  'Daniel Rocha (Demo)',    '1985-01-18', '11990001004', 'daniel.demo@example.com',    'Barueri',      'SP', '[DEMO] Cliente fictício', v_actor, current_date - 34),
    (v_customers[5],  'Elisa Ferreira (Demo)',  '1996-09-09', '11990001005', 'elisa.demo@example.com',     'Santo André',  'SP', '[DEMO] Cliente fictício', v_actor, current_date - 32),
    (v_customers[6],  'Felipe Lima (Demo)',     '1975-12-27', '11990001006', 'felipe.demo@example.com',    'São Bernardo', 'SP', '[DEMO] Cliente fictício', v_actor, current_date - 30),
    (v_customers[7],  'Gabriela Alves (Demo)',  '1990-05-11', '11990001007', 'gabriela.demo@example.com',  'Guarulhos',    'SP', '[DEMO] Cliente fictício', v_actor, current_date - 28),
    (v_customers[8],  'Henrique Costa (Demo)',  '1982-08-30', '11990001008', 'henrique.demo@example.com',  'São Paulo',    'SP', '[DEMO] Cliente fictício', v_actor, current_date - 26),
    (v_customers[9],  'Isabela Ramos (Demo)',   '1998-02-16', '11990001009', 'isabela.demo@example.com',   'Diadema',      'SP', '[DEMO] Cliente fictício', v_actor, current_date - 24),
    (v_customers[10], 'João Ribeiro (Demo)',    '1968-06-03', '11990001010', 'joao.demo@example.com',      'São Caetano',  'SP', '[DEMO] Cliente fictício', v_actor, current_date - 22),
    (v_customers[11], 'Larissa Nunes (Demo)',   '1994-10-25', '11990001011', 'larissa.demo@example.com',   'Mauá',         'SP', '[DEMO] Cliente fictício', v_actor, current_date - 20),
    (v_customers[12], 'Marcos Oliveira (Demo)', '1987-04-07', '11990001012', 'marcos.demo@example.com',    'São Paulo',    'SP', '[DEMO] Cliente fictício', v_actor, current_date - 18)
  on conflict (id) do update set
    full_name = excluded.full_name,
    phone = excluded.phone,
    email = excluded.email,
    notes = excluded.notes,
    active = true;

  for v_product in
    select * from (values
      (v_products[1],  'DEMO-ARM-001', 'Armação Aurora',        'Armações',      95.00, 249.90, 40::numeric,  6::numeric),
      (v_products[2],  'DEMO-ARM-002', 'Armação Horizonte',     'Armações',     110.00, 289.90, 38::numeric,  6::numeric),
      (v_products[3],  'DEMO-ARM-003', 'Armação Essencial',     'Armações',      72.00, 199.90, 44::numeric,  7::numeric),
      (v_products[4],  'DEMO-LEN-001', 'Lente Antirreflexo',    'Lentes',       120.00, 329.90, 50::numeric,  8::numeric),
      (v_products[5],  'DEMO-LEN-002', 'Lente Filtro Azul',     'Lentes',       145.00, 389.90, 45::numeric,  7::numeric),
      (v_products[6],  'DEMO-LEN-003', 'Lente Multifocal',      'Lentes',       310.00, 749.90, 35::numeric,  5::numeric),
      (v_products[7],  'DEMO-SOL-001', 'Óculos Solar Atlântico','Óculos de sol', 90.00, 259.90, 36::numeric,  5::numeric),
      (v_products[8],  'DEMO-SOL-002', 'Óculos Solar Urbano',   'Óculos de sol',105.00, 299.90, 34::numeric,  5::numeric),
      (v_products[9],  'DEMO-ACE-001', 'Estojo Premium',        'Acessórios',    18.00,  49.90, 60::numeric, 10::numeric),
      (v_products[10], 'DEMO-ACE-002', 'Cordão Ajustável',      'Acessórios',     8.00,  24.90, 70::numeric, 12::numeric),
      (v_products[11], 'DEMO-MAT-001', 'Kit Limpeza',           'Materiais',     12.00,  34.90, 65::numeric, 10::numeric),
      (v_products[12], 'DEMO-MAT-002', 'Spray Limpa Lentes',    'Materiais',      7.00,  19.90, 80::numeric, 15::numeric)
    ) as p(id, sku, name, category_name, cost_price, sale_price, opening_stock, minimum_stock)
  loop
    insert into public.products(id, category_id, sku, name, description, cost_price, sale_price, stock_quantity, minimum_stock)
    select v_product.id, c.id, v_product.sku, v_product.name,
      '[DEMO] Produto fictício para apresentação', v_product.cost_price,
      v_product.sale_price, v_product.opening_stock, v_product.minimum_stock
    from public.product_categories c
    where c.name = v_product.category_name
    on conflict (id) do nothing;

    get diagnostics v_inserted = row_count;
    if v_inserted = 1 then
      insert into public.stock_movements(product_id, movement_type, quantity_delta, balance_after, reason, created_by, created_at)
      values (v_product.id, 'purchase', v_product.opening_stock, v_product.opening_stock,
        '[DEMO] Estoque inicial demonstrativo', v_actor, current_date - 16);
    end if;
  end loop;

  perform set_config('app.stock_operation', 'on', true);

  for v_day in 0..14 loop
    for v_slot in 0..1 loop
      v_index := (v_day * 2) + v_slot + 1;
      v_sale_id := md5('demo-sale-' || v_index)::uuid;
      v_sale_key := md5('demo-sale-key-' || v_index)::uuid;

      if exists (select 1 from public.sales where idempotency_key = v_sale_key) then
        continue;
      end if;

      v_sale_date := current_date - (14 - v_day);
      v_sale_time := (v_sale_date::timestamp + make_interval(hours => 10 + (v_slot * 5), mins => 20 + ((v_day * 7) % 35))) at time zone 'America/Sao_Paulo';
      v_customer_id := v_customers[((v_index - 1) % array_length(v_customers, 1)) + 1];
      v_product_index := ((v_index - 1) % array_length(v_products, 1)) + 1;
      v_second_product_index := ((v_index + 3) % array_length(v_products, 1)) + 1;
      v_product_id := v_products[v_product_index];
      v_second_product_id := v_products[v_second_product_index];
      v_quantity := case when v_index % 7 = 0 then 2 else 1 end;
      v_second_quantity := case when v_index % 3 = 0 then 1 else 0 end;

      select sale_price, cost_price into strict v_price, v_cost from public.products where id = v_product_id;
      select sale_price, cost_price into strict v_second_price, v_second_cost from public.products where id = v_second_product_id;

      v_subtotal := (v_price * v_quantity) + (v_second_price * v_second_quantity);
      v_discount := case when v_index % 5 = 0 then 10.00 else 0.00 end;
      v_total := v_subtotal - v_discount;
      v_payment_method_id := v_payment_methods[((v_index - 1) % array_length(v_payment_methods, 1)) + 1];

      insert into public.sales(id, customer_id, employee_id, status, subtotal, discount, total,
        idempotency_key, notes, completed_at, created_by, created_at, updated_at)
      values (v_sale_id, v_customer_id, v_employee, 'completed', v_subtotal, v_discount, v_total,
        v_sale_key, '[DEMO] Venda demonstrativa', v_sale_time, v_actor, v_sale_time, v_sale_time);

      insert into public.sale_items(sale_id, product_id, quantity, unit_price, unit_cost, discount)
      values (v_sale_id, v_product_id, v_quantity, v_price, v_cost, v_discount);

      update public.products
      set stock_quantity = stock_quantity - v_quantity
      where id = v_product_id and stock_quantity >= v_quantity
      returning stock_quantity into v_balance;
      if not found then raise exception 'Estoque demo insuficiente para %', v_product_id; end if;

      insert into public.stock_movements(product_id, movement_type, quantity_delta, balance_after, sale_id, reason, created_by, created_at)
      values (v_product_id, 'sale', -v_quantity, v_balance, v_sale_id, '[DEMO] Venda concluída', v_actor, v_sale_time);

      if v_second_quantity > 0 then
        insert into public.sale_items(sale_id, product_id, quantity, unit_price, unit_cost, discount)
        values (v_sale_id, v_second_product_id, v_second_quantity, v_second_price, v_second_cost, 0);

        update public.products
        set stock_quantity = stock_quantity - v_second_quantity
        where id = v_second_product_id and stock_quantity >= v_second_quantity
        returning stock_quantity into v_balance;
        if not found then raise exception 'Estoque demo insuficiente para %', v_second_product_id; end if;

        insert into public.stock_movements(product_id, movement_type, quantity_delta, balance_after, sale_id, reason, created_by, created_at)
        values (v_second_product_id, 'sale', -v_second_quantity, v_balance, v_sale_id, '[DEMO] Venda concluída', v_actor, v_sale_time);
      end if;

      insert into public.sale_payments(sale_id, payment_method_id, amount, installments, created_at)
      values (v_sale_id, v_payment_method_id, v_total,
        case when v_index % 4 = 0 then 2 else 1 end, v_sale_time);

      insert into public.financial_entries(type, status, category_id, payment_method_id, sale_id,
        amount, occurred_on, description, source, created_by, created_at, updated_at)
      values ('income', 'paid', v_income_category, v_payment_method_id, v_sale_id,
        v_total, v_sale_date, '[DEMO] Venda demonstrativa', 'sale', v_actor, v_sale_time, v_sale_time);
    end loop;
  end loop;

  for v_index in 1..8 loop
    v_sale_time := ((current_date - v_index)::timestamp + make_interval(hours => 9 + (v_index % 3), mins => 10)) at time zone 'America/Sao_Paulo';
    insert into public.exams(id, customer_id, status, scheduled_at, duration_minutes,
      professional_name, notes, completed_at, created_by, created_at, updated_at)
    values (md5('demo-exam-completed-' || v_index)::uuid,
      v_customers[((v_index - 1) % array_length(v_customers, 1)) + 1],
      'completed', v_sale_time, 30, 'Dra. Helena Demo',
      '[DEMO] Consulta concluída com prescrição registrada.', v_sale_time + interval '30 minutes',
      v_actor, v_sale_time - interval '7 days', v_sale_time + interval '30 minutes')
    on conflict (id) do nothing;
  end loop;

  for v_index in 1..10 loop
    v_sale_time := ((current_date + v_index)::timestamp + make_interval(hours => 9 + ((v_index % 3) * 2), mins => 30)) at time zone 'America/Sao_Paulo';
    insert into public.exams(id, customer_id, status, scheduled_at, duration_minutes,
      professional_name, notes, created_by, created_at, updated_at)
    values (md5('demo-exam-future-' || v_index)::uuid,
      v_customers[((v_index + 3) % array_length(v_customers, 1)) + 1],
      case when v_index % 2 = 0 then 'confirmed'::public.exam_status else 'scheduled'::public.exam_status end,
      v_sale_time, 30, 'Dra. Helena Demo', '[DEMO] Consulta futura para apresentação da agenda.',
      v_actor, now(), now())
    on conflict (id) do nothing;
  end loop;
end $$;

commit;

-- Resumo esperado: 12 clientes, 12 produtos, 30 vendas e 18 consultas.
select
  count(*) as vendas_demo,
  coalesce(sum(total), 0) as faturamento_demo,
  min(completed_at::date) as inicio,
  max(completed_at::date) as fim,
  (select count(*) from public.exams where notes like '[DEMO]%') as consultas_demo
from public.sales
where notes = '[DEMO] Venda demonstrativa';
