alter table if exists public.staff_messages disable row level security;

grant usage on schema public to authenticated;
grant usage on schema public to service_role;

revoke all on table public.staff_messages from authenticated;
revoke all on table public.staff_messages from service_role;

grant select, insert, update, delete on table public.staff_messages to authenticated;
grant select, insert, update, delete on table public.staff_messages to service_role;

notify pgrst, 'reload schema';
