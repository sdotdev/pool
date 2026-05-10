# Pool — Codebase Guide for AI Assistants

**Pool** is a shared task quest board for teams. Team members claim work from a shared backlog, preventing overlap while earning points for completion. Built with Next.js 16, React 19, Supabase, and Tailwind CSS.

See [prd.md](./prd.md) for product vision and [docs/superpowers/plans/2026-05-09-pool-implementation.md](./docs/superpowers/plans/2026-05-09-pool-implementation.md) for detailed implementation plan.

---

## Quick Reference

| Aspect | Details |
|--------|---------|
| **Primary stack** | Next.js 16.2.6 (App Router), React 19, TypeScript 5, Tailwind v4, Supabase |
| **Runtime** | Node.js + browser (React Client Components) |
| **Database** | Supabase Postgres (RLS enforced, atomic functions) |
| **Auth** | Google OAuth via Supabase |
| **UI Components** | shadcn/ui (Button, Card, Dialog, Badge, etc.) |
| **Package manager** | npm |
| **Deploy** | Vercel (or any Node.js host) |
| **Dev server** | `npm run dev` → http://localhost:3000 |
| **Linting** | eslint 9 + eslint-config-next |
| **Type checking** | TypeScript strict mode |

---

## Project Structure

```
pool/
├── app/                          # Next.js App Router (v16 file-based routing)
│   ├── layout.tsx                # Root layout (Metadata, fonts)
│   ├── page.tsx                  # Root page (redirects to /board)
│   ├── proxy.ts                  # ⚠️ Auth guard (NOT middleware.ts — Next.js 16)
│   ├── auth/                     # Public auth routes
│   │   ├── page.tsx              # Google sign-in page
│   │   ├── google/               # OAuth endpoint
│   │   └── callback/
│   │       └── route.ts          # OAuth callback, profile upsert
│   ├── join/                     # Public join route (with invite token)
│   │   └── page.tsx              # Create or join board
│   └── (app)/                    # Protected routes (route group, no URL change)
│       ├── layout.tsx            # Authenticated layout (includes Nav)
│       ├── board/
│       │   ├── page.tsx          # Shared backlog board
│       │   └── my/
│       │       └── page.tsx      # Personal task board (filtered to owner)
│       ├── leaderboard/
│       │   └── page.tsx          # Points rankings by user
│       └── admin/
│           └── page.tsx          # Admin controls (invite link, token rotate)
│
├── components/                   # React components
│   ├── ui/                       # shadcn/ui generated (button, card, dialog, etc.)
│   ├── nav.tsx                   # Top navigation (links, user avatar, points)
│   ├── task-card.tsx             # Task display + claim/release/status buttons
│   ├── task-form.tsx             # Create/edit task form
│   ├── status-badge.tsx          # Colored status pill (open, claimed, done, etc.)
│   ├── board-realtime.tsx        # Client wrapper for Supabase realtime
│   └── invite-panel.tsx          # Copy invite link + rotate token
│
├── lib/                          # Core logic and utilities
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase client (@supabase/ssr)
│   │   └── server.ts             # Server Supabase client factory
│   ├── actions/                  # Next.js Server Actions (mutations)
│   │   ├── tasks.ts              # claim, release, create, update status, complete
│   │   └── admin.ts              # joinBoard, createBoard, rotateInviteToken
│   ├── dal.ts                    # Data Access Layer (getCurrentProfile)
│   ├── types.ts                  # TypeScript interfaces (Database, Task, Profile, etc.)
│   └── utils.ts                  # Shared helpers (if needed later)
│
├── supabase/                     # Database schema and migrations
│   └── migrations/
│       ├── 001_schema.sql        # Tables: boards, profiles, tasks, point_events
│       ├── 002_rls.sql           # Row-level security policies
│       └── 003_claim_fn.sql      # Atomic functions: claim_task, release_task
│
├── public/                       # Static assets (favicon, images)
├── docs/
│   └── superpowers/plans/
│       └── 2026-05-09-pool-implementation.md  # Detailed task-by-task build plan
├── .env.local                    # Local env (not committed): NEXT_PUBLIC_SUPABASE_URL, etc.
├── eslint.config.mjs             # ESLint config
├── next.config.ts                # Next.js config
├── tsconfig.json                 # TypeScript compiler options
├── package.json                  # Dependencies and scripts
├── CLAUDE.md                     # This file
├── AGENTS.md                     # Notes on Next.js 16 breaking changes
├── README.md                     # Basic setup guide
└── prd.md                        # Product requirements
```

---

## Database Schema (Supabase Postgres)

### Tables

**`boards`** — Team workspaces
- `id` (uuid, pk)
- `name` (text, default 'Pool')
- `invite_token` (uuid) — rotatable link for onboarding
- `created_at` (timestamptz)

