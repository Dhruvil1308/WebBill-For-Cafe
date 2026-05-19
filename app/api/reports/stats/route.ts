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
    const range = searchParams.get('range') || 'today' // 'today', '7days', 'overall'

    // Determine start date filter based on range
    let startDate: Date | undefined = undefined
    const now = new Date()

    if (range === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (range === '7days') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      startDate.setHours(0, 0, 0, 0)
    }

    // Fetch all PAID bills matching the filters
    const bills = await prisma.bill.findMany({
      where: {
        cafeId: cafe.id,
        status: 'PAID',
        ...(startDate ? { createdAt: { gte: startDate } } : {}),
      },
      include: {
        items: {
          include: {
            menuItem: {
              include: {
                category: true,
              },
            },
          },
        },
        customer: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    // 1. Calculate General KPI Metrics
    let totalSales = 0
    let totalDiscount = 0
    let totalGst = 0
    let totalSubtotal = 0
    const totalOrders = bills.length

    for (const bill of bills) {
      totalSales += Number(bill.total)
      totalDiscount += Number(bill.discount)
      totalGst += Number(bill.gstAmount)
      totalSubtotal += Number(bill.subtotal)
    }

    const averageBillValue = totalOrders > 0 ? totalSales / totalOrders : 0

    // 2. Calculate Payment Method Breakdown
    const paymentBreakdown: Record<string, { count: number; value: number }> = {
      CASH: { count: 0, value: 0 },
      UPI: { count: 0, value: 0 },
      CARD: { count: 0, value: 0 },
      WALLET: { count: 0, value: 0 },
    }

    for (const bill of bills) {
      const pm = bill.paymentMethod
      if (paymentBreakdown[pm]) {
        paymentBreakdown[pm].count += 1
        paymentBreakdown[pm].value += Number(bill.total)
      }
    }

    // Convert paymentBreakdown to a flatter array representation for charts
    const payments = Object.entries(paymentBreakdown).map(([name, data]) => ({
      name,
      count: data.count,
      value: Number(data.value.toFixed(2)),
    }))

    // 3. Calculate Order Type (Channel) Breakdown
    const channelsBreakdown: Record<string, { count: number; value: number }> = {
      DINE_IN: { count: 0, value: 0 },
      TAKEAWAY: { count: 0, value: 0 },
      ONLINE_ZOMATO: { count: 0, value: 0 },
      ONLINE_SWIGGY: { count: 0, value: 0 },
    }

    for (const bill of bills) {
      const ot = bill.orderType
      if (channelsBreakdown[ot]) {
        channelsBreakdown[ot].count += 1
        channelsBreakdown[ot].value += Number(bill.total)
      }
    }

    const channels = Object.entries(channelsBreakdown).map(([name, data]) => ({
      name: name.replace('ONLINE_', '').replace('_', ' '),
      count: data.count,
      value: Number(data.value.toFixed(2)),
    }))

    // 4. Calculate Peak Operating Hours
    // Initialize 24-hour array
    const hourlyCounts: Record<number, number> = {}
    for (let i = 0; i < 24; i++) {
      hourlyCounts[i] = 0
    }

    for (const bill of bills) {
      const hour = new Date(bill.createdAt).getHours()
      hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1
    }

    const peakHours = Object.entries(hourlyCounts).map(([hStr, count]) => {
      const h = Number(hStr)
      const label = h === 0 ? '12 AM' : h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`
      return {
        hourNumber: h,
        hour: label,
        orders: count,
      }
    }).sort((a, b) => a.hourNumber - b.hourNumber)

    // 5. Calculate Best Selling Menu Items
    const itemsMap: Record<string, { name: string; category: string; quantity: number; revenue: number }> = {}

    for (const bill of bills) {
      for (const item of bill.items) {
        const key = item.menuItemId
        if (!itemsMap[key]) {
          itemsMap[key] = {
            name: item.menuItem.name,
            category: item.menuItem.category.name,
            quantity: 0,
            revenue: 0,
          }
        }
        itemsMap[key].quantity += item.quantity
        itemsMap[key].revenue += Number(item.subtotal)
      }
    }

    const bestSellers = Object.values(itemsMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
      .map((item, idx) => ({
        rank: idx + 1,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        revenue: Number(item.revenue.toFixed(2)),
      }))

    // 6. Calculate Top Customers
    const customerMap: Record<string, { name: string; phone: string; visits: number; spent: number }> = {}

    for (const bill of bills) {
      if (bill.customer) {
        const phone = bill.customer.phone || 'Unknown'
        const name = bill.customer.name || 'Guest Customer'
        const key = phone

        if (!customerMap[key]) {
          customerMap[key] = {
            name,
            phone,
            visits: 0,
            spent: 0,
          }
        }
        customerMap[key].visits += 1
        customerMap[key].spent += Number(bill.total)
      }
    }

    const topCustomers = Object.values(customerMap)
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 5)
      .map((cust) => ({
        name: cust.name,
        phone: cust.phone,
        visits: cust.visits,
        spent: Number(cust.spent.toFixed(2)),
      }))

    // 7. Calculate Sales Timeline (for the Sales Performance chart)
    // For 'today', we can display orders grouped by hour. For '7days' and 'overall', we group by date.
    const timelineMap: Record<string, number> = {}

    if (range === 'today') {
      // 24 hourly buckets
      for (let i = 0; i < 24; i++) {
        const label = i === 0 ? '12 AM' : i === 12 ? '12 PM' : i > 12 ? `${i - 12} PM` : `${i} AM`
        timelineMap[label] = 0
      }
      for (const bill of bills) {
        const h = new Date(bill.createdAt).getHours()
        const label = h === 0 ? '12 AM' : h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`
        timelineMap[label] = (timelineMap[label] || 0) + Number(bill.total)
      }
    } else {
      // Group by Date String: e.g. "May 17"
      for (const bill of bills) {
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
      summary: {
        totalSales: Number(totalSales.toFixed(2)),
        totalOrders,
        averageBillValue: Number(averageBillValue.toFixed(2)),
        totalDiscount: Number(totalDiscount.toFixed(2)),
        totalGst: Number(totalGst.toFixed(2)),
        totalSubtotal: Number(totalSubtotal.toFixed(2)),
      },
      payments,
      channels,
      peakHours,
      bestSellers,
      topCustomers,
      timeline,
    })
  } catch (error: any) {
    console.error('Error generating reports stats:', error)
    return NextResponse.json({ error: error?.message || 'Error generating reports stats' }, { status: 500 })
  }
}
