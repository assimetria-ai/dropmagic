const path = require('path')
const fs = require('fs')
const express = require('express')
const compression = require('compression')
const cookieParser = require('cookie-parser')
const pinoHttp = require('pino-http')
const { doubleCsrf } = require('csrf-csrf')

const logger = require('./lib/@system/Logger')
const { cors, securityHeaders } = require('./lib/@system/Middleware')
const systemRoutes = require('./routes/@system')
const customRoutes = require('./routes/@custom')

const app = express()

app.use(securityHeaders)
app.use(cors)
app.use(compression())
app.use(cookieParser())

if (process.env.NODE_ENV !== 'test') {
  app.use(pinoHttp({ logger }))
}

// Mount Stripe webhook BEFORE express.json() — requires raw body for signature verification
const stripeWebhookRouter = require('./api/@system/stripe-webhook')
app.use('/api', stripeWebhookRouter)

// Parse JSON for all other routes
app.use(express.json({ limit: '10mb' }))

// CSRF Protection — double-submit cookie pattern
const csrfSecret = process.env.CSRF_SECRET || 'default-csrf-secret-change-in-production'
const { generateToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => csrfSecret,
  cookieName: '__Host-csrf.token',
  cookieOptions: {
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getTokenFromRequest: (req) => req.headers['x-csrf-token'],
})

// CSRF token generation endpoint (must be called before making state-changing requests)
app.get('/api/csrf-token', (req, res) => {
  const token = generateToken(req, res)
  res.json({ csrfToken: token })
})

// Apply CSRF protection to all routes except webhooks
// Webhooks already use signature verification (e.g., Stripe webhook signatures)
app.use((req, res, next) => {
  // Skip CSRF for webhook endpoints (they use their own verification)
  if (req.path.startsWith('/api/webhook')) {
    return next()
  }
  // Apply CSRF protection to state-changing methods
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return doubleCsrfProtection(req, res, next)
  }
  next()
})

// Local file uploads — serve before API routes so /uploads/* resolves correctly
const localUploadsDir = process.env.LOCAL_STORAGE_DIR ?? path.join(__dirname, '..', 'uploads')
app.use('/uploads', express.static(localUploadsDir))

// Routes
app.use('/api', systemRoutes)
app.use('/api', customRoutes)

// Serve React SPA in production
const publicDir = path.join(__dirname, '..', 'public')
if (process.env.NODE_ENV === 'production' && fs.existsSync(publicDir)) {
  app.use(express.static(publicDir))
  app.get('*', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'))
  })
} else {
  // 404 (dev/test — client runs separately)
  app.use((req, res) => {
    res.status(404).json({ message: 'Not found' })
  })
}

// Error handler
app.use((err, req, res, _next) => {
  logger.error({ err, req: { method: req.method, url: req.url } }, err.message ?? 'Internal server error')

  // Stripe SDK errors have a `type` field (e.g. StripeCardError, StripeInvalidRequestError).
  // Never expose raw Stripe messages to clients — they contain internal details such as
  // price/customer IDs, live-vs-test mode hints, and API key hints.
  if (err.type && err.type.startsWith('Stripe')) {
    const status = err.statusCode ?? 400

    // Card errors carry a user-safe decline message (e.g. "Your card has insufficient funds.")
    if (err.type === 'StripeCardError') {
      return res.status(status).json({ message: err.message ?? 'Your card was declined. Please check your payment details.' })
    }

    // Authentication errors mean a misconfigured API key — generic message for users
    if (err.type === 'StripeAuthenticationError') {
      return res.status(500).json({ message: 'Payment service is temporarily unavailable. Please try again later.' })
    }

    // Rate limit — tell the user to slow down
    if (err.type === 'StripeRateLimitError') {
      return res.status(429).json({ message: 'Too many requests. Please wait a moment and try again.' })
    }

    // All other Stripe errors (StripeInvalidRequestError, StripeAPIError, StripeConnectionError, etc.)
    return res.status(status >= 400 && status < 600 ? status : 400).json({
      message: 'Something went wrong with the payment service. Please try again or contact support.',
    })
  }

  const status = err.status ?? err.statusCode ?? 500
  res.status(status).json({ message: err.message ?? 'Internal server error' })
})

module.exports = app
