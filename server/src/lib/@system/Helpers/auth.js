const crypto = require('crypto')
const { verifyTokenAsync } = require('./jwt')
const UserRepo = require('../../../db/repos/@system/UserRepo')
const ApiKeyRepo = require('../../../db/repos/@system/ApiKeyRepo')
const SessionRepo = require('../../../db/repos/@system/SessionRepo')

/**
 * Reads the access token from:
 *   1. `access_token` cookie (new name)
 *   2. `token` cookie (legacy name, backward-compatible)
 *   3. Authorization: Bearer <token> header
 */
function extractAccessToken(req) {
  return (
    req.cookies?.access_token ??
    req.cookies?.token ??
    req.headers.authorization?.replace('Bearer ', '')
  )
}

/**
 * Check if a user has any active (non-revoked, non-expired) sessions.
 * Used as a basic revocation check for JWT access tokens.
 * Returns true if user has at least one active session, false otherwise.
 * 
 * Note: JWTs are stateless and can't be individually revoked. This check
 * ensures that if ALL sessions are revoked, the JWT is rejected even if
 * it hasn't expired yet. Individual session revocation doesn't affect
 * existing JWTs (they expire in 15min by default).
 */
async function hasActiveSessions(userId) {
  try {
    const sessions = await SessionRepo.findActiveByUserId(userId)
    return sessions && sessions.length > 0
  } catch (err) {
    console.error('[auth/hasActiveSessions] DB check failed, failing open to prevent lockout:', {
      userId,
      errorCode: err.code,
      errorMessage: err.message,
      hint: 'JWT expiry is still enforced'
    })
    // On DB error, allow the request (fail open) to prevent lockout during outages
    // The JWT expiry is still enforced, providing some security
    return true
  }
}

function hashKey(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

async function authenticate(req, res, next) {
  try {
    const rawToken = extractAccessToken(req)
    if (!rawToken) return res.status(401).json({ message: 'Unauthorized' })

    // API key path: tokens starting with "sk_"
    if (rawToken.startsWith('sk_')) {
      const keyHash = hashKey(rawToken)
      const apiKey = await ApiKeyRepo.findByHash(keyHash)
      if (!apiKey) return res.status(401).json({ message: 'Unauthorized' })
      if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
        return res.status(401).json({ message: 'API key expired' })
      }
      const user = await UserRepo.findById(apiKey.user_id)
      if (!user) return res.status(401).json({ message: 'Unauthorized' })
      // Check if user account is active (account lockout protection)
      if (user.is_active === false) {
        return res.status(401).json({ message: 'Account is locked or deactivated' })
      }
      // Fire-and-forget last_used update
      ApiKeyRepo.touchLastUsed(apiKey.id).catch(() => {})
      req.user = { id: user.id, email: user.email, name: user.name, role: user.role, emailVerified: !!user.email_verified_at, onboardingCompleted: !!user.onboarding_completed }
      req.apiKey = { id: apiKey.id, name: apiKey.name }
      return next()
    }

    // Session JWT path
    const payload = await verifyTokenAsync(rawToken)
    const user = await UserRepo.findById(payload.userId)
    if (!user) return res.status(401).json({ message: 'Unauthorized' })
    // Check if user account is active (account lockout protection)
    if (user.is_active === false) {
      return res.status(401).json({ message: 'Account is locked or deactivated' })
    }
    // Check if user has any active sessions (revocation check)
    // Note: This only rejects if ALL sessions are revoked. Individual session
    // revocation doesn't affect existing JWTs until they expire.
    const hasActive = await hasActiveSessions(user.id)
    if (!hasActive) {
      return res.status(401).json({ message: 'All sessions have been revoked' })
    }
    req.user = { id: user.id, email: user.email, name: user.name, role: user.role, emailVerified: !!user.email_verified_at, onboardingCompleted: !!user.onboarding_completed }
    next()
  } catch (err) {
    res.status(401).json({ message: 'Unauthorized' })
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Forbidden' })
  next()
}

module.exports = { authenticate, requireAdmin, extractAccessToken }
