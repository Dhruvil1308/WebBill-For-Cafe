import { config } from 'dotenv'
config({ path: '.env.local' })
import { Pool } from 'pg'

async function test() {
  const connectionString = "postgres://postgres.azfrfoayfiijokjhyyze:Meena13092000%40@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
  console.log('Testing with aws-1-ap-south-1 pooler session mode connection string:', connectionString)

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  })

  try {
    const res = await pool.query('SELECT NOW()')
    console.log('Success:', res.rows[0])
  } catch (err) {
    console.error('Error connecting:', err)
  } finally {
    await pool.end()
  }
}

test()
