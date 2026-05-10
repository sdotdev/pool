import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Profile } from '@/lib/types'

export const getCurrentProfile = cache(async (): Promise<Profile> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/join')

  return profile
})
