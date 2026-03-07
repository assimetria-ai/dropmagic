require('dotenv').config()

// ── Run DB migrations before anything else (Railway startCommand fix) ────────
;(function runMigrationsSync() {
  const { execSync } = require('child_process')
  const path = require('path')
  const runJs = path.join(__dirname, 'db/migrations/@system/run.js')
  const log = (msg) => console.log(`[startup][${new Date().toISOString()}] ${msg}`)
  try {
    log('Running DB migrations...')
    execSync(`node "${runJs}"`, { stdio: 'inherit' })
    log('Migrations done.')
  } catch (e) {
    log(`Migrations failed (${e.message}) — clearing schema_migrations and retrying`)
    try {
      const { Client } = require('pg')
      const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
      // sync drop via spawnSync
      const { spawnSync } = require('child_process')
      spawnSync('node', ['-e', `
        const {Client}=require('pg');
        const c=new Client({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}});
        c.connect().then(()=>c.query('DROP TABLE IF EXISTS schema_migrations')).then(()=>c.end()).catch(e=>{console.error(e);process.exit(1)});
      `], { stdio: 'inherit', env: process.env })
    } catch (_) {}
    execSync(`node "${runJs}"`, { stdio: 'inherit' })
    log('Migrations done after recovery.')
  }
})()

require('./lib/@system/Env') // validate env vars — exits with a clear error if required vars are missing
const app = require('./app')
const logger = require('./lib/@system/Logger')
const { connect: connectRedis } = require('./lib/@system/Redis')
const { connectPool: connectPostgres, disconnectPool: disconnectPostgres } = require('./lib/@system/PostgreSQL')
const { scheduler } = require('./scheduler/tasks/@system')

const PORT = process.env.PORT ?? 4000

// ── Enhanced Crash Guard (task #9384) ─────────────────────────────────────
// Captures unhandled promise rejections with full diagnostic information
// to help identify root causes of connection errors and other async failures
process.on('unhandledRejection', (reason, promise) => {
  // Safely extract promise info (task #9385: fix "invalid input" errors)
  let promiseStr = '[unable to stringify promise]'
  try {
    if (promise && typeof promise.toString === 'function') {
      promiseStr = promise.toString().substring(0, 200)
    }
  } catch (_) {
    // Ignore errors from promise.toString()
  }

  const errorDetails = {
    timestamp: new Date().toISOString(),
    message: reason?.message || String(reason),
    name: reason?.name,
    code: reason?.code,        // DB error codes (ECONNRESET, etc.)
    errno: reason?.errno,      // System error numbers
    syscall: reason?.syscall,  // System call that failed
    address: reason?.address,  // Network address (for connection errors)
    port: reason?.port,        // Network port
    stack: reason?.stack,      // Full stack trace
    promise: promiseStr
  }
  
  try {
    console.error('[CRASH-GUARD] unhandledRejection (NOT crashing):', JSON.stringify(errorDetails, null, 2))
  } catch (stringifyError) {
    // Fallback if JSON.stringify fails (circular refs, etc.)
    console.error('[CRASH-GUARD] unhandledRejection (NOT crashing):', errorDetails.message || 'unknown error')
    console.error('[CRASH-GUARD] JSON.stringify failed:', stringifyError.message)
  }
})

async function start() {
  await connectPostgres()
  await connectRedis()

  // ── Scheduler ──────────────────────────────────────────────────────────
  await scheduler.init()

  const server = app.listen(PORT, () => {
    logger.info({ port: PORT, env: process.env.NODE_ENV ?? 'development' }, 'server started')
  })

  // ── Graceful shutdown ──────────────────────────────────────────────────
  async function shutdown(signal) {
    logger.info({ signal }, 'shutdown signal received')
    server.close(async () => {
      await disconnectPostgres()
      logger.info('shutdown complete')
      process.exit(0)
    })
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

start()
