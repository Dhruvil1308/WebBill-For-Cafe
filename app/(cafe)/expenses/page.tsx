"use client"

import { useState, useEffect } from 'react'
import { Plus, Trash2, Pencil, Search, Wallet, FileText, Banknote, IndianRupee, CheckCircle2, XCircle, CalendarClock, CheckSquare, Square } from 'lucide-react'
import { toast } from 'sonner'
import { format, isPast, isToday, addDays } from 'date-fns'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Expense {
  id: string
  itemName: string
  quantity: number
  price: number
  total: number
  amountPaid: number
  isCleared: boolean
  dueDate: string | null
  paymentMethod: string
  paidTo: string | null
  note: string | null
  date: string
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [currentExpense, setCurrentExpense] = useState<Expense | null>(null)
  
  // Form State
  const [formData, setFormData] = useState({
    itemName: '',
    quantity: '1',
    price: '',
    amountPaid: '',
    isCleared: false,
    dueDate: '',
    paymentMethod: 'CASH',
    paidTo: '',
    note: '',
    date: new Date().toISOString().split('T')[0],
  })

  // Whenever price/quantity changes in add mode, automatically update amountPaid if it's cleared
  useEffect(() => {
    if (isAddOpen && formData.isCleared) {
      const total = (parseFloat(formData.quantity || '0') * parseFloat(formData.price || '0')).toFixed(2)
      if (formData.amountPaid !== total && !isNaN(Number(total))) {
        setFormData(prev => ({ ...prev, amountPaid: total }))
      }
    }
  }, [formData.quantity, formData.price, formData.isCleared, isAddOpen])

  useEffect(() => {
    fetchExpenses()
  }, [])

  const fetchExpenses = async () => {
    try {
      const res = await fetch('/api/expenses')
      if (!res.ok) throw new Error('Failed to fetch expenses')
      const data = await res.json()
      setExpenses(data)
    } catch (error: any) {
      toast.error(error.message || 'Error fetching expenses')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value
    setFormData({ ...formData, [e.target.name]: value })
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const total = (parseFloat(formData.quantity) * parseFloat(formData.price)).toFixed(2)
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          quantity: parseInt(formData.quantity),
          price: parseFloat(formData.price),
          total,
          amountPaid: formData.amountPaid ? parseFloat(formData.amountPaid) : (formData.isCleared ? parseFloat(total) : 0),
          dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to add expense')
      }

      toast.success('Expense added successfully')
      setIsAddOpen(false)
      setFormData({
        itemName: '', quantity: '1', price: '', amountPaid: '', isCleared: false, dueDate: '', paymentMethod: 'CASH', paidTo: '', note: '', date: new Date().toISOString().split('T')[0]
      })
      fetchExpenses()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentExpense) return
    try {
      const total = (parseFloat(formData.quantity) * parseFloat(formData.price)).toFixed(2)
      const res = await fetch(`/api/expenses/${currentExpense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          quantity: parseInt(formData.quantity),
          price: parseFloat(formData.price),
          total,
          amountPaid: formData.amountPaid ? parseFloat(formData.amountPaid) : 0,
          dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to update expense')
      }

      toast.success('Expense updated successfully')
      setIsEditOpen(false)
      setCurrentExpense(null)
      fetchExpenses()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return
    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete expense')
      toast.success('Expense deleted')
      fetchExpenses()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const toggleClearedStatus = async (expense: Expense) => {
    try {
      const newStatus = !expense.isCleared
      const newAmountPaid = newStatus ? expense.total : 0
      
      const res = await fetch(`/api/expenses/${expense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isCleared: newStatus,
          amountPaid: newAmountPaid
        }),
      })

      if (!res.ok) throw new Error('Failed to update status')
      toast.success(`Expense marked as ${newStatus ? 'cleared' : 'pending'}`)
      fetchExpenses()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const openEditModal = (expense: Expense) => {
    setCurrentExpense(expense)
    setFormData({
      itemName: expense.itemName,
      quantity: expense.quantity.toString(),
      price: expense.price.toString(),
      amountPaid: expense.amountPaid.toString(),
      isCleared: expense.isCleared,
      dueDate: expense.dueDate ? new Date(expense.dueDate).toISOString().split('T')[0] : '',
      paymentMethod: expense.paymentMethod,
      paidTo: expense.paidTo || '',
      note: expense.note || '',
      date: new Date(expense.date).toISOString().split('T')[0],
    })
    setIsEditOpen(true)
  }

  const filteredExpenses = expenses.filter(e => 
    e.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.paidTo?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalMonthlyExpenses = expenses
    .filter(e => new Date(e.date).getMonth() === new Date().getMonth() && new Date(e.date).getFullYear() === new Date().getFullYear())
    .reduce((acc, curr) => acc + parseFloat(curr.total.toString()), 0)

  const totalPendingAmount = expenses
    .filter(e => !e.isCleared)
    .reduce((acc, curr) => acc + (parseFloat(curr.total.toString()) - parseFloat(curr.amountPaid.toString())), 0)

  const getDueDateStatus = (dueDateStr: string | null, isCleared: boolean) => {
    if (!dueDateStr || isCleared) return null
    const dueDate = new Date(dueDateStr)
    // reset times for fair comparison
    dueDate.setHours(0,0,0,0)
    const today = new Date()
    today.setHours(0,0,0,0)

    if (dueDate < today) return { label: 'Overdue', color: 'text-red-600 bg-red-50 border-red-200' }
    if (dueDate.getTime() === today.getTime()) return { label: 'Due Today', color: 'text-amber-600 bg-amber-50 border-amber-200' }
    if (dueDate <= addDays(today, 3)) return { label: 'Due Soon', color: 'text-orange-600 bg-orange-50 border-orange-200' }
    return { label: 'Upcoming', color: 'text-gray-600 bg-gray-50 border-gray-200' }
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Expense Management</h1>
          <p className="text-gray-500 mt-1">Track your cafe's daily purchases, payments, and dues.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={<Button className="bg-violet-600 hover:bg-violet-700 text-white shadow-sm" />}>
            <Plus className="mr-2 h-4 w-4" /> Add Expense
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Expense</DialogTitle>
              <DialogDescription>Record a new purchase or outgoing payment.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Item Name <span className="text-red-500">*</span></label>
                <Input name="itemName" value={formData.itemName} onChange={handleInputChange} required placeholder="e.g. Coffee Beans, Milk" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quantity</label>
                  <Input name="quantity" type="number" min="1" step="0.01" value={formData.quantity} onChange={handleInputChange} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Price per unit <span className="text-red-500">*</span></label>
                  <Input name="price" type="number" step="0.01" value={formData.price} onChange={handleInputChange} required placeholder="0.00" />
                </div>
              </div>

              {/* Clearance & Payment Section */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium text-gray-900">Payment Cleared?</label>
                    <p className="text-xs text-gray-500">Mark if the full amount is paid</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" name="isCleared" checked={formData.isCleared} onChange={handleInputChange} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Amount Paid</label>
                    <Input name="amountPaid" type="number" step="0.01" value={formData.amountPaid} onChange={handleInputChange} placeholder={((parseFloat(formData.quantity)||0) * (parseFloat(formData.price)||0)).toFixed(2)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Due Date {!formData.isCleared && <span className="text-xs text-red-500">(Recommended)</span>}</label>
                    <Input name="dueDate" type="date" value={formData.dueDate} onChange={handleInputChange} disabled={formData.isCleared} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Payment Method</label>
                  <select name="paymentMethod" value={formData.paymentMethod} onChange={handleInputChange} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">Card</option>
                    <option value="WALLET">Wallet</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Purchase Date</label>
                  <Input name="date" type="date" value={formData.date} onChange={handleInputChange} required />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Paid To (Vendor)</label>
                <Input name="paidTo" value={formData.paidTo} onChange={handleInputChange} placeholder="e.g. Local Dairy" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-violet-600 hover:bg-violet-700">Save Expense</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses (This Month)</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalMonthlyExpenses.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">Based on current month data</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 shadow-sm bg-red-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-900">Total Pending Dues</CardTitle>
            <CalendarClock className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">₹{totalPendingAmount.toFixed(2)}</div>
            <p className="text-xs text-red-600 mt-1">Amount left to be paid</p>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expenses.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Lifetime expense entries</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border flex items-center gap-4 bg-gray-50/50">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search expenses or vendors..."
              className="pl-9 bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Item & Vendor</th>
                <th className="px-6 py-4 font-medium text-right">Total</th>
                <th className="px-6 py-4 font-medium text-right">Paid</th>
                <th className="px-6 py-4 font-medium text-center">Status</th>
                <th className="px-6 py-4 font-medium text-right">Due Date</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <div className="animate-pulse flex flex-col items-center">
                      <div className="h-8 w-8 bg-gray-200 rounded-full mb-2"></div>
                      Loading expenses...
                    </div>
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <Wallet className="h-10 w-10 text-gray-300 mb-3" />
                      <p className="text-lg font-medium text-gray-900">No expenses found</p>
                      <p className="text-sm">You haven't recorded any expenses yet.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => {
                  const dueStatus = getDueDateStatus(expense.dueDate, expense.isCleared)
                  
                  return (
                    <tr key={expense.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {format(new Date(expense.date), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{expense.itemName}</div>
                        {expense.paidTo && <div className="text-xs text-gray-500 mt-0.5">To: {expense.paidTo}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-gray-900">
                        ₹{Number(expense.total).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-emerald-600">
                        ₹{Number(expense.amountPaid).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {expense.isCleared ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Cleared
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3.5 h-3.5" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {expense.isCleared ? (
                          <span className="text-gray-400 text-xs">-</span>
                        ) : dueStatus ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${dueStatus.color}`}>
                            {format(new Date(expense.dueDate!), 'MMM dd')} - {dueStatus.label}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">No Due Date</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title={expense.isCleared ? "Mark as Pending" : "Mark as Cleared"}
                            className={`h-8 w-8 ${expense.isCleared ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50' : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'}`} 
                            onClick={() => toggleClearedStatus(expense)}
                          >
                            {expense.isCleared ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => openEditModal(expense)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(expense.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>Update the details of this expense.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Item Name <span className="text-red-500">*</span></label>
              <Input name="itemName" value={formData.itemName} onChange={handleInputChange} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Quantity</label>
                <Input name="quantity" type="number" min="1" step="0.01" value={formData.quantity} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Price per unit <span className="text-red-500">*</span></label>
                <Input name="price" type="number" step="0.01" value={formData.price} onChange={handleInputChange} required />
              </div>
            </div>

            {/* Clearance & Payment Section */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium text-gray-900">Payment Cleared?</label>
                  <p className="text-xs text-gray-500">Mark if the full amount is paid</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" name="isCleared" checked={formData.isCleared} onChange={handleInputChange} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-violet-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount Paid</label>
                  <Input name="amountPaid" type="number" step="0.01" value={formData.amountPaid} onChange={handleInputChange} placeholder={((parseFloat(formData.quantity)||0) * (parseFloat(formData.price)||0)).toFixed(2)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Due Date {!formData.isCleared && <span className="text-xs text-red-500">(Recommended)</span>}</label>
                  <Input name="dueDate" type="date" value={formData.dueDate} onChange={handleInputChange} disabled={formData.isCleared} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Method</label>
                <select name="paymentMethod" value={formData.paymentMethod} onChange={handleInputChange} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                  <option value="WALLET">Wallet</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Purchase Date</label>
                <Input name="date" type="date" value={formData.date} onChange={handleInputChange} required />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Paid To (Vendor)</label>
              <Input name="paidTo" value={formData.paidTo} onChange={handleInputChange} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-violet-600 hover:bg-violet-700">Update Expense</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
