"use client"

import { useState, useEffect } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  ShoppingBag, 
  DollarSign, 
  Percent, 
  Users, 
  Clock, 
  CreditCard,
  ChevronDown,
  Loader2,
  Calendar,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'

interface SummaryStats {
  totalSales: number
  totalOrders: number
  averageBillValue: number
  totalDiscount: number
  totalGst: number
  totalSubtotal: number
}

interface BestSeller {
  rank: number
  name: string
  category: string
  quantity: number
  revenue: number
}

interface TopCustomer {
  name: string
  phone: string
  visits: number
  spent: number
}

interface ChartItem {
  name: string
  count: number
  value: number
}

interface PeakHourItem {
  hourNumber: number
  hour: string
  orders: number
}

interface TimelineItem {
  label: string
  sales: number
}

const COLORS = ['#8B5CF6', '#10B981', '#3B82F6', '#F59E0B']

export default function ReportsDashboard() {
  const [range, setRange] = useState<'today' | '7days' | 'overall' | 'custom'>('today')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const [data, setData] = useState<{
    summary: SummaryStats
    payments: ChartItem[]
    channels: ChartItem[]
    peakHours: PeakHourItem[]
    bestSellers: BestSeller[]
    topCustomers: TopCustomer[]
    timeline: TimelineItem[]
  } | null>(null)

  // Avoid SSR hydration issues with Recharts
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    async function fetchStats() {
      if (range === 'custom' && (!startDate || !endDate)) return
      try {
        setIsLoading(true)
        let url = `/api/reports/stats?range=${range}`
        if (range === 'custom') {
          url += `&startDate=${startDate}&endDate=${endDate}`
        }
        const res = await fetch(url)
        if (res.ok) {
          const stats = await res.json()
          setData(stats)
        } else {
          toast.error('Failed to load dashboard report statistics')
        }
      } catch (error) {
        console.error(error)
        toast.error('Error connecting to the analytical servers')
      } finally {
        setIsLoading(false)
      }
    }
    if (isMounted) {
      fetchStats()
    }
  }, [range, startDate, endDate, isMounted])

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val)
  }

  if (isLoading || !isMounted) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in duration-300">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/40 border border-gray-200/80 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-200 animate-pulse rounded-xl" />
            <div className="space-y-2">
              <div className="h-6 w-48 bg-gray-200 animate-pulse rounded-lg" />
              <div className="h-4 w-72 bg-gray-200 animate-pulse rounded-md" />
            </div>
          </div>
          <div className="h-10 w-36 bg-gray-200 animate-pulse rounded-xl" />
        </div>

        {/* KPI Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white border border-gray-200 animate-pulse rounded-2xl p-5" />
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-[350px] bg-white border border-gray-200 animate-pulse rounded-2xl" />
          <div className="h-[350px] bg-white border border-gray-200 animate-pulse rounded-2xl" />
        </div>
      </div>
    )
  }

  // Fallback values for empty stats
  const summary = data?.summary || {
    totalSales: 0,
    totalOrders: 0,
    averageBillValue: 0,
    totalDiscount: 0,
    totalGst: 0,
    totalSubtotal: 0
  }
  const payments = data?.payments || []
  const channels = data?.channels || []
  const peakHours = data?.peakHours || []
  const bestSellers = data?.bestSellers || []
  const topCustomers = data?.topCustomers || []
  const timeline = data?.timeline || []

  // Check if there are no transactions at all for empty state display
  const hasNoTransactions = summary.totalOrders === 0

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in duration-300">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/40 backdrop-blur-md border border-gray-200/80 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-violet-100 border border-violet-200/50 rounded-2xl flex items-center justify-center text-violet-700 shadow-xs">
            <BarChart3 size={22} className="stroke-[2.25]" />
          </div>
          <div>
            <h1 className="text-2xl font-headings font-bold text-gray-900 tracking-tight">Reports & Analytics</h1>
            <p className="text-gray-500 text-sm mt-0.5">Real-time performance metrics, customer behavior, and sales insights.</p>
          </div>
        </div>

        {/* Range Selector */}
        <div className="relative inline-block text-left">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-1 shadow-xs">
            <button
              onClick={() => setRange('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                range === 'today'
                  ? 'bg-violet-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-950 hover:bg-gray-50'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setRange('7days')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                range === '7days'
                  ? 'bg-violet-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-950 hover:bg-gray-50'
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setRange('overall')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                range === 'overall'
                  ? 'bg-violet-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-950 hover:bg-gray-50'
              }`}
            >
              Overall
            </button>
            <button
              onClick={() => setRange('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                range === 'custom'
                  ? 'bg-violet-600 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-950 hover:bg-gray-50'
              }`}
            >
              Custom
            </button>
          </div>
          {range === 'custom' && (
            <div className="absolute right-0 top-full mt-2 p-3 bg-white border border-gray-200 rounded-xl shadow-lg z-10 flex flex-col gap-2 min-w-[200px]">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Start Date</label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-sm px-2 py-1.5 rounded-md border border-gray-200 outline-none focus:border-violet-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">End Date</label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-sm px-2 py-1.5 rounded-md border border-gray-200 outline-none focus:border-violet-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {hasNoTransactions ? (
        /* Zero State View */
        <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-5 shadow-xs">
          <div className="w-16 h-16 bg-amber-50 border border-amber-200/50 rounded-full flex items-center justify-center text-amber-500 mx-auto">
            <AlertCircle size={32} className="stroke-[1.5]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold font-headings text-gray-900">No Transactions Recorded</h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed">
              We couldn&apos;t find any active customer bills for the selected filter period ({range === 'today' ? 'Today' : range === '7days' ? 'Last 7 Days' : 'Overall'}).
            </p>
          </div>
          <div className="pt-2">
            <p className="text-xs text-gray-400 bg-gray-50 inline-block px-3.5 py-1.5 rounded-xl border border-gray-150">
              💡 Pro Tip: Open the Billing page and check out your first customer to see statistics update in real-time!
            </p>
          </div>
        </div>
      ) : (
        /* Dashboard Charts & Stats */
        <>
          {/* KPI Dashboard Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Net Revenue */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex items-center justify-between transition-all duration-200 hover:border-emerald-200 hover:shadow-xs">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Net Sales</span>
                <p className="text-2xl font-bold font-mono text-gray-900">{formatCurrency(summary.totalSales)}</p>
                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                  <TrendingUp size={11} />
                  <span>Incl. Taxes</span>
                </div>
              </div>
              <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <DollarSign size={20} className="stroke-[2.25]" />
              </div>
            </div>

            {/* Total Orders */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex items-center justify-between transition-all duration-200 hover:border-violet-200 hover:shadow-xs">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Orders</span>
                <p className="text-2xl font-bold font-mono text-gray-900">{summary.totalOrders}</p>
                <span className="text-[10px] text-gray-400 font-semibold">Active customer tickets</span>
              </div>
              <div className="w-11 h-11 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center">
                <ShoppingBag size={20} className="stroke-[2.25]" />
              </div>
            </div>

            {/* Average Ticket Value */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex items-center justify-between transition-all duration-200 hover:border-blue-200 hover:shadow-xs">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Average Bill Value</span>
                <p className="text-2xl font-bold font-mono text-gray-900">{formatCurrency(summary.averageBillValue)}</p>
                <span className="text-[10px] text-gray-400 font-semibold">Spent per customer transaction</span>
              </div>
              <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <TrendingUp size={20} className="stroke-[2.25]" />
              </div>
            </div>

            {/* Discounts */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex items-center justify-between transition-all duration-200 hover:border-rose-200 hover:shadow-xs">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Discounts Given</span>
                <p className="text-2xl font-bold font-mono text-gray-900">{formatCurrency(summary.totalDiscount)}</p>
                <span className="text-[10px] text-gray-400 font-semibold">Loyalty markdowns / offers</span>
              </div>
              <div className="w-11 h-11 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
                <Percent size={18} className="stroke-[2.5]" />
              </div>
            </div>
          </div>

          {/* Double Column Primary Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales performance chart */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                <div>
                  <h3 className="text-sm font-bold font-headings text-gray-900">Sales Performance Flow</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {range === 'today' ? 'Sales trends hour-by-hour' : 'Revenue changes day-by-day'}
                  </p>
                </div>
              </div>
              <div className="h-72 w-full text-xs font-mono min-h-0">
                <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
                  <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="label" stroke="#9CA3AF" tickLine={false} />
                    <YAxis stroke="#9CA3AF" tickLine={false} />
                    <Tooltip 
                      contentStyle={{ background: '#FFF', borderRadius: '12px', border: '1px solid #E5E7EB', fontFamily: 'sans-serif' }}
                      formatter={(value) => [`₹${value}`, 'Sales']}
                    />
                    <Area type="monotone" dataKey="sales" stroke="#8B5CF6" strokeWidth={2} fillOpacity={1} fill="url(#salesGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Peak Operating Hours Chart */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-gray-50">
                <div>
                  <h3 className="text-sm font-bold font-headings text-gray-900 flex items-center gap-2">
                    <Clock size={16} className="text-amber-500" />
                    Peak Operating Hours
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">Identify busiest times of day to optimize labor / staff presence</p>
                </div>
              </div>
              <div className="h-72 w-full text-xs font-mono min-h-0">
                <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
                  <AreaChart data={peakHours.filter(p => p.orders > 0 || range !== 'today')} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="hour" stroke="#9CA3AF" tickLine={false} />
                    <YAxis stroke="#9CA3AF" tickLine={false} allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ background: '#FFF', borderRadius: '12px', border: '1px solid #E5E7EB', fontFamily: 'sans-serif' }}
                      formatter={(value) => [`${value} Orders`, 'Volume']}
                    />
                    <Area type="monotone" dataKey="orders" stroke="#F59E0B" strokeWidth={2} fillOpacity={1} fill="url(#hoursGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Lower Grid Details split */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Payment & Channels Distribution Chart */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between h-full space-y-4">
              <div>
                <h3 className="text-sm font-bold font-headings text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-50">
                  <CreditCard size={16} className="text-blue-500" />
                  Payments & Channels
                </h3>
              </div>
              
              <div className="flex-1 min-h-[220px] flex items-center justify-center min-h-0">
                <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
                  <PieChart>
                    <Pie
                      data={payments.filter(p => p.count > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {payments.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`₹${value}`, 'Amount']} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-50 text-xs">
                <div className="flex justify-between items-center text-gray-500">
                  <span>Sales Volume Breakdown:</span>
                </div>
                {payments.map((p, index) => (
                  <div key={p.name} className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="font-semibold text-gray-700">{p.name}</span>
                    </div>
                    <span className="font-mono text-gray-900">{formatCurrency(p.value)} ({p.count} bills)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Best Sellers table */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between h-full space-y-4 lg:col-span-2">
              <div>
                <h3 className="text-sm font-bold font-headings text-gray-900 pb-2 border-b border-gray-50">
                  🔥 Best Selling Products
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Top performing menu items by quantity sold</p>
              </div>

              <div className="flex-1 overflow-x-auto min-h-[240px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-gray-400 font-bold uppercase border-b border-gray-100">
                      <th className="py-2.5 w-12 text-center">Rank</th>
                      <th className="py-2.5 pl-2">Product</th>
                      <th className="py-2.5 pl-2">Category</th>
                      <th className="py-2.5 text-center">Qty Sold</th>
                      <th className="py-2.5 text-right pr-2">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bestSellers.length > 0 ? (
                      bestSellers.map((item) => (
                        <tr key={item.name} className="border-b border-gray-50 hover:bg-gray-50/50 transition-all font-medium text-gray-700">
                          <td className="py-3 text-center">
                            <span className={`w-5 h-5 rounded-full inline-flex items-center justify-center font-bold text-[10px] ${
                              item.rank === 1 ? 'bg-amber-100 text-amber-800' :
                              item.rank === 2 ? 'bg-slate-100 text-slate-800' :
                              item.rank === 3 ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {item.rank}
                            </span>
                          </td>
                          <td className="py-3 pl-2 font-bold text-gray-950">{item.name}</td>
                          <td className="py-3 pl-2">
                            <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wide">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3 text-center font-mono font-bold text-gray-900">{item.quantity} units</td>
                          <td className="py-3 text-right pr-2 font-mono text-gray-900 font-bold">{formatCurrency(item.revenue)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center py-10 text-gray-400 italic">No products sold in this range</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Customer Insights / Channels grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Channels distribution chart */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-sm font-bold font-headings text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-50">
                  🌐 Sales Channels Breakdown
                </h3>
              </div>

              <div className="flex-1 min-h-[200px] flex items-center justify-center min-h-0">
                <ResponsiveContainer width="99%" height="100%" minWidth={1} minHeight={1}>
                  <BarChart data={channels} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                    <XAxis dataKey="name" stroke="#9CA3AF" tickLine={false} />
                    <YAxis stroke="#9CA3AF" tickLine={false} />
                    <Tooltip formatter={(value) => [`₹${value}`, 'Revenue']} />
                    <Bar dataKey="value" fill="#8B5CF6" radius={[4, 4, 0, 0]}>
                      {channels.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Customer Insights Leaderboard */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4 lg:col-span-2">
              <div>
                <h3 className="text-sm font-bold font-headings text-gray-900 flex items-center gap-2 pb-2 border-b border-gray-50">
                  <Users size={16} className="text-violet-500" />
                  Top Customer Insights
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Most loyal customers based on visits and spending</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-gray-400 font-bold uppercase border-b border-gray-100">
                      <th className="py-2 pl-2">Customer Details</th>
                      <th className="py-2 text-center">Visit Count</th>
                      <th className="py-2 text-right pr-2">Lifetime Spent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCustomers.length > 0 ? (
                      topCustomers.map((cust) => (
                        <tr key={cust.phone} className="border-b border-gray-50 hover:bg-gray-50/50 transition-all font-medium text-gray-700">
                          <td className="py-3 pl-2">
                            <div className="space-y-0.5">
                              <p className="font-bold text-gray-950">{cust.name}</p>
                              <p className="text-[10px] text-gray-400 font-mono">{cust.phone}</p>
                            </div>
                          </td>
                          <td className="py-3 text-center font-mono font-bold text-gray-900">{cust.visits} visits</td>
                          <td className="py-3 text-right pr-2 font-mono font-bold text-violet-700">{formatCurrency(cust.spent)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="text-center py-10 text-gray-400 italic">No customer data recorded for this range</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  )
}
