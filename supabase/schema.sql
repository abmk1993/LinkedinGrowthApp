-- LinkedIn Growth Agent — MVP schema
-- Run against a Supabase project (or any Postgres 14+ with pgcrypto/gen_random_uuid).
-- Mirrors section 3 of docs/dev-plan.md — keep both in sync when either changes.

create extension if not exists pgcrypto;

-- Users (Supabase auth.users handles auth; this is the profile extension)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  profession text,
  industry text,
  experience_level text,
  career_goal text,
  created_at timestamptz not null default now()
);

create table if not exists skills (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  name text not null
);

create table if not exists interests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  name text not null
);

-- One row per audit run. headline_raw/about_raw/experience_raw are
-- transcribed by the AI from the uploaded screenshot(s), not pasted by
-- the user — screenshot_urls points at those screenshots in Storage
-- (bucket: profile-screenshots).
create table if not exists profile_snapshots (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  headline_raw text,
  about_raw text,
  experience_raw text,
  screenshot_urls jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists profile_audit_items (
  id uuid primary key default gen_random_uuid(),
  profile_snapshot_id uuid not null references profile_snapshots(id) on delete cascade,
  section text not null check (section in ('headline', 'about', 'experience')),
  critique text,
  suggested_rewrite text,
  score int check (score between 0 and 100),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'edited', 'rejected')),
  final_text text,
  created_at timestamptz not null default now()
);

create table if not exists profile_photos (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  original_url text not null,
  score int check (score between 0 and 100),
  critique text,
  issues jsonb not null default '[]'::jsonb,
  corrected_url text,
  status text not null default 'pending' check (status in ('pending', 'approved_as_is', 'corrected', 'downloaded')),
  created_at timestamptz not null default now()
);

-- Templated LinkedIn cover banners (see lib/banner/generate.ts) — storage_path
-- points at the rendered PNG in Storage (bucket: profile-banners). One row
-- per profile (overwritten on regen) — same reasoning as `positioning`
-- below: the unique constraint is load-bearing, the API upserts on
-- profile_id, and it closes off a delete-the-wrong-row race that existed
-- when this was insert-then-cleanup-old-rows instead.
create table if not exists profile_banners (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles(id) on delete cascade,
  theme text not null check (theme in ('ink', 'paper', 'brass')),
  storage_path text not null,
  created_at timestamptz not null default now()
);

-- User's chosen posting cadence for Phase 2 (Growth Plan Setup)
create table if not exists growth_plans (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  cadence text not null check (cadence in ('daily', 'few_times_week', 'weekly')),
  created_at timestamptz not null default now()
);

-- AI-generated positioning, one row per profile (overwritten on regen).
-- The unique constraint is load-bearing: the API upserts on profile_id,
-- and Postgres refuses ON CONFLICT (profile_id) without it.
create table if not exists positioning (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles(id) on delete cascade,
  pillars jsonb not null,
  content_style text,
  target_audience text,
  generated_at timestamptz not null default now()
);

-- One row per research run
create table if not exists research_runs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

create table if not exists research_items (
  id uuid primary key default gen_random_uuid(),
  research_run_id uuid not null references research_runs(id) on delete cascade,
  topic text not null,
  why_it_matters text,
  why_you text,
  suggested_angle text,
  source_url text,
  source_name text,
  category text check (category in ('update', 'trend', 'post_opportunity')),
  created_at timestamptz not null default now()
);

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  research_item_id uuid references research_items(id) on delete set null,
  hooks jsonb,
  selected_hook text,
  body text,
  cta text,
  hashtags jsonb,
  status text not null default 'draft' check (status in ('draft', 'approved', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists post_metrics (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  impressions int,
  reactions int,
  comments int,
  shares int,
  recorded_at timestamptz not null default now()
);

-- Row Level Security: every table is user-scoped by profile_id, so a
-- user can only ever see/write their own data.
alter table profiles enable row level security;
alter table skills enable row level security;
alter table interests enable row level security;
alter table profile_snapshots enable row level security;
alter table profile_audit_items enable row level security;
alter table profile_photos enable row level security;
alter table profile_banners enable row level security;
alter table growth_plans enable row level security;
alter table positioning enable row level security;
alter table research_runs enable row level security;
alter table research_items enable row level security;
alter table posts enable row level security;
alter table post_metrics enable row level security;

create policy "profiles_own_row" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "skills_own_rows" on skills
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "interests_own_rows" on interests
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "profile_snapshots_own_rows" on profile_snapshots
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "profile_audit_items_own_rows" on profile_audit_items
  for all using (
    auth.uid() = (select profile_id from profile_snapshots where id = profile_snapshot_id)
  );

create policy "profile_photos_own_rows" on profile_photos
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "profile_banners_own_rows" on profile_banners
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "growth_plans_own_rows" on growth_plans
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "positioning_own_rows" on positioning
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "research_runs_own_rows" on research_runs
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "research_items_own_rows" on research_items
  for all using (
    auth.uid() = (select profile_id from research_runs where id = research_run_id)
  );

create policy "posts_own_rows" on posts
  for all using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "post_metrics_own_rows" on post_metrics
  for all using (
    auth.uid() = (select profile_id from posts where id = post_id)
  );
