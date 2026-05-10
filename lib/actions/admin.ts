'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/dal'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function joinBoard(token: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('unauthenticated')

  const { data: board } = await supabase
    .from('boards')
    .select('id')
    .eq('invite_token', token)
    .single()

  if (!board) throw new Error('invalid_token')

  const { error } = await supabase
    .from('profiles')
    .update({ board_id: board.id })
    .eq('id', user.id)

  if (error) throw new Error('join_failed')

  redirect('/board')
}

export async function rotateInviteToken() {
  const profile = await getCurrentProfile()
  if (profile.role !== 'admin') throw new Error('forbidden')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('boards')
    .update({ invite_token: crypto.randomUUID() })
    .eq('id', profile.board_id!)
    .select('invite_token')
    .single()

  if (error) throw new Error('rotate_failed')
  revalidatePath('/admin')
  return data.invite_token
}

export async function createBoard(name: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('unauthenticated')

  if (!name?.trim()) throw new Error('invalid_board_name')

  // Check user has no board yet
  const { data: existing } = await supabase
    .from('profiles')
    .select('board_id')
    .eq('id', user.id)
    .single()

  if (existing?.board_id) redirect('/board')

  const { data: board, error: boardError } = await supabase
    .from('boards')
    .insert({ name: name.trim() })
    .select()
    .single()

  if (boardError || !board) throw new Error('board_create_failed')

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ board_id: board.id, role: 'admin' })
    .eq('id', user.id)

  if (profileError) throw new Error('board_create_failed')

  redirect('/board')
}
