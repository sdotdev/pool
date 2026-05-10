'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function DemoInvitePanel({ inviteToken, appUrl }: { inviteToken: string; appUrl: string }) {
  const [token, setToken] = useState(inviteToken)
  const [copied, setCopied] = useState(false)

  const inviteUrl = `${appUrl}/join?token=${token}`

  const copy = () => {
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const rotate = () => setToken(crypto.randomUUID())

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input value={inviteUrl} readOnly className="text-xs font-mono" />
        <Button size="sm" variant="outline" onClick={copy}>
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
      <Button size="sm" variant="ghost" onClick={rotate}>
        Generate new link
      </Button>
      <p className="text-xs text-muted-foreground">
        Anyone with this link can join the board. Rotate it to invalidate the old link.
      </p>
    </div>
  )
}
