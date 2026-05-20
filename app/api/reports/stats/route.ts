import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getActiveCafe } from '@/lib/auth'

export async function GET(req: Request) {
  try {
    const activeCafeResult = await getActiveCafe()
    if (!activeCafeResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { cafe } = activeCafeResult
    const { searchParams } = new URL(req.url)
    const range = searchParams.get('range') || 'today'

    let startDate: Date | undefined = undefined
    const now = new Date()

    if (range === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (range === '7days') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      startDate.setHours(0, 0, 0, 0)
    }

    const billWhere = {
      cafeId: cafe.id,
      status: 'PAID' as const,
      ...(startDate ? { createdAt: { gte: startDate } } : {}),
    }

    // --- Run all independent DB queries in parallel ---
    // This replaces a single massive query (loading all bills + all items + all categories
    // into Node.js memory) with targeted SQL aggregations that the DB engine handles efficiently.
    const [
      kpiResult,
      paymentGroups,
      channelGroups,
      bestSellerGroups,
      customerGroups,
      timelineBills,
    ] = await Promise.all([
      // 1. KPI summary via SQL aggregate (SUM, COUNT, AVG)
      prisma.bill.aggregate({
        where: billWhere,
        _sum: { total: true, discount: true, gstAmount: true, subtotal: true },
        _count: { id: true },
        _avg: { total: true },
      }),

      // 2. Payment method breakdown via SQL GROUP BY
      prisma.bill.groupBy({
        by: ['paymentMethod'],
        where: billWhere,
        _count: { id: true },
        _sum: { total: true },
      }),

      // 3. Order type (channel) breakdown via SQL GROUP BY
      prisma.bill.groupBy({
        by: ['orderType'],
        where: billWhere,
        _count: { id: true },
        _sum: { total: true },
      }),

      // 4. Best-selling items via SQL GROUP BY on bill items
      prisma.billItem.groupBy({
        by: ['menuItemId'],
        where: { bill: billWhere },
        _sum: { quantity: true, subtotal: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),

      // 5. Top customers via SQL GROUP BY
      prisma.bill.groupBy({
        by: ['customerId'],
        where: { ...billWhere, customerId: { not: null } },
        _sum: { total: true },
        _count: { id: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),

      // 6. Minimal bill data for timeline & peak hours (only 2 fields needed)
      prisma.bill.findMany({
        where: billWhere,
        select: { createdAt: true, total: true },
        orderBy: { createdAt: 'asc' },
      }),
    ])

    // Fetch menu item names and customer names for the IDs returned above (also in parallel)
    const menuItemIds = bestSellerGroups.map(g => g.menuItemId)
    const customerIds = customerGroups
      .map(g => g.customerId)
      .filter(Boolean) as string[]

    const [menuItems, customers] = await Promise.all([
      menuItemIds.length > 0
        ? prisma.menuItem.findMany({
            where: { id: { in: menuItemIds } },
            select: { id: true, name: true, category: { select: { name: true } } },
          })
        : Promise.resolve([]),
      customerIds.length > 0
        ? prisma.customer.findMany({
            where: { id: { in: customerIds } },
            select: { id: true, name: true, phone: true },
          })
        : Promise.resolve([]),
    ])

    // ── Build formatted output ─────────────────────────────────────────────

    // 1. KPI Summary
    const totalOrders = kpiResult._count.id
    const totalSales = Number(kpiResult._sum.total ?? 0)
    const summary = {
      totalSales: Number(totalSales.toFixed(2)),
      totalOrders,
      averageBillValue:
        totalOrders > 0
          ? Number((totalSales / totalOrders).toFixed(2))
          : 0,
      totalDiscount: Number(Number(kpiResult._sum.discount ?? 0).toFixed(2)),
      totalGst: Number(Number(kpiResult._sum.gstAmount ?? 0).toFixed(2)),
      totalSubtotal: Number(Number(kpiResult._sum.subtotal ?? 0).toFixed(2)),
    }

    // 2. Payment breakdown
    const allPaymentMethods = ['CASH', 'UPI', 'CARD', 'WALLET']
    const payments = allPaymentMethods.map(method => {
      const group = paymentGroups.find(g => g.paymentMethod === method)
      return {
        name: method,
        count: group?._count.id ?? 0,
        value: Number(Number(group?._sum.total ?? 0).toFixed(2)),
      }
    })

    // 3. Channel breakdown
    const allChannels = ['DINE_IN', 'TAKEAWAY']
    const channels = allChannels.map(type => {
      const group = channelGroups.find(g => g.orderType === type)
      return {
        name: type.replace('ONLINE_', '').replace('_', ' '),
        count: group?._count.id ?? 0,
        value: Number(Number(group?._sum.total ?? 0).toFixed(2)),
      }
    })

    // 4. Best sellers
    const menuItemMap = new Map(menuItems.map(m => [m.id, m]))
    const bestSellers = bestSellerGroups.map((g, idx) => {
      const item = menuItemMap.get(g.menuItemId)
      return {
        rank: idx + 1,
        name: item?.name ?? 'Unknown',
        category: item?.category?.name ?? 'Unknown',
        quantity: g._sum.quantity ?? 0,
        revenue: Number(Number(g._sum.subtotal ?? 0).toFixed(2)),
      }
    })

    // 5. Top customers
    const customerMap = new Map(customers.map(c => [c.id, c]))
    const topCustomers = customerGroups.map(g => {
      const customer = customerMap.get(g.customerId!)
      return {
        name: customer?.name ?? 'Guest Customer',
        phone: customer?.phone ?? 'Unknown',
        visits: g._count.id,
        spent: Number(Number(g._sum.total ?? 0).toFixed(2)),
      }
    })

    // 6. Peak hours (JS computation over minimal data)
    const hourlyCounts: Record<number, number> = {}
    for (let i = 0; i < 24; i++) hourlyCounts[i] = 0
    for (const bill of timelineBills) {
      hourlyCounts[new Date(bill.createdAt).getHours()]++
    }
    const peakHours = Object.entries(hourlyCounts)
      .map(([hStr, count]) => {
        const h = Number(hStr)
        const label =
          h === 0 ? '12 AM' : h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`
        return { hourNumber: h, hour: label, orders: count }
      })
      .sort((a, b) => a.hourNumber - b.hourNumber)

    // 7. Sales timeline
    const timelineMap: Record<string, number> = {}
    if (range === 'today') {
      for (let i = 0; i < 24; i++) {
        const label =
          i === 0 ? '12 AM' : i === 12 ? '12 PM' : i > 12 ? `${i - 12} PM` : `${i} AM`
        timelineMap[label] = 0
      }
      for (const bill of timelineBills) {
        const h = new Date(bill.createdAt).getHours()
        const label =
          h === 0 ? '12 AM' : h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`
        timelineMap[label] = (timelineMap[label] || 0) + Number(bill.total)
      }
    } else {
      for (const bill of timelineBills) {
        const dateStr = new Date(bill.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
        timelineMap[dateStr] = (timelineMap[dateStr] || 0) + Number(bill.total)
      }
    }
    const timeline = Object.entries(timelineMap).map(([label, total]) => ({
      label,
      sales: Number(total.toFixed(2)),
    }))

    return NextResponse.json({
      summary,
      payments,
      channels,
      peakHours,
      bestSellers,
      topCustomers,
      timeline,
    })
  } catch (error: any) {
    console.error('Error generating reports stats:', error)
    return NextResponse.json(
      { error: error?.message || 'Error generating reports stats' },
      { status: 500 }
    )
  }
}
