"use client"

import { useState, useEffect } from 'react'
import {
  Users, Search, Plus, Edit2, Trash2, Loader2, AlertTriangle,
  Phone, UserCircle, RefreshCw, Eye, X
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

interface Customer {
  id: string
  name: string | null
  phone: string | null
  createdAt: string
  visitCount: number
  totalSpent: number
  lastVisit: string | null
}

interface CustomerDetail {
  id: string
  name: string | null
  phone: string | null
  createdAt: string
  bills: {
    id: string
    billNumber: string
    total: number
    status: string
    orderType: string
    paymentMethod: string
    createdAt: string
    items: { quantity: number; menuItem: { name: string } }[]
  }[]
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Modal state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null)
  const [detailCustomer, setDetailCustomer] = useState<CustomerDetail | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const fetchCustomers = async (search?: string) => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const res = await fetch(`/api/customers?${params.toString()}`, { cache: 'no-store' })
      if (res.ok) setCustomers(await res.json())
      else toast.error('Failed to load customers')
    } catch {
      toast.error('Error connecting to server')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchCustomers() }, [])

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => fetchCustomers(searchQuery || undefined), 400)
    return () => clearTimeout(t)
  }, [searchQuery])

  // ADD
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim() && !formPhone.trim()) return toast.error('Provide a name or phone number')
    setIsSaving(true)
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName.trim() || null, phone: formPhone.trim() || null })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create customer')
      }
      const newCust = await res.json()
      setCustomers(prev => [newCust, ...prev])
      toast.success(`Customer "${newCust.name || newCust.phone}" added!`)
      setIsAddOpen(false)
      setFormName('')
      setFormPhone('')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // EDIT
  const openEdit = (cust: Customer) => {
    setEditingCustomer(cust)
    setFormName(cust.name || '')
    setFormPhone(cust.phone || '')
    setIsEditOpen(true)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCustomer) return
    if (!formName.trim() && !formPhone.trim()) return toast.error('Provide a name or phone')
    setIsSaving(true)
    try {
      const res = await fetch(`/api/customers/${editingCustomer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName.trim() || null, phone: formPhone.trim() || null })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update customer')
      }
      const updated = await res.json()
      setCustomers(prev => prev.map(c => c.id === updated.id ? { ...c, name: updated.name, phone: updated.phone } : c))
      toast.success('Customer updated!')
      setIsEditOpen(false)
      setEditingCustomer(null)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // VIEW DETAIL
  const openDetail = async (cust: Customer) => {
    setIsDetailOpen(true)
    setDetailCustomer(null)
    setIsDetailLoading(true)
    try {
      const res = await fetch(`/api/customers/${cust.id}`)
      if (res.ok) setDetailCustomer(await res.json())
      else toast.error('Failed to load customer details')
    } catch {
      toast.error('Error loading customer history')
    } finally {
      setIsDetailLoading(false)
    }
  }

  // DELETE
  const openDelete = (cust: Customer) => {
    setDeletingCustomer(cust)
    setIsDeleteOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingCustomer) return
    try {
      const res = await fetch(`/api/customers/${deletingCustomer.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete')
      }
      setCustomers(prev => prev.filter(c => c.id !== deletingCustomer.id))
      toast.success(`"${deletingCustomer.name || deletingCustomer.phone}" removed`)
      setIsDeleteOpen(false)
      setDeletingCustomer(null)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val)

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  // Stats
  const totalCustomers = customers.length
  const totalRevenue = customers.reduce((s, c) => s + c.totalSpent, 0)
  const repeatCustomers = customers.filter(c => c.visitCount > 1).length

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/40 backdrop-blur-md border border-gray-200/80 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-violet-100 border border-violet-200/50 rounded-2xl flex items-center justify-center text-violet-700">
            <Users size={22} className="stroke-[2.25]" />
          </div>
          <div>
            <h1 className="text-2xl font-headings font-bold text-gray-900 tracking-tight">Customers</h1>
            <p className="text-gray-500 text-sm mt-0.5">Manage your customer database and view visit history.</p>
          </div>
        </div>
        <Button
          onClick={() => { setFormName(''); setFormPhone(''); setIsAddOpen(true) }}
          className="bg-violet-600 w-full sm:w-auto hover:bg-violet-700 text-white gap-2 font-bold px-4 py-2 rounded-xl shadow-sm"
        >
          <Plus size={18} /> Add Customer
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Customers', value: isLoading ? '...' : totalCustomers, color: 'violet' },
          { label: 'Total Revenue', value: isLoading ? '...' : formatCurrency(totalRevenue), color: 'emerald' },
          { label: 'Repeat Customers', value: isLoading ? '...' : repeatCustomers, color: 'amber' },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-${stat.color}-50 text-${stat.color}-600`}>
              <Users size={20} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{stat.label}</p>
              <p className="text-xl font-bold text-gray-900 mt-0.5">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
        <div className="relative max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <Input
            placeholder="Search by name or phone..."
            className="pl-10 h-10 rounded-xl border-gray-200 bg-gray-50/50 text-sm"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-gray-400">
            <Loader2 className="animate-spin text-violet-600" size={32} />
            <p className="text-sm font-medium">Loading customers...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-gray-400">
            <UserCircle size={48} className="text-gray-300" />
            <div className="text-center">
              <p className="font-semibold text-gray-600">No customers yet</p>
              <p className="text-xs mt-1">Customers are auto-created when a phone number is entered at billing.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/70 text-gray-500 font-bold border-b border-gray-100 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4 text-center">Visits</th>
                  <th className="px-6 py-4 text-right">Total Spent</th>
                  <th className="px-6 py-4">Last Visit</th>
                  <th className="px-6 py-4">Registered</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map(cust => (
                  <tr key={cust.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center font-bold text-sm shrink-0">
                          {(cust.name || cust.phone || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{cust.name || <span className="italic text-gray-400">No name</span>}</p>
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <Phone size={10} />
                            {cust.phone || '—'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        cust.visitCount > 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {cust.visitCount} {cust.visitCount === 1 ? 'visit' : 'visits'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold font-mono text-gray-900">
                      {formatCurrency(cust.totalSpent)}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {cust.lastVisit ? formatDate(cust.lastVisit) : '—'}
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {formatDate(cust.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="ghost" size="icon-sm"
                          onClick={() => openDetail(cust)}
                          className="h-8 w-8 text-gray-500 hover:text-violet-600 hover:bg-violet-50/50 rounded-lg"
                          title="View History"
                        >
                          <Eye size={15} />
                        </Button>
                        <Button
                          variant="ghost" size="icon-sm"
                          onClick={() => openEdit(cust)}
                          className="h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg"
                          title="Edit"
                        >
                          <Edit2 size={15} />
                        </Button>
                        <Button
                          variant="ghost" size="icon-sm"
                          onClick={() => openDelete(cust)}
                          className="h-8 w-8 text-gray-500 hover:text-rose-600 hover:bg-rose-50/50 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD DIALOG */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-sm border border-gray-100 rounded-2xl shadow-xl p-6 bg-white max-h-[90dvh] overflow-y-auto">
          <DialogHeader className="pb-2 border-b border-gray-100">
            <DialogTitle className="text-lg font-bold">Add Customer</DialogTitle>
            <DialogDescription className="text-xs text-gray-500 mt-1">
              Manually register a customer (or let the billing system auto-create them via phone).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Full Name</label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. Rahul Sharma"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 text-sm bg-gray-50/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Phone Number</label>
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={formPhone}
                onChange={e => setFormPhone(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 text-sm bg-gray-50/50"
              />
            </div>
            <DialogFooter className="pt-3 border-t border-gray-100 flex gap-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="flex-1 h-10 font-bold rounded-xl border-gray-200">Cancel</Button>
              <Button type="submit" disabled={isSaving} className="flex-1 h-10 font-bold bg-violet-600 hover:bg-violet-700 text-white rounded-xl">
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : 'Add Customer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-sm border border-gray-100 rounded-2xl shadow-xl p-6 bg-white max-h-[90dvh] overflow-y-auto">
          <DialogHeader className="pb-2 border-b border-gray-100">
            <DialogTitle className="text-lg font-bold">Edit Customer</DialogTitle>
            <DialogDescription className="text-xs text-gray-500 mt-1">Update name or phone number.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Full Name</label>
              <input
                type="text"
                autoFocus
                value={formName}
                onChange={e => setFormName(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 text-sm bg-gray-50/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Phone Number</label>
              <input
                type="tel"
                value={formPhone}
                onChange={e => setFormPhone(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 text-sm bg-gray-50/50"
              />
            </div>
            <DialogFooter className="pt-3 border-t border-gray-100 flex gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="flex-1 h-10 font-bold rounded-xl border-gray-200">Cancel</Button>
              <Button type="submit" disabled={isSaving} className="flex-1 h-10 font-bold bg-violet-600 hover:bg-violet-700 text-white rounded-xl">
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DETAIL DIALOG */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg border border-gray-100 rounded-2xl shadow-xl bg-white p-0 overflow-hidden max-h-[90dvh] overflow-y-auto">
          <DialogHeader className="p-6 border-b border-gray-100">
            <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <UserCircle size={20} className="text-violet-600" />
              {detailCustomer?.name || detailCustomer?.phone || 'Customer History'}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400 mt-0.5">
              {detailCustomer?.phone && `📞 ${detailCustomer.phone}`}
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 max-h-[55vh] overflow-y-auto space-y-3">
            {isDetailLoading ? (
              <div className="h-40 flex items-center justify-center">
                <Loader2 className="animate-spin text-violet-600" size={28} />
              </div>
            ) : !detailCustomer || detailCustomer.bills.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center gap-2 text-gray-400">
                <p className="font-semibold text-gray-600">No bills yet</p>
                <p className="text-xs">This customer hasn't placed any orders.</p>
              </div>
            ) : (
              detailCustomer.bills.map(bill => (
                <div key={bill.id} className="border border-gray-100 rounded-xl p-4 hover:bg-gray-50/50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono font-bold text-gray-900 text-sm">{bill.billNumber}</span>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(bill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {' · '}{bill.orderType.replace(/_/g, ' ')}
                        {' · '}{bill.paymentMethod}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold font-mono text-gray-900">
                        ₹{Number(bill.total).toFixed(2)}
                      </p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        bill.status === 'PAID' ? 'bg-emerald-50 text-emerald-700'
                        : bill.status === 'CANCELLED' ? 'bg-rose-50 text-rose-600'
                        : 'bg-amber-50 text-amber-700'
                      }`}>
                        {bill.status}
                      </span>
                    </div>
                  </div>
                  {bill.items.length > 0 && (
                    <p className="text-xs text-gray-500 mt-2">
                      {bill.items.map(i => `${i.quantity}× ${i.menuItem.name}`).join(', ')}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-sm border border-gray-100 rounded-2xl shadow-xl p-6 bg-white max-h-[90dvh] overflow-y-auto">
          <DialogHeader className="pb-2 border-b border-gray-100 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center text-rose-500 mb-3">
              <AlertTriangle size={22} />
            </div>
            <DialogTitle className="text-lg font-bold">Delete Customer?</DialogTitle>
            <DialogDescription className="text-xs text-gray-500 mt-1">
              Remove <span className="font-bold text-gray-800">"{deletingCustomer?.name || deletingCustomer?.phone}"</span> from the database.
              This will fail if they have bills on record.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 border-t border-gray-100 flex gap-2">
            <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)} className="flex-1 h-10 font-bold border-gray-200 rounded-xl">Cancel</Button>
            <Button onClick={handleDelete} className="flex-1 h-10 font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl border-0">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
