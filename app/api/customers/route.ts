import { NextResponse } from 'next/server'
import { getActiveCafe } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET — Customers with aggregated stats pushed entirely to the database layer
export async function GET(req: Request) {
  try {
    const activeCafeResult = await getActiveCafe()
    if (!activeCafeResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')

    const where: any = { cafeId: activeCafeResult.cafe.id }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Fetch customers and their bill aggregates in parallel —
    // database computes SUM, COUNT, and MAX, not JavaScript.
    const [customers, billStats] = await Promise.all([
      prisma.customer.findMany({
        where,
        select: { id: true, name: true, phone: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.bill.groupBy({
        by: ['customerId'],
        where: {
          cafeId: activeCafeResult.cafe.id,
          status: 'PAID',
          customerId: { not: null },
        },
        _sum: { total: true },
        _count: { id: true },
        _max: { createdAt: true },
      }),
    ])

    // Merge in O(n) using a Map — no nested loops, no sort/reduce on arrays
    const statsMap = new Map(billStats.map((s) => [s.customerId, s]))

    const customersWithStats = customers.map((c) => {
      const stats = statsMap.get(c.id)
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        createdAt: c.createdAt,
        visitCount: stats?._count.id ?? 0,
        totalSpent: Number(stats?._sum.total ?? 0),
        lastVisit: stats?._max.createdAt ?? null,
      }
    })

    return NextResponse.json(customersWithStats)
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error fetching customers' },
      { status: 500 }
    )
  }
}

// POST — Manually create a customer record
export async function POST(req: Request) {
  try {
    const activeCafeResult = await getActiveCafe()
    if (!activeCafeResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, phone } = body

    if (!name?.trim() && !phone?.trim()) {
      return NextResponse.json(
        { error: 'Name or phone number is required' },
        { status: 400 }
      )
    }

    if (phone?.trim()) {
      const existing = await prisma.customer.findFirst({
        where: { cafeId: activeCafeResult.cafe.id, phone: phone.trim() },
        select: { id: true },
      })
      if (existing) {
        return NextResponse.json(
          { error: 'A customer with this phone number already exists' },
          { status: 400 }
        )
      }
    }

    const newCustomer = await prisma.customer.create({
      data: {
        cafeId: activeCafeResult.cafe.id,
        name: name?.trim() || null,
        phone: phone?.trim() || null,
      },
    })

    return NextResponse.json(
      { ...newCustomer, visitCount: 0, totalSpent: 0, lastVisit: null },
      { status: 201 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error creating customer' },
      { status: 500 }
    )
  }
}
