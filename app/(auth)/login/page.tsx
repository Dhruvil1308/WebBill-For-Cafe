"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    router.prefetch('/billing')
    router.prefetch('/superadmin')
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return toast.error('Please enter email and password')
    
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      toast.error(error.message)
      setLoading(false)
    } else {
      toast.success('Logged in successfully')
      
      // Dynamic Role-based Routing
      try {
        const roleRes = await fetch('/api/auth/role')
        if (roleRes.ok) {
          const { role } = await roleRes.json()
          if (role === 'SUPERADMIN') {
            router.push('/superadmin')
            return
          }
        }
      } catch (err) {
        console.error('Error determining post-login destination:', err)
      }

      router.push('/billing')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-violet-50 p-4">
      <Card className="w-full max-w-[400px] shadow-sm rounded-xl border-border">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-2">
            <Image src="/WebBill_logo_edited.png" alt="WebBill Logo" width={200} height={60} style={{ width: 'auto', height: 'auto' }} className="object-contain" priority />
          </div>
          <CardDescription className="text-gray-500">
            Smart billing for cafes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <Input 
                type="email" 
                placeholder="owner@cafe.com" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="rounded-lg bg-white border-gray-200 focus-visible:ring-violet-600 focus-visible:ring-offset-0"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <Input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="rounded-lg bg-white border-gray-200 focus-visible:ring-violet-600 focus-visible:ring-offset-0"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full rounded-lg bg-violet-700 hover:bg-violet-800 text-white font-medium shadow-sm transition-colors mt-2"
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sign In \u2192"}
            </Button>
          </form>

          <div className="mt-8 text-center text-xs text-gray-400 font-medium">
            Powered by{' '}
            <a 
              href="https://webcultivation.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-violet-600 hover:underline transition-colors"
            >
              WebCultivation Technology
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
