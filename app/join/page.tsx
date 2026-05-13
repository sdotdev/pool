import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { joinBoard, createBoard } from '@/lib/actions/admin'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Join' }

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { code } = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-4">
        {code && (
          <Card>
            <CardHeader>
              <CardTitle>Join a board</CardTitle>
              <p className="text-sm text-muted-foreground">
                You've been invited to join a Pool board.
              </p>
            </CardHeader>
            <CardContent>
              <form action={async () => { 'use server'; await joinBoard(code) }}>
                <Button type="submit" className="w-full">Accept invite</Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Enter a join code</CardTitle>
            <p className="text-sm text-muted-foreground">
              Type the 6-character code from your team admin.
            </p>
          </CardHeader>
          <CardContent>
            <form
              action={async (fd: FormData) => {
                'use server'
                await joinBoard(fd.get('code') as string)
              }}
              className="space-y-3"
            >
              <div className="space-y-1">
                <Label htmlFor="code">Join code</Label>
                <Input
                  id="code"
                  name="code"
                  placeholder="e.g. XK7P2M"
                  maxLength={6}
                  className="font-mono uppercase tracking-widest text-center text-lg"
                  defaultValue={code ?? ''}
                  required
                />
              </div>
              <Button type="submit" className="w-full">Join board</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create a new board</CardTitle>
            <p className="text-sm text-muted-foreground">
              Start fresh. You'll be the admin.
            </p>
          </CardHeader>
          <CardContent>
            <form
              action={async (fd: FormData) => {
                'use server'
                await createBoard(fd.get('name') as string)
              }}
              className="space-y-3"
            >
              <div className="space-y-1">
                <Label htmlFor="name">Board name</Label>
                <Input id="name" name="name" placeholder="e.g. Design Sprint Q3" required />
              </div>
              <Button type="submit" variant="outline" className="w-full">Create board</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
