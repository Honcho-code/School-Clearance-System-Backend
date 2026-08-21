import pg from 'pg'
import 'dotenv/config'

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

pool.on('connect', () => {
  if (process.env.NODE_ENV !== 'test') {
    console.log('PostgreSQL connected')
  }
})

pool.on('error', (err) => {
  console.error('PostgreSQL error:', err.message)
})

export const query = (text, params) => pool.query(text, params)
export default pool