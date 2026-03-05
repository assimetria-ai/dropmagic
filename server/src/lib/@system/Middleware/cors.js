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
  // SECURITY: Always require an Origin header to prevent CORS bypass attacks.
  // Requests without Origin (curl, server-to-server) are blocked in all environments.
  // Legitimate server-to-server requests don't need CORS (they don't send credentials).
  // For local development testing, use a proper origin header or use the API without credentials.
  if (!origin) {
    return false
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
