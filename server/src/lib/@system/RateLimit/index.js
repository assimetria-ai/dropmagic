// @system — rate limiting middleware for auth endpoints
// Uses express-rate-limit with a Redis-backed store when Redis is available,
// falling back to the default in-memory store for graceful degradation.

const rateLimit = require('express-rate-limit')
const { client: redis, isReady: redisReady } = require('../Redis')
const logger = require('../Logger')

// ── Redis store adapter for express-rate-limit v7 ─────────────────────────
// Implements the Store interface: { increment, decrement, resetKey }

class RedisStore {
  constructor({ prefix, windowMs }) {
    this.prefix = prefix
    this.windowSecs = Math.ceil(windowMs / 1000)
  }

  _key(key) {
    return `${this.prefix}${key}`
  }

  async increment(key) {
    const rKey = this._key(key)
    try {
      // INCR + EXPIRE in a pipeline — atomic enough for rate limiting purposes
      const pipeline = redis.pipeline()
      pipeline.incr(rKey)
      pipeline.ttl(rKey)
      const [[, count], [, ttl]] = await pipeline.exec()

      // Set expiry only on first hit (ttl === -1 means key has no expiry)
      if (ttl === -1) {
        await redis.expire(rKey, this.windowSecs)
      }

      const resetTime = new Date(Date.now() + (ttl === -1 ? this.windowSecs : ttl) * 1000)
      return { totalHits: count, resetTime }
    } catch (err) {
      logger.warn({ err }, 'RateLimit Redis increment failed — skipping')
      // Return a permissive value so the request is not blocked on Redis failure
      return { totalHits: 1, resetTime: new Date(Date.now() + this.windowSecs * 1000) }
    }
  }

  async decrement(key) {
    try {
      await redis.decr(this._key(key))
    } catch {
      // best-effort
    }
  }

  async resetKey(key) {
    try {
      await redis.del(this._key(key))
    } catch {
      // best-effort
    }
  }
}

// ── Factory ────────────────────────────────────────────────────────────────

/**
 * Build a rate limiter middleware.
 *
 * @param {object} opts
 * @param {number}  opts.windowMs   - Time window in ms
 * @param {number}  opts.max        - Max requests per window
 * @param {string}  opts.prefix     - Redis key prefix (must be unique per limiter)
 * @param {string}  [opts.message]  - Error message returned on limit exceeded
 */
function createLimiter({ windowMs, max, prefix, message = 'Too many requests, please try again later.' }) {
  const store = redisReady() ? new RedisStore({ prefix, windowMs }) : undefined

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,   // Return RateLimit-* headers
    legacyHeaders: false,
    message: { message },
    store,                    // undefined → default in-memory store
    // Skip rate limiting ONLY in test environment (not development - security requirement)
    skip: () => process.env.NODE_ENV === 'test',
    handler(req, res, next, options) {
      logger.warn(
        { ip: req.ip, path: req.path, prefix },
        `Rate limit exceeded — ${prefix}`
      )
      res.status(options.statusCode).json(options.message)
    },
  })
}

// ── Named limiters ─────────────────────────────────────────────────────────

/** Login: 10 attempts per 15 minutes */
const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  prefix: 'rl:login:',
  message: 'Too many login attempts. Please try again in 15 minutes.',
})

/** Register: 5 registrations per hour */
const registerLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  prefix: 'rl:register:',
  message: 'Too many accounts created from this IP. Please try again later.',
})

/** Password reset request + reset: 5 per hour */
const passwordResetLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  prefix: 'rl:password-reset:',
  message: 'Too many password reset attempts. Please try again later.',
})

/** Email verification: 10 attempts per hour */
const emailVerificationLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  prefix: 'rl:email-verify:',
  message: 'Too many email verification attempts. Please try again later.',
})

/** General API rate limiter: 100 requests per 15 minutes */
const apiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  prefix: 'rl:api:',
  message: 'Too many requests. Please try again later.',
})

module.exports = { 
  loginLimiter, 
  registerLimiter, 
  passwordResetLimiter, 
  emailVerificationLimiter,
  apiLimiter,
}
