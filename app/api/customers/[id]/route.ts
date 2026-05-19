import { NextResponse } from 'next/server'
import { getActiveCafe } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET — Single customer with full bill history
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const activeCafeResult = await getActiveCafe()
    if (!activeCafeResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const customer = await prisma.customer.findFirst({
      where: { id, cafeId: activeCafeResult.cafe.id },
      include: {
        bills: {
          include: {
            items: { include: { menuItem: { select: { name: true } } } }
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: { select: { bills: true } }
      }
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json(customer)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error fetching customer' }, { status: 500 })
  }
}

// PUT — Update customer name and/or phone
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const activeCafeResult = await getActiveCafe()
    if (!activeCafeResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const { name, phone } = body

    if (!name?.trim() && !phone?.trim()) {
      return NextResponse.json({ error: 'Name or phone is required' }, { status: 400 })
    }

    const existing = await prisma.customer.findFirst({
      where: { id, cafeId: activeCafeResult.cafe.id }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Check duplicate phone (excluding self)
    if (phone?.trim() && phone.trim() !== existing.phone) {
      const dup = await prisma.customer.findFirst({
        where: { cafeId: activeCafeResult.cafe.id, phone: phone.trim(), id: { not: id } }
      })
      if (dup) {
        return NextResponse.json({ error: 'Another customer with this phone already exists' }, { status: 400 })
      }
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        name: name?.trim() ?? existing.name,
        phone: phone?.trim() ?? existing.phone,
      }
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error updating customer' }, { status: 500 })
  }
}

// DELETE — Hard delete if no bills; block and return error if bills exist
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const activeCafeResult = await getActiveCafe()
    if (!activeCafeResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const existing = await prisma.customer.findFirst({
      where: { id, cafeId: activeCafeResult.cafe.id },
      include: { _count: { select: { bills: true } } }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    if ((existing._count?.bills ?? 0) > 0) {
      return NextResponse.json(
        { error: `Cannot delete: this customer has ${existing._count.bills} bill(s) on record. Remove bills first.` },
        { status: 400 }
      )
    }

    await prisma.customer.delete({ where: { id } })
    return NextResponse.json({ deleted: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error deleting customer' }, { status: 500 })
  }
}
