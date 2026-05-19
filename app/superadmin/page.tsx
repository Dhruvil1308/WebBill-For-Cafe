import { getAuthSession } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import SuperAdminDashboard from './SuperAdminDashboard'

export const dynamic = 'force-dynamic'

export default async function SuperAdminPage() {
  const user = await getAuthSession()
  if (!user || !user.email) {
    redirect('/login')
  }

  const admin = await prisma.superAdmin.findUnique({
    where: { email: user.email }
  })

  if (!admin) {
    redirect('/login')
  }

  return <SuperAdminDashboard adminEmail={user.email} />
}
