'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import type { TaskWithOwner, Profile } from '@/lib/types'

export interface KanbanCardProps {
  task: TaskWithOwner
  currentProfile: Profile
  onClaim?: () => void
  onAdvance?: () => void
  onRelease?: () => void
  pending?: boolean
  teamOnly?: boolean
}

const advanceLabel: Partial<Record<string, string>> = {
  claimed: 'Start',
  in_progress: 'Send for review',
  review: 'Mark done',
}

const difficultyColor: Record<string, string> = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
}

export function KanbanCard({ task, currentProfile, onClaim, onAdvance, onRelease, pending, teamOnly }: KanbanCardProps) {
  const isOwner = task.owner_id === currentProfile.id
  const isCoordinator = currentProfile.role === 'coordinator' || currentProfile.role === 'admin'

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: !!teamOnly,
  })

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`shadow-none touch-none select-none ${teamOnly ? 'opacity-60' : ''} ${isDragging ? 'opacity-40 cursor-grabbing' : 'cursor-grab'}`}
      {...(!teamOnly ? { ...listeners, ...attributes } : {})}
    >
      <CardContent className="p-3 space-y-2">
        <p className="font-medium text-sm leading-snug">{task.title}</p>

        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
        )}

        <div className="flex flex-wrap gap-1 items-center">
          <Badge variant="outline" className={`text-xs ${difficultyColor[task.difficulty]}`}>
            {task.difficulty} · {task.points}pts
          </Badge>
          {task.tags.map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">{tag}</Badge>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={task.status} />
          {task.owner && (
            <span className="text-xs text-muted-foreground">→ {task.owner.display_name}</span>
          )}
        </div>

        {task.blocked_reason && (
          <p className="text-xs text-destructive">{task.blocked_reason}</p>
        )}

        {!teamOnly && (
          <div
            className="flex gap-1 pt-1 flex-wrap"
            onPointerDown={e => e.stopPropagation()}
          >
            {task.status === 'open' && onClaim && (
              <Button size="sm" className="h-7 text-xs" onClick={onClaim} disabled={pending}>
                Claim
              </Button>
            )}
            {isOwner && advanceLabel[task.status] && onAdvance && (
              <Button size="sm" className="h-7 text-xs" onClick={onAdvance} disabled={pending}>
                {advanceLabel[task.status]}
              </Button>
            )}
            {(isOwner || isCoordinator) && task.status !== 'open' && onRelease && (
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onRelease} disabled={pending}>
                Release
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
