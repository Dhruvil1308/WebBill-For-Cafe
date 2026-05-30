"use client"

import { useState, useEffect } from 'react'
import { useCartStore } from '@/store/cartStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2, Plus, Minus, Printer, Store, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'
import type { OrderType, PaymentMethod } from '@/store/cartStore'
import { printWithQZTray, PrintBillData } from '@/lib/qzPrinter'
import { format } from 'date-fns'
import confetti from 'canvas-confetti'

export function CartPanel() {
  const cart = useCartStore()

  const [cafeDetails, setCafeDetails] = useState<any>(null)
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  // Derive from fetched db setting
  const receiptNeeded = cafeDetails?.isReceiptEnabled ?? true

  // Fetch active cafe details on mount for branding on printed bills
  useEffect(() => {
    async function fetchCafeDetails() {
      try {
        const res = await fetch('/api/cafe')
        if (res.ok) {
          const data = await res.json()
          setCafeDetails(data)
          cart.setIsGstEnabled(data.isGstEnabled ?? true)
        }
      } catch (err) {
        console.error('Error fetching cafe details:', err)
      }
    }
    fetchCafeDetails()
  }, [])

  const handleCheckout = async () => {
    if (cart.items.length === 0) return

    setIsCheckingOut(true)
    try {
      // 1. Save the bill to the database first
      const payload = {
        customerName: cart.customerName || undefined,
        customerPhone: cart.customerPhone || undefined,
        orderType: cart.orderType,
        paymentMethod: cart.paymentMethod,
        subtotal: cart.getSubtotal(),
        gstAmount: cart.getGST(),
        discount: 0,
        total: cart.getTotal(),
        items: cart.items.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity,
          variantName: item.variantName || undefined,
        })),
      }

      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save bill')
      }

      const savedBill = await res.json()

      if (!receiptNeeded) {
        // Just save to db, show confetti and skip printing
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#7c3aed', '#10b981', '#f59e0b', '#3b82f6'],
        })
        toast.success('Bill saved successfully!')
        cart.clearCart()
        return
      }

      // 2. Check for configured Windows printer name
      const printerName = localStorage.getItem('qz_printer_name')

      if (!printerName) {
        // Bill saved but no printer configured — guide the user to settings
        toast.warning('Bill saved! No printer configured.', {
          description: 'Go to Settings → Hardware Configuration and enter your Windows printer name (e.g. EPSON TM-T82).',
          duration: 8000,
          action: {
            label: 'Open Settings',
            onClick: () => (window.location.href = '/settings'),
          },
        })
        cart.clearCart()
        return
      }

      // 3. Attempt direct, silent thermal print via QZ Tray
      toast.loading(`Printing to ${printerName}...`, { id: 'qz-print' })

      const printData: PrintBillData = {
        cafeName: cafeDetails?.name ?? 'WebBill Cafe',
        cafeAddress: cafeDetails?.address,
        cafePhone: cafeDetails?.phone,
        cafeGst: cafeDetails?.gstNumber,
        orderType: payload.orderType,
        date: format(new Date(), 'dd/MM/yyyy'),
        time: format(new Date(), 'HH:mm'),
        customerName: payload.customerName,
        billNumber: savedBill.billNumber,
        items: cart.items.map(item => ({
          name: item.variantName
            ? `${item.name} - ${item.variantName}`
            : item.name,
          qty: item.quantity,
          price: Number(item.price),
          amt: Number(item.price * item.quantity),
        })),
        subtotal: payload.subtotal,
        gstAmount: payload.gstAmount,
        total: payload.total,
        paymentMethod: payload.paymentMethod,
      }

      const printResult = await printWithQZTray(printerName, printData)

      if (printResult.success) {
        toast.success('Receipt printed!', { id: 'qz-print' })
        confetti({
          particleCount: 100,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#7c3aed', '#10b981', '#3b82f6'],
        })
      } else {
        toast.error(`Print failed: ${printResult.error}`, {
          id: 'qz-print',
          duration: 10000,
          description: 'Bill is saved. Ensure QZ Tray is running and the printer name is correct.',
          action: {
            label: 'Open Settings',
            onClick: () => (window.location.href = '/settings'),
          },
        })
      }

      // 4. Always clear cart — the bill is already persisted in the DB
      cart.clearCart()
    } catch (err: any) {
      toast.error(err.message || 'Checkout failed')
    } finally {
      setIsCheckingOut(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Customer details */}
      <div className="p-4 border-b border-border space-y-3 shrink-0">
        <Input
          placeholder="Customer Name (optional)"
          value={cart.customerName}
          onChange={e => cart.setCustomer(e.target.value, cart.customerPhone)}
          className="bg-gray-50 rounded-lg shadow-none border-gray-200"
        />
        <Input
          placeholder="Phone Number (optional)"
          value={cart.customerPhone}
          onChange={e => cart.setCustomer(cart.customerName, e.target.value)}
          className="bg-gray-50 rounded-lg shadow-none border-gray-200"
        />
      </div>

      {/* Cart items */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {cart.items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm space-y-3">
            <ShoppingBag size={48} className="text-gray-200" />
            <p>Add items from the menu &rarr;</p>
          </div>
        ) : (
          cart.items.map(item => (
            <div
              key={item.menuItemId}
              className="flex items-center justify-between group animate-in slide-in-from-right-4"
            >
              <div className="flex-1 min-w-0 pr-2">
                <p className="font-medium text-sm text-gray-900 truncate">{item.name}</p>
                <p className="text-xs text-gray-500">₹{item.price}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    if (item.quantity > 1) {
                      cart.updateQty(item.menuItemId, item.quantity - 1)
                    } else {
                      cart.removeItem(item.menuItemId)
                    }
                  }}
                  className="p-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                >
                  <Minus size={14} />
                </button>
                <span className="w-5 text-center text-sm font-medium">{item.quantity}</span>
                <button
                  onClick={() => cart.updateQty(item.menuItemId, item.quantity + 1)}
                  className="p-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className="w-16 text-right font-bold text-sm text-gray-900 shrink-0">
                ₹{item.price * item.quantity}
              </div>
              <button
                onClick={() => cart.removeItem(item.menuItemId)}
                className="ml-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Totals & Actions */}
      <div className="p-4 border-t border-border bg-gray-50 space-y-4 shrink-0">
        <div className="flex gap-2">
          {['DINE_IN', 'TAKEAWAY'].map(type => (
            <Button
              key={type}
              variant={cart.orderType === type ? 'default' : 'outline'}
              className={`flex-1 rounded-lg h-9 text-sm ${
                cart.orderType === type
                  ? 'bg-violet-700 hover:bg-violet-800 shadow-none'
                  : 'bg-white shadow-none'
              }`}
              onClick={() => cart.setOrderType(type as OrderType)}
            >
              {type === 'DINE_IN' ? (
                <Store className="mr-2" size={16} />
              ) : (
                <ShoppingBag className="mr-2" size={16} />
              )}
              {type === 'DINE_IN' ? 'Dine-in' : 'Takeaway'}
            </Button>
          ))}
        </div>

        <div className="space-y-1.5 text-sm px-1">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span className="font-medium">₹{cart.getSubtotal().toFixed(2)}</span>
          </div>
          {cart.isGstEnabled && (
            <div className="flex justify-between text-gray-600">
              <span>GST (5%)</span>
              <span className="font-medium">₹{cart.getGST().toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg text-gray-900 border-t border-gray-200 pt-2 mt-2">
            <span>Total</span>
            <span className="text-violet-700">₹{cart.getTotal().toFixed(2)}</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {['CASH', 'UPI', 'CARD', 'WALLET'].map(method => (
            <Button
              key={method}
              variant={cart.paymentMethod === method ? 'default' : 'outline'}
              className={`text-[11px] h-8 px-0 font-semibold rounded-lg ${
                cart.paymentMethod === method
                  ? 'bg-gray-800 text-white shadow-none hover:bg-gray-900'
                  : 'bg-white shadow-none text-gray-600'
              }`}
              onClick={() => cart.setPaymentMethod(method as PaymentMethod)}
            >
              {method}
            </Button>
          ))}
        </div>

        <Button
          className="w-full bg-violet-700 hover:bg-violet-800 text-base font-bold h-12 rounded-xl shadow-sm transition-all mt-4"
          disabled={cart.items.length === 0 || isCheckingOut}
          onClick={handleCheckout}
        >
          {receiptNeeded ? <Printer className="mr-2" size={20} /> : <Store className="mr-2" size={20} />}
          {isCheckingOut ? (receiptNeeded ? 'Printing...' : 'Saving...') : (receiptNeeded ? 'Print Bill' : 'Save Order')}
        </Button>
      </div>
    </div>
  )
}
