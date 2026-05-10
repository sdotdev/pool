import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { joinBoard, createBoard } from '@/lib/actions/admin'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const { token } = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-4">
        {token && (
          <Card>
            <CardHeader>
              <CardTitle>Join a board</CardTitle>
              <p className="text-sm text-muted-foreground">
                You've been invited to join a Pool board.
              </p>
            </CardHeader>
            <CardContent>
              <form action={async () => { 'use server'; await joinBoard(token) }}>
                <Button type="submit" className="w-full">Accept invite</Button>
              </form>
            </CardContent>
          </Card>
        )}

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
