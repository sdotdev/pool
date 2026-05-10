'use client'

import { useTransition, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createTask } from '@/lib/actions/tasks'

export function TaskForm({ onDone }: { onDone?: () => void }) {
  const [pending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const [difficulty, setDifficulty] = useState('medium')

  return (
    <form
      ref={formRef}
      action={(fd) => {
        startTransition(async () => {
          await createTask(fd)
          formRef.current?.reset()
          onDone?.()
        })
      }}
      className="space-y-3"
    >
      <div className="space-y-1">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required placeholder="What needs doing?" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={2} placeholder="Optional details" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Difficulty</Label>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy (5pts)</SelectItem>
              <SelectItem value="medium">Medium (10pts)</SelectItem>
              <SelectItem value="hard">Hard (20pts)</SelectItem>
            </SelectContent>
          </Select>
          <input type="hidden" name="difficulty" value={difficulty} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="due_date">Due date</Label>
          <Input id="due_date" name="due_date" type="date" />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="tags">Tags</Label>
        <Input id="tags" name="tags" placeholder="design, backend, urgent" />
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Adding…' : 'Add task'}
      </Button>
    </form>
  )
}
