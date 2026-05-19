"use client"

import { useState, useEffect, useRef } from 'react'
import {
  ScrollText, Search, Eye, XCircle, Printer, Loader2, AlertTriangle,
  RefreshCw, ChevronDown, CheckCircle, XOctagon, FileEdit
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

type BillStatus = 'PAID' | 'CANCELLED' | 'EDITED'
type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'ONLINE_ZOMATO' | 'ONLINE_SWIGGY'
type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'WALLET'

interface BillItem {
  id: string
  quantity: number
  price: number
  subtotal: number
  variantName: string | null
  menuItem: { name: string; isVeg: boolean }
}

interface Bill {
  id: string
  billNumber: string
  orderType: OrderType
  paymentMethod: PaymentMethod
  subtotal: number
  gstAmount: number
  discount: number
  total: number
  status: BillStatus
  note: string | null
  createdAt: string
  customer: { id: string; name: string | null; phone: string | null } | null
  items: BillItem[]
}

const ORDER_LABELS: Record<OrderType, string> = {
  DINE_IN: 'Dine In',
  TAKEAWAY: 'Takeaway',
  ONLINE_ZOMATO: 'Zomato',
  ONLINE_SWIGGY: 'Swiggy'
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  CARD: 'Card',
  WALLET: 'Wallet'
}

const STATUS_STYLES: Record<BillStatus, string> = {
  PAID: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  CANCELLED: 'bg-rose-50 text-rose-700 border border-rose-200',
  EDITED: 'bg-amber-50 text-amber-700 border border-amber-200',
}

export default function BillsPage() {
  const [bills, setBills] = useState<Bill[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | BillStatus>('ALL')
  const [rangeFilter, setRangeFilter] = useState<'today' | '7days' | 'all'>('today')

  // Detail & Cancel state
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isCancelOpen, setIsCancelOpen] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<Bill | null>(null)
  const [cancelNote, setCancelNote] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)

  const printRef = useRef<HTMLDivElement>(null)

  const fetchBills = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({ range: rangeFilter })
      if (statusFilter !== 'ALL') params.set('status', statusFilter)
      if (searchQuery) params.set('search', searchQuery)

      const res = await fetch(`/api/bills?${params.toString()}`)
      if (res.ok) {
        setBills(await res.json())
      } else {
        toast.error('Failed to load bills')
      }
    } catch {
      toast.error('Error connecting to server')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchBills() }, [rangeFilter, statusFilter])

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => fetchBills(), 400)
    return () => clearTimeout(t)
  }, [searchQuery])

  const handleCancelBill = async () => {
    if (!cancelTarget) return
    setIsCancelling(true)
    try {
      const res = await fetch(`/api/bills/${cancelTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED', note: cancelNote || null })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to cancel bill')
      }
      const updated = await res.json()
      setBills(prev => prev.map(b => b.id === updated.id ? updated : b))
      toast.success(`Bill ${cancelTarget.billNumber} cancelled`)
      setIsCancelOpen(false)
      setCancelTarget(null)
      setCancelNote('')
      // Close detail if it was open for the same bill
      if (selectedBill?.id === cancelTarget.id) setSelectedBill(updated)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsCancelling(false)
    }
  }

  const handlePrint = () => {
    const content = printRef.current
    if (!content) return
    const win = window.open('', '_blank', 'width=400,height=600')
    if (!win) return
    win.document.write(`
      <html><head><title>Bill Receipt</title>
      <style>body{font-family:monospace;font-size:12px;padding:16px;max-width:300px;}</style>
      </head><body>${content.innerHTML}</body></html>
    `)
    win.document.close()
    win.focus()
    win.print()
    win.close()
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val)

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const filteredBills = bills.filter(b => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      b.billNumber.toLowerCase().includes(q) ||
      (b.customer?.name || '').toLowerCase().includes(q) ||
      (b.customer?.phone || '').includes(q)
    )
  })

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/40 backdrop-blur-md border border-gray-200/80 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-violet-100 border border-violet-200/50 rounded-2xl flex items-center justify-center text-violet-700">
            <ScrollText size={22} className="stroke-[2.25]" />
          </div>
          <div>
            <h1 className="text-2xl font-headings font-bold text-gray-900 tracking-tight">Bills History</h1>
            <p className="text-gray-500 text-sm mt-0.5">View, cancel, and reprint all customer transactions.</p>
          </div>
        </div>
        <button
          onClick={fetchBills}
          className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <Input
            placeholder="Search bill # or customer..."
            className="pl-10 h-10 rounded-xl border-gray-200 bg-gray-50/50 text-sm"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Range filter */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
          {(['today', '7days', 'all'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRangeFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                rangeFilter === r ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {r === 'today' ? 'Today' : r === '7days' ? 'Last 7 Days' : 'All Time'}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
          {(['ALL', 'PAID', 'CANCELLED', 'EDITED'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-gray-400">
            <Loader2 className="animate-spin text-violet-600" size={32} />
            <p className="text-sm font-medium">Loading bills...</p>
          </div>
        ) : filteredBills.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-gray-400">
            <ScrollText size={44} className="text-gray-300" />
            <p className="font-semibold text-gray-600">No bills found</p>
            <p className="text-xs">Try changing the date range or search term.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/70 text-gray-500 font-bold border-b border-gray-100 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-4">Bill #</th>
                  <th className="px-5 py-4">Date & Time</th>
                  <th className="px-5 py-4">Customer</th>
                  <th className="px-5 py-4">Order Type</th>
                  <th className="px-5 py-4">Payment</th>
                  <th className="px-5 py-4 text-right">Total</th>
                  <th className="px-5 py-4 text-center">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBills.map(bill => (
                  <tr key={bill.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-gray-900">{bill.billNumber}</td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">{formatDate(bill.createdAt)}</td>
                    <td className="px-5 py-3.5">
                      {bill.customer ? (
                        <div>
                          <p className="font-semibold text-gray-900">{bill.customer.name || 'Walk-in'}</p>
                          <p className="text-xs text-gray-400">{bill.customer.phone}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs italic">Walk-in</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-bold">
                        {ORDER_LABELS[bill.orderType]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-700 text-xs font-semibold">{PAYMENT_LABELS[bill.paymentMethod]}</td>
                    <td className="px-5 py-3.5 text-right font-bold font-mono text-gray-900">{formatCurrency(Number(bill.total))}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[bill.status]}`}>
                        {bill.status === 'PAID' && <CheckCircle size={11} />}
                        {bill.status === 'CANCELLED' && <XOctagon size={11} />}
                        {bill.status === 'EDITED' && <FileEdit size={11} />}
                        {bill.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="ghost" size="icon-sm"
                          onClick={() => { setSelectedBill(bill); setIsDetailOpen(true) }}
                          className="h-8 w-8 text-gray-500 hover:text-violet-600 hover:bg-violet-50/50 rounded-lg"
                          title="View Details"
                        >
                          <Eye size={15} />
                        </Button>
                        {bill.status === 'PAID' && (
                          <Button
                            variant="ghost" size="icon-sm"
                            onClick={() => { setCancelTarget(bill); setCancelNote(''); setIsCancelOpen(true) }}
                            className="h-8 w-8 text-gray-500 hover:text-rose-600 hover:bg-rose-50/50 rounded-lg"
                            title="Cancel Bill"
                          >
                            <XCircle size={15} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* BILL DETAIL DRAWER */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg border border-gray-100 rounded-2xl shadow-xl bg-white p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold text-gray-900">
                  Bill {selectedBill?.billNumber}
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-400 mt-0.5">
                  {selectedBill && formatDate(selectedBill.createdAt)}
                </DialogDescription>
              </div>
              {selectedBill && (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[selectedBill.status]}`}>
                  {selectedBill.status}
                </span>
              )}
            </div>
          </DialogHeader>

          {selectedBill && (
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto" ref={printRef}>
              {/* Customer Info */}
              {selectedBill.customer && (
                <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
                  <p className="font-bold text-gray-800">{selectedBill.customer.name || 'Walk-in Customer'}</p>
                  {selectedBill.customer.phone && <p className="text-gray-500 text-xs">{selectedBill.customer.phone}</p>}
                </div>
              )}

              {/* Meta */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-gray-50 p-3 rounded-xl">
                  <p className="text-gray-400 font-semibold uppercase tracking-wide mb-1">Order Type</p>
                  <p className="font-bold text-gray-800">{ORDER_LABELS[selectedBill.orderType]}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl">
                  <p className="text-gray-400 font-semibold uppercase tracking-wide mb-1">Payment</p>
                  <p className="font-bold text-gray-800">{PAYMENT_LABELS[selectedBill.paymentMethod]}</p>
                </div>
              </div>

              {/* Items */}
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2.5 text-xs font-bold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  Order Items ({selectedBill.items.length})
                </div>
                <div className="divide-y divide-gray-50">
                  {selectedBill.items.map(item => (
                    <div key={item.id} className="px-4 py-3 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 border flex items-center justify-center rounded-[2px] ${
                          item.menuItem.isVeg ? 'border-emerald-500' : 'border-rose-500'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${item.menuItem.isVeg ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{item.menuItem.name}</p>
                          {item.variantName && <p className="text-xs text-gray-400">{item.variantName}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{formatCurrency(Number(item.subtotal))}</p>
                        <p className="text-xs text-gray-400">{item.quantity} × {formatCurrency(Number(item.price))}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatCurrency(Number(selectedBill.subtotal))}</span>
                </div>
                {Number(selectedBill.gstAmount) > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>GST</span>
                    <span className="font-mono">{formatCurrency(Number(selectedBill.gstAmount))}</span>
                  </div>
                )}
                {Number(selectedBill.discount) > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Discount</span>
                    <span className="font-mono">-{formatCurrency(Number(selectedBill.discount))}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-2 text-base">
                  <span>Total</span>
                  <span className="font-mono">{formatCurrency(Number(selectedBill.total))}</span>
                </div>
              </div>

              {selectedBill.note && (
                <div className="bg-amber-50 border border-amber-200/50 rounded-xl p-3 text-xs text-amber-800">
                  <span className="font-bold">Note: </span>{selectedBill.note}
                </div>
              )}
            </div>
          )}

          <div className="p-5 border-t border-gray-100 flex gap-2">
            {selectedBill?.status === 'PAID' && (
              <Button
                onClick={() => { setIsDetailOpen(false); setCancelTarget(selectedBill); setCancelNote(''); setIsCancelOpen(true) }}
                variant="outline"
                className="flex-1 h-10 font-bold border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl"
              >
                <XCircle size={15} className="mr-2" /> Cancel Bill
              </Button>
            )}
            <Button
              onClick={handlePrint}
              className="flex-1 h-10 font-bold bg-violet-600 hover:bg-violet-700 text-white rounded-xl"
            >
              <Printer size={15} className="mr-2" /> Reprint
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* CANCEL CONFIRMATION */}
      <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <DialogContent className="sm:max-w-sm border border-gray-100 rounded-2xl shadow-xl p-6 bg-white">
          <DialogHeader className="pb-2 border-b border-gray-100 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center text-rose-500 mb-3">
              <AlertTriangle size={22} />
            </div>
            <DialogTitle className="text-lg font-bold text-gray-900">Cancel Bill?</DialogTitle>
            <DialogDescription className="text-xs text-gray-500 mt-1">
              Bill <span className="font-bold text-gray-800">{cancelTarget?.billNumber}</span> will be marked as cancelled. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-3 space-y-1.5">
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Reason / Note (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Customer changed order"
              value={cancelNote}
              onChange={e => setCancelNote(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 text-sm bg-gray-50/50"
            />
          </div>
          <DialogFooter className="pt-4 border-t border-gray-100 flex gap-2">
            <Button type="button" variant="outline" onClick={() => setIsCancelOpen(false)} className="flex-1 h-10 font-bold border-gray-200 rounded-xl">
              Keep Bill
            </Button>
            <Button onClick={handleCancelBill} disabled={isCancelling} className="flex-1 h-10 font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl border-0">
              {isCancelling ? <Loader2 size={14} className="animate-spin" /> : 'Confirm Cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
