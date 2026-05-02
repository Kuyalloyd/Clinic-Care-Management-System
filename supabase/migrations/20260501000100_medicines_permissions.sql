alter table if exists public.medicines disable row level security;

grant usage on schema public to authenticated;
grant usage on schema public to service_role;

revoke all on table public.medicines from authenticated;
revoke all on table public.medicines from service_role;

grant select, insert, update, delete on table public.medicines to authenticated;
grant select, insert, update, delete on table public.medicines to service_role;

notify pgrst, 'reload schema';
