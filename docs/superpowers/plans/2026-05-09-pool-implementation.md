# Pool — Internal Task Quest Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build "Pool" — a multiplayer task board where team members claim work from a shared backlog, preventing overlap, with points and a leaderboard.

**Architecture:** Next.js 16.2.6 App Router with Supabase for auth (Google OAuth) and Postgres. RLS enforces read access; Server Actions handle all mutations (claim, complete, invite). Atomic claim uses a Postgres function with `FOR UPDATE` to prevent race conditions.

**Tech Stack:** Next.js 16.2.6, React 19, Tailwind v4, shadcn/ui, Supabase (`@supabase/ssr`), TypeScript

---

## ⚠️ Next.js 16 Breaking Changes

- **`proxy.ts`** replaces `middleware.ts` — export named `proxy`, not `middleware`
- **`refresh()`** from `next/cache` replaces the old router refresh pattern
- Read `node_modules/next/dist/docs/` before touching routing or auth code

---

## File Map

```
app/
  layout.tsx                     (modify: wrap with nav)
  page.tsx                       (modify: redirect to /board)
  proxy.ts                       (create: auth guard - NOT middleware.ts)
  auth/
    page.tsx                     (create: Google sign-in page)
    callback/
      route.ts                   (create: OAuth callback handler)
  join/
    page.tsx                     (create: join board via invite token)
  board/
    page.tsx                     (create: shared backlog - Server Component)
    my/
      page.tsx                   (create: personal board)
  leaderboard/
    page.tsx                     (create: points rankings)
  admin/
    page.tsx                     (create: invite link + admin controls)

lib/
  supabase/
    client.ts                    (create: browser Supabase client)
    server.ts                    (create: server Supabase client factory)
  actions/
    tasks.ts                     (create: claim, release, create, update, complete)
    admin.ts                     (create: rotateInviteToken, releaseStaleClam)
  dal.ts                         (create: verifySession, getCurrentProfile)
  types.ts                       (create: Database types - generated then hand-extended)

components/
  ui/                            (shadcn generated - do not hand-edit)
  task-card.tsx                  (create: task display + claim button)
  task-form.tsx                  (create: create/edit task form)
  status-badge.tsx               (create: colored status pill)
  board-realtime.tsx             (create: client component wrapping board for live updates)
  invite-panel.tsx               (create: show/copy/rotate invite link)
  nav.tsx                        (create: top nav with links + user avatar)

supabase/
  migrations/
    001_schema.sql               (create: tables)
    002_rls.sql                  (create: RLS policies)
    003_claim_fn.sql             (create: atomic claim_task() function)
```

---

## Phase 1 — Foundation (sequential, must complete before anything else)

### Task 1: Install dependencies

**Files:** `package.json`

- [ ] **Step 1: Install Supabase SSR and shadcn**

```bash
npm install @supabase/ssr @supabase/supabase-js
npx shadcn@latest init
```

When `shadcn init` prompts:
- Style: Default
- Base color: Slate
- CSS variables: Yes

- [ ] **Step 2: Install shadcn components we'll use**

```bash
npx shadcn@latest add button badge card dialog input label textarea select avatar dropdown-menu separator toast
```

- [ ] **Step 3: Verify package.json has the deps**

```bash
npm list @supabase/ssr @supabase/supabase-js
```
Expected: both listed without errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json components.json components/ui
git commit -m "chore: install supabase ssr and shadcn/ui"
```

---

### Task 2: Supabase project setup + schema

**Files:** `supabase/migrations/001_schema.sql`, `supabase/migrations/002_rls.sql`, `supabase/migrations/003_claim_fn.sql`, `.env.local`

- [ ] **Step 1: Create a Supabase project**

Go to supabase.com → New project. Note the project URL and anon key.

- [ ] **Step 2: Create `.env.local`**

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 3: Create migration 001 — tables**

Create `supabase/migrations/001_schema.sql`:

```sql
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
  created_by uuid not null references profiles(id),
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
```

- [ ] **Step 4: Create migration 002 — RLS**

Create `supabase/migrations/002_rls.sql`:

```sql
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
```

- [ ] **Step 5: Create migration 003 — atomic claim function**

Create `supabase/migrations/003_claim_fn.sql`:

```sql
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
```

- [ ] **Step 6: Run migrations in Supabase SQL editor**

Paste and run each migration file in order in the Supabase dashboard → SQL editor.

- [ ] **Step 7: Enable Google OAuth in Supabase**

Dashboard → Authentication → Providers → Google → Enable.
Add your Google OAuth client ID and secret (from Google Cloud Console).
Set callback URL: `https://your-project.supabase.co/auth/v1/callback`

