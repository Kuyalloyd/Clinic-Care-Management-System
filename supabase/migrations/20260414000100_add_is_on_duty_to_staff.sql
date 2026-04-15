alter table if exists staff
add column if not exists is_on_duty boolean not null default false;
