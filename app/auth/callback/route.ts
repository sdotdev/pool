import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/types'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    // We must write session cookies onto the redirect response itself, so we
    // can't use createClient() (which writes to the Next.js cookie store and
    // not onto an arbitrary NextResponse). Build a client that defers cookie
    // writes until we hand them to the final response.
    const cookiesToSet: { name: string; value: string; options: object }[] = []
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll() },
          setAll(cs) { cookiesToSet.push(...cs) },
        },
      }
    )
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    const withCookies = (res: NextResponse) => {
      cookiesToSet.forEach(({ name, value, options }) =>
        res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2])
      )
      return res
    }

    if (!error && data.user) {
      // Check if profile exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, board_id')
        .eq('id', data.user.id)
        .single()

      if (!profile) {
        // New user — create profile stub, redirect to join
        const { error: insertError } = await supabase.from('profiles').insert({
          id: data.user.id,
          display_name: data.user.user_metadata?.full_name ?? null,
          avatar_url: data.user.user_metadata?.avatar_url ?? null,
          board_id: null,
        })
        if (insertError) return withCookies(NextResponse.redirect(`${origin}/auth?error=profile_failed`))
        return withCookies(NextResponse.redirect(`${origin}/join`))
      }

      if (!profile.board_id) {
        return withCookies(NextResponse.redirect(`${origin}/join`))
      }

      return withCookies(NextResponse.redirect(`${origin}/board`))
    }
  }

  return NextResponse.redirect(`${origin}/auth?error=callback_failed`)
}
