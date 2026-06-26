-- 2026-06-26 Member onboarding rebuild
-- RUN MANUALLY IN THE SUPABASE DASHBOARD SQL EDITOR. DO NOT RUN FROM APP CODE.
-- After running, verify with:
--   select column_name, data_type from information_schema.columns where table_name='users' and column_name in ('priorities','experience');

-- 1) New: priorities (multi-select, max 3 enforced in UI)
alter table public.users
  add column if not exists priorities text[] default '{}'::text[];

-- 2) Reuse the existing `experience` column; allow the new 'returning' value.
--    Drop any existing CHECK constraint on experience, then recreate it with the
--    full set of allowed values. The default constraint name is users_experience_check
--    but yours may differ — check with:
--      select conname from pg_constraint where conrelid='public.users'::regclass and contype='c';
do $$
begin
  -- Drop by the most common auto-generated name first; ignore error if it doesn't exist.
  execute 'alter table public.users drop constraint if exists users_experience_check';
end $$;

alter table public.users
  add constraint users_experience_check
  check (experience is null or experience in
    ('beginner', 'returning', 'intermediate', 'advanced'));
