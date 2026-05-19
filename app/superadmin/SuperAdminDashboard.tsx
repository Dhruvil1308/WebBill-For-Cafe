"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { toast } from 'sonner'
import { 
  Users, 
  Activity, 
  Sparkles, 
  UserPlus, 
  LogOut, 
  ReceiptText, 
  KeyRound, 
  X, 
  RefreshCw,
  Search,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

interface Cafe {
  id: string
  name: string
  address: string | null
  phone: string | null
  gstNumber: string | null
  createdAt: string
}

interface Client {
  id: string
  name: string
  email: string
  phone: string | null
  isActive: boolean
  plan: 'BASIC' | 'PRO' | 'ENTERPRISE'
  subscriptionEnds: string | null
  createdAt: string
  cafe: Cafe | null
}

export default function SuperAdminDashboard({ adminEmail }: { adminEmail: string }) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const router = useRouter()
  const supabase = createClient()

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    cafeName: '',
    plan: 'BASIC' as 'BASIC' | 'PRO' | 'ENTERPRISE',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [updatingIds, setUpdatingIds] = useState<Record<string, boolean>>({})

  // Edit & Delete State
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editData, setEditData] = useState<{ id: string; name: string; phone: string; plan: string; subscriptionEnds: string }>({
    id: '', name: '', phone: '', plan: 'BASIC', subscriptionEnds: ''
  })
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch Clients
  const fetchClients = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/superadmin/clients')
      if (!res.ok) {
        throw new Error('Failed to fetch clients')
      }
      const data = await res.json()
      setClients(data)
    } catch (err: any) {
      toast.error(err.message || 'Error loading clients')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [])

  // Logout Handler
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      toast.success('Logged out successfully')
      router.push('/login')
    } catch (error: any) {
      toast.error(error.message || 'Logout failed')
    }
  }

  // Toggle Client Active Status
  const toggleActiveStatus = async (id: string, currentStatus: boolean) => {
    setUpdatingIds(prev => ({ ...prev, [id]: true }))
    try {
      const res = await fetch(`/api/superadmin/clients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update client status')
      }

      toast.success(`Client ${!currentStatus ? 'activated' : 'deactivated'} successfully`)
      setClients(prev => prev.map(c => c.id === id ? { ...c, isActive: !currentStatus } : c))
    } catch (err: any) {
      toast.error(err.message || 'Error changing client status')
    } finally {
      setUpdatingIds(prev => ({ ...prev, [id]: false }))
    }
  }

  // Change Subscription Plan
  const changePlan = async (id: string, newPlan: 'BASIC' | 'PRO' | 'ENTERPRISE') => {
    setUpdatingIds(prev => ({ ...prev, [id]: true }))
    try {
      const res = await fetch(`/api/superadmin/clients/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: newPlan })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update client subscription plan')
      }

      toast.success(`Plan updated to ${newPlan}`)
      setClients(prev => prev.map(c => c.id === id ? { ...c, plan: newPlan } : c))
    } catch (err: any) {
      toast.error(err.message || 'Error changing client plan')
    } finally {
      setUpdatingIds(prev => ({ ...prev, [id]: false }))
    }
  }

  // Handle Full Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editData.name.trim()) return toast.error('Name is required')
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/superadmin/clients/${editData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editData.name,
          phone: editData.phone,
          plan: editData.plan,
          subscriptionEnds: editData.subscriptionEnds || null
        })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update client')
      }
      const updated = await res.json()
      setClients(prev => prev.map(c => c.id === updated.id ? updated : c))
      toast.success('Client updated successfully')
      setIsEditOpen(false)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Delete
  const handleDeleteClient = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/superadmin/clients/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete client')
      }
      setClients(prev => prev.filter(c => c.id !== deleteTarget.id))
      toast.success(`Client ${deleteTarget.name} and their Cafe deleted`)
      setIsDeleteOpen(false)
      setDeleteTarget(null)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsDeleting(false)
    }
  }

  // Generate Password Helper
  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData(prev => ({ ...prev, password }))
    toast.success('Generated a secure random password')
  }

  // Submit Client Registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.email || !formData.password || !formData.cafeName) {
      return toast.error('Please fill in all required fields')
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/superadmin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      toast.success('Cafe Owner account & Cafe registered successfully!')
      setIsModalOpen(false)
      setFormData({
        name: '',
        email: '',
        phone: '',
        password: '',
        cafeName: '',
        plan: 'BASIC',
      })
      fetchClients()
    } catch (err: any) {
      toast.error(err.message || 'Error registering new owner')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Search Filter
  const filteredClients = clients.filter(c => {
    const term = searchTerm.toLowerCase()
    return (
      c.name.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term) ||
      (c.cafe?.name || '').toLowerCase().includes(term)
    )
  })

  // Calculations for Stats Card
  const totalClients = clients.length
  const activeClients = clients.filter(c => c.isActive).length
  const premiumClients = clients.filter(c => c.plan === 'PRO' || c.plan === 'ENTERPRISE').length

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Premium Header bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center">
              <Image src="/WebBill_logo_edited.png" alt="WebBill Logo" width={140} height={40} style={{ width: 'auto', height: 'auto' }} className="object-contain" priority />
            </div>
            <div>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">SuperAdmin</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 hidden md:inline">Logged in as: <strong className="text-gray-700">{adminEmail}</strong></span>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-600 transition-colors"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Dynamic Welcome and Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 font-headings">System Administration</h1>
            <p className="mt-1 text-sm text-gray-500">Monitor billing accounts, manage cafe clients, and register new enterprises.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-medium px-4 py-2.5 rounded-xl transition-all shadow-md shadow-violet-100 hover:shadow-violet-200"
          >
            <UserPlus size={18} />
            Create Cafe Owner
          </button>
        </div>

        {/* System Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400">Total Client Cafes</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-0.5">{loading ? '...' : totalClients}</h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Activity size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400">Active Instances</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-0.5">{loading ? '...' : activeClients}</h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex items-center gap-5">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Sparkles size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400">Premium Tier Owners</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-0.5">{loading ? '...' : premiumClients}</h3>
            </div>
          </div>
        </div>

        {/* Main Client Table Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          
          {/* Table Header Filter controls */}
          <div className="p-5 border-b border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-900 font-headings">Registered Billing Clients</h2>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by owner or cafe..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-transparent text-sm transition-all"
              />
            </div>
          </div>

          {/* Table Contents */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-gray-500 gap-3">
                <RefreshCw className="animate-spin text-violet-600" size={32} />
                <p className="text-sm font-medium">Querying active client accounts...</p>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="py-20 text-center text-gray-400">
                <AlertCircle className="mx-auto text-gray-300 mb-2" size={40} />
                <p className="text-sm font-medium">No clients found matching the filters.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-sm text-gray-600">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase font-semibold tracking-wider text-[11px]">
                    <th className="py-4 px-6 w-1/4">Cafe Owner</th>
                    <th className="py-4 px-6 w-1/4">Cafe Name</th>
                    <th className="py-4 px-6">Subscription Plan</th>
                    <th className="py-4 px-6">Registered Date</th>
                    <th className="py-4 px-6">Expiry Date</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredClients.map((client) => {
                    const isBusy = updatingIds[client.id] || false
                    return (
                      <tr key={client.id} className="hover:bg-gray-50/50 transition-colors group">
                        {/* Cafe Owner Details */}
                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-900">{client.name}</span>
                            <span className="text-xs text-gray-400 mt-0.5">{client.email}</span>
                            {client.phone && <span className="text-xs text-gray-400 mt-0.5">{client.phone}</span>}
                          </div>
                        </td>

                        {/* Cafe Business Details */}
                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-800">{client.cafe?.name || 'No Cafe Registered'}</span>
                            <span className="text-[11px] font-mono text-gray-400 mt-0.5">ID: {client.cafe?.id || 'N/A'}</span>
                          </div>
                        </td>

                        {/* Subscription Tier Selection */}
                        <td className="py-4 px-6">
                          <select
                            value={client.plan}
                            onChange={(e) => changePlan(client.id, e.target.value as any)}
                            disabled={isBusy}
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-gray-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-600 disabled:opacity-50 ${
                              client.plan === 'ENTERPRISE' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                              client.plan === 'PRO' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                              'bg-gray-100 text-gray-600'
                            }`}
                          >
                            <option value="BASIC">BASIC</option>
                            <option value="PRO">PRO</option>
                            <option value="ENTERPRISE">ENTERPRISE</option>
                          </select>
                        </td>

                        {/* Registration Date */}
                        <td className="py-4 px-6 text-gray-500 whitespace-nowrap">
                          {new Date(client.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'short', day: 'numeric'
                          })}
                        </td>
                        
                        {/* Expiry Date */}
                        <td className="py-4 px-6 text-gray-500 whitespace-nowrap">
                          {client.subscriptionEnds ? new Date(client.subscriptionEnds).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'short', day: 'numeric'
                          }) : <span className="italic text-gray-400">Never</span>}
                        </td>

                        {/* Toggle Status switch */}
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => toggleActiveStatus(client.id, client.isActive)}
                            disabled={isBusy}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold select-none cursor-pointer transition-all ${
                              client.isActive 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' 
                                : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                            } disabled:opacity-50`}
                          >
                            {isBusy ? (
                              <RefreshCw className="animate-spin" size={12} />
                            ) : (
                              client.isActive ? <CheckCircle size={12} /> : <AlertCircle size={12} />
                            )}
                            {client.isActive ? 'Active' : 'Suspended'}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditData({
                                  id: client.id,
                                  name: client.name,
                                  phone: client.phone || '',
                                  plan: client.plan,
                                  subscriptionEnds: client.subscriptionEnds ? new Date(client.subscriptionEnds).toISOString().split('T')[0] : ''
                                })
                                setIsEditOpen(true)
                              }}
                              className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                              title="Edit Client"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                            </button>
                            <button
                              onClick={() => {
                                setDeleteTarget(client)
                                setIsDeleteOpen(true)
                              }}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Client"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Creation Modal dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-150 flex items-center justify-between">
              <div className="flex items-center gap-2 text-violet-600">
                <UserPlus size={20} />
                <h2 className="text-xl font-bold font-headings text-gray-900">Create Cafe Client Account</h2>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-50 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Client Personal Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Owner Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-600 text-sm focus:border-transparent bg-white"
                    placeholder="E.g. Dhruvil Prajapati"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Phone (Optional)</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-600 text-sm focus:border-transparent bg-white"
                    placeholder="E.g. 9876543210"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-600 text-sm focus:border-transparent bg-white"
                  placeholder="E.g. owner@webbill.cafe"
                />
              </div>

              {/* Password configuration with generate helper */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Auth Password *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={formData.password}
                    onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="flex-1 h-10 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-600 text-sm focus:border-transparent bg-white"
                    placeholder="Must be at least 6 characters"
                  />
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="px-3 h-10 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-lg text-sm text-gray-600 font-medium transition-colors flex items-center gap-1.5"
                  >
                    <KeyRound size={16} />
                    Generate
                  </button>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Business Setup Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Initial Cafe Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.cafeName}
                    onChange={e => setFormData(prev => ({ ...prev, cafeName: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-600 text-sm focus:border-transparent bg-white"
                    placeholder="E.g. Cafe Antigravity"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Subscription Plan *</label>
                  <select
                    value={formData.plan}
                    onChange={e => setFormData(prev => ({ ...prev, plan: e.target.value as any }))}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-600 text-sm focus:border-transparent bg-white text-gray-700"
                  >
                    <option value="BASIC">BASIC (Free Trial / Standard)</option>
                    <option value="PRO">PRO (Advanced Customisations)</option>
                    <option value="ENTERPRISE">ENTERPRISE (Uncapped Multi-POS)</option>
                  </select>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-600 font-medium rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-medium px-5 py-2 rounded-xl text-sm transition-all shadow-md shadow-violet-100 disabled:opacity-50"
                >
                  {isSubmitting && <RefreshCw className="animate-spin" size={14} />}
                  Register & Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-sm w-full">
            <div className="p-6 border-b border-gray-150 flex items-center justify-between">
              <h2 className="text-xl font-bold font-headings text-gray-900">Edit Client</h2>
              <button onClick={() => setIsEditOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Name *</label>
                <input
                  type="text" required value={editData.name}
                  onChange={e => setEditData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Phone</label>
                <input
                  type="tel" value={editData.phone}
                  onChange={e => setEditData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Expiry Date</label>
                <input
                  type="date" value={editData.subscriptionEnds}
                  onChange={e => setEditData(prev => ({ ...prev, subscriptionEnds: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm"
                />
              </div>
              <div className="pt-2 flex gap-2">
                <button type="button" onClick={() => setIsEditOpen(false)} className="flex-1 py-2 font-semibold text-gray-600 border border-gray-200 rounded-lg">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-2 font-semibold text-white bg-violet-600 rounded-lg disabled:opacity-70">
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-sm w-full p-6 text-center">
            <div className="w-12 h-12 bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center text-rose-500 mx-auto mb-4">
              <AlertCircle size={24} />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Delete Client Account?</h2>
            <p className="text-sm text-gray-500 mt-2">
              This will permanently delete <strong className="text-gray-800">{deleteTarget?.name}</strong>, their cafe, and <strong>all</strong> associated data (menus, bills). This action cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setIsDeleteOpen(false)} className="flex-1 py-2 font-semibold text-gray-600 border border-gray-200 rounded-lg">Cancel</button>
              <button onClick={handleDeleteClient} disabled={isDeleting} className="flex-1 py-2 font-semibold text-white bg-rose-600 rounded-lg disabled:opacity-70">
                {isDeleting ? 'Deleting...' : 'Yes, Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
