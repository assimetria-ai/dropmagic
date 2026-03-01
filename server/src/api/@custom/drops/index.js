const express = require('express')
const router = express.Router()
const { authenticate } = require('../../../lib/@system/Helpers/auth')
const Email = require('../../../lib/@system/Email')
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
    const conversionDenom = parseInt(signups.count) + parseInt(shares.total)
    const conversionRate = conversionDenom > 0
      ? ((parseInt(shares.total) / conversionDenom) * 100).toFixed(1) + '%'
      : '0%'
    res.json({
      activeDrops: parseInt(active.count),
      totalSignups: parseInt(signups.count),
      sharesGenerated: parseInt(shares.total),
      conversionRate,
    })
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

// GET /api/drops/signups/recent — last 48h signups
router.get('/drops/signups/recent', authenticate, async (req, res, next) => {
  try {
    const signups = await db.any(
      `SELECT s.id, s.email, d.name as dropName, s.referral_count as referralCount,
              s.created_at as dateJoined
       FROM drop_signups s
       JOIN drops d ON s.drop_id = d.id
       WHERE d.user_id = $1 AND s.created_at > NOW() - INTERVAL '48 hours'
       ORDER BY s.created_at DESC LIMIT 50`,
      [req.user.id]
    )
    res.json(signups)
  } catch (err) {
    next(err)
  }
})

