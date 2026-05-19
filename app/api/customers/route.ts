import { NextResponse } from 'next/server'
import { getActiveCafe } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET — List all customers with aggregated visit count and total spent
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

    const customers = await prisma.customer.findMany({
      where,
      include: {
        bills: {
          where: { status: 'PAID' },
          select: { total: true, createdAt: true }
        },
        _count: { select: { bills: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Add computed stats to each customer
    const customersWithStats = customers.map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      createdAt: c.createdAt,
      visitCount: c._count.bills,
      totalSpent: c.bills.reduce((sum, b) => sum + Number(b.total), 0),
      lastVisit: c.bills.length > 0
        ? c.bills.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt
        : null,
    }))

    return NextResponse.json(customersWithStats)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error fetching customers' }, { status: 500 })
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
      return NextResponse.json({ error: 'Name or phone number is required' }, { status: 400 })
    }

    // Check for duplicate phone
    if (phone?.trim()) {
      const existing = await prisma.customer.findFirst({
        where: { cafeId: activeCafeResult.cafe.id, phone: phone.trim() }
      })
      if (existing) {
        return NextResponse.json({ error: 'A customer with this phone number already exists' }, { status: 400 })
      }
    }

    const newCustomer = await prisma.customer.create({
      data: {
        cafeId: activeCafeResult.cafe.id,
        name: name?.trim() || null,
        phone: phone?.trim() || null,
      }
    })

    return NextResponse.json({ ...newCustomer, visitCount: 0, totalSpent: 0, lastVisit: null }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error creating customer' }, { status: 500 })
  }
}