- [ ] **Step 8: Commit migrations**

```bash
git add supabase/ .env.local
git commit -m "feat: supabase schema, rls, and atomic claim function"
```

---

## Phase 2 — Supabase clients + types (sequential after Phase 1)

### Task 3: Supabase client helpers + database types

**Files:** `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/types.ts`

- [ ] **Step 1: Create browser client**

Create `lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: Create server client**

Create `lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/types'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 3: Create database types**

Create `lib/types.ts` with the schema types (hand-written to match migrations):

```typescript
export type Role = 'contributor' | 'coordinator' | 'admin'
export type TaskStatus = 'open' | 'claimed' | 'in_progress' | 'blocked' | 'review' | 'done' | 'archived'
export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Board {
  id: string
  name: string
  invite_token: string
  created_at: string
}

export interface Profile {
  id: string
  board_id: string | null
  display_name: string | null
  avatar_url: string | null
  role: Role
  points: number
  created_at: string
}

export interface Task {
  id: string
  board_id: string
  title: string
  description: string | null
  status: TaskStatus
  owner_id: string | null
  created_by: string
  points: number
  difficulty: Difficulty
  tags: string[]
  due_date: string | null
  blocked_reason: string | null
  created_at: string
  updated_at: string
}

export interface PointEvent {
  id: string
  board_id: string
  user_id: string
  task_id: string
  points: number
  created_at: string
}

// Joined types used in UI
export interface TaskWithOwner extends Task {
  owner: Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null
  creator: Pick<Profile, 'id' | 'display_name'> | null
}

export interface Database {
  public: {
    Tables: {
      boards: { Row: Board; Insert: Omit<Board, 'id' | 'invite_token' | 'created_at'>; Update: Partial<Board> }
      profiles: { Row: Profile; Insert: Omit<Profile, 'created_at'>; Update: Partial<Profile> }
      tasks: { Row: Task; Insert: Omit<Task, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Task> }
      point_events: { Row: PointEvent; Insert: Omit<PointEvent, 'id' | 'created_at'>; Update: never }
    }
    Functions: {
      claim_task: { Args: { p_task_id: string; p_user_id: string }; Returns: Task }
      release_task: { Args: { p_task_id: string; p_user_id: string }; Returns: Task }
    }
  }
}
```

- [ ] **Step 4: Create DAL (data access layer)**

Create `lib/dal.ts`:

```typescript
import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Profile } from '@/lib/types'

export const getCurrentProfile = cache(async (): Promise<Profile> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/join')

  return profile
})
```

- [ ] **Step 5: Commit**

```bash
git add lib/
git commit -m "feat: supabase client helpers, database types, and DAL"
```

---

## Phase 3 — Auth flow (sequential after Task 3)

### Task 4: Proxy (auth guard) + auth pages

**Files:** `proxy.ts`, `app/auth/page.tsx`, `app/auth/callback/route.ts`

> ⚠️ Next.js 16: This file is `proxy.ts` at the root, NOT `middleware.ts`.

- [ ] **Step 1: Create `proxy.ts`**

Create `proxy.ts` at the project root:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isPublic = pathname.startsWith('/auth') || pathname.startsWith('/join')

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)'],
}
```

- [ ] **Step 2: Create auth page**

Create `app/auth/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function AuthPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/board')

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Pool</CardTitle>
          <p className="text-sm text-muted-foreground">
            Sign in to access your team's task board.
          </p>
        </CardHeader>
        <CardContent>
          <form action="/auth/google" method="POST">
            <Button type="submit" className="w-full">
              Continue with Google
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Create Google OAuth route handler**

