import { DemoInvitePanel } from '@/components/demo-invite-panel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DEMO_BOARD_NAME, DEMO_INVITE_TOKEN } from '@/lib/demo-data'

export default function DemoAdminPage() {
  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-xl font-semibold">Admin — {DEMO_BOARD_NAME}</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invite link</CardTitle>
        </CardHeader>
        <CardContent>
          <DemoInvitePanel
            inviteToken={DEMO_INVITE_TOKEN}
            appUrl="http://localhost:3000"
          />
        </CardContent>
      </Card>
    </div>
  )
}
