import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { PoolLogo } from '@/components/PoolLogo'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Sign in' }

export default async function AuthPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/board')

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center pb-2">
          <PoolLogo size={56} color="currentColor" />
          <p className="text-sm text-muted-foreground pt-1">
            Sign in to access your team's task board.
          </p>
        </CardHeader>
        <CardContent>
          <form action="/auth/google" method="POST">
            <Button type="submit" className="w-full">
              Continue with Google
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
