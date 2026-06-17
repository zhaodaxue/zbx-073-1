import { Router, type Request, type Response } from 'express'
import type { Database } from 'sql.js'
import { getDb, markDirty } from '../db.js'

const router = Router()

interface RoundRow {
  id: number
  name: string
  deadline: string
  status: string
  created_at: string
}

interface CategoryRow {
  id: number
  round_id: number
  name: string
  stock_limit: number
}

interface ClaimRow {
  id: number
  round_id: number
  category_name: string
  member_code: string
  quantity: number
  timestamp: string
  result: string
}

function queryAll<T>(db: Database, sql: string, params?: any[]): T[] {
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

function queryOne<T>(db: Database, sql: string, params?: any[]): T | null {
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

function autoCloseAndDraw(db: Database, round: RoundRow): RoundRow {
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

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb()
    let rounds = queryAll<RoundRow>(db, 'SELECT * FROM rounds ORDER BY created_at DESC')
    rounds = rounds.map(r => autoCloseAndDraw(db, r))

    const result = []
    for (const round of rounds) {
      const categories = queryAll<CategoryRow>(db, 'SELECT * FROM categories WHERE round_id = ?', [round.id])
      const categoryStats = []
      for (const cat of categories) {
        const claimSum = queryOne<{ total: number }>(db, 'SELECT COALESCE(SUM(quantity), 0) as total FROM claims WHERE round_id = ? AND category_name = ?', [round.id, cat.name])
        categoryStats.push({
          name: cat.name,
          stockLimit: cat.stock_limit,
          totalClaimed: claimSum?.total ?? 0
        })
      }
      result.push({
        id: round.id,
        name: round.name,
        deadline: round.deadline,
        status: round.status,
        createdAt: round.created_at,
        categories: categoryStats
      })
    }

    res.json({ success: true, data: result })
  } catch (err) {
    console.error('Get rounds error:', err)
    res.status(500).json({ success: false, error: 'Failed to get rounds' })
  }
})

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb()
    let round = queryOne<RoundRow>(db, 'SELECT * FROM rounds WHERE id = ?', [req.params.id])
    if (!round) {
      res.status(404).json({ success: false, error: 'Round not found' })
      return
    }
    round = autoCloseAndDraw(db, round)

    const categories = queryAll<CategoryRow>(db, 'SELECT * FROM categories WHERE round_id = ?', [round.id])
    const categoryStats = []
    for (const cat of categories) {
      const claims = queryAll<ClaimRow>(db, 'SELECT * FROM claims WHERE round_id = ? AND category_name = ? ORDER BY timestamp ASC', [round.id, cat.name])
      categoryStats.push({
        name: cat.name,
        stockLimit: cat.stock_limit,
        totalClaimed: claims.reduce((sum, c) => sum + c.quantity, 0),
        claimCount: claims.length,
        claims: claims.map(c => ({
          id: c.id,
          memberCode: c.member_code,
          quantity: c.quantity,
          timestamp: c.timestamp,
          result: c.result
        }))
      })
    }

    res.json({
      success: true,
      data: {
        id: round.id,
        name: round.name,
        deadline: round.deadline,
        status: round.status,
        createdAt: round.created_at,
        categories: categoryStats
      }
    })
  } catch (err) {
    console.error('Get round detail error:', err)
    res.status(500).json({ success: false, error: 'Failed to get round detail' })
  }
})

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, deadline, categories } = req.body
    if (!name || !deadline || !Array.isArray(categories) || categories.length === 0) {
      res.status(400).json({ success: false, error: 'name, deadline, and categories are required' })
      return
    }

    for (const cat of categories) {
      if (!cat.name || typeof cat.stockLimit !== 'number' || cat.stockLimit < 1) {
        res.status(400).json({ success: false, error: 'Each category must have a valid name and stockLimit >= 1' })
        return
      }
    }

    const status = new Date(deadline) <= new Date() ? 'closed' : 'open'

    const db = await getDb()
    db.run('INSERT INTO rounds (name, deadline, status) VALUES (?, ?, ?)', [name, deadline, status])
    const roundRow = queryOne<RoundRow>(db, 'SELECT * FROM rounds ORDER BY id DESC LIMIT 1')
    const roundId = roundRow!.id

    for (const cat of categories) {
      db.run('INSERT INTO categories (round_id, name, stock_limit) VALUES (?, ?, ?)', [roundId, cat.name, cat.stockLimit])
    }

    markDirty()

    const createdCategories = queryAll<CategoryRow>(db, 'SELECT * FROM categories WHERE round_id = ?', [roundId])

    res.status(201).json({
      success: true,
      data: {
        id: roundId,
        name,
        deadline,
        status,
        categories: createdCategories.map(c => ({ name: c.name, stockLimit: c.stock_limit }))
      }
    })
  } catch (err) {
    console.error('Create round error:', err)
    res.status(500).json({ success: false, error: 'Failed to create round' })
  }
})

router.post('/:id/draw', async (req: Request, res: Response): Promise<void> => {
  try {
    const db = await getDb()
    const round = queryOne<RoundRow>(db, 'SELECT * FROM rounds WHERE id = ?', [req.params.id])
    if (!round) {
      res.status(404).json({ success: false, error: 'Round not found' })
      return
    }

    if (round.status === 'drawn') {
      res.status(400).json({ success: false, error: 'Round already drawn' })
      return
    }

    if (round.status !== 'closed') {
      res.status(400).json({ success: false, error: 'Round must be closed before drawing' })
      return
    }

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
    markDirty()

    res.json({ success: true, data: { roundId: round.id, status: 'drawn' } })
  } catch (err) {
    console.error('Draw error:', err)
    res.status(500).json({ success: false, error: 'Failed to draw round' })
  }
})

export default router
