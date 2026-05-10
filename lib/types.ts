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
      increment_points: { Args: { user_id: string; amount: number }; Returns: number }
    }
  }
}
