"use client"

import { useState, useEffect } from 'react'
import { useCartStore } from '@/store/cartStore'

interface MenuItem {
  id: string
  name: string
  price: number | string
  isVeg: boolean
  isAvailable: boolean
  imageUrl?: string | null
  category: {
    id: string
    name: string
  }
}

export function MenuGrid({ category = 'All', searchQuery = '' }) {
  const { items: cartItems, addItem, updateQty } = useCartStore()
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchItems() {
      setLoading(true)
      try {
        const url = category === 'All' 
          ? '/api/menu-items' 
          : `/api/menu-items?categoryName=${encodeURIComponent(category)}`
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          // Only show available items
          setItems(data.filter((item: MenuItem) => item.isAvailable))
        }
      } catch (err) {
        console.error('Error fetching menu items:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchItems()
  }, [category])

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20 md:pb-0">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white border border-border rounded-xl p-3 animate-pulse flex flex-col items-center">
            <div className="aspect-square bg-gray-100 rounded-lg w-full mb-3 mt-auto h-32" />
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-1/4" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20 md:pb-0">
      {filteredItems.map(item => {
        const inCart = cartItems.find(i => i.menuItemId === item.id)
        const qty = inCart ? inCart.quantity : 0
        const price = Number(item.price)

        return (
          <div 
            key={item.id} 
            onClick={() => {
              if (qty > 0) {
                updateQty(item.id, qty + 1)
              } else {
                addItem({ menuItemId: item.id, name: item.name, price: price, quantity: 1 })
              }
            }}
            className="bg-white border text-center border-border rounded-xl p-3 cursor-pointer hover:shadow-sm transition-shadow relative overflow-hidden flex flex-col active:scale-[0.98] transform duration-100"
          >
            {qty > 0 && (
              <div className="absolute top-2 right-2 bg-violet-700 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold z-10 shadow-sm animate-in zoom-in">
                {qty}
              </div>
            )}
            <div className="aspect-square bg-violet-50/50 rounded-lg mb-3 mt-auto flex items-center justify-center relative overflow-hidden">
              {/* Veg/Non-veg indicator */}
              <div className={`absolute top-2 left-2 w-3 h-3 rounded-sm border flex items-center justify-center z-10 ${item.isVeg ? 'border-green-600 bg-white' : 'border-red-600 bg-white'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
              </div>
              
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover mix-blend-multiply" />
              ) : (
                <span className="text-violet-200 font-medium text-sm">Image</span>
              )}
            </div>
            <h3 className="font-medium text-sm text-gray-900 truncate">{item.name}</h3>
            <p className="text-violet-700 font-bold mt-1">₹{price}</p>
          </div>
        )
      })}

      {filteredItems.length === 0 && (
        <div className="col-span-full py-12 text-center text-gray-500">
          No items found matching your search.
        </div>
      )}
    </div>
  )
}

