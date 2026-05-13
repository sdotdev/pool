import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/dal'
import { BoardKanban } from '@/components/board-kanban'
import { BoardRealtime } from '@/components/board-realtime'
import type { TaskWithOwner } from '@/lib/types'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Board' }

export default async function BoardPage() {
  const profile = await getCurrentProfile()
  const supabase = await createClient()

  const { data: tasks } = await supabase
    .from('tasks')
    .select(`
      *,
      owner:profiles!tasks_owner_id_fkey(id, display_name, avatar_url),
      creator:profiles!tasks_created_by_fkey(id, display_name)
    `)
    .eq('board_id', profile.board_id!)
    .not('status', 'eq', 'archived')
    .order('created_at', { ascending: false })

  const allTasks = (tasks ?? []) as unknown as TaskWithOwner[]
  const canCreate = ['coordinator', 'admin'].includes(profile.role)

  return (
    <>
      <BoardRealtime boardId={profile.board_id!} />
      <BoardKanban
        initialTasks={allTasks}
        profile={profile}
        canCreate={canCreate}
        boardId={profile.board_id!}
      />
    </>
  )
}
