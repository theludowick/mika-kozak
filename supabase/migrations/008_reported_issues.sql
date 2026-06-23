create table if not exists reported_issues (
  id                uuid        primary key default gen_random_uuid(),
  item_id           text        not null,
  item_name         text        not null,
  message           text        not null,
  submitted_by      uuid        not null,
  submitted_by_name text,
  resolved          boolean     not null default false,
  resolved_by       uuid,
  resolved_by_name  text,
  resolved_at       timestamptz,
  created_at        timestamptz not null default now()
);

alter table reported_issues enable row level security;

-- Any authenticated user can submit an issue about themselves
create policy "users_insert_reported_issues"
  on reported_issues for insert
  to authenticated
  with check (submitted_by = auth.uid());

-- Only admins can read issues
create policy "admin_select_reported_issues"
  on reported_issues for select
  to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.is_admin = true
    )
  );

-- Only admins can resolve issues
create policy "admin_update_reported_issues"
  on reported_issues for update
  to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.is_admin = true
    )
  )
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.is_admin = true
    )
  );
