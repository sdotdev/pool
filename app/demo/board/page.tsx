'use client'

import { useState } from 'react'
import { DEMO_TASKS, DEMO_PROFILE } from '@/lib/demo-data'
import { KanbanColumn } from '@/components/kanban-column'
import { KanbanCard } from '@/components/kanban-card'
import { TaskForm } from '@/components/task-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { TaskWithOwner } from '@/lib/types'

const STATUS_ADVANCE: Partial<Record<string, TaskWithOwner['status']>> = {
  claimed: 'in_progress',
  in_progress: 'review',
  review: 'done',
}

export default function DemoBoardPage() {
  const [tasks, setTasks] = useState<TaskWithOwner[]>(DEMO_TASKS)

  function handleClaim(taskId: string) {
    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, status: 'claimed', owner_id: DEMO_PROFILE.id, owner: { id: DEMO_PROFILE.id, display_name: DEMO_PROFILE.display_name, avatar_url: DEMO_PROFILE.avatar_url } }
        : t
    ))
  }

  function handleRelease(taskId: string) {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, status: 'open', owner_id: null, owner: null } : t
    ))
  }

  function handleAdvance(taskId: string) {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t
      const next = STATUS_ADVANCE[t.status]
      return next ? { ...t, status: next } : t
    }))
  }

  const poolTasks = tasks.filter(t => t.status === 'open')
  const teamInProgress = tasks.filter(t =>
    ['claimed', 'in_progress', 'blocked', 'review'].includes(t.status) && t.owner_id !== DEMO_PROFILE.id
  )
  const todoTasks = tasks.filter(t => t.status === 'claimed' && t.owner_id === DEMO_PROFILE.id)
  const doingTasks = tasks.filter(t => t.status === 'in_progress' && t.owner_id === DEMO_PROFILE.id)
  const reviewTasks = tasks.filter(t => t.status === 'review' && t.owner_id === DEMO_PROFILE.id)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Board</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm">+ Add task</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New task (demo — won&apos;t save)</DialogTitle>
            </DialogHeader>
            <TaskForm />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 items-start">
        {/* Pool column — wider */}
        <KanbanColumn title="Pool" count={poolTasks.length + teamInProgress.length} className="min-w-[340px] w-96">
          {poolTasks.map(task => (
            <KanbanCard
              key={task.id}
              task={task}
              currentProfile={DEMO_PROFILE}
              onClaim={() => handleClaim(task.id)}
            />
          ))}
          {teamInProgress.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground pt-2 pb-1 font-medium">In progress by team</p>
              {teamInProgress.map(task => (
                <KanbanCard
                  key={task.id}
                  task={task}
                  currentProfile={DEMO_PROFILE}
                  teamOnly
                />
              ))}
            </>
          )}
        </KanbanColumn>

        {/* To Do */}
        <KanbanColumn title="To Do" count={todoTasks.length}>
          {todoTasks.map(task => (
            <KanbanCard
              key={task.id}
              task={task}
              currentProfile={DEMO_PROFILE}
              onAdvance={() => handleAdvance(task.id)}
              onRelease={() => handleRelease(task.id)}
            />
          ))}
        </KanbanColumn>

        {/* Doing */}
        <KanbanColumn title="Doing" count={doingTasks.length}>
          {doingTasks.map(task => (
            <KanbanCard
              key={task.id}
              task={task}
              currentProfile={DEMO_PROFILE}
              onAdvance={() => handleAdvance(task.id)}
              onRelease={() => handleRelease(task.id)}
            />
          ))}
        </KanbanColumn>

        {/* Review */}
        <KanbanColumn title="Review" count={reviewTasks.length}>
          {reviewTasks.map(task => (
            <KanbanCard
              key={task.id}
              task={task}
              currentProfile={DEMO_PROFILE}
              onAdvance={() => handleAdvance(task.id)}
              onRelease={() => handleRelease(task.id)}
            />
          ))}
        </KanbanColumn>
      </div>
    </div>
  )
}
