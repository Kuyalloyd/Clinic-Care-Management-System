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
