import type { Database } from 'sql.js'
import { markDirty } from './db.js'

export interface RoundRow {
  id: number
  name: string
  deadline: string
  status: string
  created_at: string
}

export interface CategoryRow {
  id: number
  round_id: number
  name: string
  stock_limit: number
}

export interface ClaimRow {
  id: number
  round_id: number
  category_name: string
  member_code: string
  quantity: number
  timestamp: string
  result: string
}

export function queryAll<T>(db: Database, sql: string, params?: any[]): T[] {
  const stmt = db.prepare(sql)
  if (params && params.length > 0) {
    stmt.bind(params)
  }
  const rows: T[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T)
  }
  stmt.free()
  return rows
}

export function queryOne<T>(db: Database, sql: string, params?: any[]): T | null {
  const stmt = db.prepare(sql)
  if (params && params.length > 0) {
    stmt.bind(params)
  }
  let row: T | null = null
  if (stmt.step()) {
    row = stmt.getAsObject() as T
  }
  stmt.free()
  return row
}

export function autoCloseAndDraw(db: Database, round: RoundRow): RoundRow {
  let updated = { ...round }

  if (round.status === 'open' && new Date(round.deadline) <= new Date()) {
    db.run('UPDATE rounds SET status = ? WHERE id = ?', ['closed', round.id])
    updated.status = 'closed'
    markDirty()
  }

  if (updated.status === 'closed') {
    const categories = queryAll<CategoryRow>(db, 'SELECT * FROM categories WHERE round_id = ?', [round.id])
    for (const cat of categories) {
      const claims = queryAll<ClaimRow>(db, 'SELECT * FROM claims WHERE round_id = ? AND category_name = ? ORDER BY timestamp ASC', [round.id, cat.name])
      const totalClaimed = claims.reduce((sum, c) => sum + c.quantity, 0)

      if (totalClaimed <= cat.stock_limit) {
        for (const claim of claims) {
          db.run('UPDATE claims SET result = ? WHERE id = ?', ['won', claim.id])
        }
      } else {
        let usedStock = 0
        for (const claim of claims) {
          if (usedStock + claim.quantity <= cat.stock_limit) {
            db.run('UPDATE claims SET result = ? WHERE id = ?', ['won', claim.id])
            usedStock += claim.quantity
          } else {
            db.run('UPDATE claims SET result = ? WHERE id = ?', ['lost', claim.id])
          }
        }
      }
    }
    db.run('UPDATE rounds SET status = ? WHERE id = ?', ['drawn', round.id])
    updated.status = 'drawn'
    markDirty()
  }

  return updated
}
