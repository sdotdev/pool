'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/status-badge'
import type { TaskWithOwner, Profile, TaskStatus } from '@/lib/types'

const NEXT_STATUS: Partial<Record<TaskStatus, TaskStatus>> = {
  claimed: 'in_progress',
  in_progress: 'review',
  review: 'done',
}

export function DemoTaskCard({
  task: initialTask,
  currentProfile,
}: {
  task: TaskWithOwner
  currentProfile: Profile
}) {
  const [task, setTask] = useState(initialTask)
  const isOwner = task.owner_id === currentProfile.id
  const canCoordinate = ['coordinator', 'admin'].includes(currentProfile.role)

  const claim = () =>
    setTask(t => ({ ...t, status: 'claimed', owner_id: currentProfile.id, owner: { id: currentProfile.id, display_name: currentProfile.display_name, avatar_url: currentProfile.avatar_url } }))

  const release = () =>
    setTask(t => ({ ...t, status: 'open', owner_id: null, owner: null }))

  const advance = () =>
    setTask(t => ({ ...t, status: NEXT_STATUS[t.status] ?? t.status }))

  return (
    <Card className="group">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-sm leading-snug">{task.title}</h3>
          <StatusBadge status={task.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {task.difficulty} · {task.points}pts
          </Badge>
          {task.tags.map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
          ))}
        </div>

        {task.owner && (
          <p className="text-xs text-muted-foreground">
            → {task.owner.display_name ?? 'Someone'}
          </p>
        )}

        {task.status === 'blocked' && task.blocked_reason && (
          <p className="text-xs text-destructive">{task.blocked_reason}</p>
        )}

        <div className="flex gap-2">
          {task.status === 'open' && (
            <Button size="sm" onClick={claim}>Claim</Button>
          )}

          {isOwner && task.status in NEXT_STATUS && (
            <Button size="sm" variant="outline" onClick={advance}>
              Mark {NEXT_STATUS[task.status]?.replace('_', ' ')}
            </Button>
          )}

          {(isOwner || canCoordinate) &&
            ['claimed', 'in_progress', 'blocked'].includes(task.status) && (
              <Button size="sm" variant="ghost" onClick={release}>Release</Button>
            )}
        </div>
      </CardContent>
    </Card>
  )
}