Create `app/auth/google/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function POST() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error || !data.url) redirect('/auth?error=oauth_failed')
  redirect(data.url)
}
```

Add `NEXT_PUBLIC_APP_URL=http://localhost:3000` to `.env.local`.

- [ ] **Step 4: Create OAuth callback route**

Create `app/auth/callback/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Check if profile exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, board_id')
        .eq('id', data.user.id)
        .single()

      if (!profile) {
        // New user — create profile stub, redirect to join
        await supabase.from('profiles').insert({
          id: data.user.id,
          display_name: data.user.user_metadata?.full_name ?? null,
          avatar_url: data.user.user_metadata?.avatar_url ?? null,
          board_id: null,
        })
        return NextResponse.redirect(`${origin}/join`)
      }

      if (!profile.board_id) {
        return NextResponse.redirect(`${origin}/join`)
      }

      return NextResponse.redirect(`${origin}/board`)
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=callback_failed`)
}
```

- [ ] **Step 5: Update root `app/page.tsx` to redirect**

Edit `app/page.tsx`:

```typescript
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/board')
}
```

- [ ] **Step 6: Test auth flow**

```bash
npm run dev
```

Open `http://localhost:3000` → should redirect to `/auth` → click Google → complete OAuth → should land on `/join` (no board yet).

- [ ] **Step 7: Commit**

```bash
git add app/ proxy.ts .env.local
git commit -m "feat: google oauth auth flow with next.js 16 proxy"
```

---

### Task 5: Join board page + invite system

**Files:** `app/join/page.tsx`, `lib/actions/admin.ts`

- [ ] **Step 1: Create the Server Action for joining a board**

Create `lib/actions/admin.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/dal'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function joinBoard(token: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('unauthenticated')

  const { data: board } = await supabase
    .from('boards')
    .select('id')
    .eq('invite_token', token)
    .single()

  if (!board) throw new Error('invalid_token')

  await supabase
    .from('profiles')
    .update({ board_id: board.id })
    .eq('id', user.id)

  redirect('/board')
}

export async function rotateInviteToken() {
  const profile = await getCurrentProfile()
  if (profile.role !== 'admin') throw new Error('forbidden')

  const supabase = await createClient()
  const { data } = await supabase
    .from('boards')
    .update({ invite_token: crypto.randomUUID() })
    .eq('id', profile.board_id!)
    .select('invite_token')
    .single()

  revalidatePath('/admin')
  return data?.invite_token
}

export async function createBoard(name: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('unauthenticated')

  // Check user has no board yet
  const { data: existing } = await supabase
    .from('profiles')
    .select('board_id')
    .eq('id', user.id)
    .single()

  if (existing?.board_id) redirect('/board')

  const { data: board } = await supabase
    .from('boards')
    .insert({ name })
    .select()
    .single()

  if (!board) throw new Error('board_create_failed')

  await supabase
    .from('profiles')
    .update({ board_id: board.id, role: 'admin' })
    .eq('id', user.id)

  redirect('/board')
}
```

- [ ] **Step 2: Create join page**

Create `app/join/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { joinBoard, createBoard } from '@/lib/actions/admin'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { token } = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-4">
        {token && (
          <Card>
            <CardHeader>
              <CardTitle>Join a board</CardTitle>
              <p className="text-sm text-muted-foreground">
                You've been invited to join a Pool board.
              </p>
            </CardHeader>
            <CardContent>
              <form action={async () => { 'use server'; await joinBoard(token) }}>
                <Button type="submit" className="w-full">Accept invite</Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Create a new board</CardTitle>
            <p className="text-sm text-muted-foreground">
              Start fresh. You'll be the admin.
            </p>
          </CardHeader>
          <CardContent>
            <form
              action={async (fd: FormData) => {
                'use server'
                await createBoard(fd.get('name') as string)
              }}
              className="space-y-3"
            >
              <div className="space-y-1">
                <Label htmlFor="name">Board name</Label>
                <Input id="name" name="name" placeholder="e.g. Design Sprint Q3" required />
              </div>
              <Button type="submit" variant="outline" className="w-full">Create board</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Test join flow**

```bash
npm run dev
```

1. Log in with Google → lands on `/join`
2. Click "Create board" with a name → should redirect to `/board`
3. Go to Supabase → check `boards` and `profiles` tables have correct data

- [ ] **Step 4: Commit**

```bash
git add app/join/ lib/actions/admin.ts
git commit -m "feat: join board and create board flow"
```

---

## Phase 4 — Core task actions (sequential after Phase 3)

### Task 6: Task Server Actions

**Files:** `lib/actions/tasks.ts`

- [ ] **Step 1: Create task actions**

Create `lib/actions/tasks.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/dal'
import { revalidatePath } from 'next/cache'
import type { TaskStatus, Difficulty } from '@/lib/types'

