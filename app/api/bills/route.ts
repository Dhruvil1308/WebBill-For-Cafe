import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getActiveCafe } from '@/lib/auth'
import { z } from 'zod'

// GET — List bills for the cafe with optional filters
export async function GET(req: Request) {
  try {
    const activeCafeResult = await getActiveCafe()
    if (!activeCafeResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')      // PAID | CANCELLED | EDITED
    const range = searchParams.get('range')        // today | 7days | all
    const search = searchParams.get('search')      // billNumber or customer name

    const where: any = { cafeId: activeCafeResult.cafe.id }

    // Status filter
    if (status && ['PAID', 'CANCELLED', 'EDITED'].includes(status)) {
      where.status = status
    }

    // Date range filter
    if (range === 'today') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      where.createdAt = { gte: today }
    } else if (range === '7days') {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      sevenDaysAgo.setHours(0, 0, 0, 0)
      where.createdAt = { gte: sevenDaysAgo }
    }

    // Search filter — bill number or customer name/phone
    if (search) {
      where.OR = [
        { billNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { phone: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const bills = await prisma.bill.findMany({
      where,
      include: {
        customer: true,
        items: {
          include: { menuItem: { select: { name: true, isVeg: true } } }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit to recent 100
    })

    return NextResponse.json(bills)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error fetching bills' }, { status: 500 })
  }
}

// Simple schema validation for incoming bill payload
const billSchema = z.object({
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  orderType: z.enum(['DINE_IN', 'TAKEAWAY', 'ONLINE_ZOMATO', 'ONLINE_SWIGGY']),
  paymentMethod: z.enum(['CASH', 'UPI', 'CARD', 'WALLET']),
  subtotal: z.number().positive(),
  gstAmount: z.number().nonnegative(),
  discount: z.number().nonnegative().default(0),
  total: z.number().positive(),
  items: z.array(
    z.object({
      menuItemId: z.string().uuid(),
      quantity: z.number().int().positive(),
      price: z.number().positive(),
      variantName: z.string().optional(),
      subtotal: z.number().positive(),
    })
  ),
})

export async function POST(req: Request) {
  try {
    const activeCafeResult = await getActiveCafe()
    if (!activeCafeResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { cafe } = activeCafeResult
    const body = await req.json()
    const parsed = billSchema.parse(body)

    // Generate consecutive bill number for the cafe (simplified approach, using count for today)
    const today = new Date()
    const startOfDay = new Date(today.setHours(0, 0, 0, 0))
    const billsTodayCount = await prisma.bill.count({
      where: {
        cafeId: cafe.id,
        createdAt: { gte: startOfDay },
      },
    })
    const generatedBillNumber = `#IN-${billsTodayCount + 1}`

    let customerId = null
    // Upsert customer if phone exists
    if (parsed.customerPhone) {
      let customer = await prisma.customer.findFirst({
        where: { cafeId: cafe.id, phone: parsed.customerPhone },
      })
      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            cafeId: cafe.id,
            phone: parsed.customerPhone,
            name: parsed.customerName || null,
          },
        })
      }
      customerId = customer.id
    }

    // Save Bill and Items
    const newBill = await prisma.bill.create({
      data: {
        cafeId: cafe.id,
        customerId: customerId,
        billNumber: generatedBillNumber,
        orderType: parsed.orderType,
        paymentMethod: parsed.paymentMethod,
        subtotal: parsed.subtotal,
        gstAmount: parsed.gstAmount,
        discount: parsed.discount,
        total: parsed.total,
        status: 'PAID', // Default to paid upon creation
        items: {
          create: parsed.items.map((i) => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
            price: i.price,
            variantName: i.variantName || null,
            subtotal: i.subtotal,
          })),
        },
      },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    })

    return NextResponse.json(newBill, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error processing bill' }, { status: 400 })
  }
}

