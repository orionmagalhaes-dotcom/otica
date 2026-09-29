begin;

drop policy own_profile_read on public.profiles;
create policy profiles_read_scoped on public.profiles for select to authenticated using (
  id = auth.uid()
  or current_user_has_permission('users.manage')
  or current_user_has_permission('employees.read')
);

commit;
