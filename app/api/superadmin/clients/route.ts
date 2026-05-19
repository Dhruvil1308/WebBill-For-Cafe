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

export async function GET() {
  try {
    const authCheck = await verifySuperAdmin()
    if (authCheck.error) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const clients = await prisma.client.findMany({
      include: {
        cafe: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(clients)
  } catch (error: any) {
    console.error('Error fetching clients in SuperAdmin API:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const authCheck = await verifySuperAdmin()
    if (authCheck.error) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const body = await request.json()
    const { name, email, password, phone, cafeName, plan } = body

    // Validate request inputs
    if (!name?.trim() || !email?.trim() || !password?.trim() || !cafeName?.trim()) {
      return NextResponse.json(
        { error: 'Name, Email, Password, and Cafe Name are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Validate that client email doesn't already exist in database
    const existingClient = await prisma.client.findUnique({
      where: { email: email.trim() }
    })
    if (existingClient) {
      return NextResponse.json(
        { error: 'A Client account with this email already exists' },
        { status: 400 }
      )
    }

    // Create the authenticated user in Supabase Auth (Auto-verified)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: password,
      email_confirm: true,
      user_metadata: { name: name.trim() }
    })

    if (authError || !authData?.user) {
      console.error('Supabase Auth User creation failed:', authError)
      return NextResponse.json(
        { error: authError?.message || 'Failed to register authentication credentials' },
        { status: 400 }
      )
    }

    const userId = authData.user.id

    // Use Prisma transaction to atomically save the Client, the Cafe, and seed default categories
    const newClientRecord = await prisma.$transaction(async (tx) => {
      const client = await tx.client.create({
        data: {
          id: userId,
          email: email.trim().toLowerCase(),
          name: name.trim(),
          phone: phone?.trim() || null,
          plan: (plan as Plan) || Plan.BASIC,
          isActive: true
        }
      })

      const cafe = await tx.cafe.create({
        data: {
          clientId: client.id,
          name: cafeName.trim(),
          categories: {
            createMany: {
              data: [
                { name: 'Hot Drinks', sortOrder: 1, isActive: true },
                { name: 'Cold Drinks', sortOrder: 2, isActive: true },
                { name: 'Snacks', sortOrder: 3, isActive: true },
                { name: 'Desserts', sortOrder: 4, isActive: true }
              ]
            }
          }
        },
        include: {
          categories: true
        }
      })

      return { ...client, cafe }
    })

    return NextResponse.json(newClientRecord, { status: 201 })
  } catch (error: any) {
    console.error('Error creating client in SuperAdmin API:', error)
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 })
  }
}
