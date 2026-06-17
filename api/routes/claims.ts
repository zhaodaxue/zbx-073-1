import { Router, type Request, type Response } from 'express'
import { getDb, markDirty } from '../db.js'
import { queryAll, queryOne, autoCloseAndDraw, type RoundRow, type CategoryRow, type ClaimRow } from '../roundUtils.js'

const router = Router()

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

    let round = queryOne<RoundRow>(db, 'SELECT * FROM rounds WHERE id = ?', [roundId])
    if (!round) {
      res.status(404).json({ success: false, error: 'Round not found' })
      return
    }

    round = autoCloseAndDraw(db, round)

    if (round.status !== 'open') {
      res.status(400).json({ success: false, error: 'Round is not open for claims' })
      return
    }

    const existing = queryOne<{ cnt: number }>(
      db,
      'SELECT COUNT(*) as cnt FROM claims WHERE round_id = ? AND member_code = ? AND category_name = ?',
      [roundId, memberCode, category]
    )
    if (existing && existing.cnt > 0) {
      res.status(409).json({ success: false, error: 'Member has already claimed this category in this round' })
      return
    }

    db.run(
      'INSERT INTO claims (round_id, member_code, category_name, quantity, timestamp, result) VALUES (?, ?, ?, ?, ?, ?)',
      [roundId, memberCode, category, quantity, new Date().toISOString(), 'pending']
    )
    markDirty()

    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

router.get('/by-member/:roundId/:memberCode', async (req: Request, res: Response): Promise<void> => {
  try {
    const roundId = Number(req.params.roundId)
    const memberCode = decodeURIComponent(req.params.memberCode)

    if (!roundId || !memberCode) {
      res.status(400).json({ success: false, error: 'roundId and memberCode are required' })
      return
    }

    const db = await getDb()

    let round = queryOne<RoundRow>(db, 'SELECT * FROM rounds WHERE id = ?', [roundId])
    if (!round) {
      res.status(404).json({ success: false, error: 'Round not found' })
      return
    }

    round = autoCloseAndDraw(db, round)

    const claims = queryAll<ClaimRow>(
      db,
      'SELECT * FROM claims WHERE round_id = ? AND member_code = ? ORDER BY timestamp ASC',
      [roundId, memberCode]
    )

    res.json({ success: true, data: claims })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
})

export default router
