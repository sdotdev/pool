'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/dal'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function joinBoard(code: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('unauthenticated')

  const { data: board } = await supabase
    .from('boards')
    .select('id')
    .eq('join_code', code.trim().toUpperCase())
    .single()

  if (!board) throw new Error('invalid_code')

  const { error } = await supabase
    .from('profiles')
    .update({ board_id: board.id })
    .eq('id', user.id)

  if (error) throw new Error('join_failed')

  redirect('/board')
}

export async function rotateJoinCode() {
  const profile = await getCurrentProfile()
  if (profile.role !== 'admin') throw new Error('forbidden')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('boards')
    .update({ invite_token: crypto.randomUUID() })
    .eq('id', profile.board_id!)
    .select('join_code')
    .single()

  if (error) throw new Error('rotate_failed')
  revalidatePath('/admin')
  return data.join_code
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

  const boardId = crypto.randomUUID()
  const joinCode = Array.from({ length: 6 }, () =>
    'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]
  ).join('')

  const { error: boardError } = await supabase
    .from('boards')
    .insert({ id: boardId, name: name.trim(), join_code: joinCode })

  if (boardError) throw new Error('board_create_failed')

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ board_id: boardId, role: 'admin' })
    .eq('id', user.id)

  if (profileError) throw new Error('board_create_failed')

  redirect('/board')
}
