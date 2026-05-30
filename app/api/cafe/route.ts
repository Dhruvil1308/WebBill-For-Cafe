import { NextResponse } from 'next/server'
import { getActiveCafe } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const activeCafeResult = await getActiveCafe()
    if (!activeCafeResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(activeCafeResult.cafe)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error fetching cafe' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const activeCafeResult = await getActiveCafe()
    if (!activeCafeResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, address, phone, gstNumber, logoUrl, isGstEnabled } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Cafe name is required' }, { status: 400 })
    }

    const updatedCafe = await prisma.cafe.update({
      where: { id: activeCafeResult.cafe.id },
      data: {
        name: name.trim(),
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        gstNumber: gstNumber?.trim() || null,
        logoUrl: logoUrl || null,
        isGstEnabled: isGstEnabled ?? true
      }
    })

    return NextResponse.json(updatedCafe)
  } catch (error: any) {
    console.error('Error updating cafe details:', error)
    return NextResponse.json({ error: error?.message || 'Error updating cafe details' }, { status: 500 })
  }
}
