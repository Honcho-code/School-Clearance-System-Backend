import 'dotenv/config'
import pool from './pool.js'

const SQL = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(200)        NOT NULL,
  email         VARCHAR(200) UNIQUE NOT NULL,
  password_hash VARCHAR(255)        NOT NULL,
  role          VARCHAR(30)         NOT NULL CHECK (role IN ('student','admin','medical','library','hod')),
  matric        VARCHAR(50),
  staff_id      VARCHAR(50),
  department    VARCHAR(150),
  faculty       VARCHAR(150),
  level         VARCHAR(10),
  title         VARCHAR(100),
  is_verified   BOOLEAN DEFAULT FALSE,
  verify_token  VARCHAR(255),
  reset_token   VARCHAR(255),
  reset_expires TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Clearance applications
CREATE TABLE IF NOT EXISTS clearance_apps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  status        VARCHAR(30) DEFAULT 'in_progress' CHECK (status IN ('in_progress','cleared','rejected')),
  letter_id     VARCHAR(50),
  granted_at    TIMESTAMPTZ,
  submitted_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Clearance stages (one row per stage per application)
CREATE TABLE IF NOT EXISTS clearance_stages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id        UUID REFERENCES clearance_apps(id) ON DELETE CASCADE,
  stage_key     VARCHAR(20) NOT NULL CHECK (stage_key IN ('admin','medical','library','hod','final')),
  status        VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','reviewing','approved','rejected')),
  reviewer_id   UUID REFERENCES users(id),
  reviewer_name VARCHAR(200),
  remark        TEXT,
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (app_id, stage_key)
);

-- Receipts (uploaded files)
CREATE TABLE IF NOT EXISTS receipts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id      UUID REFERENCES clearance_apps(id) ON DELETE CASCADE,
  type        VARCHAR(20) NOT NULL CHECK (type IN ('school_fees','medical','library')),
  level       VARCHAR(10),
  filename    VARCHAR(255) NOT NULL,
  original    VARCHAR(255),
  url         VARCHAR(500),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  message     TEXT NOT NULL,
  type        VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info','success','warning','cleared')),
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES users(id),
  actor_name  VARCHAR(200),
  action      VARCHAR(100),
  target_id   UUID,
  meta        JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clearance_apps_student ON clearance_apps(student_id);
CREATE INDEX IF NOT EXISTS idx_stages_app    ON clearance_stages(app_id);
CREATE INDEX IF NOT EXISTS idx_stages_key    ON clearance_stages(stage_key, status);
CREATE INDEX IF NOT EXISTS idx_receipts_app  ON receipts(app_id);
CREATE INDEX IF NOT EXISTS idx_notifs_user   ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_actor   ON audit_log(actor_id);
`

async function migrate() {
  const client = await pool.connect()
  try {
    console.log('Running migrations...')
    await client.query(SQL)
    console.log('Migrations complete.')
  } catch (err) {
    console.error('Migration failed:', err.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

migrate()