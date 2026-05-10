import { Nav } from '@/components/nav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="px-4 py-6 overflow-x-auto">{children}</main>
    </>
  )
}
