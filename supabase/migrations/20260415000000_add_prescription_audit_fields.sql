alter table if exists public.prescriptions
  add column if not exists updated_at timestamp with time zone,
  add column if not exists updated_by uuid;

comment on column public.prescriptions.updated_at is 'Timestamp of the latest create or update action';
comment on column public.prescriptions.updated_by is 'Staff member who last created or updated the prescription';
