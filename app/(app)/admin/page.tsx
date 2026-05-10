import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/dal'
import { redirect } from 'next/navigation'
import { InvitePanel } from '@/components/invite-panel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function AdminPage() {
  const profile = await getCurrentProfile()
  if (profile.role !== 'admin') redirect('/board')

  const supabase = await createClient()
  const { data: board } = await supabase
    .from('boards')
    .select('invite_token, name')
    .eq('id', profile.board_id!)
    .single()

  if (!board) redirect('/board')

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-xl font-semibold">Admin — {board.name}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invite link</CardTitle>
        </CardHeader>
        <CardContent>
          <InvitePanel
            inviteToken={board.invite_token}
            appUrl={process.env.NEXT_PUBLIC_APP_URL!}
          />
        </CardContent>
      </Card>
    </div>
  )
}
