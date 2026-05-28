"use client"

import { useState, useEffect } from 'react'
import { Plus, Trash2, Pencil, Search, Wallet, FileText, Banknote, IndianRupee } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

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
    paymentMethod: 'CASH',
    paidTo: '',
    note: '',
    date: new Date().toISOString().split('T')[0],
  })

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
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const total = (parseFloat(formData.quantity) * parseFloat(formData.price)).toString()
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          quantity: parseInt(formData.quantity),
          price: parseFloat(formData.price),
          total,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to add expense')
      }

      toast.success('Expense added successfully')
      setIsAddOpen(false)
      setFormData({
        itemName: '', quantity: '1', price: '', paymentMethod: 'CASH', paidTo: '', note: '', date: new Date().toISOString().split('T')[0]
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
      const total = (parseFloat(formData.quantity) * parseFloat(formData.price)).toString()
      const res = await fetch(`/api/expenses/${currentExpense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          quantity: parseInt(formData.quantity),
          price: parseFloat(formData.price),
          total,
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

  const openEditModal = (expense: Expense) => {
    setCurrentExpense(expense)
    setFormData({
      itemName: expense.itemName,
      quantity: expense.quantity.toString(),
      price: expense.price.toString(),
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

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Expense Management</h1>
          <p className="text-gray-500 mt-1">Track your cafe's daily purchases and outgoings.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={<Button className="bg-violet-600 hover:bg-violet-700 text-white shadow-sm" />}>
            <Plus className="mr-2 h-4 w-4" /> Add Expense
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
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
              <div className="space-y-2">
                <label className="text-sm font-medium">Total Amount</label>
                <Input value={((parseFloat(formData.quantity) || 0) * (parseFloat(formData.price) || 0)).toFixed(2)} disabled className="bg-gray-50 font-semibold" />
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
                  <label className="text-sm font-medium">Date</label>
                  <Input name="date" type="date" value={formData.date} onChange={handleInputChange} required />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Paid To (Vendor)</label>
                <Input name="paidTo" value={formData.paidTo} onChange={handleInputChange} placeholder="e.g. Local Dairy" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <textarea name="note" value={formData.note} onChange={handleInputChange} className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" placeholder="Optional notes..."></textarea>
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
                <th className="px-6 py-4 font-medium text-right">Qty × Price</th>
                <th className="px-6 py-4 font-medium text-right">Total</th>
                <th className="px-6 py-4 font-medium text-center">Payment</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="animate-pulse flex flex-col items-center">
                      <div className="h-8 w-8 bg-gray-200 rounded-full mb-2"></div>
                      Loading expenses...
                    </div>
                  </td>
                </tr>
              ) : filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <Wallet className="h-10 w-10 text-gray-300 mb-3" />
                      <p className="text-lg font-medium text-gray-900">No expenses found</p>
                      <p className="text-sm">You haven't recorded any expenses yet.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {format(new Date(expense.date), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{expense.itemName}</div>
                      {expense.paidTo && <div className="text-xs text-gray-500 mt-0.5">To: {expense.paidTo}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-gray-600">
                      {expense.quantity} × ₹{Number(expense.price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-semibold text-gray-900">
                      ₹{Number(expense.total).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                        {expense.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => openEditModal(expense)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(expense.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Total Amount</label>
              <Input value={((parseFloat(formData.quantity) || 0) * (parseFloat(formData.price) || 0)).toFixed(2)} disabled className="bg-gray-50 font-semibold" />
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
                <label className="text-sm font-medium">Date</label>
                <Input name="date" type="date" value={formData.date} onChange={handleInputChange} required />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Paid To (Vendor)</label>
              <Input name="paidTo" value={formData.paidTo} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <textarea name="note" value={formData.note} onChange={handleInputChange} className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"></textarea>
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
