import { NextResponse } from 'next/server'
import { getActiveCafe } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const activeCafeResult = await getActiveCafe()
    if (!activeCafeResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const categories = await prisma.category.findMany({
      where: { cafeId: activeCafeResult.cafe.id },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { items: true } } }
    })

    return NextResponse.json(categories)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error fetching categories' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const activeCafeResult = await getActiveCafe()
    if (!activeCafeResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    // Auto-assign next sort order
    const lastCategory = await prisma.category.findFirst({
      where: { cafeId: activeCafeResult.cafe.id },
      orderBy: { sortOrder: 'desc' },
    })
    const nextSortOrder = (lastCategory?.sortOrder ?? 0) + 1

    const newCategory = await prisma.category.create({
      data: {
        cafeId: activeCafeResult.cafe.id,
        name: name.trim(),
        sortOrder: nextSortOrder,
        isActive: true,
      },
      include: { _count: { select: { items: true } } }
    })

    return NextResponse.json(newCategory, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error creating category' }, { status: 500 })
  }
}

