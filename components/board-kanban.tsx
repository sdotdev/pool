'use client'

import { useState, useTransition } from 'react'
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
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

// Maps droppable column id → the status a task should have when dropped there
const COLUMN_STATUS: Record<string, TaskStatus | 'open'> = {
  pool: 'open',
  todo: 'claimed',
  doing: 'in_progress',
  review: 'review',
}

export function BoardKanban({ initialTasks, profile, canCreate }: Props) {
  const [tasks, setTasks] = useState<TaskWithOwner[]>(initialTasks)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  )

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
      try { await claimTask(taskId) }
      catch { if (snapshot) setTasks(prev => prev.map(t => t.id === taskId ? snapshot : t)) }
      finally { setPendingId(null) }
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
      try { await updateTaskStatus(taskId, next) }
      catch { if (snapshot) setTasks(prev => prev.map(t => t.id === taskId ? snapshot : t)) }
      finally { setPendingId(null) }
    })
  }

  function handleRelease(taskId: string) {
    const snapshot = tasks.find(t => t.id === taskId)
    optimistic(taskId, t => ({ ...t, status: 'open' as TaskStatus, owner_id: null, owner: null }))
    setPendingId(taskId)
    startTransition(async () => {
      try { await releaseTask(taskId) }
      catch { if (snapshot) setTasks(prev => prev.map(t => t.id === taskId ? snapshot : t)) }
      finally { setPendingId(null) }
    })
  }

  function handleAdvanceTo(taskId: string, targetStatus: TaskStatus) {
    const snapshot = tasks.find(t => t.id === taskId)
    if (!snapshot) return
    optimistic(taskId, t => ({ ...t, status: targetStatus }))
    setPendingId(taskId)
    startTransition(async () => {
      try { await updateTaskStatus(taskId, targetStatus) }
      catch { if (snapshot) setTasks(prev => prev.map(t => t.id === taskId ? snapshot : t)) }
      finally { setPendingId(null) }
    })
  }

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over) return

    const taskId = active.id as string
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    const targetColumn = over.id as string
    const targetStatus = COLUMN_STATUS[targetColumn]
    if (!targetStatus) return
    if (targetStatus === task.status) return

    const isOwner = task.owner_id === profile.id
    const isCoordinator = ['coordinator', 'admin'].includes(profile.role)

    if ((targetStatus as string) === 'open') {
      // Release back to pool
      if (isOwner || isCoordinator) handleRelease(taskId)
    } else if (task.status === 'open' && targetStatus === 'claimed') {
      // Claim from pool
      handleClaim(taskId)
    } else if (isOwner && targetStatus !== 'open') {
      // Advance to a specific status
      handleAdvanceTo(taskId, targetStatus as TaskStatus)
    }
  }

  const openTasks = tasks.filter(t => t.status === 'open')
  const teamInProgress = tasks.filter(t =>
    ['claimed', 'in_progress', 'review'].includes(t.status) && t.owner_id !== profile.id
  )
  const todoTasks = tasks.filter(t => t.status === 'claimed' && t.owner_id === profile.id)
  const doingTasks = tasks.filter(t => t.status === 'in_progress' && t.owner_id === profile.id)
  const reviewTasks = tasks.filter(t => t.status === 'review' && t.owner_id === profile.id)

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
          <KanbanColumn id="pool" title="Pool" count={openTasks.length + teamInProgress.length} className="min-w-[340px] w-96">
            {openTasks.map(task => (
              <KanbanCard key={task.id} task={task} currentProfile={profile} onClaim={() => handleClaim(task.id)} pending={pendingId === task.id} />
            ))}
            {teamInProgress.map(task => (
              <KanbanCard key={task.id} task={task} currentProfile={profile} teamOnly pending={false} />
            ))}
          </KanbanColumn>

          <KanbanColumn id="todo" title="To Do" count={todoTasks.length} className="min-w-[280px] w-72">
            {todoTasks.map(task => (
              <KanbanCard key={task.id} task={task} currentProfile={profile} onAdvance={() => handleAdvance(task.id)} onRelease={() => handleRelease(task.id)} pending={pendingId === task.id} />
            ))}
          </KanbanColumn>

          <KanbanColumn id="doing" title="Doing" count={doingTasks.length} className="min-w-[280px] w-72">
            {doingTasks.map(task => (
              <KanbanCard key={task.id} task={task} currentProfile={profile} onAdvance={() => handleAdvance(task.id)} onRelease={() => handleRelease(task.id)} pending={pendingId === task.id} />
            ))}
          </KanbanColumn>

          <KanbanColumn id="review" title="Review" count={reviewTasks.length} className="min-w-[280px] w-72">
            {reviewTasks.map(task => (
              <KanbanCard key={task.id} task={task} currentProfile={profile} onAdvance={() => handleAdvance(task.id)} pending={pendingId === task.id} />
            ))}
          </KanbanColumn>
        </div>
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="rotate-1 opacity-90 shadow-xl">
            <KanbanCard task={activeTask} currentProfile={profile} pending={false} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
