begin;

create unique index exams_professional_slot_unique
on public.exams (lower(coalesce(professional_name, '')), scheduled_at)
where status in ('scheduled', 'confirmed');

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles(id, full_name, role, active)
  values(new.id, coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'),''), split_part(new.email,'@',1)), 'employee', false)
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.validate_finance_category() returns trigger language plpgsql as $$
begin
  if not exists(select 1 from public.finance_categories c where c.id = new.category_id and c.type = new.type) then
    raise exception using errcode = '23514', message = 'A categoria não corresponde ao tipo do lançamento.';
  end if;
  return new;
end $$;
create trigger financial_entries_category before insert or update of category_id, type on public.financial_entries
for each row execute function public.validate_finance_category();

-- Role changes are audited by the profiles audit trigger. Auth account creation
-- remains in Supabase Dashboard (server-side) so no service_role key is needed by this app.
commit;
