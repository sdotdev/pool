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

// Row/Insert/Update shapes for each table
export type BoardRow = Board & { [key: string]: unknown }
export type BoardInsert = Omit<Board, 'id' | 'invite_token' | 'created_at'> & { [key: string]: unknown }
export type BoardUpdate = Partial<Board> & { [key: string]: unknown }

export type ProfileRow = Profile & { [key: string]: unknown }
export type ProfileInsert = Omit<Profile, 'created_at' | 'role' | 'points'> & { role?: Role; points?: number } & { [key: string]: unknown }
export type ProfileUpdate = Partial<Profile> & { [key: string]: unknown }

export type TaskRow = Task & { [key: string]: unknown }
export type TaskInsert = Omit<Task, 'id' | 'created_at' | 'updated_at'> & { [key: string]: unknown }
export type TaskUpdate = Partial<Task> & { [key: string]: unknown }

export type PointEventRow = PointEvent & { [key: string]: unknown }
export type PointEventInsert = Omit<PointEvent, 'id' | 'created_at'> & { [key: string]: unknown }
export type PointEventUpdate = Partial<PointEvent> & { [key: string]: unknown }

export interface Database {
  public: {
    Views: Record<string, { Row: Record<string, unknown>; Relationships: [] }>
    Tables: {
      boards: { Row: BoardRow; Insert: BoardInsert; Update: BoardUpdate; Relationships: [] }
      profiles: { Row: ProfileRow; Insert: ProfileInsert; Update: ProfileUpdate; Relationships: [] }
      tasks: { Row: TaskRow; Insert: TaskInsert; Update: TaskUpdate; Relationships: [] }
      point_events: { Row: PointEventRow; Insert: PointEventInsert; Update: PointEventUpdate; Relationships: [] }
    }
    Functions: {
      claim_task: { Args: { p_task_id: string; p_user_id: string } & { [key: string]: unknown }; Returns: unknown }
      release_task: { Args: { p_task_id: string; p_user_id: string } & { [key: string]: unknown }; Returns: unknown }
      increment_points: { Args: { user_id: string; amount: number } & { [key: string]: unknown }; Returns: unknown }
    }
  }
}
