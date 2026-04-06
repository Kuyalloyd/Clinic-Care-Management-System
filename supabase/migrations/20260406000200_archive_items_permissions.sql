alter table if exists public.archive_items disable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on table public.archive_items to anon, authenticated, service_role;
