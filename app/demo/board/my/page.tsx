import { DEMO_TASKS, DEMO_PROFILE } from '@/lib/demo-data'
import { DemoTaskCard } from '@/components/demo-task-card'
import type { TaskStatus } from '@/lib/types'

const SECTIONS: { label: string; statuses: TaskStatus[] }[] = [
  { label: 'To do', statuses: ['claimed'] },
  { label: 'In progress', statuses: ['in_progress', 'blocked'] },
  { label: 'Review', statuses: ['review'] },
  { label: 'Done', statuses: ['done'] },
]

export default function DemoMyBoardPage() {
  const myTasks = DEMO_TASKS.filter(t => t.owner_id === DEMO_PROFILE.id)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">My tasks</h1>
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
                <DemoTaskCard key={task.id} task={task} currentProfile={DEMO_PROFILE} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
