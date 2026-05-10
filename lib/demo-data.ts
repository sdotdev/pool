import type { Profile, TaskWithOwner } from '@/lib/types'

export const DEMO_PROFILE: Profile = {
  id: 'demo-user-1',
  board_id: 'demo-board-1',
  display_name: 'You (Demo)',
  avatar_url: null,
  role: 'admin',
  points: 45,
  created_at: '2026-01-01T00:00:00Z',
}

export const DEMO_MEMBERS: Profile[] = [
  DEMO_PROFILE,
  { id: 'demo-user-2', board_id: 'demo-board-1', display_name: 'Alex Kim', avatar_url: null, role: 'coordinator', points: 80, created_at: '2026-01-01T00:00:00Z' },
  { id: 'demo-user-3', board_id: 'demo-board-1', display_name: 'Sam Rivera', avatar_url: null, role: 'contributor', points: 30, created_at: '2026-01-01T00:00:00Z' },
  { id: 'demo-user-4', board_id: 'demo-board-1', display_name: 'Jordan Lee', avatar_url: null, role: 'contributor', points: 10, created_at: '2026-01-01T00:00:00Z' },
]

export const DEMO_TASKS: TaskWithOwner[] = [
  {
    id: 'task-1', board_id: 'demo-board-1', title: 'Design onboarding flow mockups',
    description: 'Create wireframes for the new user onboarding experience. Include mobile breakpoints.',
    status: 'open', owner_id: null, created_by: 'demo-user-2',
    points: 20, difficulty: 'hard', tags: ['design', 'ux'], due_date: '2026-05-20',
    blocked_reason: null, created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-01T00:00:00Z',
    owner: null, creator: { id: 'demo-user-2', display_name: 'Alex Kim' },
  },
  {
    id: 'task-2', board_id: 'demo-board-1', title: 'Write API docs for /tasks endpoint',
    description: null, status: 'open', owner_id: null, created_by: 'demo-user-2',
    points: 10, difficulty: 'medium', tags: ['docs'], due_date: null,
    blocked_reason: null, created_at: '2026-05-02T00:00:00Z', updated_at: '2026-05-02T00:00:00Z',
    owner: null, creator: { id: 'demo-user-2', display_name: 'Alex Kim' },
  },
  {
    id: 'task-3', board_id: 'demo-board-1', title: 'Fix login redirect bug on Safari',
    description: 'After OAuth, Safari sometimes stays on /auth instead of redirecting.',
    status: 'open', owner_id: null, created_by: 'demo-user-2',
    points: 5, difficulty: 'easy', tags: ['bug', 'auth'], due_date: null,
    blocked_reason: null, created_at: '2026-05-03T00:00:00Z', updated_at: '2026-05-03T00:00:00Z',
    owner: null, creator: { id: 'demo-user-2', display_name: 'Alex Kim' },
  },
  {
    id: 'task-4', board_id: 'demo-board-1', title: 'Set up error monitoring',
    description: 'Integrate Sentry into the Next.js app and configure alert thresholds.',
    status: 'claimed', owner_id: 'demo-user-1', created_by: 'demo-user-2',
    points: 10, difficulty: 'medium', tags: ['infra'], due_date: null,
    blocked_reason: null, created_at: '2026-05-04T00:00:00Z', updated_at: '2026-05-05T00:00:00Z',
    owner: { id: 'demo-user-1', display_name: 'You (Demo)', avatar_url: null },
    creator: { id: 'demo-user-2', display_name: 'Alex Kim' },
  },
  {
    id: 'task-5', board_id: 'demo-board-1', title: 'Migrate DB to new schema',
    description: 'Run migration 004 and backfill legacy records.',
    status: 'in_progress', owner_id: 'demo-user-3', created_by: 'demo-user-2',
    points: 20, difficulty: 'hard', tags: ['backend', 'db'], due_date: '2026-05-15',
    blocked_reason: null, created_at: '2026-05-03T00:00:00Z', updated_at: '2026-05-06T00:00:00Z',
    owner: { id: 'demo-user-3', display_name: 'Sam Rivera', avatar_url: null },
    creator: { id: 'demo-user-2', display_name: 'Alex Kim' },
  },
  {
    id: 'task-6', board_id: 'demo-board-1', title: 'Add dark mode toggle',
    description: null, status: 'blocked', owner_id: 'demo-user-4', created_by: 'demo-user-2',
    points: 5, difficulty: 'easy', tags: ['frontend'], due_date: null,
    blocked_reason: 'Waiting on design tokens from the design team.',
    created_at: '2026-05-02T00:00:00Z', updated_at: '2026-05-07T00:00:00Z',
    owner: { id: 'demo-user-4', display_name: 'Jordan Lee', avatar_url: null },
    creator: { id: 'demo-user-2', display_name: 'Alex Kim' },
  },
  {
    id: 'task-7', board_id: 'demo-board-1', title: 'Write unit tests for claim logic',
    description: null, status: 'review', owner_id: 'demo-user-2', created_by: 'demo-user-2',
    points: 10, difficulty: 'medium', tags: ['testing'], due_date: null,
    blocked_reason: null, created_at: '2026-05-01T00:00:00Z', updated_at: '2026-05-08T00:00:00Z',
    owner: { id: 'demo-user-2', display_name: 'Alex Kim', avatar_url: null },
    creator: { id: 'demo-user-2', display_name: 'Alex Kim' },
  },
]

export const DEMO_INVITE_TOKEN = 'demo-invite-token-00000000'
export const DEMO_BOARD_NAME = 'Demo Board'
