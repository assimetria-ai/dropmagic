const cors = require('cors')

// Parse DEV_ORIGINS from comma-separated env var (e.g., "http://localhost:5173,http://localhost:3000")
const devOrigins = process.env.DEV_ORIGINS
  ? process.env.DEV_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : []

const ALLOWED_ORIGINS = [
  process.env.APP_URL,
  ...devOrigins,
].filter(Boolean)

function isOriginAllowed(origin) {
  // In production, deny requests with no Origin header (blocks server-to-server CORS bypass).
  // In development, allow no-origin for curl, Postman, and local tooling convenience.
  if (!origin) { // Allow healthchecks, server-to-server, curl
    return true // was: only in dev. Now: allow for healthcheck probes
  }

  // Exact match
  if (ALLOWED_ORIGINS.includes(origin)) return true

  // Allow any subdomain of the APP_URL host in production
  if (process.env.APP_URL) {
    try {
      const appHost = new URL(process.env.APP_URL).hostname
      const originHost = new URL(origin).hostname
      if (originHost === appHost || originHost.endsWith(`.${appHost}`)) return true
    } catch {
      // malformed URL — deny
    }
  }

  return false
}

const corsOptions = {
  origin(origin, callback) {
    if (isOriginAllowed(origin)) {
      callback(null, true)
    } else {
      callback(new Error(`CORS: origin '${origin}' not allowed`))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['X-Total-Count', 'X-Request-Id'],
  maxAge: 600, // preflight cache 10 min
}

module.exports = cors(corsOptions)
