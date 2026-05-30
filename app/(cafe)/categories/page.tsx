"use client"

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Loader2, Tag, AlertTriangle, ToggleLeft, ToggleRight, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

interface Category {
  id: string
  name: string
  sortOrder: number
  isActive: boolean
  createdAt: string
  _count?: { items: number }
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [deletingCat, setDeletingCat] = useState<Category | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const fetchCategories = async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`/api/categories?t=${Date.now()}`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setCategories(data)
      } else {
        toast.error('Failed to load categories')
      }
    } catch {
      toast.error('Error connecting to server')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchCategories() }, [])

  // ADD
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) return toast.error('Category name is required')
    setIsSaving(true)
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName.trim() })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create category')
      }
      const newCat = await res.json()
      setCategories(prev => [...prev, newCat])
      toast.success(`Category "${newCat.name}" created!`)
      setIsAddOpen(false)
      setFormName('')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // EDIT
  const openEdit = (cat: Category) => {
    setEditingCat(cat)
    setFormName(cat.name)
    setIsEditOpen(true)
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCat || !formName.trim()) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/categories/${editingCat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName.trim() })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update category')
      }
      const updated = await res.json()
      setCategories(prev => prev.map(c => c.id === updated.id ? updated : c))
      toast.success(`Category renamed to "${updated.name}"`)
      setIsEditOpen(false)
      setEditingCat(null)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // TOGGLE ACTIVE
  const toggleActive = async (cat: Category) => {
    try {
      const res = await fetch(`/api/categories/${cat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !cat.isActive })
      })
      if (!res.ok) throw new Error('Failed to toggle status')
      const updated = await res.json()
      setCategories(prev => prev.map(c => c.id === updated.id ? updated : c))
      toast.success(`"${cat.name}" is now ${!cat.isActive ? 'Active' : 'Inactive'}`)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  // SORT ORDER (move up/down)
  const moveSortOrder = async (cat: Category, direction: 'up' | 'down') => {
    const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder)
    const idx = sorted.findIndex(c => c.id === cat.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return

    const swapCat = sorted[swapIdx]
    const newOrderCurrent = swapCat.sortOrder
    const newOrderSwap = cat.sortOrder

    await Promise.all([
      fetch(`/api/categories/${cat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: newOrderCurrent })
      }),
      fetch(`/api/categories/${swapCat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sortOrder: newOrderSwap })
      })
    ])

    setCategories(prev => prev.map(c => {
      if (c.id === cat.id) return { ...c, sortOrder: newOrderCurrent }
      if (c.id === swapCat.id) return { ...c, sortOrder: newOrderSwap }
      return c
    }))
  }

  // DELETE
  const openDelete = (cat: Category) => {
    setDeletingCat(cat)
    setIsDeleteOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingCat) return
    try {
      const res = await fetch(`/api/categories/${deletingCat.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete')
      }
      const data = await res.json()
      if (data.softDeleted) {
        setCategories(prev => prev.map(c => c.id === deletingCat.id ? { ...c, isActive: false } : c))
        toast.warning(`"${deletingCat.name}" has menu items — marked Inactive instead.`, { duration: 6000 })
      } else {
        setCategories(prev => prev.filter(c => c.id !== deletingCat.id))
        toast.success(`"${deletingCat.name}" deleted successfully`)
      }
      setIsDeleteOpen(false)
      setDeletingCat(null)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/40 backdrop-blur-md border border-gray-200/80 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-violet-100 border border-violet-200/50 rounded-2xl flex items-center justify-center text-violet-700">
            <Tag size={22} className="stroke-[2.25]" />
          </div>
          <div>
            <h1 className="text-2xl font-headings font-bold text-gray-900 tracking-tight">Menu Categories</h1>
            <p className="text-gray-500 text-sm mt-0.5">Organise menu items into logical groups for faster billing.</p>
          </div>
        </div>
        <Button
          onClick={() => { setFormName(''); setIsAddOpen(true) }}
          className="bg-violet-600 hover:bg-violet-700 text-white gap-2 font-bold px-4 py-2 rounded-xl transition-all shadow-sm"
        >
          <Plus size={18} />
          Add Category
        </Button>
      </div>

      {/* Table Card */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-gray-400">
            <Loader2 className="animate-spin text-violet-600" size={32} />
            <p className="text-sm font-medium">Loading categories...</p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-gray-400">
            <Tag size={44} className="text-gray-300" />
            <div className="text-center">
              <p className="font-semibold text-gray-600">No categories yet</p>
              <p className="text-xs mt-1">Create your first category to start organising your menu.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/70 text-gray-500 font-bold border-b border-gray-100 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-6 py-4">Sort</th>
                  <th className="px-6 py-4">Category Name</th>
                  <th className="px-6 py-4 text-center">Menu Items</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map((cat, idx) => (
                  <tr key={cat.id} className="hover:bg-gray-50/50 transition-colors group">
                    {/* Sort Arrows */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => moveSortOrder(cat, 'up')}
                          disabled={idx === 0}
                          className="p-1 rounded hover:bg-gray-100 disabled:opacity-25 transition-colors"
                        >
                          <ArrowUp size={13} className="text-gray-500" />
                        </button>
                        <button
                          onClick={() => moveSortOrder(cat, 'down')}
                          disabled={idx === sorted.length - 1}
                          className="p-1 rounded hover:bg-gray-100 disabled:opacity-25 transition-colors"
                        >
                          <ArrowDown size={13} className="text-gray-500" />
                        </button>
                      </div>
                    </td>

                    {/* Name */}
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-900">{cat.name}</span>
                    </td>

                    {/* Item Count */}
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center bg-violet-50 text-violet-700 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                        {cat._count?.items ?? 0} items
                      </span>
                    </td>

                    {/* Toggle Active */}
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleActive(cat)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          cat.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}
                      >
                        {cat.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        {cat.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(cat)}
                          className="h-8 w-8 text-gray-500 hover:text-violet-600 hover:bg-violet-50/50 rounded-lg"
                        >
                          <Edit2 size={15} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openDelete(cat)}
                          className="h-8 w-8 text-gray-500 hover:text-rose-600 hover:bg-rose-50/50 rounded-lg"
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
            <DialogTitle className="text-lg font-bold text-gray-900">Add Category</DialogTitle>
            <DialogDescription className="text-gray-500 text-xs mt-1">
              Create a new menu group to organise your items.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Category Name *</label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. Hot Drinks"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 text-sm bg-gray-50/50"
                required
              />
            </div>
            <DialogFooter className="pt-3 border-t border-gray-100 flex gap-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="flex-1 h-10 font-bold border-gray-200 rounded-xl">Cancel</Button>
              <Button type="submit" disabled={isSaving} className="flex-1 h-10 font-bold bg-violet-600 hover:bg-violet-700 text-white rounded-xl">
                {isSaving ? <Loader2 size={15} className="animate-spin" /> : 'Create Category'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-sm border border-gray-100 rounded-2xl shadow-xl p-6 bg-white max-h-[90dvh] overflow-y-auto">
          <DialogHeader className="pb-2 border-b border-gray-100">
            <DialogTitle className="text-lg font-bold text-gray-900">Edit Category</DialogTitle>
            <DialogDescription className="text-gray-500 text-xs mt-1">Rename this category.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Category Name *</label>
              <input
                type="text"
                autoFocus
                value={formName}
                onChange={e => setFormName(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 text-sm bg-gray-50/50"
                required
              />
            </div>
            <DialogFooter className="pt-3 border-t border-gray-100 flex gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="flex-1 h-10 font-bold border-gray-200 rounded-xl">Cancel</Button>
              <Button type="submit" disabled={isSaving} className="flex-1 h-10 font-bold bg-violet-600 hover:bg-violet-700 text-white rounded-xl">
                {isSaving ? <Loader2 size={15} className="animate-spin" /> : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-sm border border-gray-100 rounded-2xl shadow-xl p-6 bg-white max-h-[90dvh] overflow-y-auto">
          <DialogHeader className="pb-2 border-b border-gray-100 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center text-rose-500 mb-3">
              <AlertTriangle size={22} />
            </div>
            <DialogTitle className="text-lg font-bold text-gray-900">Delete Category?</DialogTitle>
            <DialogDescription className="text-gray-500 text-xs mt-1">
              Remove <span className="font-bold text-gray-800">"{deletingCat?.name}"</span> from your menu.
              If it has items, it will be disabled instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 border-t border-gray-100 flex gap-2">
            <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)} className="flex-1 h-10 font-bold border-gray-200 rounded-xl">Keep It</Button>
            <Button onClick={handleDelete} className="flex-1 h-10 font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl border-0">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
