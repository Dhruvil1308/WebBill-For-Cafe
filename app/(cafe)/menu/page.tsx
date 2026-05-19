"use client"

import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, Loader2, AlertTriangle, HelpCircle, Check, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

export default function MenuManagementPage() {
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  // Dialog Open States
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  // Form Field States
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [isVeg, setIsVeg] = useState(true)
  const [isAvailable, setIsAvailable] = useState(true)
  const [imageUrl, setImageUrl] = useState('')
  const [imageUploading, setImageUploading] = useState(false)

  // Selections for actions
  const [editingItem, setEditingItem] = useState<any>(null)
  const [deletingItem, setDeletingItem] = useState<any>(null)

  // Fetch menu items and categories on mount
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        const [itemsRes, catsRes] = await Promise.all([
          fetch('/api/menu-items'),
          fetch('/api/categories')
        ])

        if (itemsRes.ok && catsRes.ok) {
          const itemsData = await itemsRes.json()
          const catsData = await catsRes.json()
          setMenuItems(itemsData)
          setCategories(catsData)
          
          // Pre-populate categoryId for the add item form
          if (catsData.length > 0) {
            setCategoryId(catsData[0].id)
          }
        } else {
          toast.error('Failed to retrieve inventory data from database')
        }
      } catch (err) {
        console.error('Error fetching inventory:', err)
        toast.error('Unable to establish connection with Supabase database')
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  // Filter items instantly in memory
  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'All' || item.categoryId === selectedCategory
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Open & Pre-populate Add Modal
  const handleOpenAdd = () => {
    setName('')
    setPrice('')
    if (categories.length > 0) {
      setCategoryId(categories[0].id)
    }
    setIsVeg(true)
    setIsAvailable(true)
    setImageUrl('')
    setIsAddOpen(true)
  }

  // Open & Pre-populate Edit Modal
  const handleOpenEdit = (item: any) => {
    setEditingItem(item)
    setName(item.name)
    setPrice(Number(item.price).toString())
    setCategoryId(item.categoryId)
    setIsVeg(item.isVeg)
    setIsAvailable(item.isAvailable)
    setImageUrl(item.imageUrl || '')
    setIsEditOpen(true)
  }

  // Open Delete Modal
  const handleOpenDelete = (item: any) => {
    setDeletingItem(item)
    setIsDeleteOpen(true)
  }

  // Image Upload Handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024) {
      toast.error('Image file size must be less than 100KB');
      return;
    }

    try {
      setImageUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'menu-images');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to upload image');
      }

      const data = await res.json();
      setImageUrl(data.url);
      toast.success('Image uploaded successfully');
    } catch (err: any) {
      toast.error(err.message || 'Error uploading image');
    } finally {
      setImageUploading(false);
    }
  };

  // Submit new menu item
  const handleSubmitAdd = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Please enter a valid item name')
      return
    }

    const numericPrice = parseFloat(price)
    if (isNaN(numericPrice) || numericPrice <= 0) {
      toast.error('Price must be a valid positive number')
      return
    }

    if (!categoryId) {
      toast.error('Please select an item category')
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch('/api/menu-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          price: numericPrice,
          categoryId,
          isVeg,
          isAvailable,
          imageUrl: imageUrl || null
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create menu item')
      }

      const newItem = await res.json()
      setMenuItems(prev => [...prev, newItem])
      toast.success(`"${newItem.name}" added to menu successfully!`)
      setIsAddOpen(false)
    } catch (err: any) {
      toast.error(err.message || 'Error occurred while saving item')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Submit updated menu item
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return

    if (!name.trim()) {
      toast.error('Please enter a valid item name')
      return
    }

    const numericPrice = parseFloat(price)
    if (isNaN(numericPrice) || numericPrice <= 0) {
      toast.error('Price must be a valid positive number')
      return
    }

    if (!categoryId) {
      toast.error('Please select an item category')
      return
    }

    try {
      setIsSubmitting(true)
      const res = await fetch(`/api/menu-items/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          price: numericPrice,
          categoryId,
          isVeg,
          isAvailable,
          imageUrl: imageUrl || null
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update menu item')
      }

      const updatedItem = await res.json()
      setMenuItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item))
      toast.success(`"${updatedItem.name}" updated successfully!`)
      setIsEditOpen(false)
      setEditingItem(null)
    } catch (err: any) {
      toast.error(err.message || 'Error occurred while saving changes')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle double-confirmed deletion (soft vs hard delete)
  const handleDelete = async () => {
    if (!deletingItem) return

    try {
      setIsSubmitting(true)
      const res = await fetch(`/api/menu-items/${deletingItem.id}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete item')
      }

      const data = await res.json()
      if (data.softDeleted) {
        // Soft delete occurred due to existing order history
        setMenuItems(prev => prev.map(item => item.id === deletingItem.id ? { ...item, isAvailable: false } : item))
        toast.warning(
          `"${deletingItem.name}" contains order history. Automatically flagged as Inactive to preserve reports.`,
          { duration: 6000 }
        )
      } else {
        // Successful hard delete
        setMenuItems(prev => prev.filter(item => item.id !== deletingItem.id))
        toast.success(`"${deletingItem.name}" permanently deleted successfully!`)
      }

      setIsDeleteOpen(false)
      setDeletingItem(null)
    } catch (err: any) {
      toast.error(err.message || 'Error occurred while deleting item')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in duration-300">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/40 backdrop-blur-md border border-gray-200/80 rounded-2xl p-5 shadow-sm">
        <div>
          <h1 className="text-2xl font-headings font-bold text-gray-900 tracking-tight">Menu Inventory</h1>
          <p className="text-gray-500 text-sm mt-1">Manage cafe items, custom pricing, dietary flags, and catalog options.</p>
        </div>
        <Button 
          onClick={handleOpenAdd}
          className="bg-violet-600 hover:bg-violet-700 active:scale-95 text-white gap-2 font-bold px-4 py-2 rounded-xl transition-all shadow-sm"
        >
          <Plus size={18} />
          Add Menu Item
        </Button>
      </div>

      {/* Control Console (Search & Category Tabs) */}
      <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-gray-200 p-4 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Real-time search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input 
              placeholder="Search by item name..." 
              className="pl-10 h-10 rounded-xl bg-white shadow-none border-gray-200 focus-visible:ring-violet-500/25 placeholder:text-gray-400 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-gray-100/80 rounded-xl max-w-fit">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                selectedCategory === 'All'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              All Items
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Database List Table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-xs">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center text-gray-400 gap-3">
              <Loader2 className="animate-spin text-violet-600" size={32} />
              <p className="text-sm font-medium">Fetching catalog from database...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-gray-400 p-6 text-center space-y-2">
              <HelpCircle size={44} className="text-gray-300" />
              <h3 className="font-semibold text-gray-700">No menu items found</h3>
              <p className="text-xs max-w-xs">Try broadening your search criteria or select a different category filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50/70 text-gray-500 font-bold border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3.5">Item Name</th>
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5">Price</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-950 font-medium">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-2.5">
                          {/* Veg/Non-veg Indicator */}
                          <div className={`w-4 h-4 border flex items-center justify-center rounded-[3px] bg-white shrink-0 ${
                            item.isVeg ? 'border-emerald-500' : 'border-rose-500'
                          }`}>
                            {item.isVeg ? (
                              <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            ) : (
                              <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[6px] border-b-rose-500" />
                            )}
                          </div>
                          <span className="font-bold text-gray-900">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4.5">
                        <span className="inline-flex items-center bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider">
                          {item.category?.name || 'Unassigned'}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 text-gray-900 font-bold">₹{Number(item.price).toFixed(2)}</td>
                      <td className="px-6 py-4.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          item.isAvailable 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' 
                            : 'bg-rose-50 text-rose-600 border border-rose-200/50'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            item.isAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                          }`} />
                          {item.isAvailable ? 'Available' : 'Unavailable'}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button 
                            variant="ghost" 
                            size="icon-sm" 
                            onClick={() => handleOpenEdit(item)}
                            className="h-8 w-8 text-gray-500 hover:text-violet-600 hover:bg-violet-50/50 border-0 rounded-lg"
                          >
                            <Edit2 size={15} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon-sm" 
                            onClick={() => handleOpenDelete(item)}
                            className="h-8 w-8 text-gray-500 hover:text-rose-600 hover:bg-rose-50/50 border-0 rounded-lg"
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
      </div>

      {/* ─── ADD MENU ITEM DIALOG ──────────────────────────────────── */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md border border-gray-100 rounded-2xl shadow-xl p-6 bg-white animate-in zoom-in-95 duration-150">
          <DialogHeader className="pb-2 border-b border-gray-100">
            <DialogTitle className="text-lg font-bold text-gray-900">Add Menu Item</DialogTitle>
            <DialogDescription className="text-gray-500 text-xs mt-1">
              Add a new delicious item to your active menu card.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitAdd} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Item Name</label>
              <Input
                placeholder="e.g. Masala Chai"
                className="h-10 rounded-xl border-gray-200 focus-visible:ring-violet-500/20 text-sm bg-gray-50/50"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Price (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="0.00"
                  className="h-10 rounded-xl border-gray-200 focus-visible:ring-violet-500/20 text-sm bg-gray-50/50"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Category</label>
                <select
                  className="h-10 px-3 rounded-xl border border-gray-200 outline-none text-sm bg-gray-50/50 focus:border-violet-500 transition-colors font-medium text-gray-700"
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  required
                >
                  <option value="" disabled>Select category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Item Image</label>
              <div className="flex items-center gap-4">
                {imageUrl ? (
                  <div className="relative w-14 h-14 rounded-xl border border-gray-200 overflow-hidden shrink-0 bg-gray-50 flex items-center justify-center">
                    <img src={imageUrl} alt="Menu Item" className="max-w-full max-h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 hover:bg-black/70"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-xl border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400 shrink-0">
                    <Search size={16} />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={imageUploading}
                    className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 transition-all cursor-pointer"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Under 100KB. Displayed in POS Menu.</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Dietary Classification</label>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsVeg(true)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 border rounded-xl font-bold text-xs transition-all ${
                    isVeg 
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm ring-1 ring-emerald-500' 
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <div className="w-4 h-4 border border-emerald-500 flex items-center justify-center rounded-[3px] bg-white">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  </div>
                  Vegetarian
                </button>
                <button
                  type="button"
                  onClick={() => setIsVeg(false)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 border rounded-xl font-bold text-xs transition-all ${
                    !isVeg 
                      ? 'bg-rose-50 border-rose-500 text-rose-800 shadow-sm ring-1 ring-rose-500' 
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <div className="w-4 h-4 border border-rose-500 flex items-center justify-center rounded-[3px] bg-white">
                    <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[8px] border-b-rose-500" />
                  </div>
                  Non-Veg
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Initial Availability</label>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAvailable(true)}
                  className={`flex-1 py-2.5 border rounded-xl font-bold text-xs transition-all ${
                    isAvailable 
                      ? 'bg-violet-50 border-violet-500 text-violet-850 shadow-sm ring-1 ring-violet-500' 
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  Active (In-Stock)
                </button>
                <button
                  type="button"
                  onClick={() => setIsAvailable(false)}
                  className={`flex-1 py-2.5 border rounded-xl font-bold text-xs transition-all ${
                    !isAvailable 
                      ? 'bg-gray-100 border-gray-400 text-gray-800 shadow-sm ring-1 ring-gray-400' 
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  Inactive (Out-of-Stock)
                </button>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-gray-100 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
                className="flex-1 h-10 font-bold border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 h-10 font-bold bg-violet-600 hover:bg-violet-700 text-white rounded-xl disabled:opacity-70 disabled:cursor-wait"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Saving...</span>
                  </div>
                ) : (
                  'Save Menu Item'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── EDIT MENU ITEM DIALOG ──────────────────────────────────── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md border border-gray-100 rounded-2xl shadow-xl p-6 bg-white animate-in zoom-in-95 duration-150">
          <DialogHeader className="pb-2 border-b border-gray-100">
            <DialogTitle className="text-lg font-bold text-gray-900">Edit Menu Item</DialogTitle>
            <DialogDescription className="text-gray-500 text-xs mt-1">
              Modify the attributes and pricing of the menu selection.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitEdit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Item Name</label>
              <Input
                placeholder="e.g. Masala Chai"
                className="h-10 rounded-xl border-gray-200 focus-visible:ring-violet-500/20 text-sm bg-gray-50/50"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Price (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="0.00"
                  className="h-10 rounded-xl border-gray-200 focus-visible:ring-violet-500/20 text-sm bg-gray-50/50"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">Category</label>
                <select
                  className="h-10 px-3 rounded-xl border border-gray-200 outline-none text-sm bg-gray-50/50 focus:border-violet-500 transition-colors font-medium text-gray-700"
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  required
                >
                  <option value="" disabled>Select category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Item Image</label>
              <div className="flex items-center gap-4">
                {imageUrl ? (
                  <div className="relative w-14 h-14 rounded-xl border border-gray-200 overflow-hidden shrink-0 bg-gray-50 flex items-center justify-center">
                    <img src={imageUrl} alt="Menu Item" className="max-w-full max-h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 hover:bg-black/70"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-xl border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400 shrink-0">
                    <Search size={16} />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={imageUploading}
                    className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 transition-all cursor-pointer"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Under 100KB. Displayed in POS Menu.</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Dietary Classification</label>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsVeg(true)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 border rounded-xl font-bold text-xs transition-all ${
                    isVeg 
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm ring-1 ring-emerald-500' 
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <div className="w-4 h-4 border border-emerald-500 flex items-center justify-center rounded-[3px] bg-white">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  </div>
                  Vegetarian
                </button>
                <button
                  type="button"
                  onClick={() => setIsVeg(false)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 border rounded-xl font-bold text-xs transition-all ${
                    !isVeg 
                      ? 'bg-rose-50 border-rose-500 text-rose-800 shadow-sm ring-1 ring-rose-500' 
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <div className="w-4 h-4 border border-rose-500 flex items-center justify-center rounded-[3px] bg-white">
                    <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[8px] border-b-rose-500" />
                  </div>
                  Non-Veg
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Availability State</label>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAvailable(true)}
                  className={`flex-1 py-2.5 border rounded-xl font-bold text-xs transition-all ${
                    isAvailable 
                      ? 'bg-violet-50 border-violet-500 text-violet-85 shadow-sm ring-1 ring-violet-500' 
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  Active (In-Stock)
                </button>
                <button
                  type="button"
                  onClick={() => setIsAvailable(false)}
                  className={`flex-1 py-2.5 border rounded-xl font-bold text-xs transition-all ${
                    !isAvailable 
                      ? 'bg-gray-100 border-gray-400 text-gray-800 shadow-sm ring-1 ring-gray-400' 
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  Inactive (Out-of-Stock)
                </button>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-gray-100 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditOpen(false)
                  setEditingItem(null)
                }}
                className="flex-1 h-10 font-bold border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 h-10 font-bold bg-violet-600 hover:bg-violet-700 text-white rounded-xl disabled:opacity-70 disabled:cursor-wait"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Saving...</span>
                  </div>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── DOUBLE-CONFIRMATION DELETE DIALOG ────────────────────────── */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md border border-gray-100 rounded-2xl shadow-xl p-6 bg-white animate-in zoom-in-95 duration-150">
          <DialogHeader className="pb-2 border-b border-gray-100 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center text-rose-500 mb-3 animate-bounce duration-1000">
              <AlertTriangle size={24} />
            </div>
            <DialogTitle className="text-lg font-bold text-gray-900">Delete Menu Selection?</DialogTitle>
            <DialogDescription className="text-gray-500 text-xs mt-1 max-w-sm">
              Confirm if you wish to remove <span className="font-bold text-gray-850">"{deletingItem?.name}"</span> from the catalog.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 px-4 bg-amber-50/50 border border-amber-250/30 rounded-xl space-y-2 mt-2">
            <div className="flex gap-2">
              <HelpCircle className="text-amber-600 shrink-0 mt-0.5" size={16} />
              <p className="text-xs text-amber-900 leading-relaxed font-semibold">
                WebBill Automatic Deletion Safety Engine:
              </p>
            </div>
            <p className="text-[11px] text-amber-800 pl-6 leading-relaxed">
              If this item has previously been ordered, the system will prevent table corruption and automatically **Soft-Delete** (disabling in-stock availability) to keep sales analytics accurate. Otherwise, a **Permanent Hard-Delete** will execute.
            </p>
          </div>

          <DialogFooter className="pt-4 border-t border-gray-100 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteOpen(false)
                setDeletingItem(null)
              }}
              className="flex-1 h-10 font-bold border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl"
            >
              Keep Item
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isSubmitting}
              className="flex-1 h-10 font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl border-0 disabled:opacity-70 disabled:cursor-wait"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  <span>Deleting...</span>
                </div>
              ) : (
                'Confirm Deletion'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}