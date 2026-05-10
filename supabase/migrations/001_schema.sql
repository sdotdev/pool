create table boards (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Pool',
  invite_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  board_id uuid references boards(id),
  display_name text,
  avatar_url text,
  role text not null default 'contributor'
    check (role in ('contributor', 'coordinator', 'admin')),
  points integer not null default 0,
  created_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'open'
    check (status in ('open','claimed','in_progress','blocked','review','done','archived')),
  owner_id uuid references profiles(id),
  created_by uuid not null references profiles(id) on delete restrict,
  points integer not null default 10,
  difficulty text not null default 'medium'
    check (difficulty in ('easy','medium','hard')),
  tags text[] default '{}',
  due_date date,
  blocked_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table point_events (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references boards(id),
  user_id uuid not null references profiles(id),
  task_id uuid not null references tasks(id),
  points integer not null,
  created_at timestamptz not null default now()
);

-- auto-update updated_at
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tasks_updated_at
  before update on tasks
  for each row execute function set_updated_at();

-- Indexes for RLS policy performance and common queries
create index on profiles(board_id);
create index on tasks(board_id, status);
create index on tasks(owner_id);
create index on tasks(board_id, created_at desc);
create index on point_events(board_id, user_id);
