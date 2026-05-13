'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { rotateJoinCode } from '@/lib/actions/admin'

export function InvitePanel({ joinCode, appUrl }: { joinCode: string; appUrl: string }) {
  const [code, setCode] = useState(joinCode)
  const [copied, setCopied] = useState(false)
  const [rotateError, setRotateError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const inviteUrl = `${appUrl}/join?code=${code}`

  const copy = () => {
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const rotate = () => {
    setRotateError(null)
    startTransition(async () => {
      try {
        const newCode = await rotateJoinCode()
        if (newCode) setCode(newCode)
      } catch {
        setRotateError('Failed to rotate code. Please try again.')
      }
    })
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs text-muted-foreground mb-1">Join code</p>
        <p className="text-2xl font-mono font-bold tracking-widest">{code}</p>
      </div>
      <div className="flex gap-2">
        <Input value={inviteUrl} readOnly className="text-xs font-mono" />
        <Button size="sm" variant="outline" onClick={copy}>
          {copied ? 'Copied!' : 'Copy link'}
        </Button>
      </div>
      <Button size="sm" variant="ghost" onClick={rotate} disabled={pending}>
        {pending ? 'Rotating…' : 'Generate new code'}
      </Button>
      {rotateError && (
        <p className="text-xs text-destructive">{rotateError}</p>
      )}
      <p className="text-xs text-muted-foreground">
        Members can join at <span className="font-mono">/join</span> by typing the code or using the link. Rotate to invalidate the old one.
      </p>
    </div>
  )
}
