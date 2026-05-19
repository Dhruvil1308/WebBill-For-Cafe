import { NextResponse } from 'next/server'
import { getActiveCafe } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Removed `force-dynamic` — Vercel Edge Cache headers in next.config.ts
// provide s-maxage=60, stale-while-revalidate=120 for this route

export async function GET() {
  try {
    const activeCafeResult = await getActiveCafe()
    if (!activeCafeResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const categories = await prisma.category.findMany({
      where: { cafeId: activeCafeResult.cafe.id },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        sortOrder: true,
        isActive: true,
        _count: { select: { items: true } },
      },
    })

    return NextResponse.json(categories)
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error fetching categories' },
      { status: 500 }
    )
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
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      )
    }

    // Get next sort order in one step using aggregate
    const maxOrder = await prisma.category.aggregate({
      where: { cafeId: activeCafeResult.cafe.id },
      _max: { sortOrder: true },
    })
    const nextSortOrder = (maxOrder._max.sortOrder ?? 0) + 1

    const newCategory = await prisma.category.create({
      data: {
        cafeId: activeCafeResult.cafe.id,
        name: name.trim(),
        sortOrder: nextSortOrder,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        sortOrder: true,
        isActive: true,
        _count: { select: { items: true } },
      },
    })

    return NextResponse.json(newCategory, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error creating category' },
      { status: 500 }
    )
  }
}
