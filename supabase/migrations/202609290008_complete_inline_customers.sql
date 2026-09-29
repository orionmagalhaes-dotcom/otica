begin;

create or replace function public.resolve_sale_customer(p_customer_id uuid, p_customer jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid(); v_customer_id uuid := p_customer_id; v_full_name text;
  v_cpf text; v_phone text; v_email text; v_birth_date date; v_state text;
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
  v_state := nullif(upper(trim(p_customer->>'state')), '');
  v_birth_date := nullif(trim(p_customer->>'birth_date'), '')::date;
  if char_length(coalesce(v_full_name, '')) < 2 then raise exception using errcode = '22023', message = 'Informe o nome do cliente.'; end if;
  if v_cpf is not null and v_cpf !~ '^\d{11}$' then raise exception using errcode = '22023', message = 'Informe um CPF com 11 dígitos.'; end if;
  if v_state is not null and char_length(v_state) <> 2 then raise exception using errcode = '22023', message = 'Informe uma UF com duas letras.'; end if;
  if v_birth_date is not null and v_birth_date > current_date then raise exception using errcode = '22023', message = 'Data de nascimento inválida.'; end if;
  insert into customers(full_name, cpf, birth_date, phone, email, address_line, city, state, postal_code, notes, created_by)
  values(v_full_name, v_cpf, v_birth_date, v_phone, v_email, nullif(trim(p_customer->>'address_line'), ''), nullif(trim(p_customer->>'city'), ''), v_state, nullif(regexp_replace(coalesce(p_customer->>'postal_code', ''), '\D', '', 'g'), ''), nullif(trim(p_customer->>'notes'), ''), v_user)
  returning id into v_customer_id;
  return v_customer_id;
end $$;

commit;
