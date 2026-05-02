# Manual Database Fixes

## `Could not find the table 'public.medicines' in the schema cache`

This means your Supabase project does not have the `public.medicines` table yet.

### Fix

1. Open Supabase.
2. Go to `SQL Editor`.
3. Run the SQL from `supabase/migrations/20260430000000_create_medicines_table.sql`.

If you want to copy it manually, run this:

```sql
create table if not exists public.medicines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  quantity integer not null default 0 check (quantity >= 0),
  unit text not null default 'pcs',
  reorder_level integer not null default 0 check (reorder_level >= 0),
  supplier text,
  expiry_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists medicines_name_idx on public.medicines(name);
create index if not exists medicines_expiry_date_idx on public.medicines(expiry_date);
```

## `permission denied for table medicines`

This means the table exists, but your Supabase roles do not have the right grants yet.

### Fix

Run this in Supabase `SQL Editor`:

```sql
alter table if exists public.medicines disable row level security;

grant usage on schema public to authenticated;
grant usage on schema public to service_role;

revoke all on table public.medicines from authenticated;
revoke all on table public.medicines from service_role;

grant select, insert, update, delete on table public.medicines to authenticated;
grant select, insert, update, delete on table public.medicines to service_role;

notify pgrst, 'reload schema';
```

## `Could not find the 'intake_notes' column of 'patients' in the schema cache`

This means your Supabase `patients` table does not have the newer nurse intake fields yet, or Supabase has not reloaded the schema cache after adding them.

### Fix

Run this in Supabase `SQL Editor`:

```sql
alter table public.patients
  add column if not exists recommended_doctor_id uuid references public.staff(id) on delete set null,
  add column if not exists intake_notes text,
  add column if not exists created_by_staff_id uuid references public.staff(id) on delete set null,
  add column if not exists updated_by_staff_id uuid references public.staff(id) on delete set null;

create index if not exists patients_recommended_doctor_idx
  on public.patients(recommended_doctor_id);

create index if not exists patients_created_by_staff_idx
  on public.patients(created_by_staff_id);

create index if not exists patients_updated_by_staff_idx
  on public.patients(updated_by_staff_id);

notify pgrst, 'reload schema';
```

You can also run the repo migration file directly:

- `supabase/migrations/20260430000100_add_patient_intake_tracking.sql`

## `Could not find the 'region' column of 'patients'`

Older Supabase projects may still have the original `state` column instead of `region`.

### Fix

Run this in Supabase `SQL Editor`:

```sql
alter table public.patients rename column state to region;

notify pgrst, 'reload schema';
```

You can also run:

- `supabase/migrations/20260326000001_rename_state_to_region.sql`

## `Messages table is not ready yet`

The doctor and nurse messaging panel needs the internal `staff_messages` table.

### Fix

Run these migrations in Supabase:

- `supabase/migrations/20260501000200_create_staff_messages_table.sql`
- `supabase/migrations/20260501000300_staff_messages_permissions.sql`

Then reload the schema cache:

```sql
notify pgrst, 'reload schema';
```

If you want to paste the permissions SQL manually, run this too:

```sql
alter table if exists public.staff_messages disable row level security;

grant usage on schema public to authenticated;
grant usage on schema public to service_role;

revoke all on table public.staff_messages from authenticated;
revoke all on table public.staff_messages from service_role;

grant select, insert, update, delete on table public.staff_messages to authenticated;
grant select, insert, update, delete on table public.staff_messages to service_role;

notify pgrst, 'reload schema';
```

## Fresh Setup

For a new Supabase project, do not use the old `001_init_schema.sql` instructions.
Run all files in `supabase/migrations/` in filename order.
