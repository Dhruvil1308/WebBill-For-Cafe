import { NextResponse } from 'next/server'
import { getActiveCafe } from '@/lib/auth'
import prisma from '@/lib/prisma'

// GET — Fetch a single bill with full details
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

    const bill = await prisma.bill.findFirst({
      where: { id, cafeId: activeCafeResult.cafe.id },
      include: {
        customer: true,
        items: {
          include: { menuItem: true }
        }
      }
    })

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }

    return NextResponse.json(bill)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error fetching bill' }, { status: 500 })
  }
}

// PATCH — Update bill status (cancel / mark edited) with optional note
export async function PATCH(
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
    const { status, note } = body

    if (!status || !['PAID', 'CANCELLED', 'EDITED'].includes(status)) {
      return NextResponse.json({ error: 'Valid status is required (PAID, CANCELLED, EDITED)' }, { status: 400 })
    }

    const existing = await prisma.bill.findFirst({
      where: { id, cafeId: activeCafeResult.cafe.id }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 })
    }

    if (existing.status === 'CANCELLED') {
      return NextResponse.json({ error: 'A cancelled bill cannot be modified' }, { status: 400 })
    }

    const updated = await prisma.bill.update({
      where: { id },
      data: {
        status: status as any,
        note: note !== undefined ? note : existing.note,
      },
      include: {
        customer: true,
        items: { include: { menuItem: true } }
      }
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error updating bill' }, { status: 500 })
  }
}
