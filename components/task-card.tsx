'use client'

import { useTransition } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/status-badge'
import { claimTask, releaseTask, updateTaskStatus } from '@/lib/actions/tasks'
import type { TaskWithOwner, Profile, TaskStatus } from '@/lib/types'

const NEXT_STATUS: Partial<Record<TaskStatus, TaskStatus>> = {
  claimed: 'in_progress',
  in_progress: 'review',
  review: 'done',
}

export function TaskCard({
  task,
  currentProfile,
}: {
  task: TaskWithOwner
  currentProfile: Profile
}) {
  const [pending, startTransition] = useTransition()
  const isOwner = task.owner_id === currentProfile.id
  const canCoordinate = ['coordinator', 'admin'].includes(currentProfile.role)

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

        <div className="flex gap-2">
          {task.status === 'open' && (
            <Button
              size="sm"
              disabled={pending}
              onClick={() => startTransition(() => claimTask(task.id))}
            >
              Claim
            </Button>
          )}

          {isOwner && task.status in NEXT_STATUS && (
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                startTransition(() =>
                  updateTaskStatus(task.id, NEXT_STATUS[task.status]!)
                )
              }
            >
              Mark {NEXT_STATUS[task.status]?.replace('_', ' ')}
            </Button>
          )}

          {(isOwner || canCoordinate) &&
            ['claimed', 'in_progress', 'blocked'].includes(task.status) && (
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => startTransition(() => releaseTask(task.id))}
              >
                Release
              </Button>
            )}
        </div>
      </CardContent>
    </Card>
  )
}
