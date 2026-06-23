create table if not exists hidden_positions (
  location     text not null,
  position_code text not null,
  primary key (location, position_code)
);

alter table hidden_positions enable row level security;

-- All authenticated users can read (quiz setup needs this)
create policy "authenticated_read_hidden_positions"
  on hidden_positions for select
  to authenticated
  using (true);

-- Only admins can write
create policy "admin_write_hidden_positions"
  on hidden_positions for all
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
