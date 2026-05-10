import { DEMO_TASKS, DEMO_PROFILE } from '@/lib/demo-data'
import { DemoTaskCard } from '@/components/demo-task-card'
import { TaskForm } from '@/components/task-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export default function DemoBoardPage() {
  const open = DEMO_TASKS.filter(t => t.status === 'open')
  const inProgress = DEMO_TASKS.filter(t =>
    ['claimed', 'in_progress', 'blocked', 'review'].includes(t.status)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Board</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm">+ Add task</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New task (demo — won't save)</DialogTitle>
            </DialogHeader>
            <TaskForm />
          </DialogContent>
        </Dialog>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Open ({open.length})</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {open.map(task => (
            <DemoTaskCard key={task.id} task={task} currentProfile={DEMO_PROFILE} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">In progress ({inProgress.length})</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {inProgress.map(task => (
            <DemoTaskCard key={task.id} task={task} currentProfile={DEMO_PROFILE} />
          ))}
        </div>
      </section>
    </div>
  )
}
