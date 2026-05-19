import { unstable_cache } from 'next/cache'
import { createServerSupabaseClient } from './supabase-server'
import prisma from './prisma'

export async function getAuthSession() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null
    return user
  } catch (err) {
    console.error('Error fetching auth session:', err)
    return null
  }
}

export async function getActiveCafe() {
  // Auth verification always runs (security requirement)
  const user = await getAuthSession()
  if (!user || !user.email) return null

  try {
    // The Prisma DB lookup is cached per-user for 60 seconds.
    // This eliminates a full round-trip to Supabase Postgres on every API call,
    // replacing it with an in-memory cache hit for the duration of the cache window.
    const getCachedCafeData = unstable_cache(
      async (email: string) => {
        const client = await prisma.client.findUnique({
          where: { email },
          include: { cafe: true },
        })

        if (!client || !client.isActive || !client.cafe) return null

        if (
          client.subscriptionEnds &&
          new Date(client.subscriptionEnds) < new Date()
        ) {
          return null
        }

        return { client, cafe: client.cafe }
      },
      ['active-cafe'],   // Base cache key prefix
      {
        revalidate: 60,  // Re-validate from DB once per minute
        tags: [`cafe-session-${user.id}`], // Allows manual invalidation
      }
    )

    return await getCachedCafeData(user.email)
  } catch (err) {
    console.error('Error fetching active cafe:', err)
    return null
  }
}
