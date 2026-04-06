create table if not exists public.archive_items (
  id uuid primary key default gen_random_uuid(),
  source_table text not null,
  source_id uuid not null,
  record_data jsonb not null,
  deleted_at timestamptz not null default now(),
  deleted_by text null
);

create index if not exists idx_archive_items_source_table on public.archive_items (source_table);
create index if not exists idx_archive_items_deleted_at on public.archive_items (deleted_at desc);
