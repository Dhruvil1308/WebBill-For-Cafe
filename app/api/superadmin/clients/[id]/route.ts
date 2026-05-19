import { NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { Plan } from '@prisma/client'

// Helper to verify SuperAdmin privilege
async function verifySuperAdmin() {
  const user = await getAuthSession()
  if (!user || !user.email) {
    return { error: 'Unauthorized', status: 401 }
  }

  const admin = await prisma.superAdmin.findUnique({
    where: { email: user.email }
  })

  if (!admin) {
    return { error: 'Forbidden', status: 403 }
  }

  return { user }
}

// PATCH — Quick updates: isActive toggle, plan change
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCheck = await verifySuperAdmin()
    if (authCheck.error) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const { id } = await params
    const body = await request.json()
    const { isActive, plan } = body

    const updateData: any = {}
    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive)
    }
    if (plan !== undefined) {
      updateData.plan = plan as Plan
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields provided for update' }, { status: 400 })
    }

    const updatedClient = await prisma.client.update({
      where: { id },
      data: updateData,
      include: { cafe: true }
    })

    return NextResponse.json(updatedClient)
  } catch (error: any) {
    console.error('Error updating client in SuperAdmin API:', error)
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 })
  }
}

// PUT — Full client edit: name, phone, subscriptionEnds
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCheck = await verifySuperAdmin()
    if (authCheck.error) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const { id } = await params
    const body = await request.json()
    const { name, phone, plan, subscriptionEnds } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Client name is required' }, { status: 400 })
    }

    const updateData: any = {
      name: name.trim(),
      phone: phone?.trim() || null,
    }

    if (plan) {
      updateData.plan = plan as Plan
    }

    if (subscriptionEnds !== undefined) {
      updateData.subscriptionEnds = subscriptionEnds ? new Date(subscriptionEnds) : null
    }

    const updatedClient = await prisma.client.update({
      where: { id },
      data: updateData,
      include: { cafe: true }
    })

    return NextResponse.json(updatedClient)
  } catch (error: any) {
    console.error('Error editing client in SuperAdmin API:', error)
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 })
  }
}

// DELETE — Remove client account and all associated data
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authCheck = await verifySuperAdmin()
    if (authCheck.error) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))

    // Require explicit confirmation to prevent accidental deletion
    if (!body?.confirm) {
      return NextResponse.json(
        { error: 'Deletion requires explicit confirmation flag { confirm: true }' },
        { status: 400 }
      )
    }

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id },
      include: { cafe: { include: { bills: true } } }
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Delete all DB records via cascading transaction
    await prisma.$transaction(async (tx) => {
      if (client.cafe) {
        const cafeId = client.cafe.id

        // Delete bill items first
        const bills = await tx.bill.findMany({ where: { cafeId }, select: { id: true } })
        for (const bill of bills) {
          await tx.billItem.deleteMany({ where: { billId: bill.id } })
        }

        await tx.bill.deleteMany({ where: { cafeId } })
        await tx.customer.deleteMany({ where: { cafeId } })
        await tx.menuItem.deleteMany({ where: { cafeId } })
        await tx.category.deleteMany({ where: { cafeId } })
        await tx.cafe.delete({ where: { id: cafeId } })
      }

      await tx.client.delete({ where: { id } })
    })

    // Remove from Supabase Auth
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(id)
    if (authDeleteError) {
      console.warn('Warning: DB deleted but Supabase Auth delete failed:', authDeleteError.message)
    }

    return NextResponse.json({ success: true, deletedId: id })
  } catch (error: any) {
    console.error('Error deleting client in SuperAdmin API:', error)
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 })
  }
}