// GET /api/drops/:id — get a single drop by ID
router.get('/drops/:id', authenticate, async (req, res, next) => {
  try {
    const drop = await db.oneOrNone(
      'SELECT * FROM drops WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )
    if (!drop) return res.status(404).json({ error: 'Drop not found' })
    res.json({ drop })
  } catch (err) {
    next(err)
  }
})

// POST /api/drops — create a drop
router.post('/drops', authenticate, async (req, res, next) => {
  try {
    const {
      name, description, product_url, launch_at, image_url,
      cta_text, hero_subtitle, theme_color, features,
    } = req.body
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now()
    const drop = await db.one(
      `INSERT INTO drops (
         user_id, name, slug, description, product_url, launch_at, image_url, status,
         cta_text, hero_subtitle, theme_color, features, created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,'active',$8,$9,$10,$11,NOW(),NOW()) RETURNING *`,
      [
        req.user.id, name, slug, description, product_url, launch_at, image_url,
        cta_text || 'Join the Waitlist',
        hero_subtitle || null,
        theme_color || '#6d28d9',
        JSON.stringify(features || []),
      ]
    )
    res.status(201).json({ drop })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/drops/:id — update a drop
router.patch('/drops/:id', authenticate, async (req, res, next) => {
  try {
    const drop = await db.oneOrNone(
      'SELECT id FROM drops WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )
    if (!drop) return res.status(404).json({ error: 'Drop not found' })

    const fields = ['name', 'description', 'product_url', 'launch_at', 'image_url',
                    'status', 'cta_text', 'hero_subtitle', 'theme_color', 'features']
    const updates = []
    const values = []
    let i = 1

    for (const field of fields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${i}`)
        values.push(field === 'features' ? JSON.stringify(req.body[field]) : req.body[field])
        i++
      }
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' })

    updates.push(`updated_at = NOW()`)
    values.push(req.params.id, req.user.id)

    const updated = await db.one(
      `UPDATE drops SET ${updates.join(', ')} WHERE id = $${i} AND user_id = $${i + 1} RETURNING *`,
      values
    )
    res.json({ drop: updated })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/drops/:id — delete a drop
router.delete('/drops/:id', authenticate, async (req, res, next) => {
  try {
    const result = await db.result(
      'DELETE FROM drops WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Drop not found' })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// POST /api/drops/:slug/signup — public signup endpoint
router.post('/drops/:slug/signup', async (req, res, next) => {
  try {
    const { email, referral_code, referralCode } = req.body
    const refCode = referral_code || referralCode
    const drop = await db.oneOrNone('SELECT * FROM drops WHERE slug = $1', [req.params.slug])
    if (!drop) return res.status(404).json({ error: 'Drop not found' })

    // Check for referrer
    let referred_by = null
    if (refCode) {
      const referrer = await db.oneOrNone('SELECT id FROM drop_signups WHERE referral_code = $1', [refCode])
      referred_by = referrer?.id || null
    }

    // Check if already signed up
    const existing = await db.oneOrNone(
      'SELECT * FROM drop_signups WHERE drop_id = $1 AND email = $2',
      [drop.id, email]
    )
    if (existing) {
      const position = await db.one(
        'SELECT COUNT(*) FROM drop_signups WHERE drop_id = $1 AND created_at <= $2',
        [drop.id, existing.created_at]
      )
      return res.json({
        success: true,
        position: parseInt(position.count),
        referralCode: existing.referral_code,
        message: 'Already signed up',
      })
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

    const positionRow = await db.one(
      'SELECT COUNT(*) FROM drop_signups WHERE drop_id = $1',
      [drop.id]
    )

    res.status(201).json({
      success: true,
      position: parseInt(positionRow.count),
      referralCode: myCode,
      signup,
    })
  } catch (err) {
    next(err)
  }
})

// GET /api/drops/:slug/public — public drop page data
router.get('/drops/:slug/public', async (req, res, next) => {
  try {
    const drop = await db.oneOrNone(
      `SELECT id, slug, name, description, image_url as "imageUrl",
              launch_at as "launchDate", status, cta_text as "ctaText",
              hero_subtitle as "heroSubtitle", theme_color as "themeColor",
              features
       FROM drops WHERE slug = $1`,
      [req.params.slug]
    )
    if (!drop) return res.status(404).json({ error: 'Drop not found' })

    const countRow = await db.one('SELECT COUNT(*) FROM drop_signups WHERE drop_id = $1', [drop.id])
    drop.totalSignups = parseInt(countRow.count)

    res.json({ drop })
  } catch (err) {
    next(err)
  }
})

// POST /api/drops/:id/announce — send launch announcement emails to all waitlist members
router.post('/drops/:id/announce', authenticate, async (req, res, next) => {
  try {
    const drop = await db.oneOrNone(
      'SELECT * FROM drops WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )
    if (!drop) return res.status(404).json({ error: 'Drop not found' })

    // Get all waitlist signups
    const signups = await db.any(
      "SELECT email FROM drop_signups WHERE drop_id = $1 AND status = 'waiting'",
      [drop.id]
    )

    if (signups.length === 0) {
      return res.json({ success: true, sent: 0, message: 'No subscribers to notify' })
    }

    const appUrl = process.env.APP_URL ?? 'https://dropmagic.com'
    const dropUrl = `${appUrl}/drop/${drop.slug}`

    // Send emails in batches to avoid rate limits
    let sent = 0
    let failed = 0
    const BATCH_SIZE = 50

    for (let i = 0; i < signups.length; i += BATCH_SIZE) {
      const batch = signups.slice(i, i + BATCH_SIZE)
      await Promise.all(
        batch.map(async (s) => {
          try {
            await Email.sendNotificationEmail({
              to: s.email,
              subject: `${drop.name} is live! 🚀`,
              title: `${drop.name} has launched!`,
              body: drop.description || `The wait is over! ${drop.name} is now live and ready for you.`,
              ctaLabel: 'Check it out',
              ctaUrl: drop.product_url || dropUrl,
            })
            sent++
          } catch {
            failed++
          }
        })
      )
    }

    // Update announced_at and mark signups as notified
    await db.none(
      "UPDATE drop_signups SET status = 'notified' WHERE drop_id = $1 AND status = 'waiting'",
      [drop.id]
    )
    await db.none(
      'UPDATE drops SET announced_at = NOW() WHERE id = $1',
      [drop.id]
    )

    res.json({ success: true, sent, failed, total: signups.length })
  } catch (err) {
    next(err)
  }
})

module.exports = router
