create table if not exists public.duty_assignments (
  id uuid primary key default gen_random_uuid(),
  duty_date date not null,
  staff_id uuid not null,
  assigned_by uuid null,
  created_at timestamptz not null default now(),
  constraint duty_assignments_staff_id_fkey foreign key (staff_id) references public.staff(id) on delete cascade,
  constraint duty_assignments_assigned_by_fkey foreign key (assigned_by) references public.staff(id) on delete set null,
  constraint duty_assignments_date_staff_unique unique (duty_date, staff_id)
);

create index if not exists idx_duty_assignments_duty_date on public.duty_assignments (duty_date desc);
create index if not exists idx_duty_assignments_staff_id on public.duty_assignments (staff_id);

notify pgrst, 'reload schema';