export async function createTask(formData: FormData) {
  const profile = await getCurrentProfile()
  if (!['coordinator', 'admin'].includes(profile.role)) throw new Error('forbidden')

  const supabase = await createClient()
  const difficulty = formData.get('difficulty') as Difficulty
  const pointsMap: Record<Difficulty, number> = { easy: 5, medium: 10, hard: 20 }

  const { error } = await supabase.from('tasks').insert({
    board_id: profile.board_id!,
    created_by: profile.id,
    title: formData.get('title') as string,
    description: formData.get('description') as string | null,
    difficulty,
    points: pointsMap[difficulty],
    tags: (formData.get('tags') as string ?? '').split(',').map(t => t.trim()).filter(Boolean),
    due_date: (formData.get('due_date') as string) || null,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/board')
}

export async function claimTask(taskId: string) {
  const profile = await getCurrentProfile()
  const supabase = await createClient()

  const { error } = await supabase.rpc('claim_task', {
    p_task_id: taskId,
    p_user_id: profile.id,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/board')
  revalidatePath('/board/my')
}

export async function releaseTask(taskId: string) {
  const profile = await getCurrentProfile()
  const supabase = await createClient()

  const { error } = await supabase.rpc('release_task', {
    p_task_id: taskId,
    p_user_id: profile.id,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/board')
  revalidatePath('/board/my')
}

export async function updateTaskStatus(taskId: string, status: TaskStatus, blockedReason?: string) {
  const profile = await getCurrentProfile()
  const supabase = await createClient()

  const { data: task } = await supabase
    .from('tasks')
    .select('owner_id, board_id')
    .eq('id', taskId)
    .single()

  if (!task) throw new Error('not_found')
  const canEdit = task.owner_id === profile.id || ['coordinator', 'admin'].includes(profile.role)
  if (!canEdit) throw new Error('forbidden')

  const { error } = await supabase
    .from('tasks')
    .update({
      status,
      blocked_reason: status === 'blocked' ? blockedReason ?? null : null,
    })
    .eq('id', taskId)

  if (error) throw new Error(error.message)

  // Award points on completion
  if (status === 'done' && task.owner_id) {
    const { data: taskData } = await supabase
      .from('tasks')
      .select('points')
      .eq('id', taskId)
      .single()

    if (taskData) {
      await supabase.from('point_events').insert({
        board_id: task.board_id,
        user_id: task.owner_id,
        task_id: taskId,
        points: taskData.points,
      })
      await supabase
        .from('profiles')
        .update({ points: supabase.rpc('increment_points', { user_id: task.owner_id, amount: taskData.points }) as unknown as number })
        .eq('id', task.owner_id)
    }
  }

  revalidatePath('/board')
  revalidatePath('/board/my')
  revalidatePath('/leaderboard')
}
```

> Note: `increment_points` RPC needs to be added. Add this SQL to Supabase:
> ```sql
> create or replace function increment_points(user_id uuid, amount integer)
> returns integer as $$
>   update profiles set points = points + amount where id = user_id returning points;
> $$ language sql;
> ```

- [ ] **Step 2: Add increment_points function in Supabase SQL editor**

```sql
create or replace function increment_points(user_id uuid, amount integer)
returns integer as $$
  update profiles set points = points + amount where id = user_id returning points;
$$ language sql security definer;
```

- [ ] **Step 3: Commit**

```bash
git add lib/actions/tasks.ts
git commit -m "feat: task server actions - create, claim, release, status update, points"
```

---

## Phase 5 — UI pages (parallel after Task 6)

> Tasks 7, 8, 9, and 10 can be implemented by parallel agents simultaneously.

---

### Task 7: Shared board page (main backlog)

**Files:** `app/board/page.tsx`, `components/task-card.tsx`, `components/status-badge.tsx`, `components/task-form.tsx`, `components/nav.tsx`

- [ ] **Step 1: Create StatusBadge component**

Create `components/status-badge.tsx`:

```typescript
import { Badge } from '@/components/ui/badge'
import type { TaskStatus } from '@/lib/types'

const colors: Record<TaskStatus, string> = {
  open: 'bg-slate-100 text-slate-700',
  claimed: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  blocked: 'bg-red-100 text-red-700',
  review: 'bg-purple-100 text-purple-700',
  done: 'bg-green-100 text-green-700',
  archived: 'bg-gray-100 text-gray-500',
}

const labels: Record<TaskStatus, string> = {
  open: 'Open',
  claimed: 'Claimed',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  review: 'Review',
  done: 'Done',
  archived: 'Archived',
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge variant="outline" className={colors[status]}>
      {labels[status]}
    </Badge>
  )
}
```

- [ ] **Step 2: Create TaskCard component**

Create `components/task-card.tsx`:

```typescript
'use client'

import { useTransition } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/status-badge'
import { claimTask, releaseTask, updateTaskStatus } from '@/lib/actions/tasks'
import type { TaskWithOwner, Profile, TaskStatus } from '@/lib/types'

const NEXT_STATUS: Partial<Record<TaskStatus, TaskStatus>> = {
  claimed: 'in_progress',
  in_progress: 'review',
  review: 'done',
}

export function TaskCard({
  task,
  currentProfile,
}: {
  task: TaskWithOwner
  currentProfile: Profile
}) {
  const [pending, startTransition] = useTransition()
  const isOwner = task.owner_id === currentProfile.id
  const canCoordinate = ['coordinator', 'admin'].includes(currentProfile.role)

  return (
    <Card className="group">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-sm leading-snug">{task.title}</h3>
          <StatusBadge status={task.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {task.difficulty} · {task.points}pts
          </Badge>
          {task.tags.map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
          ))}
        </div>

        {task.owner && (
          <p className="text-xs text-muted-foreground">
            → {task.owner.display_name ?? 'Someone'}
          </p>
        )}

        <div className="flex gap-2">
          {task.status === 'open' && (
            <Button
              size="sm"
              disabled={pending}
              onClick={() => startTransition(() => claimTask(task.id))}
            >
              Claim
            </Button>
          )}

          {isOwner && task.status in NEXT_STATUS && (
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                startTransition(() =>
                  updateTaskStatus(task.id, NEXT_STATUS[task.status]!)
                )
              }
            >
              Mark {NEXT_STATUS[task.status]?.replace('_', ' ')}
            </Button>
          )}

          {(isOwner || canCoordinate) &&
            ['claimed', 'in_progress', 'blocked'].includes(task.status) && (
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => startTransition(() => releaseTask(task.id))}
              >
                Release
              </Button>
            )}
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Create TaskForm component**

Create `components/task-form.tsx`:

```typescript
'use client'

import { useTransition, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createTask } from '@/lib/actions/tasks'

export function TaskForm({ onDone }: { onDone?: () => void }) {
  const [pending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <form
      ref={formRef}
      action={(fd) => {
        startTransition(async () => {
          await createTask(fd)
          formRef.current?.reset()
          onDone?.()
        })
      }}
      className="space-y-3"
    >
      <div className="space-y-1">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required placeholder="What needs doing?" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={2} placeholder="Optional details" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Difficulty</Label>
          <Select name="difficulty" defaultValue="medium">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy (5pts)</SelectItem>
              <SelectItem value="medium">Medium (10pts)</SelectItem>
              <SelectItem value="hard">Hard (20pts)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="due_date">Due date</Label>
          <Input id="due_date" name="due_date" type="date" />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="tags">Tags</Label>
        <Input id="tags" name="tags" placeholder="design, backend, urgent" />
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Adding…' : 'Add task'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 4: Create Nav component**

Create `components/nav.tsx`:

```typescript
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getCurrentProfile } from '@/lib/dal'

export async function Nav() {
  const profile = await getCurrentProfile()

  return (
    <header className="border-b bg-background">
      <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
        <nav className="flex items-center gap-6">
          <Link href="/board" className="font-semibold text-sm">Pool</Link>
          <Link href="/board" className="text-sm text-muted-foreground hover:text-foreground">Board</Link>
          <Link href="/board/my" className="text-sm text-muted-foreground hover:text-foreground">My tasks</Link>
          <Link href="/leaderboard" className="text-sm text-muted-foreground hover:text-foreground">Leaderboard</Link>
          {profile.role === 'admin' && (
            <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">Admin</Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{profile.points}pts</span>
          <Avatar className="h-7 w-7">
            <AvatarImage src={profile.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs">
              {(profile.display_name ?? 'U').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 5: Update root layout to include Nav**

Edit `app/layout.tsx` — add Nav inside body, skip it on auth/join routes:

```typescript
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = { title: 'Pool', description: 'Team task board' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
```

Create `app/(app)/layout.tsx` for authenticated routes (board, leaderboard, admin):

```typescript
import { Nav } from '@/components/nav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </>
  )
}
```

Move `app/board/`, `app/leaderboard/`, `app/admin/` under `app/(app)/` (route group — no URL change).

- [ ] **Step 6: Create shared board page**

Create `app/(app)/board/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/dal'
import { TaskCard } from '@/components/task-card'
import { TaskForm } from '@/components/task-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { TaskWithOwner } from '@/lib/types'

export default async function BoardPage() {
  const [profile, supabase] = await Promise.all([
    getCurrentProfile(),
    createClient(),
  ])

  const { data: tasks } = await (await supabase)
    .from('tasks')
    .select(`
      *,
      owner:profiles!tasks_owner_id_fkey(id, display_name, avatar_url),
      creator:profiles!tasks_created_by_fkey(id, display_name)
    `)
    .eq('board_id', profile.board_id!)
    .not('status', 'eq', 'archived')
    .order('created_at', { ascending: false })

  const open = (tasks ?? []).filter(t => t.status === 'open') as TaskWithOwner[]
  const inProgress = (tasks ?? []).filter(t => ['claimed','in_progress','blocked','review'].includes(t.status)) as TaskWithOwner[]

  const canCreate = ['coordinator', 'admin'].includes(profile.role)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Board</h1>
        {canCreate && (
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">+ Add task</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New task</DialogTitle>
              </DialogHeader>
              <TaskForm />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Open ({open.length})
        </h2>
        {open.length === 0 && (
          <p className="text-sm text-muted-foreground">No open tasks.</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {open.map(task => (
            <TaskCard key={task.id} task={task} currentProfile={profile} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          In progress ({inProgress.length})
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {inProgress.map(task => (
            <TaskCard key={task.id} task={task} currentProfile={profile} />
          ))}
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 7: Test board page**

```bash
npm run dev
```

1. Log in, create a board
2. Navigate to `/board`
3. If you're coordinator/admin: click "+ Add task", fill in form, submit
4. Task should appear in Open section
5. Click "Claim" → task moves to In Progress section with your name

- [ ] **Step 8: Commit**

```bash
git add app/ components/
git commit -m "feat: shared board page with task cards, claim/release, and task form"
```

---

### Task 8: Personal board page

**Files:** `app/(app)/board/my/page.tsx`

- [ ] **Step 1: Create personal board page**

Create `app/(app)/board/my/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/dal'
import { TaskCard } from '@/components/task-card'
import type { TaskWithOwner, TaskStatus } from '@/lib/types'

const SECTIONS: { label: string; statuses: TaskStatus[] }[] = [
  { label: 'To do', statuses: ['claimed'] },
  { label: 'In progress', statuses: ['in_progress', 'blocked'] },
  { label: 'Review', statuses: ['review'] },
  { label: 'Done', statuses: ['done'] },
]

export default async function MyBoardPage() {
  const profile = await getCurrentProfile()
  const supabase = await createClient()

  const { data: tasks } = await supabase
    .from('tasks')
    .select(`
      *,
      owner:profiles!tasks_owner_id_fkey(id, display_name, avatar_url),
      creator:profiles!tasks_created_by_fkey(id, display_name)
    `)
    .eq('owner_id', profile.id)
    .not('status', 'in', '("archived")')
    .order('updated_at', { ascending: false })

  const myTasks = (tasks ?? []) as TaskWithOwner[]

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">My tasks</h1>
      {myTasks.length === 0 && (
        <p className="text-sm text-muted-foreground">
          You haven't claimed any tasks yet. Head to the{' '}
          <a href="/board" className="underline">board</a> to pick something up.
        </p>
      )}
      {SECTIONS.map(({ label, statuses }) => {
        const sectionTasks = myTasks.filter(t => statuses.includes(t.status))
        if (sectionTasks.length === 0) return null
        return (
          <section key={label} className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">
              {label} ({sectionTasks.length})
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sectionTasks.map(task => (
                <TaskCard key={task.id} task={task} currentProfile={profile} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Test personal board**

1. Claim a task from `/board`
2. Navigate to `/board/my`
3. Task should appear in "To do" section
4. Click "Mark in progress" → moves to "In progress"

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/board/my/
git commit -m "feat: personal board page showing owned tasks by status"
```

---

### Task 9: Leaderboard page

**Files:** `app/(app)/leaderboard/page.tsx`

- [ ] **Step 1: Create leaderboard page**

Create `app/(app)/leaderboard/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/dal'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { Profile } from '@/lib/types'

export default async function LeaderboardPage() {
  const profile = await getCurrentProfile()
  const supabase = await createClient()

  const { data: members } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, points, role')
    .eq('board_id', profile.board_id!)
    .order('points', { ascending: false })

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-xl font-semibold">Leaderboard</h1>
      <ol className="space-y-2">
        {(members ?? []).map((member: Profile, index) => (
          <li
            key={member.id}
            className={`flex items-center gap-3 p-3 rounded-lg border ${
              member.id === profile.id ? 'bg-muted' : 'bg-background'
            }`}
          >
            <span className="text-sm font-mono text-muted-foreground w-6 text-right">
              {index + 1}
            </span>
            <Avatar className="h-8 w-8">
              <AvatarImage src={member.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs">
                {(member.display_name ?? 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {member.display_name ?? 'Unnamed'}
                {member.id === profile.id && (
                  <span className="text-muted-foreground font-normal"> (you)</span>
                )}
              </p>
            </div>
            <span className="text-sm font-semibold tabular-nums">{member.points}pts</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
```

- [ ] **Step 2: Test leaderboard**

Complete a task (status → done) → navigate to `/leaderboard` → points should be reflected.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/leaderboard/
git commit -m "feat: leaderboard page sorted by points"
```

---

### Task 10: Admin page + invite panel

**Files:** `app/(app)/admin/page.tsx`, `components/invite-panel.tsx`

- [ ] **Step 1: Create InvitePanel client component**

Create `components/invite-panel.tsx`:

```typescript
'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { rotateInviteToken } from '@/lib/actions/admin'

export function InvitePanel({ inviteToken, appUrl }: { inviteToken: string; appUrl: string }) {
  const [token, setToken] = useState(inviteToken)
  const [copied, setCopied] = useState(false)
  const [pending, startTransition] = useTransition()

  const inviteUrl = `${appUrl}/join?token=${token}`

  const copy = () => {
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const rotate = () => {
    startTransition(async () => {
      const newToken = await rotateInviteToken()
      if (newToken) setToken(newToken)
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input value={inviteUrl} readOnly className="text-xs font-mono" />
        <Button size="sm" variant="outline" onClick={copy}>
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
      <Button size="sm" variant="ghost" onClick={rotate} disabled={pending}>
        {pending ? 'Rotating…' : 'Generate new link'}
      </Button>
      <p className="text-xs text-muted-foreground">
        Anyone with this link can join the board. Rotate it to invalidate the old link.
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Create admin page**

Create `app/(app)/admin/page.tsx`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/dal'
import { redirect } from 'next/navigation'
import { InvitePanel } from '@/components/invite-panel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function AdminPage() {
  const profile = await getCurrentProfile()
  if (profile.role !== 'admin') redirect('/board')

  const supabase = await createClient()
  const { data: board } = await supabase
    .from('boards')
    .select('invite_token, name')
    .eq('id', profile.board_id!)
    .single()

  if (!board) redirect('/board')

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-xl font-semibold">Admin — {board.name}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invite link</CardTitle>
        </CardHeader>
        <CardContent>
          <InvitePanel
            inviteToken={board.invite_token}
            appUrl={process.env.NEXT_PUBLIC_APP_URL!}
          />
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Test invite flow end-to-end**

1. Log in as admin → `/admin` → copy invite link
2. Open in incognito / different browser
3. Log in with a different Google account
4. You should be redirected to `/join?token=...` with the "Accept invite" button
5. Click accept → redirected to `/board`
6. Both users now see the same board

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/admin/ components/invite-panel.tsx
git commit -m "feat: admin page with invite link and rotate token"
```

---

## Phase 6 — Realtime (after Phase 5)

### Task 11: Realtime board updates

**Files:** `components/board-realtime.tsx`, modify `app/(app)/board/page.tsx`

- [ ] **Step 1: Create BoardRealtime client component**

Create `components/board-realtime.tsx`:

```typescript
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function BoardRealtime({ boardId }: { boardId: string }) {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`board:${boardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `board_id=eq.${boardId}`,
        },
        () => {
          router.refresh()
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [boardId, router, supabase])

  return null
}
```

- [ ] **Step 2: Add realtime to board page**

Edit `app/(app)/board/page.tsx` — add `<BoardRealtime>` at the top of the return:

```typescript
// At top of BoardPage return:
<div className="space-y-6">
  <BoardRealtime boardId={profile.board_id!} />
  {/* rest of board UI */}
</div>
```

- [ ] **Step 3: Enable realtime in Supabase**

Supabase dashboard → Database → Replication → enable replication for `tasks` table.

- [ ] **Step 4: Test realtime**

1. Open two browser windows, both logged into the same board
2. In window 1, claim a task
3. Window 2 should update within ~1 second without refresh

- [ ] **Step 5: Commit**

```bash
git add components/board-realtime.tsx app/\(app\)/board/page.tsx
git commit -m "feat: realtime board updates via supabase subscriptions"
```

---

## Parallelism Guide for Agents

```
Phase 1 (Task 1, 2) → sequential
Phase 2 (Task 3) → sequential after Phase 1
Phase 3 (Task 4, 5) → sequential after Phase 2
Phase 4 (Task 6) → sequential after Phase 3
Phase 5 (Tasks 7, 8, 9, 10) → PARALLEL after Task 6
Phase 6 (Task 11) → after Phase 5
```

**Dispatch 4 agents in parallel for Phase 5:** Task 7 (board page + components), Task 8 (my board), Task 9 (leaderboard), Task 10 (admin + invite panel).

---

## Verification Checklist

After all phases:

- [ ] `/auth` → Google OAuth → redirects to `/join` for new users
- [ ] `/join` → create board → redirects to `/board` as admin
- [ ] Share invite link → second user joins same board
- [ ] Coordinator/admin can create tasks on `/board`
- [ ] Two users cannot claim the same task (open two tabs, race to click Claim — only one succeeds)
- [ ] Claiming a task makes it appear on `/board/my` for that user
- [ ] Completing a task awards points and updates `/leaderboard`
- [ ] Admin can rotate invite token on `/admin`
- [ ] Board updates in realtime when another user claims/updates a task
