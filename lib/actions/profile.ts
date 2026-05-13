'use server'

import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/types'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function updateDisplayName(name: string) {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('invalid_name')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('unauthenticated')

  const { error } = await supabase
    .from('profiles')
    .update({ display_name: trimmed })
    .eq('id', user.id)

  if (error) throw new Error('update_failed')
  revalidatePath('/settings')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth')
}

export async function leaveBoard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('unauthenticated')

  const { error } = await supabase
    .from('profiles')
    .update({ board_id: null, role: 'contributor' })
    .eq('id', user.id)

  if (error) throw new Error('leave_failed')
  redirect('/join')
}

export async function deleteAccount() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('unauthenticated')

  // Needs service role to call admin.deleteUser — cascades to profiles via FK
  const admin = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) throw new Error('delete_failed')

  redirect('/auth')
}
