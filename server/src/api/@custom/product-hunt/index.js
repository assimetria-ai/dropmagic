const express = require('express')
const router = express.Router()
const https = require('https')
const { authenticate } = require('../../../lib/@system/Helpers/auth')
const db = require('../../../lib/@system/PostgreSQL')

// POST /api/drops/:id/product-hunt — post launch to Product Hunt
// Body: { tagline, topics[], token, thumbnailUrl? }
router.post('/drops/:id/product-hunt', authenticate, async (req, res, next) => {
  try {
    const drop = await db.oneOrNone(
      'SELECT * FROM drops WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )
    if (!drop) return res.status(404).json({ error: 'Drop not found' })

    const { tagline, topics = [], token, thumbnailUrl } = req.body

    if (!tagline?.trim()) return res.status(400).json({ error: 'tagline is required' })
    if (!token?.trim()) return res.status(400).json({ error: 'Product Hunt token is required' })

    const appUrl = process.env.APP_URL ?? 'https://dropmagic.com'
    const dropUrl = `${appUrl}/drop/${drop.slug}`
    const productUrl = drop.product_url || dropUrl

    // Build GraphQL mutation
    const mutation = `
      mutation CreatePost($input: PostCreateInput!) {
        postCreate(input: $input) {
          post {
            id
            slug
            url
          }
          errors {
            field
            messages
          }
        }
      }
    `

    const variables = {
      input: {
        name: drop.name,
        tagline: tagline.trim(),
        url: productUrl,
        description: drop.description || undefined,
        topics: topics.filter(Boolean),
        thumbnailImageUuid: thumbnailUrl || (drop.image_url || undefined),
      },
    }

    // Make request to Product Hunt GraphQL API
    const result = await new Promise((resolve, reject) => {
      const body = JSON.stringify({ query: mutation, variables })
      const options = {
        hostname: 'api.producthunt.com',
        path: '/v2/api/graphql',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token.trim()}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      }

      const req = https.request(options, (r) => {
        let data = ''
        r.on('data', (chunk) => { data += chunk })
        r.on('end', () => {
          try { resolve({ status: r.statusCode, body: JSON.parse(data) }) }
          catch { reject(new Error('Invalid JSON from Product Hunt API')) }
        })
      })

      req.on('error', reject)
      req.write(body)
      req.end()
    })

    const { status, body: phBody } = result

    if (status !== 200) {
      return res.status(502).json({ error: `Product Hunt API returned ${status}` })
    }

    const { postCreate } = phBody?.data ?? {}
    if (postCreate?.errors?.length) {
      const msgs = postCreate.errors.map((e) => `${e.field}: ${e.messages.join(', ')}`).join('; ')
      return res.status(422).json({ error: msgs })
    }

    const post = postCreate?.post
    if (!post) {
      return res.status(502).json({ error: 'No post returned from Product Hunt API' })
    }

    res.json({
      success: true,
      name: drop.name,
      url: post.url || `https://www.producthunt.com/posts/${post.slug}`,
      id: post.id,
      slug: post.slug,
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
