import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-headings',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
})

export const metadata: Metadata = {
  title: 'WebBill - Smart Billing for Cafes',
  description: 'Fast, minimal, multi-tenant POS and Billing system for cafes and small restaurants.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${plusJakartaSans.variable} font-body bg-white text-gray-900 antialiased`}>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