**`profiles`** — Team members
- `id` (uuid, pk, fk to auth.users)
- `board_id` (uuid, fk to boards) — null until user joins
- `display_name` (text, nullable)
- `avatar_url` (text, nullable)
- `role` (text: 'contributor' | 'coordinator' | 'admin')
- `points` (integer, default 0)
- `created_at` (timestamptz)

**`tasks`** — Team work items
- `id` (uuid, pk)
- `board_id` (uuid, fk to boards)
- `title`, `description` (text)
- `status` (text: 'open' | 'claimed' | 'in_progress' | 'blocked' | 'review' | 'done' | 'archived')
- `owner_id` (uuid, nullable, fk to profiles) — exactly one owner per task
- `created_by` (uuid, fk to profiles) — who created it
- `points` (integer, default 10) — awarded on completion
- `difficulty` (text: 'easy' | 'medium' | 'hard') — affects points (5/10/20)
- `tags` (text[]) — e.g., ['design', 'urgent']
- `due_date`, `blocked_reason` (text, nullable)
- `created_at`, `updated_at` (timestamptz)

**`point_events`** — Audit log of point awards
- `id` (uuid, pk)
- `board_id`, `user_id`, `task_id` (fk)
- `points` (integer)
- `created_at` (timestamptz)

### Atomic Functions (PL/pgSQL)

**`claim_task(p_task_id, p_user_id)`** — Race-condition-safe claiming
- Locks row with `FOR UPDATE`
- Fails if status ≠ 'open' or owner_id ≠ null
- Returns updated task

**`release_task(p_task_id, p_user_id)`** — Release claim (owner or admin)
- Sets status='open', owner_id=null
- Verifies permission

**`increment_points(user_id, amount)`** — Award points on task completion
- Atomically adds to profile.points
- Logs event in point_events

### Row-Level Security (RLS)

All tables have RLS enabled. Key policies:
- **boards**: Members can read only their board
- **profiles**: Members can read board members; users update own profile
- **tasks**: Members read all tasks; coordinators/admins create; owners and coordinators update
- **point_events**: Members read only board events

---

## Key Conventions

### 1. Server Components vs. Client Components

- **Server Components** (default): Pages and data-fetching parents
  - Use `async` functions
  - Call Supabase server client directly
  - Fetch related data with `.select('*, owner:profiles(...), creator:profiles(...)')`
  - Server Actions live in `lib/actions/`

- **Client Components** (`'use client'`): Forms, interactive UI, state
  - Use hooks: `useState`, `useTransition`, `useRouter`
  - Call Server Actions for mutations
  - Wrap with `useTransition()` for loading states

**Example Pattern:**
```typescript
// Server Component (page.tsx)
import { TaskCard } from '@/components/task-card'
export default async function BoardPage() {
  const profile = await getCurrentProfile()
  const { data: tasks } = await supabase.from('tasks').select(...)
  return <div>{tasks.map(t => <TaskCard task={t} currentProfile={profile} />)}</div>
}

// Client Component (task-card.tsx)
'use client'
import { claimTask } from '@/lib/actions/tasks'
export function TaskCard({ task, currentProfile }) {
  const [pending, startTransition] = useTransition()
  return (
    <button onClick={() => startTransition(() => claimTask(task.id))}>
      {pending ? 'Claiming…' : 'Claim'}
    </button>
  )
}
```

### 2. Server Actions (Mutations)

All database writes go through Server Actions in `lib/actions/`.

```typescript
'use server'
import { getCurrentProfile } from '@/lib/dal'
import { revalidatePath } from 'next/cache'

export async function claimTask(taskId: string) {
  const profile = await getCurrentProfile()
  const supabase = await createClient()
  
  // Use atomic RPC for critical operations
  const { error } = await supabase.rpc('claim_task', {
    p_task_id: taskId,
    p_user_id: profile.id,
  })
  
  if (error) throw new Error(error.message)
  
  // Revalidate affected paths so Server Components re-fetch
  revalidatePath('/board')
  revalidatePath('/board/my')
}
```

**Key rules:**
- All Server Actions start with `'use server'` pragma
- Use `getCurrentProfile()` to get auth user + board membership
- Call Supabase server client
- On success, call `revalidatePath()` for any page that displays the changed data
- Throw errors; they surface as form validation or toasts

### 3. Data Types

Always use TypeScript interfaces from `lib/types.ts`. Generated from schema but hand-extended:

```typescript
export interface Task {
  id: string
  board_id: string
  title: string
  status: TaskStatus // literal type: 'open' | 'claimed' | ...
  owner_id: string | null
  // ... rest of fields
}

export interface TaskWithOwner extends Task {
  owner: Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null
  creator: Pick<Profile, 'id' | 'display_name'> | null
}

// Supabase client is typed with Database interface
const supabase = createClient<Database>()
```

