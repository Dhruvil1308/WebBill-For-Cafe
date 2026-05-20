"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2, Mail, Lock, Eye, EyeOff, Coffee, TrendingUp, CreditCard, Zap, BarChart2, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase'
import InteractiveBackground from './InteractiveBackground'

/* ─── Floating decorative icons ────────────────────────────────── */
const floatingIcons = [
  { Icon: Coffee,     delay: '0s',   duration: '6s',   top: '14%', left: '8%',  size: 22 },
  { Icon: TrendingUp, delay: '1.2s', duration: '8s',   top: '30%', left: '18%', size: 20 },
  { Icon: CreditCard, delay: '2.5s', duration: '7.5s', top: '68%', left: '6%',  size: 20 },
  { Icon: Zap,        delay: '0.4s', duration: '6.5s', top: '50%', left: '2%',  size: 16 },
  { Icon: BarChart2,  delay: '1.8s', duration: '9s',   top: '80%', left: '16%', size: 18 },
  { Icon: Printer,    delay: '3s',   duration: '7s',   top: '20%', left: '4%',  size: 17 },
]

/* ─── Highlight stat cards on the left branding panel ─────────── */
const statCards = [
  { value: '2,400+', label: 'Bills Generated' },
  { value: '99.9%',  label: 'Uptime' },
  { value: '<1s',    label: 'Print Speed' },
]

