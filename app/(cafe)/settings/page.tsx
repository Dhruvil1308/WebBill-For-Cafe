"use client"

import { useState, useEffect } from 'react'
import { Store, Phone, MapPin, Receipt, Loader2, Check, FileText } from 'lucide-react'
import { toast } from 'sonner'

export default function CafeSetupPage() {
  const [name, setName] = useState('')
  const [gstNumber, setGstNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [logoUploading, setLogoUploading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    async function fetchCafe() {
      try {
        setIsLoading(true)
        const res = await fetch('/api/cafe')
        if (res.ok) {
          const data = await res.json()
          setName(data.name || '')
          setGstNumber(data.gstNumber || '')
          setPhone(data.phone || '')
          setAddress(data.address || '')
          setLogoUrl(data.logoUrl || '')
        } else {
          toast.error('Failed to load cafe details')
        }
      } catch (error) {
        console.error(error)
        toast.error('Error connecting to servers')
      } finally {
        setIsLoading(false)
      }
    }
    fetchCafe()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clean values
    const cleanName = name.trim()
    const cleanGst = gstNumber.trim()
    const cleanPhone = phone.trim()
    const cleanAddress = address.trim()
    
    // Validation
    const newErrors: Record<string, string> = {}
    if (!cleanName) {
      newErrors.name = 'Cafe name is required'
    }
    
    if (cleanGst) {
      // Basic GSTIN validation: 15 alphanumeric characters
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
      if (cleanGst.length !== 15) {
        newErrors.gstNumber = 'GST Number must be exactly 15 characters'
      } else if (!gstRegex.test(cleanGst.toUpperCase())) {
        newErrors.gstNumber = 'Invalid GST Number format (e.g. 22AAAAA0000A1Z5)'
      }
    }
    
    if (cleanPhone) {
      const phoneRegex = /^\+?[0-9\s\-()]{10,15}$/
      if (!phoneRegex.test(cleanPhone)) {
        newErrors.phone = 'Please enter a valid phone number (10-15 digits)'
      }
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      toast.error('Please correct the validation errors')
      return
    }
    
    setErrors({})
    setIsSaving(true)
    try {
      const res = await fetch('/api/cafe', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          gstNumber: cleanGst ? cleanGst.toUpperCase() : null,
          phone: cleanPhone || null,
          address: cleanAddress || null,
          logoUrl: logoUrl || null,
        })
      })
      
      if (res.ok) {
        toast.success('Settings updated successfully')
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to update settings')
      }
    } catch (error) {
      console.error(error)
      toast.error('Connection error occurred while saving details')
    } finally {
      setIsSaving(false)
    }
  }

  // Helper for live character check/input borders
  const getInputClass = (fieldName: string) => {
    const base = "w-full h-10 pl-10 pr-3 rounded-xl border transition-all duration-200 outline-none text-sm bg-white"
    if (errors[fieldName]) {
      return `${base} border-rose-300 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10`
    }
    return `${base} border-gray-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10`
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      toast.error('Logo file size must be less than 500KB');
      return;
    }

    try {
      setLogoUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'cafe-logos');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to upload logo');
      }

      const data = await res.json();
      setLogoUrl(data.url);
      toast.success('Logo uploaded successfully');
    } catch (err: any) {
      toast.error(err.message || 'Error uploading logo');
    } finally {
      setLogoUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in duration-300">
        {/* Header Skeleton */}
        <div className="flex items-center gap-4 bg-white/40 border border-gray-200/80 rounded-2xl p-5 shadow-sm">
          <div className="w-12 h-12 bg-gray-200 animate-pulse rounded-xl" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-gray-200 animate-pulse rounded-lg" />
            <div className="h-4 w-72 bg-gray-200 animate-pulse rounded-md" />
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white/40 border border-gray-200/85 rounded-2xl p-8 shadow-sm space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-24 bg-gray-200 animate-pulse rounded-md" />
                <div className="h-10 w-full bg-gray-200 animate-pulse rounded-xl" />
              </div>
            ))}
            <div className="h-10 w-full bg-gray-200 animate-pulse rounded-xl pt-4" />
          </div>
          <div className="bg-white/40 border border-gray-200/85 rounded-2xl p-6 shadow-sm h-[400px] space-y-4 hidden md:block">
            <div className="h-4 w-32 bg-gray-200 animate-pulse rounded-md mx-auto" />
            <div className="h-px w-full bg-gray-200 animate-pulse" />
            <div className="space-y-2">
              <div className="h-3 w-full bg-gray-200 animate-pulse rounded-md" />
              <div className="h-3 w-5/6 bg-gray-200 animate-pulse rounded-md" />
              <div className="h-3 w-4/6 bg-gray-200 animate-pulse rounded-md" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in duration-300">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/40 backdrop-blur-md border border-gray-200/80 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-violet-100 border border-violet-200/50 rounded-2xl flex items-center justify-center text-violet-700 shadow-xs">
            <Store size={22} className="stroke-[2.25]" />
          </div>
          <div>
            <h1 className="text-2xl font-headings font-bold text-gray-900 tracking-tight">Cafe Settings</h1>
            <p className="text-gray-500 text-sm mt-0.5">Manage your store business profile, billing credentials, and invoice receipts.</p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Settings Form Card */}
        <div className="md:col-span-2 bg-white border border-gray-205 rounded-2xl p-8 shadow-xs">
          <form onSubmit={handleSave} className="space-y-6">
            
            {/* Cafe Name */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Cafe Name *</label>
                {errors.name && (
                  <span className="text-xs text-rose-500 font-semibold">{errors.name}</span>
                )}
              </div>
              <div className="relative">
                <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                <input
                  type="text"
                  className={getInputClass('name')}
                  placeholder="E.g. WebBill Cafe"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (errors.name) {
                      const err = { ...errors }
                      delete err.name
                      setErrors(err)
                    }
                  }}
                  required
                />
              </div>
              <p className="text-[11px] text-gray-400">This is the official brand name that will print at the top of your bills.</p>
            </div>

            {/* Phone & GST */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Phone Field */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Phone Number</label>
                  {errors.phone && (
                    <span className="text-xs text-rose-500 font-semibold">{errors.phone}</span>
                  )}
                </div>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                  <input
                    type="tel"
                    className={getInputClass('phone')}
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value)
                      if (errors.phone) {
                        const err = { ...errors }
                        delete err.phone
                        setErrors(err)
                      }
                    }}
                  />
                </div>
                <p className="text-[11px] text-gray-400">Optional customer contact helpline displayed on invoices.</p>
              </div>

              {/* GST Field */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">GST Number</label>
                  {errors.gstNumber && (
                    <span className="text-xs text-rose-500 font-semibold shrink-0">{errors.gstNumber}</span>
                  )}
                </div>
                <div className="relative">
                  <Receipt className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                  <input
                    type="text"
                    className={getInputClass('gstNumber')}
                    placeholder="E.g. 22AAAAA0000A1Z5"
                    value={gstNumber}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase().slice(0, 15)
                      setGstNumber(value)
                      if (errors.gstNumber) {
                        const err = { ...errors }
                        delete err.gstNumber
                        setErrors(err)
                      }
                    }}
                  />
                </div>
                <p className="text-[11px] text-gray-400">
                  {gstNumber.length}/15 chars. Optional 15-digit Tax Identification Number.
                </p>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Business Address</label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-3 text-gray-400" size={17} />
                <textarea
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 outline-none text-sm transition-all bg-white"
                  rows={3}
                  placeholder="123 Cozy Lane, Gourmet Market, Foodville"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <p className="text-[11px] text-gray-400">Physical shop address to print under store title on printed billing slips.</p>
            </div>

            {/* Logo Upload */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Cafe Logo</label>
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <div className="relative w-16 h-16 rounded-xl border border-gray-200 overflow-hidden shrink-0 bg-gray-50 flex items-center justify-center">
                    <img src={logoUrl} alt="Cafe Logo" className="max-w-full max-h-full object-contain" />
                    <button 
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 hover:bg-black/70"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400 shrink-0">
                    <Store size={20} />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={logoUploading}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 transition-all cursor-pointer"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">PNG, JPG or WEBP up to 500KB. Will be displayed on receipts.</p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2 border-t border-gray-100">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full h-11 bg-violet-600 hover:bg-violet-700 active:scale-[0.99] disabled:opacity-75 disabled:scale-100 text-white font-bold rounded-xl transition-all duration-150 flex items-center justify-center gap-2 shadow-sm text-sm cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Check size={16} className="stroke-[2.5]" />
                    Save Configurations
                  </>
                )}
              </button>
            </div>

          </form>
        </div>

        {/* Live POS Receipt Preview Panel */}
        <div className="bg-amber-50/40 border border-amber-200/50 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-amber-800">
            <FileText size={18} />
            <h3 className="font-headings text-sm font-bold tracking-wide uppercase">POS Receipt Preview</h3>
          </div>
          
          <p className="text-[11px] text-amber-800/80 leading-relaxed">
            See exactly how your customer bills will look in real-time as you tweak details.
          </p>

          {/* Thermal Receipt Paper */}
          <div className="bg-white border border-gray-200/60 rounded-xl p-5 shadow-xs relative overflow-hidden font-mono text-[11px] text-gray-700 leading-normal select-none">
            {/* Top receipt serrated edge simulation */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-200 to-transparent" />
            
            <div className="text-center space-y-1 pb-3 border-b border-dashed border-gray-300">
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-tight break-words px-2">
                {name.trim() || 'YOUR CAFE NAME'}
              </h4>
              
              {address.trim() ? (
                <p className="text-[9px] text-gray-500 max-w-[180px] mx-auto break-words leading-tight whitespace-pre-wrap">
                  {address.trim()}
                </p>
              ) : (
                <p className="text-[9px] text-gray-400 italic">Cafe Address Here</p>
              )}

              {phone.trim() ? (
                <p className="text-[9px] text-gray-500">Ph: {phone.trim()}</p>
              ) : null}

              {gstNumber.trim() ? (
                <p className="text-[9px] font-semibold text-gray-600 bg-gray-50 inline-block px-1.5 py-0.5 rounded uppercase mt-0.5">
                  GSTIN: {gstNumber.trim().toUpperCase()}
                </p>
              ) : null}
            </div>

            {/* Receipt Items */}
            <div className="py-3 space-y-2 border-b border-dashed border-gray-300">
              <div className="flex justify-between text-[9px] font-bold text-gray-400">
                <span>QTY & ITEM</span>
                <span>PRICE</span>
              </div>
              <div className="flex justify-between">
                <span>1 x Cappuccino</span>
                <span>₹120.00</span>
              </div>
              <div className="flex justify-between">
                <span>1 x Blueberry Muffin</span>
                <span>₹95.00</span>
              </div>
            </div>

            {/* Total Section */}
            <div className="py-2.5 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span>₹215.00</span>
              </div>
              {gstNumber.trim() ? (
                <>
                  <div className="flex justify-between text-[10px] text-gray-500 pl-2">
                    <span>CGST (2.5%)</span>
                    <span>₹5.38</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500 pl-2">
                    <span>SGST (2.5%)</span>
                    <span>₹5.38</span>
                  </div>
                </>
              ) : null}
              <div className="flex justify-between font-bold text-gray-900 border-t border-dashed border-gray-200 pt-1.5 text-xs">
                <span>TOTAL DUE</span>
                <span>₹{gstNumber.trim() ? '225.76' : '215.00'}</span>
              </div>
            </div>

            <div className="text-center pt-3 border-t border-dashed border-gray-300 space-y-1">
              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Thank You! Visit Again</p>
              <p className="text-[8px] text-gray-400">Powered by WebBill POS</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}