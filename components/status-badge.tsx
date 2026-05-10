import { Badge } from '@/components/ui/badge'
import type { TaskStatus } from '@/lib/types'

const colors: Record<TaskStatus, string> = {
  open: 'bg-slate-100 text-slate-700',
  claimed: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  blocked: 'bg-red-100 text-red-700',
  review: 'bg-purple-100 text-purple-700',
  done: 'bg-green-100 text-green-700',
  archived: 'bg-gray-100 text-gray-500',
}

const labels: Record<TaskStatus, string> = {
  open: 'Open',
  claimed: 'Claimed',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  review: 'Review',
  done: 'Done',
  archived: 'Archived',
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge variant="outline" className={colors[status]}>
      {labels[status]}
    </Badge>
  )
}
