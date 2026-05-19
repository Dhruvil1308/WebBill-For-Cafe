import { createServerSupabaseClient } from './supabase-server'
import prisma from './prisma'

export async function getAuthSession() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    return user
  } catch (err) {
    console.error('Error fetching auth session:', err)
    return null
  }
}

export async function getActiveCafe() {
  const user = await getAuthSession()
  if (!user || !user.email) return null

  try {
    // Find the Client matching this user's email, including their Cafe
    const client = await prisma.client.findUnique({
      where: { email: user.email },
      include: { cafe: true }
    })

    if (!client || !client.isActive || !client.cafe) {
      return null
    }

    // Enforce subscription expiry if set
    if (client.subscriptionEnds && new Date(client.subscriptionEnds) < new Date()) {
      return null
    }

    return {
      client,
      cafe: client.cafe
    }
  } catch (err) {
    console.error('Error fetching active cafe:', err)
    return null
  }
}
