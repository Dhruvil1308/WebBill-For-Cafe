import { config } from 'dotenv'
config({ path: '.env.local' })

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL
const pool = new Pool({
  connectionString,
  ssl: connectionString?.includes('supabase.co') ? { rejectUnauthorized: false } : undefined
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter, log: ['query'] })

async function main() {
  console.log('Seeding database...')

  // 1. Create Super Admin
  const superAdmin = await prisma.superAdmin.upsert({
    where: { email: 'prajapatidhruvil1309@gmail.com' },
    update: {},
    create: {
      email: 'prajapatidhruvil1309@gmail.com',
    },
  })
  console.log('SuperAdmin created:', superAdmin.email)

  // 2. Create Cafe Owner (Client)
  const client = await prisma.client.upsert({
    where: { email: 'prajapatidhruvil1309@gmail.com' },
    update: {},
    create: {
      email: 'prajapatidhruvil1309@gmail.com',
      name: 'Dhruvil Prajapati',
      phone: '9876543210',
      plan: 'PRO',
    },
  })
  console.log('Client created:', client.name)

  // 3. Create Cafe
  const cafe = await prisma.cafe.upsert({
    where: { clientId: client.id },
    update: {},
    create: {
      clientId: client.id,
      name: 'The Central Perk Cafe',
      address: '123 Main Street, Bangalore',
      phone: '080-12345678',
      currency: 'INR',
    },
  })
  console.log('Cafe created:', cafe.name)

  // 4. Create Categories & Menu Items
  const categoriesData = [
    { name: 'Coffee', sortOrder: 1 },
    { name: 'Food', sortOrder: 2 },
    { name: 'Drinks', sortOrder: 3 },
    { name: 'Snacks', sortOrder: 4 },
    { name: 'Desserts', sortOrder: 5 }
  ]

  const itemsData = [
    { name: 'Espresso', categoryName: 'Coffee', price: 80, isVeg: true },
    { name: 'Cappuccino', categoryName: 'Coffee', price: 130, isVeg: true },
    { name: 'Cold Coffee', categoryName: 'Coffee', price: 120, isVeg: true },
    { name: 'Garlic Bread', categoryName: 'Food', price: 90, isVeg: true },
    { name: 'Margherita Pizza', categoryName: 'Food', price: 250, isVeg: true },
    { name: 'Chicken Sandwich', categoryName: 'Food', price: 180, isVeg: false },
    { name: 'Lemonade', categoryName: 'Drinks', price: 60, isVeg: true },
    { name: 'Mango Smoothie', categoryName: 'Drinks', price: 110, isVeg: true },
  ]

  for (const cat of categoriesData) {
    const category = await prisma.category.create({
      data: {
        cafeId: cafe.id,
        name: cat.name,
        sortOrder: cat.sortOrder,
      }
    })

    // Filter items for this category
    const catItems = itemsData.filter(i => i.categoryName === cat.name)
    for (const item of catItems) {
      await prisma.menuItem.create({
        data: {
          cafeId: cafe.id,
          categoryId: category.id,
          name: item.name,
          price: item.price,
          isVeg: item.isVeg,
        }
      })
    }
  }
  console.log('Categories and Menu Items created.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
