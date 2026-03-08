# QA Strategy — DropMagic

> Quality assurance and testing strategy for DropMagic product launch pages

---

## Table of Contents

1. [Overview](#overview)
2. [Testing Pyramid](#testing-pyramid)
3. [Critical Path Testing](#critical-path-testing)
4. [Unit Testing](#unit-testing)
5. [Integration Testing](#integration-testing)
6. [E2E Testing](#e2e-testing)
7. [Manual Testing Checklist](#manual-testing-checklist)
8. [Performance Testing](#performance-testing)
9. [Cross-Browser Testing](#cross-browser-testing)
10. [Bug Tracking](#bug-tracking)

---

## Overview

DropMagic is a product launch page builder with countdown timers, email capture, and viral share mechanics. Built with React (Vite) + Node.js/Express + PostgreSQL.

### Testing Goals

1. **Launch Page Reliability** — Pages must load and display correctly
2. **Email Capture** — Zero lost signups
3. **Countdown Accuracy** — Timers must be precise
4. **Share Mechanics** — Viral loops must work
5. **Performance** — Fast page loads (< 2s)

---

## Testing Pyramid

```
         /\
        /  \
       / E2E \        5%  — End-to-end (Playwright)
      /--------\
     /          \
    / Integration \   15% — API integration (Supertest)
   /--------------\
  /                \
 /   Unit Tests     \ 80% — Unit tests (Jest)
/____________________\
```

---

## Critical Path Testing

The **critical path** (features that must never break):

1. ✅ **Landing page loads** — Public page accessible
2. ✅ **Countdown timer displays** — Shows time until launch
3. ✅ **Email capture works** — User can submit email
4. ✅ **Email validation** — Invalid emails rejected
5. ✅ **Duplicate prevention** — Same email can't register twice
6. ✅ **Share link generation** — Unique referral links created
7. ✅ **Referral tracking** — Signups attributed to referrer
8. ✅ **Admin dashboard** — View signups and analytics
9. ✅ **Launch countdown reaches zero** — Page updates at launch time
10. ✅ **Post-launch redirect** — Page shows product after launch

---

## Unit Testing

### Framework

- **Jest** — Test runner
- **React Testing Library** — Component testing

### Scope

**Frontend (`client/src/test/unit/`):**

- Countdown timer logic
- Email validation
- Share link formatting
- Date/time utilities
- React components (Button, Input, CountdownDisplay)

**Backend (`server/test/unit/`):**

- Email validation functions
- Referral code generation
- Signup deduplication logic
- Database query helpers

### Example: Countdown Timer Unit Test

```jsx
// client/src/test/unit/components/CountdownTimer.test.jsx
import { render, screen } from '@testing-library/react'
import { CountdownTimer } from '../../../app/components/@custom/CountdownTimer'

describe('CountdownTimer', () => {
  test('displays days, hours, minutes, seconds', () => {
    const launchDate = new Date(Date.now() + 86400000) // 1 day from now
    render(<CountdownTimer launchDate={launchDate} />)
    
    expect(screen.getByTestId('countdown-days')).toBeInTheDocument()
    expect(screen.getByTestId('countdown-hours')).toBeInTheDocument()
    expect(screen.getByTestId('countdown-minutes')).toBeInTheDocument()
    expect(screen.getByTestId('countdown-seconds')).toBeInTheDocument()
  })

  test('shows "Launched!" when countdown reaches zero', () => {
    const launchDate = new Date(Date.now() - 1000) // 1 second ago
    render(<CountdownTimer launchDate={launchDate} />)
    
    expect(screen.getByText(/Launched!/i)).toBeInTheDocument()
  })
})
```

### Example: Email Validation Unit Test

```js
// server/test/unit/lib/validation.test.js
const { validateEmail } = require('../../../src/lib/@system/validation')

describe('Email Validation', () => {
  test('accepts valid email', () => {
    expect(validateEmail('user@example.com')).toBe(true)
  })

  test('rejects invalid email', () => {
    expect(validateEmail('notanemail')).toBe(false)
    expect(validateEmail('@example.com')).toBe(false)
    expect(validateEmail('user@')).toBe(false)
  })

  test('rejects emails with spaces', () => {
    expect(validateEmail('user @example.com')).toBe(false)
  })
})
```

### Running Unit Tests

```bash
# Frontend
cd client
npm run test

# Backend
cd server
npm test -- --testPathPattern=test/unit
```

---

## Integration Testing

### Framework

- **Supertest** — HTTP assertions
- **Jest** — Test runner

### Scope

Integration tests verify **API endpoints with real database**:

- Email signup endpoint
- Duplicate email handling
- Referral tracking
- Admin analytics endpoints
- Share link generation

### Example: Email Signup Integration Test

```js
// server/test/api/signups.test.js
const request = require('supertest')
const { createApp } = require('../../src/app')
const { db } = require('../../src/lib/@system/db')

describe('POST /api/signups', () => {
  let app

  beforeAll(() => {
    app = createApp()
  })

  beforeEach(async () => {
    await db.none('DELETE FROM signups')
  })

  test('creates signup with valid email', async () => {
    const res = await request(app)
      .post('/api/signups')
      .send({ email: 'user@example.com' })

    expect(res.status).toBe(201)
    expect(res.body.email).toBe('user@example.com')
    expect(res.body.referral_code).toBeDefined()
  })

  test('rejects duplicate email', async () => {
    await request(app)
      .post('/api/signups')
      .send({ email: 'user@example.com' })

    const res = await request(app)
      .post('/api/signups')
      .send({ email: 'user@example.com' })

    expect(res.status).toBe(409) // Conflict
  })

  test('tracks referrer when referral code provided', async () => {
    // First signup
    const first = await request(app)
      .post('/api/signups')
      .send({ email: 'referrer@example.com' })

    // Second signup with referral code
    const res = await request(app)
      .post('/api/signups')
      .send({ 
        email: 'referred@example.com',
        referral_code: first.body.referral_code
      })

    expect(res.status).toBe(201)
    expect(res.body.referred_by).toBe(first.body.id)
  })
})
```

### Running Integration Tests

```bash
cd server

# Set test database
export DATABASE_URL=postgresql://user:pass@localhost:5432/dropmagic_test

# Run tests
npm test -- --testPathPattern=test/api
```

---

## E2E Testing

### Framework

- **Playwright** — Cross-browser automation

### Scope

E2E tests simulate **real user journeys**:

- Landing page loads with countdown
- User submits email
- Share link displayed after signup
- Referral tracking works
- Admin dashboard displays signups

### Test Suites

**1. Landing Page (`e2e/@custom/01-landing-page.spec.ts`)**

```ts
import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test('page loads successfully', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/DropMagic/)
    await expect(page.locator('body')).toBeVisible()
  })

  test('countdown timer displays', async ({ page }) => {
    await page.goto('/')
    
    // Check countdown elements exist
    await expect(page.locator('[data-testid="countdown-days"]')).toBeVisible()
    await expect(page.locator('[data-testid="countdown-hours"]')).toBeVisible()
    await expect(page.locator('[data-testid="countdown-minutes"]')).toBeVisible()
    await expect(page.locator('[data-testid="countdown-seconds"]')).toBeVisible()
  })

  test('email input is visible', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('[name="email"]')).toBeVisible()
  })
})
```

**2. Email Signup Flow (`e2e/@custom/02-signup.spec.ts`)**

```ts
import { test, expect } from '@playwright/test'

test.describe('Email Signup', () => {
  test('user can submit email', async ({ page }) => {
    await page.goto('/')
    
    const email = `test${Date.now()}@example.com`
    await page.fill('[name="email"]', email)
    await page.click('button[type="submit"]')
    
    // Should show success message
    await expect(page.locator('text=/Thanks for signing up|Success/')).toBeVisible()
  })

  test('shows share link after signup', async ({ page }) => {
    await page.goto('/')
    
    const email = `test${Date.now()}@example.com`
    await page.fill('[name="email"]', email)
    await page.click('button[type="submit"]')
    
    // Should display referral link
    await expect(page.locator('[data-testid="referral-link"]')).toBeVisible()
  })

  test('rejects invalid email', async ({ page }) => {
    await page.goto('/')
    
    await page.fill('[name="email"]', 'notanemail')
    await page.click('button[type="submit"]')
    
    // Should show error
    await expect(page.locator('text=/Invalid email|Please enter/')).toBeVisible()
  })

  test('rejects duplicate email', async ({ page }) => {
    await page.goto('/')
    
    const email = 'duplicate@example.com'
    
    // First submission
    await page.fill('[name="email"]', email)
    await page.click('button[type="submit"]')
    await expect(page.locator('text=/Thanks for signing up/')).toBeVisible()
    
    // Reload page and try again
    await page.goto('/')
    await page.fill('[name="email"]', email)
    await page.click('button[type="submit"]')
    
    // Should show already registered message
    await expect(page.locator('text=/already registered|already signed up/')).toBeVisible()
  })
})
```

**3. Referral Tracking (`e2e/@custom/03-referrals.spec.ts`)**

```ts
import { test, expect } from '@playwright/test'

test.describe('Referral Tracking', () => {
  test('referral code in URL attributes signup', async ({ page }) => {
    // First user signs up
    await page.goto('/')
    const email1 = `referrer${Date.now()}@example.com`
    await page.fill('[name="email"]', email1)
    await page.click('button[type="submit"]')
    
    // Get referral link
    const referralLink = await page.locator('[data-testid="referral-link"]').textContent()
    const url = new URL(referralLink)
    const referralCode = url.searchParams.get('ref')
    
    expect(referralCode).toBeTruthy()
    
    // Second user visits with referral code
    await page.goto(`/?ref=${referralCode}`)
    const email2 = `referred${Date.now()}@example.com`
    await page.fill('[name="email"]', email2)
    await page.click('button[type="submit"]')
    
    // Should show success
    await expect(page.locator('text=/Thanks for signing up/')).toBeVisible()
  })
})
```

### Running E2E Tests

```bash
# Start dev servers first
cd server && npm run dev &
cd client && npm run dev &

# Run tests
npm run test:e2e

# With browser UI
npm run test:e2e:ui
```

---

## Manual Testing Checklist

Before releasing a DropMagic update, manually verify:

### Landing Page

- [ ] Page loads without errors
- [ ] Countdown timer displays correctly
- [ ] Countdown updates every second
- [ ] Design is responsive (mobile, tablet, desktop)
- [ ] Images load correctly
- [ ] Copy/text is readable

### Email Signup

- [ ] Email input accepts valid emails
- [ ] Invalid emails show error
- [ ] Submit button works
- [ ] Success message displays after signup
- [ ] Duplicate emails show appropriate message
- [ ] Email stored in database

### Share Mechanics

- [ ] Referral link displayed after signup
- [ ] Referral link is unique per user
- [ ] Copy button copies link to clipboard
- [ ] Clicking referral link loads page with ref parameter
- [ ] Signups via referral link are attributed correctly

### Countdown Timer

- [ ] Timer shows correct days/hours/minutes/seconds
- [ ] Timer updates in real-time
- [ ] Timer shows "Launched!" when time reaches zero
- [ ] Post-launch content displays correctly

### Admin Dashboard

- [ ] Admin can view total signups
- [ ] Signup list displays correctly
- [ ] Referral metrics shown
- [ ] Export functionality works
- [ ] Charts/graphs render correctly

---

## Performance Testing

### Goals

- **Page load:** < 2s (First Contentful Paint)
- **Time to Interactive:** < 3s
- **API response:** < 200ms (email signup)
- **Countdown accuracy:** ±1 second

### Tools

- **Lighthouse** — Page performance audits
- **WebPageTest** — Real-world performance testing
- **k6** — Load testing (API endpoints)

### Example: Load Test

```js
// scripts/load-test.js
import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '1m', target: 100 },  // Ramp up to 100 signups/min
    { duration: '3m', target: 100 },  // Sustained load
    { duration: '30s', target: 0 },   // Ramp down
  ],
}

export default function () {
  const email = `load${__VU}${Date.now()}@example.com`
  const res = http.post('http://localhost:3000/api/signups', JSON.stringify({
    email
  }), {
    headers: { 'Content-Type': 'application/json' },
  })
  
  check(res, { 
    'status is 201': (r) => r.status === 201,
    'response time < 200ms': (r) => r.timings.duration < 200,
  })
  
  sleep(1)
}
```

---

## Cross-Browser Testing

### Browsers

- **Chrome** — Primary target
- **Safari** — iOS users
- **Firefox** — Alt browser
- **Edge** — Windows default

### Mobile

- **iOS Safari** — iPhone users
- **Chrome Mobile** — Android users

### Playwright Config

```js
// playwright.config.js
module.exports = {
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
}
```

---

## Bug Tracking

### Severity Classification

| Severity | Definition | Examples | SLA |
|----------|------------|----------|-----|
| **P0 (Critical)** | Launch blocked | Page down, signups broken | Fix immediately |
| **P1 (High)** | Major feature broken | Timer not updating, shares broken | Fix within 24h |
| **P2 (Medium)** | Minor issue | Styling glitch, slow load | Fix within 1 week |
| **P3 (Low)** | Cosmetic | Typo, minor UI issue | Backlog |

### Bug Report Template

```markdown
## Bug Report

**Severity:** P1

**Description:**
Countdown timer freezes after 30 seconds.

**Steps to Reproduce:**
1. Load landing page
2. Wait 30 seconds
3. Observe timer stops updating

**Expected Behavior:**
Timer should update every second until launch.

**Actual Behavior:**
Timer stops at random point.

**Environment:**
- Browser: Chrome 120
- OS: macOS 14
- Screen: Desktop

**Screenshots:**
[Attach screenshot]
```

---

## Launch Day Checklist

Before launch (T-24h):

- [ ] Run full E2E test suite
- [ ] Verify countdown shows correct time
- [ ] Test email signup end-to-end
- [ ] Verify share links work
- [ ] Check admin dashboard
- [ ] Run Lighthouse audit (score > 90)
- [ ] Test on mobile devices
- [ ] Backup database
- [ ] Set up monitoring alerts

During launch (T-0):

- [ ] Monitor signup rate
- [ ] Watch for errors in logs
- [ ] Check page load times
- [ ] Verify countdown reaches zero correctly
- [ ] Confirm post-launch content displays

After launch (T+1h):

- [ ] Review analytics
- [ ] Check email delivery rate
- [ ] Verify no data loss
- [ ] Monitor server performance

---

## Conclusion

DropMagic's QA strategy ensures:

- **Reliability** — Launch pages work flawlessly
- **Performance** — Fast page loads for viral sharing
- **Accuracy** — Countdown timers are precise
- **Zero lost signups** — Email capture is bulletproof

**Goal:** Launch with confidence — every time.

---

**Questions?** See [README.md](../README.md) or [ARCHITECTURE.md](./ARCHITECTURE.md).

**Report bugs:** Create issue with severity label.
