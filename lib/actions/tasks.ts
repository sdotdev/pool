'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/dal'
import { revalidatePath } from 'next/cache'
import type { TaskStatus, Difficulty } from '@/lib/types'

const DIFFICULTY_POINTS: Record<Difficulty, number> = {
  easy: 5,
  medium: 10,
  hard: 20,
}

export async function createTask(formData: FormData) {
  const profile = await getCurrentProfile()
  if (!['coordinator', 'admin'].includes(profile.role)) throw new Error('forbidden')

  const supabase = await createClient()
  const difficulty = formData.get('difficulty') as Difficulty
  const title = (formData.get('title') as string)?.trim()
  if (!title) throw new Error('invalid_title')

  const tagsRaw = formData.get('tags') as string ?? ''
  const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean)

  const { error } = await supabase.from('tasks').insert({
    board_id: profile.board_id!,
    created_by: profile.id,
    title,
    description: (formData.get('description') as string) || null,
    difficulty,
    points: DIFFICULTY_POINTS[difficulty] ?? 10,
    tags,
    due_date: (formData.get('due_date') as string) || null,
    status: 'open' as TaskStatus,
    owner_id: null,
    blocked_reason: null,
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

  // Fetch task to verify permission
  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('owner_id, board_id, points, status')
    .eq('id', taskId)
    .single()

  if (fetchError || !task) throw new Error('not_found')

  const canEdit =
    task.owner_id === profile.id ||
    ['coordinator', 'admin'].includes(profile.role)
  if (!canEdit) throw new Error('forbidden')

  const { error: updateError } = await supabase
    .from('tasks')
    .update({
      status,
      blocked_reason: status === 'blocked' ? (blockedReason ?? null) : null,
    })
    .eq('id', taskId)

  if (updateError) throw new Error(updateError.message)

  // Award points when task is marked done (guard against double-awarding)
  if (status === 'done' && task.owner_id && task.status !== 'done') {
    await supabase.from('point_events').insert({
      board_id: task.board_id,
      user_id: task.owner_id,
      task_id: taskId,
      points: task.points,
    })

    await supabase.rpc('increment_points', {
      user_id: task.owner_id,
      amount: task.points,
    })
  }

  revalidatePath('/board')
  revalidatePath('/board/my')
  revalidatePath('/leaderboard')
}
