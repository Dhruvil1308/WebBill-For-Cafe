import { create } from 'zustand'

export type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'ONLINE_ZOMATO' | 'ONLINE_SWIGGY'
export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'WALLET'

export interface CartItem {
  menuItemId: string
  name: string
  price: number
  quantity: number
  variantName?: string
}

interface CartStore {
  items: CartItem[]
  customerName: string
  customerPhone: string
  orderType: OrderType
  paymentMethod: PaymentMethod
  addItem: (item: CartItem) => void
  removeItem: (menuItemId: string) => void
  updateQty: (menuItemId: string, qty: number) => void
  clearCart: () => void
  setCustomer: (name: string, phone: string) => void
  setOrderType: (type: OrderType) => void
  setPaymentMethod: (method: PaymentMethod) => void
  getSubtotal: () => number
  getGST: () => number
  getTotal: () => number
}

const DEFAULT_GST_RATE = 0.05 // 5% GST

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  customerName: '',
  customerPhone: '',
  orderType: 'DINE_IN',
  paymentMethod: 'CASH',

  addItem: (item) =>
    set((state) => {
      const existingItem = state.items.find((i) => i.menuItemId === item.menuItemId)
      if (existingItem) {
        return {
          items: state.items.map((i) =>
            i.menuItemId === item.menuItemId
              ? { ...i, quantity: i.quantity + item.quantity }
              : i
          ),
        }
      }
      return { items: [...state.items, item] }
    }),

  removeItem: (menuItemId) =>
    set((state) => ({
      items: state.items.filter((i) => i.menuItemId !== menuItemId),
    })),

  updateQty: (menuItemId, qty) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.menuItemId === menuItemId ? { ...i, quantity: Math.max(1, qty) } : i
      ),
    })),

  clearCart: () => set({ items: [], customerName: '', customerPhone: '' }),

  setCustomer: (name, phone) => set({ customerName: name, customerPhone: phone }),
  setOrderType: (type) => set({ orderType: type }),
  setPaymentMethod: (method) => set({ paymentMethod: method }),

  getSubtotal: () => {
    return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  },

  getGST: () => {
    return get().getSubtotal() * DEFAULT_GST_RATE
  },

  getTotal: () => {
    return get().getSubtotal() + get().getGST()
  },
}))
