"use client"

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, LogOut } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet'
import { sidebarLinks } from './Sidebar'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useEffect } from 'react'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function TopBar() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    sidebarLinks.forEach((link) => {
      router.prefetch(link.href)
    })
  }, [router])

  return (
    <header className="h-16 bg-white border-b border-border flex items-center justify-between px-4 md:hidden">
      <div className="flex items-center gap-3">
        <Sheet>
          <SheetTrigger className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            <Menu size={24} />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 flex flex-col">
            <div className="px-6 py-6 mb-2 border-b border-gray-100">
              <Image src="/WebBill_logo_edited.png" alt="WebBill Logo" width={140} height={40} style={{ width: 'auto', height: 'auto' }} className="object-contain" priority />
            </div>

            <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
              {sidebarLinks.map((link) => {
                const isActive = pathname.startsWith(link.href)
                const Icon = link.icon
                return (
                  <SheetClose
                    key={link.name}
                    nativeButton={false}
                    render={
                      <Link
                        href={link.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                          isActive 
                            ? "bg-violet-100 text-violet-700" 
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        )}
                      />
                    }
                  >
                    <Icon size={20} className={cn(isActive ? "text-violet-700" : "text-gray-400")} />
                    {link.name}
                  </SheetClose>
                )
              })}
            </nav>

            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-3 px-3 py-2 mb-2">
                <div className="w-10 h-10 rounded-full bg-violet-200 flex items-center justify-center text-violet-700 font-bold">
                  C
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Cafe Owner</p>
                </div>
              </div>
              <button
                onClick={async () => {
                  const { createClient } = await import('@/lib/supabase');
                  const supabase = createClient();
                  await supabase.auth.signOut();
                  window.location.href = '/login';
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
              >
                <LogOut size={18} />
                Log Out
              </button>
            </div>
          </SheetContent>
        </Sheet>

        <Image src="/WebBill_logo_edited.png" alt="WebBill Logo" width={100} height={28} style={{ width: 'auto', height: 'auto' }} className="object-contain" priority />
      </div>
      
      <div className="w-8 h-8 rounded-full bg-violet-200 flex items-center justify-center text-violet-700 font-bold text-sm">
        C
      </div>
    </header>
  )
}
