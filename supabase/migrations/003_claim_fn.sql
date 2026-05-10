-- Atomic claim: locks row, fails if not open/unowned
create or replace function claim_task(p_task_id uuid, p_user_id uuid)
returns tasks as $$
declare
  v_task tasks;
  v_board_id uuid;
begin
  -- Verify user is a board member
  select board_id into v_board_id
  from profiles where id = p_user_id;

  select * into v_task
  from tasks
  where id = p_task_id
    and status = 'open'
    and owner_id is null
    and board_id = v_board_id
  for update;

  if not found then
    raise exception 'task_not_available';
  end if;

  update tasks
  set status = 'claimed', owner_id = p_user_id, updated_at = now()
  where id = p_task_id
  returning * into v_task;

  return v_task;
end;
$$ language plpgsql security definer;

-- Release claim (owner or admin)
create or replace function release_task(p_task_id uuid, p_user_id uuid)
returns tasks as $$
declare
  v_task tasks;
  v_role text;
begin
  select role into v_role from profiles where id = p_user_id;

  select * into v_task
  from tasks
  where id = p_task_id
    and (owner_id = p_user_id or v_role in ('coordinator','admin'))
  for update;

  if not found then
    raise exception 'not_authorized';
  end if;

  update tasks
  set status = 'open', owner_id = null, updated_at = now()
  where id = p_task_id
  returning * into v_task;

  return v_task;
end;
$$ language plpgsql security definer;

-- Increment points atomically
create or replace function increment_points(user_id uuid, amount integer)
returns integer as $$
  update profiles set points = points + amount where id = user_id returning points;
$$ language sql security definer;
