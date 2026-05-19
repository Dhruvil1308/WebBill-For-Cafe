"use client"

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { ReceiptText, UtensilsCrossed, BarChart3, Settings, Tag, ScrollText, Users } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const sidebarLinks = [
  { name: 'Billing', href: '/billing', icon: ReceiptText },
  { name: 'Menu', href: '/menu', icon: UtensilsCrossed },
  { name: 'Categories', href: '/categories', icon: Tag },
  { name: 'Bills', href: '/bills', icon: ScrollText },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Reports', href: '/reports/daily', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-white border-r border-border h-screen flex flex-col pt-6 hidden md:flex">
      <div className="px-6 mb-8 flex items-center">
        <Image src="/WebBill_logo_edited.png" alt="WebBill Logo" width={140} height={40} style={{ width: 'auto', height: 'auto' }} className="object-contain" priority />
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {sidebarLinks.map((link) => {
          const isActive = pathname.startsWith(link.href)
          const Icon = link.icon
          return (
            <Link
              key={link.name}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive 
                  ? "bg-violet-100 text-violet-700" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon size={18} className={cn(isActive ? "text-violet-700" : "text-gray-400")} />
              {link.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-violet-200 flex items-center justify-center text-violet-700 font-bold text-sm">
            C
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Cafe Owner</p>
            <p className="text-xs text-gray-500">Free Plan</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
