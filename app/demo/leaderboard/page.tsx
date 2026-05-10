import { DEMO_MEMBERS, DEMO_PROFILE } from '@/lib/demo-data'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export default function DemoLeaderboardPage() {
  const sorted = [...DEMO_MEMBERS].sort((a, b) => b.points - a.points)

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-xl font-semibold">Leaderboard</h1>
      <ol className="space-y-2">
        {sorted.map((member, index) => (
          <li
            key={member.id}
            className={`flex items-center gap-3 p-3 rounded-lg border ${
              member.id === DEMO_PROFILE.id ? 'bg-muted' : 'bg-background'
            }`}
          >
            <span className="text-sm font-mono text-muted-foreground w-6 text-right">
              {index + 1}
            </span>
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {(member.display_name ?? 'U').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {member.display_name}
                {member.id === DEMO_PROFILE.id && (
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
