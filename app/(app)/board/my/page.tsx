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
    .not('status', 'eq', 'archived')
    .order('updated_at', { ascending: false })

  const myTasks = (tasks ?? []) as unknown as TaskWithOwner[]

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
