alter table boards enable row level security;
alter table profiles enable row level security;
alter table tasks enable row level security;
alter table point_events enable row level security;

-- boards: visible to members
create policy "board members can read board"
  on boards for select
  using (
    id in (select board_id from profiles where id = auth.uid())
  );

-- profiles: visible to board members
create policy "board members can read profiles"
  on profiles for select
  using (
    board_id in (select board_id from profiles where id = auth.uid())
  );

create policy "users can update own profile"
  on profiles for update
  using (id = auth.uid());

create policy "users can insert own profile"
  on profiles for insert
  with check (id = auth.uid());

-- tasks: board members can read
create policy "board members can read tasks"
  on tasks for select
  using (
    board_id in (select board_id from profiles where id = auth.uid())
  );

-- tasks: coordinator or admin can insert
create policy "coordinators can create tasks"
  on tasks for insert
  with check (
    board_id in (
      select board_id from profiles
      where id = auth.uid() and role in ('coordinator','admin')
    )
  );

-- tasks: owner can update status; coordinator/admin can update anything
create policy "task owners and coordinators can update tasks"
  on tasks for update
  using (
    board_id in (select board_id from profiles where id = auth.uid())
    and (
      owner_id = auth.uid()
      or exists (
        select 1 from profiles
        where id = auth.uid() and role in ('coordinator','admin')
      )
    )
  );

-- point_events: board members can read
create policy "board members can read point events"
  on point_events for select
  using (
    board_id in (select board_id from profiles where id = auth.uid())
  );
