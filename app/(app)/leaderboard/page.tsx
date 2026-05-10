import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/dal'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Profile } from '@/lib/types'

export default async function LeaderboardPage() {
  const profile = await getCurrentProfile()
  const supabase = await createClient()

  const { data: members } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, points, role')
    .eq('board_id', profile.board_id!)
    .order('points', { ascending: false })

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-xl font-semibold">Leaderboard</h1>
      <ol className="space-y-2">
        {(members ?? []).map((member: Pick<Profile, 'id' | 'display_name' | 'avatar_url' | 'points' | 'role'>, index) => (
          <li
            key={member.id}
            className={`flex items-center gap-3 p-3 rounded-lg border ${
              member.id === profile.id ? 'bg-muted' : 'bg-background'
            }`}
          >
            <span className="text-sm font-mono text-muted-foreground w-6 text-right">
              {index + 1}
            </span>
            <Avatar className="h-8 w-8">
              <AvatarImage src={member.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs">
                {(member.display_name ?? 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {member.display_name ?? 'Unnamed'}
                {member.id === profile.id && (
                  <span className="text-muted-foreground font-normal"> (you)</span>
                )}
              </p>
            </div>
            <span className="text-sm font-semibold tabular-nums">{member.points}pts</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
