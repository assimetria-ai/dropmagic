const express = require('express')
const router = express.Router()
const { authenticate } = require('../../../lib/@system/Helpers/auth')
const db = require('../../../lib/@system/PostgreSQL')

// GET /api/drops — list drops
router.get('/drops', authenticate, async (req, res, next) => {
  try {
    const drops = await db.any(
      'SELECT * FROM drops WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    )
    res.json({ drops })
  } catch (err) {
    next(err)
  }
})

// POST /api/drops — create a drop
router.post('/drops', authenticate, async (req, res, next) => {
  try {
    const { name, description, product_url, launch_at, image_url } = req.body
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now()
    const drop = await db.one(
      `INSERT INTO drops (user_id, name, slug, description, product_url, launch_at, image_url, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW()) RETURNING *`,
      [req.user.id, name, slug, description, product_url, launch_at, image_url]
    )
    res.status(201).json({ drop })
  } catch (err) {
    next(err)
  }
})

// GET /api/drops/:slug/signup — public signup endpoint
router.post('/drops/:slug/signup', async (req, res, next) => {
  try {
    const { email, referral_code } = req.body
    const drop = await db.oneOrNone('SELECT * FROM drops WHERE slug = $1', [req.params.slug])
    if (!drop) return res.status(404).json({ error: 'Drop not found' })

    // Check for referrer
    let referred_by = null
    if (referral_code) {
      const referrer = await db.oneOrNone('SELECT id FROM drop_signups WHERE referral_code = $1', [referral_code])
      referred_by = referrer?.id || null
    }

    const myCode = Math.random().toString(36).slice(2, 8).toUpperCase()
    const signup = await db.one(
      `INSERT INTO drop_signups (drop_id, email, referral_code, referred_by, created_at)
       VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [drop.id, email, myCode, referred_by]
    )

    // Increment referral count for referrer
    if (referred_by) {
      await db.none('UPDATE drop_signups SET referral_count = referral_count + 1 WHERE id = $1', [referred_by])
    }

    res.status(201).json({ signup, referral_code: myCode })
  } catch (err) {
    next(err)
  }
})

// GET /api/drops/signups — list signups for user's drops
router.get('/drops/signups', authenticate, async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query
    const signups = await db.any(
      `SELECT s.*, d.name as drop_name FROM drop_signups s
       JOIN drops d ON s.drop_id = d.id
       WHERE d.user_id = $1 ORDER BY s.created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    )
    res.json({ signups })
  } catch (err) {
    next(err)
  }
})

// GET /api/drops/stats — dashboard stats
router.get('/drops/stats', authenticate, async (req, res, next) => {
  try {
    const active = await db.one("SELECT COUNT(*) FROM drops WHERE user_id = $1 AND status = 'active'", [req.user.id])
    const signups = await db.one(
      'SELECT COUNT(*) FROM drop_signups s JOIN drops d ON s.drop_id = d.id WHERE d.user_id = $1',
      [req.user.id]
    )
    const shares = await db.one(
      'SELECT COALESCE(SUM(referral_count),0) as total FROM drop_signups s JOIN drops d ON s.drop_id = d.id WHERE d.user_id = $1',
      [req.user.id]
    )
    res.json({
      active_drops: parseInt(active.count),
      total_signups: parseInt(signups.count),
      shares_generated: parseInt(shares.total),
      conversion_rate: 0,
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
