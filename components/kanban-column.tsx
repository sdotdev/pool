import { Badge } from '@/components/ui/badge'
import type { ReactNode } from 'react'

interface KanbanColumnProps {
  title: string
  count: number
  children: ReactNode
  className?: string
}

export function KanbanColumn({ title, count, children, className }: KanbanColumnProps) {
  return (
    <div className={`flex flex-col bg-muted/5 rounded-lg border ${className ?? 'min-w-[280px] w-72'}`}>
      <div className="sticky top-0 z-10 flex items-center gap-2 px-3 py-2 bg-muted/10 rounded-t-lg border-b">
        <span className="font-semibold text-sm">{title}</span>
        <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">{count}</Badge>
      </div>
      <div className="flex flex-col gap-2 p-3 flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
