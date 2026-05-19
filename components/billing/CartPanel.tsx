"use client"

import { useRef, useState, useEffect } from 'react'
import { useReactToPrint } from 'react-to-print'
import { useCartStore } from '@/store/cartStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Trash2, Plus, Minus, Printer, Store, ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'
import type { OrderType, PaymentMethod } from '@/store/cartStore'
import { ThermalReceipt } from './ThermalReceipt'
import { printThermalReceipt, PrintBillData } from '@/lib/epsonPrinter'
import { format } from 'date-fns'

export function CartPanel() {
  const cart = useCartStore()
  const receiptRef = useRef<HTMLDivElement>(null)
  
  const [cafeDetails, setCafeDetails] = useState<any>(null)
  const [lastSavedBill, setLastSavedBill] = useState<any>(null)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [isReadyToPrint, setIsReadyToPrint] = useState(false)

  // Fetch active cafe details on mount for branding on printed bills
  useEffect(() => {
    async function fetchCafe() {
      try {
        const res = await fetch('/api/cafe')
        if (res.ok) {
          const data = await res.json()
          setCafeDetails(data)
        }
      } catch (err) {
        console.error('Error fetching cafe details:', err)
      }
    }
    fetchCafe()
  }, [])

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
    onAfterPrint: () => {
      toast.success('Bill generated and printed successfully!')
      cart.clearCart()
      setLastSavedBill(null)
      setIsReadyToPrint(false)
    },
  })

  // Trigger print immediately after the state has been updated and receipt DOM rendered
  useEffect(() => {
    if (isReadyToPrint && lastSavedBill) {
      handlePrint()
    }
  }, [isReadyToPrint, lastSavedBill])

  const handleCheckout = async () => {
    if (cart.items.length === 0) return
    
    setIsCheckingOut(true)
    try {
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
          variantName: item.variantName || undefined
        }))
      }

      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save bill')
      }

      const savedBill = await res.json()
      setLastSavedBill(savedBill)
      
      // EPSON ePOS INTEGRATION
      const epsonIp = localStorage.getItem('epson_printer_ip')
      
      if (epsonIp) {
        // Attempt direct thermal printing over IP
        toast.loading('Sending to Epson printer...', { id: 'epson-print' })
        
        const printData: PrintBillData = {
          cafeName: cafeDetails ? cafeDetails.name : "WebBill Cafe",
          cafeAddress: cafeDetails?.address,
          cafePhone: cafeDetails?.phone,
          cafeGst: cafeDetails?.gstNumber,
          orderType: payload.orderType,
          date: format(new Date(), 'dd/MM/yyyy'),
          time: format(new Date(), 'HH:mm'),
          customerName: payload.customerName,
          billNumber: savedBill.billNumber,
          items: payload.items.map((i: any) => ({
            name: i.variantName ? `${i.name} - ${i.variantName}` : (cart.items.find(ci => ci.menuItemId === i.menuItemId)?.name || 'Item'),
            qty: i.quantity,
            price: Number(i.price),
            amt: Number(i.subtotal)
          })),
          subtotal: payload.subtotal,
          gstAmount: payload.gstAmount,
          total: payload.total,
          paymentMethod: payload.paymentMethod
        }
        
        const printResult = await printThermalReceipt(epsonIp, printData)
        
        if (printResult.success) {
          toast.success('Bill printed successfully via Epson POS!', { id: 'epson-print' })
          cart.clearCart()
          setLastSavedBill(null)
          setIsCheckingOut(false)
          return
        } else {
          toast.error(`Epson Print Failed: ${printResult.error}. Falling back to browser print.`, { id: 'epson-print' })
          // Fallback to ReactToPrint
          setIsReadyToPrint(true)
        }
      } else {
        // No IP configured, use fallback browser print dialog
        setIsReadyToPrint(true)
      }
      
    } catch (err: any) {
      toast.error(err.message || 'Checkout failed')
    } finally {
      setIsCheckingOut(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Hidden receipt for printing */}
      <div style={{ display: 'none' }}>
        <ThermalReceipt ref={receiptRef} bill={lastSavedBill} cafe={cafeDetails} />
      </div>

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
            <div key={item.menuItemId} className="flex items-center justify-between group animate-in slide-in-from-right-4">
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
                  <Minus size={14}/>
                </button>
                <span className="w-5 text-center text-sm font-medium">{item.quantity}</span>
                <button 
                  onClick={() => cart.updateQty(item.menuItemId, item.quantity + 1)} 
                  className="p-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                >
                  <Plus size={14}/>
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
          {['DINE_IN', 'TAKEAWAY'].map((type) => (
            <Button 
              key={type} 
              variant={cart.orderType === type ? 'default' : 'outline'}
              className={`flex-1 rounded-lg h-9 text-sm ${cart.orderType === type ? 'bg-violet-700 hover:bg-violet-800 shadow-none' : 'bg-white shadow-none'}`}
              onClick={() => cart.setOrderType(type as OrderType)}
            >
              {type === 'DINE_IN' ? <Store className="mr-2" size={16}/> : <ShoppingBag className="mr-2" size={16}/>}
              {type === 'DINE_IN' ? 'Dine-in' : 'Takeaway'}
            </Button>
          ))}
        </div>

        <div className="space-y-1.5 text-sm px-1">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span className="font-medium">₹{cart.getSubtotal().toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>GST (5%)</span>
            <span className="font-medium">₹{cart.getGST().toFixed(2)}</span>
          </div>
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
              className={`text-[11px] h-8 px-0 font-semibold rounded-lg ${cart.paymentMethod === method ? 'bg-gray-800 text-white shadow-none hover:bg-gray-900' : 'bg-white shadow-none text-gray-600'}`}
              onClick={() => cart.setPaymentMethod(method as PaymentMethod)}
            >
              {method}
            </Button>
          ))}
        </div>

        <Button 
          className="w-full bg-violet-700 hover:bg-violet-800 text-base font-bold h-12 rounded-xl shadow-sm transition-all" 
          disabled={cart.items.length === 0 || isCheckingOut}
          onClick={handleCheckout}
        >
          <Printer className="mr-2" size={20} />
          {isCheckingOut ? 'Checking out...' : 'Print Bill'}
        </Button>
      </div>
    </div>
  )
}
