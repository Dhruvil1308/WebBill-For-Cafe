import { NextResponse } from 'next/server'
import { getActiveCafe } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const activeCafeResult = await getActiveCafe()
    if (!activeCafeResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify expense belongs to this cafe
    const expense = await prisma.expense.findFirst({
      where: {
        id,
        cafeId: activeCafeResult.cafe.id,
      },
    })

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    await prisma.expense.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete expense error:', error)
    return NextResponse.json(
      { error: error?.message || 'Error deleting expense' },
      { status: 500 }
    )
  }
}

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
    const { itemName, quantity, price, total, paymentMethod, paidTo, note, date } = body

    // Verify expense belongs to this cafe
    const existingExpense = await prisma.expense.findFirst({
      where: {
        id,
        cafeId: activeCafeResult.cafe.id,
      },
    })

    if (!existingExpense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: {
        itemName: itemName?.trim() || existingExpense.itemName,
        quantity: quantity !== undefined ? quantity : existingExpense.quantity,
        price: price !== undefined ? parseFloat(price) : existingExpense.price,
        total: total !== undefined ? parseFloat(total) : existingExpense.total,
        paymentMethod: paymentMethod || existingExpense.paymentMethod,
        paidTo: paidTo !== undefined ? paidTo?.trim() || null : existingExpense.paidTo,
        note: note !== undefined ? note?.trim() || null : existingExpense.note,
        date: date ? new Date(date) : existingExpense.date,
      },
    })

    return NextResponse.json(updatedExpense)
  } catch (error: any) {
    console.error('Update expense error:', error)
    return NextResponse.json(
      { error: error?.message || 'Error updating expense' },
      { status: 500 }
    )
  }
}
