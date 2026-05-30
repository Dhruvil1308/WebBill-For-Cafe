import type { Metadata } from 'next'
import { Hanken_Grotesk, Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { Toaster } from 'sonner'

// Optimized font loading:
// - display: 'swap' prevents invisible text during font load (improves LCP)
// - preload: true hints to the browser to fetch this font early
// - Only latin subset reduces font file size
const inter = Inter({
  subsets:  ["latin"],
  variable: "--font-inter",
  display:  "swap",
  weight:   ["300", "400", "500", "600", "700", "800", "900"],
});

const hanken = Hanken_Grotesk({
  subsets:  ["latin"],
  variable: "--font-hanken",
  display:  "swap",
  weight:   ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: 'WebBill — Smart Billing for Cafes',
  description:
    'Fast, minimal, multi-tenant POS and Billing system for cafes and small restaurants.',
  icons: {
    icon: '/favicon_webbill_image.png',
  },
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
        className={`${inter.variable} ${hanken.variable} font-sans bg-white text-gray-900 antialiased`}
      >
        {/* QZ Tray: bridges browser → Windows printer driver (no IP needed) */}
        <Script
          src="https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.js"
          strategy="beforeInteractive"
        />
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
