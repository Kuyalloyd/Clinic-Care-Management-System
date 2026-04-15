alter table if exists public.staff
  add column if not exists is_on_duty boolean not null default false;

notify pgrst, 'reload schema';