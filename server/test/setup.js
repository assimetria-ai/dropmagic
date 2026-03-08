/**
 * Global test setup - loads environment variables before any module imports
 * 
 * This file runs before all tests to ensure .env is loaded properly.
 * Without this, JWT and other modules that check process.env at load time
 * will fail with missing environment variable warnings.
 */

// Set NODE_ENV to test BEFORE loading .env so it can be overridden
process.env.NODE_ENV = 'test'

require('dotenv').config()

// Disable Redis for tests - individual test files mock it as needed
// This prevents connection attempts to localhost:6379
delete process.env.REDIS_URL
