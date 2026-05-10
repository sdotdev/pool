'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { rotateInviteToken } from '@/lib/actions/admin'

export function InvitePanel({ inviteToken, appUrl }: { inviteToken: string; appUrl: string }) {
  const [token, setToken] = useState(inviteToken)
  const [copied, setCopied] = useState(false)
  const [pending, startTransition] = useTransition()

  const inviteUrl = `${appUrl}/join?token=${token}`

  const copy = () => {
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const rotate = () => {
    startTransition(async () => {
      const newToken = await rotateInviteToken()
      if (newToken) setToken(newToken)
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input value={inviteUrl} readOnly className="text-xs font-mono" />
        <Button size="sm" variant="outline" onClick={copy}>
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
      <Button size="sm" variant="ghost" onClick={rotate} disabled={pending}>
        {pending ? 'Rotating…' : 'Generate new link'}
      </Button>
      <p className="text-xs text-muted-foreground">
        Anyone with this link can join the board. Rotate it to invalidate the old link.
      </p>
    </div>
  )
}
