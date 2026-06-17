import initSqlJs, { type Database } from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DB_PATH = path.join(__dirname, '..', 'data', 'app.db')

let db: Database | null = null
let saveTimer: ReturnType<typeof setTimeout> | null = null

function ensureDataDir() {
  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

export function saveDb() {
  if (!db) return
  try {
    ensureDataDir()
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(DB_PATH, buffer)
  } catch (err) {
    console.error('Failed to save database:', err)
  }
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveDb()
    saveTimer = null
  }, 1000)
}

export async function getDb(): Promise<Database> {
  if (db) return db

  const SQL = await initSqlJs()

  ensureDataDir()

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS rounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      deadline TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      round_id INTEGER NOT NULL REFERENCES rounds(id),
      name TEXT NOT NULL,
      stock_limit INTEGER NOT NULL
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      round_id INTEGER NOT NULL REFERENCES rounds(id),
      category_name TEXT NOT NULL,
      member_code TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 5),
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      result TEXT NOT NULL DEFAULT 'pending',
      UNIQUE(round_id, category_name, member_code)
    )
  `)

  db.run(`CREATE INDEX IF NOT EXISTS idx_claims_round_category ON claims(round_id, category_name)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_claims_member ON claims(round_id, member_code)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_claims_timestamp ON claims(round_id, category_name, timestamp)`)

  saveDb()

  process.on('exit', () => {
    saveDb()
  })

  return db
}

export function markDirty() {
  scheduleSave()
}
