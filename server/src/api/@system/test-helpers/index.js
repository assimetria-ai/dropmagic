/**
 * @system — test helper endpoints
 * POST /api/register — simplified registration endpoint for testing (combines user creation + login)
 * 
 * NOTE: This endpoint is only meant for test environments and should NOT be used in production.
 * It bypasses email verification and immediately returns an access token.
 */
const express = require('express')
const router = express.Router()
const bcrypt = require('bcryptjs')
const { validatePassword } = require('../../../lib/@system/Helpers/password-validator')
const UserRepo = require('../../../db/repos/@system/UserRepo')
const { signAccessTokenAsync } = require('../../../lib/@system/Helpers/jwt')

// POST /api/register — test-only endpoint that combines registration + immediate login
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body
    
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' })
    }
    
    const pwCheck = validatePassword(password)
    if (!pwCheck.valid) {
      return res.status(400).json({ error: pwCheck.message })
    }

    const existing = await UserRepo.findByEmail(email)
    if (existing) {
      return res.status(409).json({ error: 'Email already in use' })
    }

    const password_hash = await bcrypt.hash(password, 12)
    const user = await UserRepo.create({ email, name, password_hash })

    // Generate access token immediately (skip email verification for testing)
    const token = await signAccessTokenAsync({ userId: user.id, email: user.email })

    res.status(201).json({ 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name 
      },
      token
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
