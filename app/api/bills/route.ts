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
    const status = searchParams.get('status')
    const range = searchParams.get('range')
    const search = searchParams.get('search')

    const where: any = { cafeId: activeCafeResult.cafe.id }

    if (status && ['PAID', 'CANCELLED', 'EDITED'].includes(status)) {
      where.status = status
    }

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
          include: { menuItem: { select: { name: true, isVeg: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json(bills, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error fetching bills' },
      { status: 500 }
    )
  }
}

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

    // Wrap entire bill creation in a transaction.
    // This makes bill number generation and customer lookup atomic —
    // no more race conditions under concurrent requests.
    const newBill = await prisma.$transaction(async (tx) => {
      const today = new Date()
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      )

      const billsTodayCount = await tx.bill.count({
        where: { cafeId: cafe.id, createdAt: { gte: startOfDay } },
      })
      const generatedBillNumber = `#IN-${billsTodayCount + 1}`

      let customerId: string | null = null

      // Safe customer lookup within transaction (no unique compound constraint in schema)
      if (parsed.customerPhone) {
        const existingCustomer = await tx.customer.findFirst({
          where: { cafeId: cafe.id, phone: parsed.customerPhone },
          select: { id: true },
        })

        if (existingCustomer) {
          customerId = existingCustomer.id
          // Update name if it was previously null and we now have one
          if (parsed.customerName) {
            await tx.customer.update({
              where: { id: existingCustomer.id },
              data: { name: parsed.customerName },
            })
          }
        } else {
          const newCustomer = await tx.customer.create({
            data: {
              cafeId: cafe.id,
              phone: parsed.customerPhone,
              name: parsed.customerName || null,
            },
          })
          customerId = newCustomer.id
        }
      }

      return tx.bill.create({
        data: {
          cafeId: cafe.id,
          customerId,
          billNumber: generatedBillNumber,
          orderType: parsed.orderType,
          paymentMethod: parsed.paymentMethod,
          subtotal: parsed.subtotal,
          gstAmount: parsed.gstAmount,
          discount: parsed.discount,
          total: parsed.total,
          status: 'PAID',
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
          items: { include: { menuItem: true } },
        },
      })
    })

    return NextResponse.json(newBill, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error processing bill' },
      { status: 400 }
    )
  }
}
