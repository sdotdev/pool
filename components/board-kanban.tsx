'use client'

import { useState, useTransition } from 'react'
import { KanbanColumn } from '@/components/kanban-column'
import { KanbanCard } from '@/components/kanban-card'
import { TaskForm } from '@/components/task-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { claimTask, releaseTask, updateTaskStatus } from '@/lib/actions/tasks'
import type { TaskWithOwner, Profile, TaskStatus } from '@/lib/types'

type Props = {
  initialTasks: TaskWithOwner[]
  profile: Profile
  canCreate: boolean
  boardId: string
}

const NEXT_STATUS: Partial<Record<TaskStatus, TaskStatus>> = {
  claimed: 'in_progress',
  in_progress: 'review',
  review: 'done',
}

export function BoardKanban({ initialTasks, profile, canCreate }: Props) {
  const [tasks, setTasks] = useState<TaskWithOwner[]>(initialTasks)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function optimistic(taskId: string, updater: (t: TaskWithOwner) => TaskWithOwner) {
    setTasks(prev => prev.map(t => t.id === taskId ? updater(t) : t))
  }

  function handleClaim(taskId: string) {
    const snapshot = tasks.find(t => t.id === taskId)
    optimistic(taskId, t => ({
      ...t,
      status: 'claimed' as TaskStatus,
      owner_id: profile.id,
      owner: { id: profile.id, display_name: profile.display_name, avatar_url: profile.avatar_url },
    }))
    setPendingId(taskId)
    startTransition(async () => {
      try {
        await claimTask(taskId)
      } catch {
        if (snapshot) setTasks(prev => prev.map(t => t.id === taskId ? snapshot : t))
      } finally {
        setPendingId(null)
      }
    })
  }

  function handleAdvance(taskId: string) {
    const snapshot = tasks.find(t => t.id === taskId)
    if (!snapshot) return
    const next = NEXT_STATUS[snapshot.status]
    if (!next) return
    optimistic(taskId, t => ({ ...t, status: next }))
    setPendingId(taskId)
    startTransition(async () => {
      try {
        await updateTaskStatus(taskId, next)
      } catch {
        if (snapshot) setTasks(prev => prev.map(t => t.id === taskId ? snapshot : t))
      } finally {
        setPendingId(null)
      }
    })
  }

  function handleRelease(taskId: string) {
    const snapshot = tasks.find(t => t.id === taskId)
    optimistic(taskId, t => ({ ...t, status: 'open' as TaskStatus, owner_id: null, owner: null }))
    setPendingId(taskId)
    startTransition(async () => {
      try {
        await releaseTask(taskId)
      } catch {
        if (snapshot) setTasks(prev => prev.map(t => t.id === taskId ? snapshot : t))
      } finally {
        setPendingId(null)
      }
    })
  }

  const openTasks = tasks.filter(t => t.status === 'open')
  const teamInProgress = tasks.filter(t =>
    ['claimed', 'in_progress', 'review'].includes(t.status) && t.owner_id !== profile.id
  )
  const todoTasks = tasks.filter(t => t.status === 'claimed' && t.owner_id === profile.id)
  const doingTasks = tasks.filter(t => t.status === 'in_progress' && t.owner_id === profile.id)
  const reviewTasks = tasks.filter(t => t.status === 'review' && t.owner_id === profile.id)

  return (
    <div className="space-y-4">
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

      <div className="flex gap-4 overflow-x-auto pb-4">
        {/* Pool column: open tasks + team in-progress */}
        <KanbanColumn
          title="Pool"
          count={openTasks.length + teamInProgress.length}
          className="min-w-[340px] w-96"
        >
          {openTasks.map(task => (
            <KanbanCard
              key={task.id}
              task={task}
              currentProfile={profile}
              onClaim={() => handleClaim(task.id)}
              pending={pendingId === task.id}
            />
          ))}
          {teamInProgress.map(task => (
            <KanbanCard
              key={task.id}
              task={task}
              currentProfile={profile}
              teamOnly
              pending={false}
            />
          ))}
        </KanbanColumn>

        {/* To Do: claimed by me */}
        <KanbanColumn title="To Do" count={todoTasks.length} className="min-w-[280px] w-72">
          {todoTasks.map(task => (
            <KanbanCard
              key={task.id}
              task={task}
              currentProfile={profile}
              onAdvance={() => handleAdvance(task.id)}
              onRelease={() => handleRelease(task.id)}
              pending={pendingId === task.id}
            />
          ))}
        </KanbanColumn>

        {/* Doing: in_progress by me */}
        <KanbanColumn title="Doing" count={doingTasks.length} className="min-w-[280px] w-72">
          {doingTasks.map(task => (
            <KanbanCard
              key={task.id}
              task={task}
              currentProfile={profile}
              onAdvance={() => handleAdvance(task.id)}
              onRelease={() => handleRelease(task.id)}
              pending={pendingId === task.id}
            />
          ))}
        </KanbanColumn>

        {/* Review: review by me */}
        <KanbanColumn title="Review" count={reviewTasks.length} className="min-w-[280px] w-72">
          {reviewTasks.map(task => (
            <KanbanCard
              key={task.id}
              task={task}
              currentProfile={profile}
              onAdvance={() => handleAdvance(task.id)}
              pending={pendingId === task.id}
            />
          ))}
        </KanbanColumn>
      </div>
    </div>
  )
}