### 4. Authentication & Authorization

- **Auth** happens via `supabase.auth.getUser()` (set by proxy)
- **Profile check** via `getCurrentProfile()` — cached per request, redirects if missing
- **Role check** inline in Server Actions:
  ```typescript
  const profile = await getCurrentProfile()
  if (!['coordinator', 'admin'].includes(profile.role)) throw new Error('forbidden')
  ```

The `proxy.ts` file is the auth guard:
- Runs on every request (configured via matcher)
- Ensures cookies stay fresh
- Redirects unauthenticated users to `/auth`
- Allows public routes: `/auth`, `/join`

### 5. UI & Components

**shadcn/ui + Tailwind v4:**
- Use shadcn components for consistent design: Button, Card, Dialog, Badge, etc.
- Install new ones with `npx shadcn@latest add <name>`
- Style with Tailwind utility classes
- Dark mode supported via CSS variables

**Patterns:**
- **Forms**: Use `<form action={serverAction}>` + `useTransition()` for state
- **Dialogs**: Wrap form in Dialog, pass `onDone` callback to close
- **Loading**: Use `useTransition()` to disable buttons during submission
- **Error handling**: Catch errors, show toasts (implement Toast component if needed)

### 6. Realtime

Tasks table has realtime enabled in Supabase. `BoardRealtime` component listens for changes:

```typescript
// components/board-realtime.tsx
'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function BoardRealtime({ boardId }) {
  const router = useRouter()
  const supabase = createClient()
  
  useEffect(() => {
    const channel = supabase.channel(`board:${boardId}`).on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tasks', filter: `board_id=eq.${boardId}` },
      () => router.refresh()
    ).subscribe()
    
    return () => supabase.removeChannel(channel)
  }, [boardId, router, supabase])
  
  return null
}
```

Add to board page: `<BoardRealtime boardId={profile.board_id!} />`

---

## Development Workflow

### Setup

```bash
# Install dependencies
npm install

# Create .env.local with Supabase credentials
echo "NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co" > .env.local
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key" >> .env.local
echo "NEXT_PUBLIC_APP_URL=http://localhost:3000" >> .env.local

# Run migrations in Supabase dashboard
# (paste 001, 002, 003 from supabase/migrations/ into SQL editor)

# Start dev server
npm run dev
```

### Before Writing Code

1. **Read the plan**: See `docs/superpowers/plans/2026-05-09-pool-implementation.md` for task breakdown
2. **Understand scope**: Don't over-abstract; build CRUD first
3. **Check types**: Look at `lib/types.ts` for interfaces
4. **Check existing actions**: See `lib/actions/` before creating new ones
5. **Lint/type-check**: `npm run lint` and `npx tsc --noEmit`

### Adding Features

1. **Database changes**: Create SQL migration in `supabase/migrations/`
2. **Types**: Update `lib/types.ts` with new interfaces
3. **Server Actions**: Add to `lib/actions/` (export, `'use server'`, revalidate paths)
4. **UI Components**: Create in `components/`
5. **Pages**: Create in `app/(app)/` or `app/` depending on auth requirement
6. **Test**: Run `npm run dev`, exercise the feature end-to-end

### Commits

Follow semantic commit style:
- `feat: <description>` — new feature
- `fix: <description>` — bug fix
- `refactor: <description>` — code restructure without behavior change
- `chore: <description>` — deps, config, tooling

Example:
```bash
git add lib/actions/tasks.ts
git commit -m "feat: atomic claim_task with race-condition protection"
```

---

## Critical Implementation Details

### ⚠️ Next.js 16 Breaking Changes

1. **`proxy.ts` not `middleware.ts`** — Next.js 16 renamed middleware to proxy
   - File must be at project root: `proxy.ts`
   - Export named function: `export async function proxy(request)`
   - Not a default export
   - See [AGENTS.md](./AGENTS.md) for details

2. **`refresh()` from `next/cache`** — Router refresh pattern changed
   - Old: `router.refresh()`
   - Use realtime subscriptions + `router.refresh()` for manual sync

3. **`searchParams` is async** — Layout/page `searchParams` is now a Promise
   ```typescript
   export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
     const { token } = await searchParams
   }
   ```

4. **Read `node_modules/next/dist/docs/` before touching routing code**

### Atomic Claiming (Race Condition Safe)

Tasks must prevent two users from claiming the same task. Solution:

```sql
-- In Postgres function with FOR UPDATE lock
select * from tasks where id = $1 and status = 'open' and owner_id is null for update;
update tasks set status = 'claimed', owner_id = $2 where id = $1;
```

The `for update` row lock ensures serialized access. Server Action calls this RPC:

```typescript
await supabase.rpc('claim_task', { p_task_id: taskId, p_user_id: profile.id })
```

### Points System

