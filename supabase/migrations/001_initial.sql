-- =====================================================================
-- Kozak Training Hub — initial schema
-- Run this in the Supabase SQL editor or via `supabase db push`
-- =====================================================================

-- ── profiles ─────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text,
  position     text,
  location     text,
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── quiz_attempts ─────────────────────────────────────────────────────

create table if not exists public.quiz_attempts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  started_at       timestamptz not null,
  completed_at     timestamptz,
  score            integer,
  correct_count    integer not null default 0,
  incorrect_count  integer not null default 0,
  total_questions  integer not null default 0,
  filters          jsonb,
  created_at       timestamptz not null default now()
);

create index on public.quiz_attempts (user_id);

alter table public.quiz_attempts enable row level security;

create policy "Users can manage their own attempts"
  on public.quiz_attempts for all
  using (auth.uid() = user_id);

-- ── quiz_answers ──────────────────────────────────────────────────────

create table if not exists public.quiz_answers (
  id               uuid primary key default gen_random_uuid(),
  attempt_id       uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id      text not null,
  selected_answer  text,
  written_answer   text,
  is_correct       boolean,
  created_at       timestamptz not null default now()
);

create index on public.quiz_answers (attempt_id);

alter table public.quiz_answers enable row level security;

create policy "Users can manage their own answers"
  on public.quiz_answers for all
  using (
    auth.uid() = (
      select user_id from public.quiz_attempts where id = attempt_id
    )
  );

-- ── menu_item_progress ────────────────────────────────────────────────

create table if not exists public.menu_item_progress (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  menu_item_id    text not null,
  viewed_at       timestamptz,
  marked_learned  boolean not null default false,
  updated_at      timestamptz not null default now(),
  unique (user_id, menu_item_id)
);

create index on public.menu_item_progress (user_id);

alter table public.menu_item_progress enable row level security;

create policy "Users can manage their own menu progress"
  on public.menu_item_progress for all
  using (auth.uid() = user_id);