/* ═══════════════════════════════════════════════════════════════════
   Page Component
═══════════════════════════════════════════════════════════════════ */
export default function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [mounted,  setMounted]  = useState(false)

  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => {
    router.prefetch('/billing')
    router.prefetch('/superadmin')
    const t = setTimeout(() => setMounted(true), 80)
    return () => clearTimeout(t)
  }, [router])

  /* ── Login Handler ─────────────────────────────────────────────── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return toast.error('Please enter email and password')

    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error(error.message)
      setLoading(false)
    } else {
      toast.success('Logged in successfully')
      try {
        const roleRes = await fetch('/api/auth/role')
        if (roleRes.ok) {
          const { role } = await roleRes.json()
          if (role === 'SUPERADMIN') { router.push('/superadmin'); return }
        }
      } catch (err) {
        console.error('Error determining post-login destination:', err)
      }
      router.push('/billing')
    }
  }

  /* ══════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════ */
  return (
    <div
      className="relative min-h-screen w-full overflow-hidden flex items-center justify-center"
      style={{ background: 'linear-gradient(145deg, #f8f7ff 0%, #f0eeff 45%, #eef6f2 100%)' }}
    >
      {/* ── Gradient Orbs ─────────────────────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="animate-pulse-slow absolute rounded-full"
          style={{ width: 700, height: 700, top: '-18%', left: '-14%',
            background: 'radial-gradient(circle, rgba(124,58,237,0.09) 0%, transparent 70%)' }} />
        <div className="animate-pulse-slow-reverse absolute rounded-full"
          style={{ width: 600, height: 600, bottom: '-16%', right: '-10%',
            background: 'radial-gradient(circle, rgba(5,150,105,0.07) 0%, transparent 70%)' }} />
        <div className="animate-pulse-slow absolute rounded-full"
          style={{ width: 400, height: 400, top: '35%', left: '42%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
            animationDelay: '5s' }} />
      </div>

      {/* ── Canvas Particle Network ────────────────────────────────── */}
      <InteractiveBackground light />

      {/* ── Floating Icons ────────────────────────────────────────── */}
      {floatingIcons.map(({ Icon, delay, duration, top, left, size }, i) => (
        <div key={i} className="absolute pointer-events-none z-10"
          style={{ top, left, animationDelay: delay,
            animation: `float ${duration} ease-in-out infinite`,
            opacity: mounted ? 1 : 0,
            transition: `opacity 1.2s ease ${delay}` }}>
          <Icon size={size} style={{ color: 'rgba(124,58,237,0.16)' }} />
        </div>
      ))}

      {/* ══════════════════════════════════════════════════════════════
          Content
      ══════════════════════════════════════════════════════════════ */}
      <div className="relative z-20 w-full max-w-5xl mx-auto px-4 py-10 flex flex-col lg:flex-row items-center gap-10 lg:gap-20">

        {/* ─── LEFT: Branding Panel ─────────────────────────────── */}
        <div
          className="hidden lg:flex flex-col flex-1 gap-8"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateX(0)' : 'translateX(-40px)',
            transition: 'all 1.1s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Logo — fixed crisp size */}
          <div>
            <Image
              src="/WebBill_logo_edited.png"
              alt="WebBill Logo"
              width={160}
              height={48}
              style={{ height: 'auto' }}
              className="object-contain"
              priority
              quality={100}
            />
          </div>

          {/* Slogan */}
          <div>
            <h1
              className="text-4xl xl:text-5xl font-extrabold leading-tight tracking-tight"
              style={{ fontFamily: 'var(--font-headings)' }}
            >
              <span
                className="animate-gradient-shift"
                style={{
                  background: 'linear-gradient(90deg, #7c3aed, #6366f1, #059669, #7c3aed)',
                  backgroundSize: '200% 200%',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  display: 'inline-block',
                }}
              >
                Smart Billing.
              </span>
              <br />
              <span style={{ color: '#1e1b4b' }}>Better Business.</span>
            </h1>

            <p
              className="mt-4 text-sm leading-relaxed"
              style={{ color: '#64748b', maxWidth: 360 }}
            >
              The modern POS platform built for Indian cafes &amp; restaurants — print-ready bills, live analytics, and multi-tenant management from one dashboard.
            </p>
          </div>

          {/* Stat cards */}
          <div className="flex gap-4">
            {statCards.map(({ value, label }, i) => (
              <div
                key={i}
                className="flex-1 rounded-2xl p-4"
                style={{
                  background: '#ffffff',
                  border: '1px solid rgba(124,58,237,0.10)',
                  boxShadow: '0 4px 20px rgba(124,58,237,0.07)',
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'translateY(0)' : 'translateY(12px)',
                  transition: `all 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${0.4 + i * 0.12}s`,
                }}
              >
                <p
                  className="text-xl font-bold"
                  style={{ color: '#7c3aed', fontFamily: 'var(--font-headings)' }}
                >
                  {value}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#94a3b8' }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Bottom tagline */}
          <p className="text-xs" style={{ color: '#cbd5e1' }}>
            Trusted by cafes &amp; restaurants across India.
          </p>
        </div>

        {/* ─── RIGHT: Login Card ──────────────────────────────────── */}
        <div
          className="w-full lg:w-auto lg:min-w-[420px] max-w-[440px] mx-auto lg:mx-0"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(30px)',
            transition: 'all 1s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
          }}
        >
          <div
            className="rounded-3xl p-8 w-full"
            style={{
              background: '#ffffff',
              border: '1px solid rgba(124,58,237,0.10)',
              boxShadow: '0 24px 64px rgba(124,58,237,0.10), 0 4px 20px rgba(0,0,0,0.04)',
            }}
          >
            {/* Mobile-only logo */}
            <div className="flex justify-center mb-6 lg:hidden">
              <Image
                src="/WebBill_logo_edited.png"
                alt="WebBill Logo"
                width={140}
                height={42}
                style={{ height: 'auto' }}
                className="object-contain"
                priority
                quality={100}
              />
            </div>

            {/* Card header */}
            <div className="mb-8">
              <h2
                className="text-2xl font-bold mb-1"
                style={{ color: '#1e1b4b', fontFamily: 'var(--font-headings)' }}
              >
                Welcome back
              </h2>
              <p className="text-sm" style={{ color: '#94a3b8' }}>
                Sign in to your WebBill account
              </p>
            </div>

            {/* ── Form ─────────────────────────────────────────────── */}
            <form onSubmit={handleLogin} className="space-y-5">

              {/* Email */}
              <div className="space-y-1.5">
                <label
                  className="text-xs font-semibold tracking-wider uppercase"
                  style={{ color: '#7c3aed' }}
                >
                  Email
                </label>
                <div
                  className="flex items-center gap-3 rounded-xl px-4 py-3.5"
                  style={{ background: '#fafafa', border: '1px solid #e5e7eb', transition: 'all 0.25s ease' }}
                  onFocus={e => {
                    const el = e.currentTarget
                    el.style.borderColor = 'rgba(124,58,237,0.45)'
                    el.style.boxShadow   = '0 0 0 3px rgba(124,58,237,0.08)'
                    el.style.background  = '#fff'
                  }}
                  onBlur={e => {
                    const el = e.currentTarget
                    el.style.borderColor = '#e5e7eb'
                    el.style.boxShadow   = 'none'
                    el.style.background  = '#fafafa'
                  }}
                >
                  <Mail size={16} style={{ color: '#a78bfa', flexShrink: 0 }} />
                  <input
                    type="email"
                    placeholder="owner@cafe.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                    style={{
                      background: 'transparent', border: 'none', outline: 'none',
                      flex: 1, color: '#1e1b4b', fontSize: 14, caretColor: '#7c3aed',
                    }}
                    className="placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label
                  className="text-xs font-semibold tracking-wider uppercase"
                  style={{ color: '#7c3aed' }}
                >
                  Password
                </label>
                <div
                  className="flex items-center gap-3 rounded-xl px-4 py-3.5"
                  style={{ background: '#fafafa', border: '1px solid #e5e7eb', transition: 'all 0.25s ease' }}
                  onFocus={e => {
                    const el = e.currentTarget
                    el.style.borderColor = 'rgba(124,58,237,0.45)'
                    el.style.boxShadow   = '0 0 0 3px rgba(124,58,237,0.08)'
                    el.style.background  = '#fff'
                  }}
                  onBlur={e => {
                    const el = e.currentTarget
                    el.style.borderColor = '#e5e7eb'
                    el.style.boxShadow   = 'none'
                    el.style.background  = '#fafafa'
                  }}
                >
                  <Lock size={16} style={{ color: '#a78bfa', flexShrink: 0 }} />
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    style={{
                      background: 'transparent', border: 'none', outline: 'none',
                      flex: 1, color: '#1e1b4b', fontSize: 14, caretColor: '#7c3aed',
                    }}
                    className="placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#cbd5e1', padding: 0, lineHeight: 1, flexShrink: 0,
                      transition: 'color 0.2s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#7c3aed' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#cbd5e1' }}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full relative overflow-hidden rounded-xl py-3.5 font-semibold text-sm tracking-wide text-white"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 60%, #4f46e5 100%)',
                  boxShadow: '0 6px 24px rgba(124,58,237,0.28)',
                  transition: 'all 0.25s ease',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.85 : 1,
                }}
                onMouseEnter={e => {
                  if (!loading) {
                    const el = e.currentTarget
                    el.style.transform = 'translateY(-2px)'
                    el.style.boxShadow = '0 12px 32px rgba(124,58,237,0.40)'
                  }
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget
                  el.style.transform = 'translateY(0)'
                  el.style.boxShadow = '0 6px 24px rgba(124,58,237,0.28)'
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  {loading
                    ? <><Loader2 className="animate-spin" size={16} /> Signing in…</>
                    : <>Sign In <span style={{ opacity: 0.75 }}>→</span></>}
                </span>
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px" style={{ background: '#f1f5f9' }} />
              <span className="text-xs" style={{ color: '#e2e8f0' }}>●</span>
              <div className="flex-1 h-px" style={{ background: '#f1f5f9' }} />
            </div>

            {/* Footer */}
            <p className="text-center text-xs" style={{ color: '#94a3b8' }}>
              Powered by{' '}
              <a
                href="https://webcultivation.com/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#7c3aed', transition: 'opacity 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.7' }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1' }}
              >
                WebCultivation Technology
              </a>
            </p>

            {/* Mobile slogan */}
            <p
              className="text-center text-xs mt-4 lg:hidden"
              style={{ color: 'rgba(124,58,237,0.5)', fontStyle: 'italic' }}
            >
              Smart Billing. Better Business.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
