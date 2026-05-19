import { NextResponse } from 'next/server'
import { getActiveCafe } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const menuItemUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  price: z.number().positive().optional(),
  categoryId: z.string().uuid().optional(),
  isVeg: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  imageUrl: z.string().url().optional().nullable(),
})

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const activeCafeResult = await getActiveCafe()
    if (!activeCafeResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = menuItemUpdateSchema.parse(body)

    // Check if the item belongs to the active cafe
    const existingItem = await prisma.menuItem.findFirst({
      where: {
        id,
        cafeId: activeCafeResult.cafe.id,
      },
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
    }

    if (parsed.categoryId) {
      // Verify category belongs to this cafe
      const category = await prisma.category.findFirst({
        where: {
          id: parsed.categoryId,
          cafeId: activeCafeResult.cafe.id,
        },
      })
      if (!category) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
      }
    }

    const updatedItem = await prisma.menuItem.update({
      where: { id },
      data: parsed,
      include: {
        category: true,
      },
    })

    return NextResponse.json(updatedItem)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error updating menu item' }, { status: 400 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const activeCafeResult = await getActiveCafe()
    if (!activeCafeResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if the item belongs to this cafe
    const existingItem = await prisma.menuItem.findFirst({
      where: {
        id,
        cafeId: activeCafeResult.cafe.id,
      },
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
    }

    // Check if the item has been ordered (exists in BillItem)
    const orderedCount = await prisma.billItem.count({
      where: { menuItemId: id },
    })

    if (orderedCount > 0) {
      // Soft-delete: make it unavailable or inactive
      const updated = await prisma.menuItem.update({
        where: { id },
        data: { isAvailable: false },
        include: { category: true },
      })
      return NextResponse.json({
        message: 'Menu item has previous order history, so it was set to unavailable instead of deleted.',
        item: updated,
        softDeleted: true,
      })
    }

    // Hard-delete if not ordered before
    await prisma.menuItem.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Menu item deleted successfully', softDeleted: false })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error deleting menu item' }, { status: 400 })
  }
}
