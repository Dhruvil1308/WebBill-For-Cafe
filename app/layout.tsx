import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'

// Optimized font loading:
// - display: 'swap' prevents invisible text during font load (improves LCP)
// - preload: true hints to the browser to fetch this font early
// - Only latin subset reduces font file size
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  preload: true,
  weight: ['400', '500', '600'],
})

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-headings',
  display: 'swap',
  preload: false, // Secondary font — no need to block for it
  weight: ['600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'WebBill — Smart Billing for Cafes',
  description:
    'Fast, minimal, multi-tenant POS and Billing system for cafes and small restaurants.',
  robots: {
    index: false, // Private SaaS app — keep out of search engines
    follow: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${plusJakartaSans.variable} font-body bg-white text-gray-900 antialiased`}
      >
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
