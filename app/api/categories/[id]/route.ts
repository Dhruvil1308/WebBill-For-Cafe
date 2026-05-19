import { NextResponse } from 'next/server'
import { getActiveCafe } from '@/lib/auth'
import prisma from '@/lib/prisma'

// PUT — Rename, toggle isActive, update sortOrder
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
    const { name, isActive, sortOrder } = body

    // Verify this category belongs to the logged-in cafe
    const existing = await prisma.category.findFirst({
      where: { id, cafeId: activeCafeResult.cafe.id }
    })
    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    const updateData: any = {}
    if (name !== undefined && name.trim()) updateData.name = name.trim()
    if (isActive !== undefined) updateData.isActive = Boolean(isActive)
    if (sortOrder !== undefined) updateData.sortOrder = Number(sortOrder)

    const updated = await prisma.category.update({
      where: { id },
      data: updateData,
      include: { _count: { select: { items: true } } }
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error updating category' }, { status: 500 })
  }
}

// DELETE — Hard delete if no menu items; soft delete (isActive=false) if items exist
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

    const existing = await prisma.category.findFirst({
      where: { id, cafeId: activeCafeResult.cafe.id },
      include: { _count: { select: { items: true } } }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    if ((existing._count?.items ?? 0) > 0) {
      // Soft delete — disable rather than destroy to protect menu items
      await prisma.category.update({
        where: { id },
        data: { isActive: false }
      })
      return NextResponse.json({ softDeleted: true, message: 'Category has menu items — marked as Inactive instead.' })
    }

    await prisma.category.delete({ where: { id } })
    return NextResponse.json({ deleted: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Error deleting category' }, { status: 500 })
  }
}
