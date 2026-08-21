import 'dotenv/config'
import bcrypt from 'bcryptjs'
import pool   from './pool.js'

const STAFF = [
  { name:'Mrs. Adaora Nwosu',  email:'admin@oui.edu.ng',   role:'admin',   staff_id:'ADM-001', department:'Registry',           title:'Senior Registrar' },
  { name:'Dr. Emeka Adeyemi',  email:'medical@oui.edu.ng', role:'medical', staff_id:'MED-001', department:'Medical Centre',     title:'Medical Officer' },
  { name:'Mr. Tunde Afolabi',  email:'library@oui.edu.ng', role:'library', staff_id:'LIB-001', department:'University Library', title:'Chief Librarian' },
  { name:'Prof. Grace Okafor', email:'hod@oui.edu.ng',     role:'hod',     staff_id:'HOD-001', department:'Computer Science',   title:'Head of Department' },
]

async function seed() {
  const client = await pool.connect()
  try {
    const hash = await bcrypt.hash('demo123', 12)

    // seed staff
    for (const s of STAFF) {
      await client.query(`
        INSERT INTO users (name, email, password_hash, role, staff_id, department, title, is_verified)
        VALUES ($1,$2,$3,$4,$5,$6,$7,true)
        ON CONFLICT (email) DO NOTHING
      `, [s.name, s.email, hash, s.role, s.staff_id, s.department, s.title])
    }

    // seed demo student
    const { rows } = await client.query(`
      INSERT INTO users (name, email, password_hash, role, matric, department, faculty, level, is_verified)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true)
      ON CONFLICT (email) DO NOTHING RETURNING id
    `, ['Oyibo Samuel','samuel@oui.edu.ng', hash,'student','OUI/2021/0042','Computer Science','Science & Technology','400'])

    console.log('Seed complete. Demo accounts ready.')
    console.log('  student  → samuel@oui.edu.ng  / demo123')
    console.log('  admin    → admin@oui.edu.ng   / demo123')
    console.log('  medical  → medical@oui.edu.ng / demo123')
    console.log('  library  → library@oui.edu.ng / demo123')
    console.log('  hod      → hod@oui.edu.ng     / demo123')
  } catch(err) {
    console.error('Seed failed:', err.message)
  } finally {
    client.release()
    await pool.end()
  }
}

seed()