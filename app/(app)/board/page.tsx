import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/dal'
import { TaskCard } from '@/components/task-card'
import { TaskForm } from '@/components/task-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { TaskWithOwner } from '@/lib/types'

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
  const open = allTasks.filter(t => t.status === 'open')
  const inProgress = allTasks.filter(t =>
    ['claimed', 'in_progress', 'blocked', 'review'].includes(t.status)
  )

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
