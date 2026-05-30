import { redirect } from 'next/navigation'
import { getActiveCafe } from '@/lib/auth'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'

export const dynamic = 'force-dynamic'

export default async function CafeLayout({ children }: { children: React.ReactNode }) {
  const activeCafeResult = await getActiveCafe()
  if (!activeCafeResult) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen bg-accent overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
