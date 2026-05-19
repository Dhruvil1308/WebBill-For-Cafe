import { NextResponse } from 'next/server'
import { getActiveCafe } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

// Removed `force-dynamic` — this route now benefits from Vercel Edge Cache headers
// set in next.config.ts (s-maxage=30, stale-while-revalidate=60)

const menuItemCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  price: z.number().positive('Price must be positive'),
  categoryId: z.string().uuid('Category is required'),
  isVeg: z.boolean().default(true),
  isAvailable: z.boolean().default(true),
  imageUrl: z.string().url().optional().nullable(),
})

export async function GET(req: Request) {
  try {
    const activeCafeResult = await getActiveCafe()
    if (!activeCafeResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const categoryId = searchParams.get('categoryId')

    const where: any = { cafeId: activeCafeResult.cafe.id }
    if (categoryId) where.categoryId = categoryId

    const items = await prisma.menuItem.findMany({
      where,
      select: {
        id: true,
        name: true,
        price: true,
        isVeg: true,
        isAvailable: true,
        imageUrl: true,
        categoryId: true,
        category: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(items)
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error fetching menu items' },
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
    const parsed = menuItemCreateSchema.parse(body)

    const category = await prisma.category.findFirst({
      where: { id: parsed.categoryId, cafeId: activeCafeResult.cafe.id },
    })

    if (!category) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    const newItem = await prisma.menuItem.create({
      data: {
        cafeId: activeCafeResult.cafe.id,
        categoryId: parsed.categoryId,
        name: parsed.name,
        price: parsed.price,
        isVeg: parsed.isVeg,
        isAvailable: parsed.isAvailable,
        imageUrl: parsed.imageUrl,
      },
      include: { category: true },
    })

    return NextResponse.json(newItem, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error creating menu item' },
      { status: 400 }
    )
  }
}
