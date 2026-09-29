-- 1. Crie primeiro o usuário em Authentication > Users.
-- 2. Troque o e-mail abaixo e execute este arquivo no SQL Editor.
do $$
declare
  target_email text := 'orion@gmail.com';
  target_user uuid;
begin
  select id into target_user from auth.users where lower(email) = lower(target_email);
  if target_user is null then
    raise exception 'Usuário não encontrado em auth.users: %', target_email;
  end if;

  insert into public.profiles(id, full_name, role, active)
  select id, coalesce(nullif(trim(raw_user_meta_data->>'full_name'), ''), split_part(email, '@', 1)), 'admin', true
  from auth.users where id = target_user
  on conflict (id) do update set role = 'admin', active = true;

  raise notice 'Administrador ativado com sucesso.';
end $$;