- Task has `points` field based on difficulty (easy=5, medium=10, hard=20)
- On task completion (status='done'), a `point_event` is logged
- `increment_points()` RPC atomically updates `profiles.points`
- Leaderboard queries `order by points desc`

### RLS & Multi-Tenancy

- Users belong to one board (board_id in profiles)
- All queries implicitly filter to board via RLS
- Example: `select * from tasks where board_id in (select board_id from profiles where id = auth.uid())`
- No manual board_id checks needed in app code — RLS handles it

---

## Common Tasks

### Adding a New Page

1. Create route folder + page.tsx in `app/(app)/` (protected) or `app/` (public)
2. Fetch data in Server Component
3. Render UI with client subcomponents
4. Link from nav component

### Adding a New Feature to Tasks

1. Update schema (migration)
2. Update types in `lib/types.ts`
3. Add Server Action in `lib/actions/tasks.ts`
4. Call from TaskCard or form component
5. Revalidate affected pages

### Debugging

- **Server logs**: Check console output when running `npm run dev`
- **Supabase logs**: Dashboard → Logs (PostgreSQL, Realtime, Edge Functions)
- **Client logs**: Browser DevTools Console
- **Type errors**: `npx tsc --noEmit`
- **Lint errors**: `npm run lint`

### Deployment

```bash
# Vercel (recommended)
vercel deploy

# Environment variables at https://vercel.com/[project]/settings/environment-variables:
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY
# NEXT_PUBLIC_APP_URL (e.g., https://your-domain.com)
```

---

## Testing Checklist

Before marking work done, verify:

- [ ] TypeScript strict mode: `npx tsc --noEmit` (no errors)
- [ ] Lint: `npm run lint` (no warnings)
- [ ] Auth flow: Can sign in with Google, redirects correctly
- [ ] Board creation: New user creates board, becomes admin
- [ ] Invite: Can copy/rotate invite link, second user joins same board
- [ ] Task creation: Coordinator can create task (appears on board)
- [ ] Task claiming: Only one user can claim; prevents race conditions (test with two tabs)
- [ ] Task status flow: Owner can move claimed → in_progress → review → done
- [ ] Points awarded: Completing task increments profile.points, appears on leaderboard
- [ ] Personal board: Owner's claimed tasks appear only on their `/board/my`
- [ ] Realtime sync: Open two tabs, claim task in tab 1, tab 2 updates without refresh
- [ ] Admin controls: Can rotate invite token
- [ ] Role enforcement: Contributors cannot create tasks; admins can do anything

---

## Key Files Quick Reference

| File | Purpose |
|------|---------|
| `lib/types.ts` | All TypeScript interfaces — start here for data shape |
| `lib/supabase/server.ts` | Supabase client factory for Server Components |
| `lib/supabase/client.ts` | Browser Supabase client for realtime + client components |
| `lib/dal.ts` | `getCurrentProfile()` — auth + board membership check |
| `lib/actions/tasks.ts` | All task mutations (create, claim, complete) |
| `lib/actions/admin.ts` | Board creation, joining, token rotation |
| `proxy.ts` | Auth guard (redirects unauthed to /auth) |
| `components/nav.tsx` | Top navigation (present on all app pages) |
| `components/task-card.tsx` | Task display + interactive buttons |
| `supabase/migrations/*.sql` | Database schema, RLS, atomic functions |
| `prd.md` | Product requirements and scope |
| `docs/superpowers/plans/...md` | Detailed step-by-step build plan |

---

## Useful Commands

```bash
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Build for production
npm run start            # Run production server
npm run lint             # Check for lint issues
npx tsc --noEmit        # Type-check without emitting
npm list <package>      # Check if package is installed
npx shadcn@latest add   # Add new shadcn component
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Cannot find module '@supabase/ssr'` | Run `npm install @supabase/ssr @supabase/supabase-js` |
| `RLS policy denies access` | Check auth.uid() matches profiles.id; verify board_id is set |
| `Task claim fails silently` | Check Server Action error in browser console; verify status='open' |
| `Realtime not updating` | Verify realtime enabled in Supabase dashboard; check channel subscription |
| `Redirect loop at /auth` | Check proxy.ts matcher; ensure `/auth` and `/join` are public |
| `TypeScript errors in components/ui/` | shadcn files are auto-generated; do not edit by hand |

---

## Next Steps for Implementers

1. Follow the task list in `docs/superpowers/plans/2026-05-09-pool-implementation.md`
2. Complete phases sequentially (1 → 2 → 3 → 4)
3. Phases 5+ can be parallelized by multiple agents
4. Commit after each task with semantic messages
5. Run type-check and lint before pushing
6. Test end-to-end on the live dev server after each phase

---

**Last updated:** 2026-05-10 | **Plan version:** 0.1 (MVP scope)
