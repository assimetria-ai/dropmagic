// @system — GDPR Article 15: Right to Access (User Data Export)
// GET /api/user-data/:userId — export all personal data for a user
const express = require('express')
const router = express.Router()
const { authenticate } = require('../../../lib/@system/Helpers/auth')
const db = require('../../../lib/@system/PostgreSQL')
const logger = require('../../../lib/@system/Logger')

// GET /api/user-data/:userId
// Returns a comprehensive export of all user data across the system.
// Only the user themselves or an admin can request the export.
router.get('/user-data/:userId', authenticate, async (req, res, next) => {
  try {
    const requestedUserId = parseInt(req.params.userId, 10)
    if (isNaN(requestedUserId)) {
      return res.status(400).json({ message: 'Invalid user ID' })
    }

    const requestingUserId = req.user?.id
    const isAdmin = req.user?.role === 'admin'

    // Authorization: user can only access their own data unless they're an admin
    if (requestingUserId !== requestedUserId && !isAdmin) {
      return res.status(403).json({ message: 'You can only export your own data' })
    }

    // Check if user exists
    const user = await db.oneOrNone(
      `SELECT id, email, name, role, stripe_customer_id, created_at, updated_at
       FROM users WHERE id = $1`,
      [requestedUserId]
    )
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Gather all user-related data
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        userId: user.id,
        dataProtectionNotice: 'This export contains all personal data we hold about you under GDPR Article 15.',
      },
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        stripeCustomerId: user.stripe_customer_id,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    }

    // Include sessions
    const sessions = await db.manyOrNone(
      `SELECT id, user_id, expires_at, created_at
       FROM sessions
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [requestedUserId]
    )
    exportData.sessions = sessions || []

    // Include refresh tokens
    const refreshTokens = await db.manyOrNone(
      `SELECT id, user_id, expires_at, created_at
       FROM refresh_tokens
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [requestedUserId]
    )
    exportData.refreshTokens = refreshTokens || []

    // Include subscriptions
    const subscriptions = await db.manyOrNone(
      `SELECT id, user_id, stripe_subscription_id, stripe_customer_id, 
              stripe_price_id, status, current_period_start, current_period_end, 
              cancel_at_period_end, created_at, updated_at
       FROM subscriptions
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [requestedUserId]
    )
    exportData.subscriptions = subscriptions || []

    // Include audit logs if table exists
    try {
      const auditLogs = await db.manyOrNone(
        `SELECT id, user_id, action, resource_type, resource_id, metadata, 
                ip_address, user_agent, created_at
         FROM audit_logs
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 1000`,
        [requestedUserId]
      )
      exportData.auditLogs = auditLogs || []
    } catch (e) {
      // Table might not exist, skip
      logger.debug({ err: e }, 'audit_logs table not found or error querying')
    }

    // Include collaborators
    try {
      const collaborators = await db.manyOrNone(
        `SELECT id, user_id, entity_type, entity_id, role, 
                invited_by, created_at, updated_at
         FROM collaborators
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [requestedUserId]
      )
      exportData.collaborators = collaborators || []
    } catch (e) {
      logger.debug({ err: e }, 'collaborators table not found or error querying')
    }

    // Include file uploads
    try {
      const fileUploads = await db.manyOrNone(
        `SELECT id, user_id, filename, file_path, file_size, mime_type, 
                created_at
         FROM file_uploads
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [requestedUserId]
      )
      exportData.fileUploads = fileUploads || []
    } catch (e) {
      logger.debug({ err: e }, 'file_uploads table not found or error querying')
    }

    // Include email logs
    try {
      const emailLogs = await db.manyOrNone(
        `SELECT id, user_id, email_type, recipient, subject, 
                status, sent_at, created_at
         FROM email_logs
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 500`,
        [requestedUserId]
      )
      exportData.emailLogs = emailLogs || []
    } catch (e) {
      logger.debug({ err: e }, 'email_logs table not found or error querying')
    }

    // Include drops (product-specific)
    try {
      const drops = await db.manyOrNone(
        `SELECT id, user_id, title, description, file_path, file_size, 
                mime_type, is_public, views, downloads, created_at, updated_at
         FROM drops
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [requestedUserId]
      )
      exportData.drops = drops || []
    } catch (e) {
      logger.debug({ err: e }, 'drops table not found or error querying')
    }

    // Include blog posts if user has written any
    try {
      const blogPosts = await db.manyOrNone(
        `SELECT id, author_id, title, slug, content, status, 
                published_at, created_at, updated_at
         FROM blog_posts
         WHERE author_id = $1
         ORDER BY created_at DESC`,
        [requestedUserId]
      )
      exportData.blogPosts = blogPosts || []
    } catch (e) {
      logger.debug({ err: e }, 'blog_posts table not found or error querying')
    }

    // Set appropriate headers for export
    res.setHeader('Content-Type', 'application/json')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="user-data-export-${requestedUserId}-${Date.now()}.json"`
    )

    logger.info({ userId: requestedUserId, requestedBy: requestingUserId }, 'user data export completed')
    res.json(exportData)
  } catch (err) {
    next(err)
  }
})

module.exports = router
