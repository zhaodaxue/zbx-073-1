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

async function triggerDrawIfNeeded(db: Database, roundId: number): Promise<void> {
  const round = queryOne<RoundRow>(db, 'SELECT * FROM rounds WHERE id = ?', [roundId])
  if (!round) return

  if (round.status !== 'closed') return

  const categories = queryAll<CategoryRow>(db, 'SELECT * FROM categories WHERE round_id = ?', [roundId])

  for (const cat of categories) {
    const claims = queryAll<ClaimRow>(db, 'SELECT * FROM claims WHERE round_id = ? AND category_name = ? ORDER BY timestamp ASC', [roundId, cat.name])
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

  db.run('UPDATE rounds SET status = ? WHERE id = ?', ['drawn', roundId])
  markDirty()
}

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { roundId, memberCode, category, quantity } = req.body

    if (!roundId || !memberCode || !category || !quantity) {
      res.status(400).json({ success: false, error: 'roundId, memberCode, category, and quantity are required' })
      return
    }

    if (typeof quantity !== 'number' || quantity < 1 || quantity > 5) {
      res.status(400).json({ success: false, error: 'quantity must be between 1 and 5' })
      return
    }

    const db = await getDb()

    const round = queryOne<RoundRow>(db, 'SELECT * FROM rounds WHERE id = ?', [roundId])
    if (!round) {
      res.status(404).json({ success: false, error: 'Round not found' })
      return
    }

    if (round.status !== 'open') {
      res.status(400).json({ success: false, error: 'Round is not open for claims' })
      return
    }

    if (new Date(round.deadline) <= new Date()) {
      res.status(400).json({ success: false, error: 'Round deadline has passed' })
      return
    }

    const categoryRow = queryOne<CategoryRow>(db, 'SELECT * FROM categories WHERE round_id = ? AND name = ?', [roundId, category])
    if (!categoryRow) {
      res.status(400).json({ success: false, error: 'Category does not exist in this round' })
      return
    }

    const existing = queryOne<ClaimRow>(db, 'SELECT * FROM claims WHERE round_id = ? AND category_name = ? AND member_code = ?', [roundId, category, memberCode])
    if (existing) {
      res.status(409).json({ success: false, error: 'You have already claimed this category in this round' })
      return
    }

    db.run('INSERT INTO claims (round_id, category_name, member_code, quantity) VALUES (?, ?, ?, ?)', [roundId, category, memberCode, quantity])
    markDirty()

    const claim = queryOne<ClaimRow>(db, 'SELECT * FROM claims WHERE round_id = ? AND category_name = ? AND member_code = ?', [roundId, category, memberCode])

    res.status(201).json({
      success: true,
      data: {
        id: claim!.id,
        roundId: claim!.round_id,
        category: claim!.category_name,
        memberCode: claim!.member_code,
        quantity: claim!.quantity,
        timestamp: claim!.timestamp,
        result: claim!.result
      }
    })
  } catch (err) {
    console.error('Submit claim error:', err)
    res.status(500).json({ success: false, error: 'Failed to submit claim' })
  }
})

router.get('/by-member/:roundId/:memberCode', async (req: Request, res: Response): Promise<void> => {
  try {
    const { roundId, memberCode } = req.params
    const db = await getDb()

    const round = queryOne<RoundRow>(db, 'SELECT * FROM rounds WHERE id = ?', [roundId])
    if (!round) {
      res.status(404).json({ success: false, error: 'Round not found' })
      return
    }

    if (round.status === 'closed') {
      await triggerDrawIfNeeded(db, Number(roundId))
    }

    const claims = queryAll<ClaimRow>(db, 'SELECT * FROM claims WHERE round_id = ? AND member_code = ?', [roundId, memberCode])

    res.json({
      success: true,
      data: claims.map(c => ({
        id: c.id,
        roundId: c.round_id,
        category: c.category_name,
        memberCode: c.member_code,
        quantity: c.quantity,
        timestamp: c.timestamp,
        result: c.result
      }))
    })
  } catch (err) {
    console.error('Get member claims error:', err)
    res.status(500).json({ success: false, error: 'Failed to get member claims' })
  }
})

export default router
