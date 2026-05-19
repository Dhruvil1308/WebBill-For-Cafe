"use client"

import { useState, useEffect } from 'react'
import { MenuGrid } from '@/components/billing/MenuGrid'
import { CartPanel } from '@/components/billing/CartPanel'
import { Input } from '@/components/ui/input'
import { Search, ShoppingBag } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

export default function BillingPage() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [categories, setCategories] = useState<string[]>(['All'])
  const { items: cartItems } = useCartStore()

  const cartTotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const cartItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)

  useEffect(() => {
    // No cache-busting — let the browser and Vercel Edge Cache do their job
    fetch('/api/categories')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) setCategories(['All', ...data.map((cat: any) => cat.name)])
      })
      .catch((err) => console.error('Error fetching categories:', err))
  }, [])

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden">
      {/* Cart Panel — desktop left sidebar */}
      <div className="hidden md:flex w-1/3 min-w-[320px] max-w-[400px] border-r border-border flex-col z-10 bg-white">
        <h2 className="font-headings font-bold text-lg p-4 border-b border-border shadow-sm">
          Current Order
        </h2>
        <div className="flex-1 overflow-hidden">
          <CartPanel />
        </div>
      </div>

      {/* Main Menu Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-accent">
        {/* Sticky header */}
        <div className="bg-white border-b border-border shadow-sm z-10 sticky top-0 px-4 pt-4 pb-0">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Search items..."
              className="pl-10 bg-gray-50 border-gray-200 focus-visible:ring-violet-600 rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === category
                    ? 'bg-violet-700 text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Grid — category filtering is now in-memory */}
        <div className="flex-1 p-4 overflow-auto">
          <MenuGrid category={activeCategory} searchQuery={searchQuery} />
        </div>
      </div>

      {/* Mobile floating cart bar */}
      {cartItemCount > 0 && (
        <div className="md:hidden fixed bottom-4 left-4 right-4 z-50">
          <Sheet>
            <SheetTrigger className="w-full bg-violet-700 hover:bg-violet-800 text-white rounded-2xl p-4 shadow-lg flex items-center justify-between font-bold animate-in slide-in-from-bottom-5">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 px-3 py-1 rounded-full flex items-center gap-2">
                  <ShoppingBag size={18} />
                  <span>{cartItemCount} items</span>
                </div>
              </div>
              <span>View Cart &nbsp;•&nbsp; ₹{cartTotal.toFixed(2)}</span>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="h-[85vh] p-0 flex flex-col rounded-t-3xl border-t-0"
            >
              <div className="p-4 border-b border-border shadow-sm flex items-center justify-between">
                <h2 className="font-headings font-bold text-lg">Current Order</h2>
              </div>
              <div className="flex-1 overflow-hidden">
                <CartPanel />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      )}
    </div>
  )
}
