const helmet = require('helmet')

/**
 * Security headers middleware built on helmet.
 *
 * Helmet sets sensible defaults for:
 *  - Content-Security-Policy (CSP) — prevents XSS and injection attacks
 *  - Strict-Transport-Security (HSTS) — enforces HTTPS
 *  - X-Frame-Options — prevents clickjacking
 *  - X-Content-Type-Options — prevents MIME sniffing
 *  - Referrer-Policy — controls referrer information leakage
 *  - Permissions-Policy — restricts browser features
 *  - Cross-Origin-* policies — controls cross-origin resource sharing
 */
const securityHeaders = helmet({
  // Content-Security-Policy — defense against XSS and injection attacks
  contentSecurityPolicy: {
    directives: {
      // Default fallback for all resource types
      defaultSrc: ["'self'"],

      // Scripts: allow same-origin and Chatbase integration
      scriptSrc: [
        "'self'",
        'https://www.chatbase.co', // Chatbase chatbot widget
      ],

      // Styles: allow same-origin and inline styles (required for React/Tailwind)
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for React apps with CSS-in-JS and Tailwind
      ],

      // Images: allow same-origin, data URIs, and HTTPS images
      imgSrc: [
        "'self'",
        'data:', // Allow data: URIs for inline images
        'https:', // Allow HTTPS images (e.g., user uploads from CDN, social previews)
      ],

      // AJAX/WebSocket/EventSource connections
      connectSrc: [
        "'self'",
        'https://www.chatbase.co', // Chatbase API calls from widget
      ],

      // Fonts: allow same-origin, HTTPS, and data URIs
      fontSrc: [
        "'self'",
        'https:', // Web fonts from CDNs
        'data:', // Data URI fonts
      ],

      // Plugins (Flash, Java, etc.): block all
      objectSrc: ["'none'"],

      // Media (audio/video): allow same-origin only
      mediaSrc: ["'self'"],

      // Iframes: allow same-origin and Chatbase iframe
      frameSrc: [
        "'self'",
        'https://www.chatbase.co', // Chatbase chatbot iframe preview
      ],

      // Base URI: restrict to same-origin to prevent base tag injection
      baseUri: ["'self'"],

      // Form actions: restrict to same-origin to prevent form hijacking
      formAction: ["'self'"],

      // Frame ancestors: prevent embedding in other sites (clickjacking protection)
      frameAncestors: ["'none'"],

      // Upgrade insecure requests in production (HTTP → HTTPS)
      ...(process.env.NODE_ENV === 'production' && {
        upgradeInsecureRequests: [],
      }),

      // CSP violation reporting endpoint
      reportUri: '/api/csp-report',
    },
    // Report-only mode for testing (disable in production after validation)
    // reportOnly: process.env.CSP_REPORT_ONLY === 'true',
  },

  // Strict-Transport-Security (HSTS) — enforce HTTPS in production
  hsts: process.env.NODE_ENV === 'production'
    ? {
        maxAge: 31536000,        // 1 year in seconds
        includeSubDomains: true, // Apply to all subdomains
        preload: true,           // Allow submission to HSTS preload list
      }
    : false,

  // X-Frame-Options — prevent clickjacking (backup for CSP frame-ancestors)
  frameguard: { action: 'deny' },

  // X-Content-Type-Options — prevent MIME sniffing
  noSniff: true,

  // Referrer-Policy — control referrer information leakage
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

  // X-Permitted-Cross-Domain-Policies — block Adobe Flash/PDF cross-domain requests
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },

  // Disable X-Powered-By header (hides Express framework version)
  hidePoweredBy: true,

  // Cross-Origin-Embedder-Policy — isolate cross-origin resources
  // Set to false unless you need SharedArrayBuffer or high-precision timers
  crossOriginEmbedderPolicy: false,

  // Cross-Origin-Opener-Policy — isolate browsing context
  crossOriginOpenerPolicy: { policy: 'same-origin' },

  // Cross-Origin-Resource-Policy — prevent cross-origin resource loading
  crossOriginResourcePolicy: { policy: 'same-site' },
})

module.exports = securityHeaders
