alter table if exists public.duty_assignments disable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.duty_assignments to authenticated;
grant select, insert, update, delete on table public.duty_assignments to service_role;

notify pgrst, 'reload schema';
