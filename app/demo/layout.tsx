import Link from 'next/link'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DEMO_PROFILE } from '@/lib/demo-data'
import { PoolLogo } from '@/components/PoolLogo'

export const metadata = { title: 'Pool — Demo' }

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="bg-yellow-400 text-yellow-900 text-xs text-center py-1 font-medium">
        Demo mode — no auth or database. <Link href="/auth" className="underline">Sign in for real</Link>
      </div>
      <header className="border-b bg-background">
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
          <nav className="flex items-center gap-6">
            <Link href="/demo/board" aria-label="Pool home">
              <PoolLogo size={22} color="currentColor" />
            </Link>
            <Link href="/demo/board" className="text-sm text-muted-foreground hover:text-foreground">Board</Link>
            <Link href="/demo/board/my" className="text-sm text-muted-foreground hover:text-foreground">My tasks</Link>
            <Link href="/demo/leaderboard" className="text-sm text-muted-foreground hover:text-foreground">Leaderboard</Link>
            <Link href="/demo/admin" className="text-sm text-muted-foreground hover:text-foreground">Admin</Link>
          </nav>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{DEMO_PROFILE.points}pts</span>
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs">Y</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>
      <main className="px-4 py-6 overflow-x-auto">{children}</main>
    </>
  )
}
