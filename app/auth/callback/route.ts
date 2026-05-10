import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Check if profile exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, board_id')
        .eq('id', data.user.id)
        .single()

      if (!profile) {
        // New user — create profile stub, redirect to join
        await supabase.from('profiles').insert({
          id: data.user.id,
          display_name: data.user.user_metadata?.full_name ?? null,
          avatar_url: data.user.user_metadata?.avatar_url ?? null,
          board_id: null,
        })
        return NextResponse.redirect(`${origin}/join`)
      }

      if (!profile.board_id) {
        return NextResponse.redirect(`${origin}/join`)
      }

      return NextResponse.redirect(`${origin}/board`)
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=callback_failed`)
}
