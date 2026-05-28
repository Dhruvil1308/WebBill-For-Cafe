import { NextResponse } from 'next/server'
import { getActiveCafe } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const activeCafeResult = await getActiveCafe()
    if (!activeCafeResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const expenses = await prisma.expense.findMany({
      where: { cafeId: activeCafeResult.cafe.id },
      orderBy: { date: 'desc' },
    })

    return NextResponse.json(expenses)
  } catch (error: any) {
    console.error('Fetch expenses error:', error)
    return NextResponse.json(
      { error: error?.message || 'Error fetching expenses' },
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
    const { itemName, quantity, price, total, amountPaid, isCleared, dueDate, paymentMethod, paidTo, note, date } = body

    if (!itemName?.trim()) {
      return NextResponse.json({ error: 'Item name is required' }, { status: 400 })
    }

    const newExpense = await prisma.expense.create({
      data: {
        cafeId: activeCafeResult.cafe.id,
        itemName: itemName.trim(),
        quantity: quantity || 1,
        price: parseFloat(price),
        total: parseFloat(total),
        amountPaid: amountPaid !== undefined ? parseFloat(amountPaid) : parseFloat(total),
        isCleared: isCleared !== undefined ? Boolean(isCleared) : true,
        dueDate: dueDate ? new Date(dueDate) : null,
        paymentMethod: paymentMethod || 'CASH',
        paidTo: paidTo?.trim() || null,
        note: note?.trim() || null,
        date: date ? new Date(date) : new Date(),
      },
    })

    return NextResponse.json(newExpense, { status: 201 })
  } catch (error: any) {
    console.error('Create expense error:', error)
    return NextResponse.json(
      { error: error?.message || 'Error creating expense' },
      { status: 500 }
    )
  }
}
