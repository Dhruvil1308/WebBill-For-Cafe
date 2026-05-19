import { NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const user = await getAuthSession()
    if (!user || !user.email) {
      return NextResponse.json({ role: 'NONE' })
    }

    // Check if the user is a registered SuperAdmin
    const admin = await prisma.superAdmin.findUnique({
      where: { email: user.email }
    })

    if (admin) {
      return NextResponse.json({ role: 'SUPERADMIN' })
    }

    // Check if the user is a registered Client
    const client = await prisma.client.findUnique({
      where: { email: user.email }
    })

    if (client) {
      return NextResponse.json({ role: 'CLIENT' })
    }

    return NextResponse.json({ role: 'NONE' })
  } catch (error: any) {
    console.error('Error in /api/auth/role:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
