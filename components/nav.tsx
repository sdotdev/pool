import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getCurrentProfile } from '@/lib/dal'

export async function Nav() {
  const profile = await getCurrentProfile()

  return (
    <header className="border-b bg-background">
      <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
        <nav className="flex items-center gap-6">
          <Link href="/board" className="font-semibold text-sm">Pool</Link>
          <Link href="/board" className="text-sm text-muted-foreground hover:text-foreground">Board</Link>
          <Link href="/board/my" className="text-sm text-muted-foreground hover:text-foreground">My tasks</Link>
          <Link href="/leaderboard" className="text-sm text-muted-foreground hover:text-foreground">Leaderboard</Link>
          {profile.role === 'admin' && (
            <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">Admin</Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{profile.points}pts</span>
          <Avatar className="h-7 w-7">
            <AvatarImage src={profile.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs">
              {(profile.display_name ?? 'U').charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
