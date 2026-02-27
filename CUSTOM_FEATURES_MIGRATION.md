# DropMagic Custom Features Migration Plan

Generated: 2026-02-26 23:21  
Status: Analysis complete, ready for implementation

## Overview
This document maps all custom features from legacy DropMagic to the new product-template-based structure.  
ALL custom code MUST go in `@custom/` directories only. NEVER modify `@system/` files.

**DropMagic Core Purpose:**  
Product launch platform with countdown pages, email captures, viral share mechanics, and referral tracking.

---

## Backend Custom Features

### Database Tables (CRITICAL - Currently in 001_initial.sql)
**IMPORTANT:** The `drops` and `drop_signups` tables are currently in the legacy `001_initial.sql` file.  
These MUST be moved to `@custom/migrations/004_drops.js` and `@custom/migrations/004_drop_signups.js`

**Core DropMagic Tables:**
1. **drops** - Product launches
   - Fields: id, user_id, name, slug, description, product_url, image_url, launch_at, status, created_at, updated_at
   - Status: active | ended | draft
   
2. **drop_signups** - Email captures with referral tracking
   - Fields: id, drop_id, email, referral_code, referred_by, referral_count, status, created_at
   - Unique constraint: (drop_id, email)
   - Self-referencing: referred_by → drop_signups(id)

### Database Repositories (@custom/repos)
Legacy location: `legacy/dropmagic/server/src/db/repos/@custom/`

**Existing repos (shared with other products):**
1. **BrandRepo.js** - Brand management (multi-product feature)
2. **UserRepo.js** - Extended user functionality beyond auth
3. **ErrorEventRepo.js** - Error tracking persistence
4. **CollaboratorRepo.js** - Team collaboration features
5. **ApiKeyRepo.js** - API key generation and management

**MISSING - Need to create:**
6. **DropRepo.js** - Drops management (core DropMagic feature)
   - Required methods:
     - `findAll(userId, filters)` - list user's drops
     - `findBySlug(slug)` - get drop by slug (public access)
     - `create(data)` - create new drop
     - `update(id, data)` - update drop
     - `getStats(userId)` - dashboard statistics
     
7. **DropSignupRepo.js** - Signup management
   - Required methods:
     - `create(dropId, email, referralCode, referredBy)` - capture email
     - `findByDrop(dropId, options)` - list signups for a drop
     - `findByReferralCode(code)` - get signup by referral code
     - `incrementReferralCount(signupId)` - update referral counter
     - `getRecentSignups(userId, limit)` - dashboard recent signups

### Database Migrations (@custom/migrations)
Legacy location: `legacy/dropmagic/server/src/db/migrations/@custom/`

**Required migrations (in order):**
1. `001_error_events.js` - Error tracking table ✅ (exists)
2. `002_brands.js` - Brand management ✅ (exists)
3. `002_collaborators.js` - Team collaboration ✅ (exists)
4. `002_users_custom.js` - User extensions ✅ (exists)
5. `003_api_keys.js` - API key storage ✅ (exists)
6. `003_invitation_tokens.js` - Invite system ✅ (exists)
7. `003_full_text_search.js` - Search optimization ✅ (exists)
8. **`004_drops.js`** - Drops table ⚠️ (NEEDS TO BE CREATED - move from 001_initial.sql)
9. **`004_drop_signups.js`** - Signups table ⚠️ (NEEDS TO BE CREATED - move from 001_initial.sql)
10. **`005_drops_full_text_search.js`** - FTS for drops ⚠️ (RECOMMENDED - add search to drops)

### API Endpoints (@custom/api)
Legacy location: `legacy/dropmagic/server/src/api/@custom/`

**DropMagic-specific endpoints:**
1. **`drops/index.js`** - Core drops API ⚠️ (NEEDS REFACTORING - currently uses raw SQL)
   - `GET /api/drops` - List user's drops
   - `POST /api/drops` - Create new drop
   - `POST /api/drops/:slug/signup` - Public signup endpoint (viral entry point)
   - `GET /api/drops/signups` - List signups for user's drops
   - `GET /api/drops/stats` - Dashboard statistics
   - **MUST be refactored to use DropRepo and DropSignupRepo**

**Shared endpoints (multi-product):**
2. **`errors/index.js`** - Error tracking API ✅
3. **`search/index.js`** - Full-text search API ✅

### Routes Configuration
- `server/src/routes/@custom/index.js` - Currently registers errors + drops ✅

### Configuration
- `server/src/config/@custom/index.js` - Product branding ✅
- `server/src/scheduler/tasks/@custom/index.js` - Scheduled jobs (empty) ✅
- `server/src/lib/@custom/index.js` - Custom utilities (empty) ✅
- `server/src/workers/@custom/index.js` - Background workers (empty) ✅

---

## Frontend Custom Features

### Pages (@custom/pages)
Legacy location: `legacy/dropmagic/client/src/app/pages/app/@custom/`

**Required pages:**
1. **DropMagicDashboardPage.tsx** - Main product dashboard
   - Shows: Active drops, total signups, shares generated, conversion rate
   - Displays: Drop cards with countdown, signup count, share count
   - Lists: Recent signups table with referral tracking
   - Features: Create drop button
   
2. **ErrorTrackingPage.tsx** - Error monitoring dashboard (shared feature) ✅

**MISSING - Likely need to create:**
3. **DropDetailPage.tsx** - Individual drop management
   - Drop settings, signups list, referral leaderboard
   
4. **CreateDropPage.tsx** - Drop creation form
   - Name, description, product URL, image, launch date

5. **PublicDropPage.tsx** - Public landing page for signups
   - Countdown timer, signup form, referral code display

### Components
Legacy location: `legacy/dropmagic/client/src/app/components/@custom/`
- Currently only has `index.tsx` (empty export file)
- **Likely needs:** DropCard, SignupForm, CountdownTimer, ReferralWidget

### Integrations
- **Sentry** (`app/lib/@custom/sentry.ts`) - Error monitoring integration ✅

### Routes
- `app/routes/@custom/index.tsx` - Currently only defines `/app/drops` ⚠️
- **NEEDS:** Public routes for `/drop/:slug` (signup page)

### Configuration
- `config/@custom/info.ts` - Product metadata ✅
  - Name: "DropMagic"
  - Description: "Launch your drop. Watch it land."

---

## DropMagic Unique Features Summary

### Core Value Proposition
**Viral Product Launch Platform:**
1. **Countdown-driven launches** - Build anticipation with launch timers
2. **Email capture** - Collect signups before launch
3. **Viral referral mechanics** - Each signup gets a unique referral code
4. **Gamified sharing** - Referral count tracking incentivizes sharing
5. **Dashboard analytics** - Track drops, signups, shares, conversion rates

### Technical Architecture
- **Public endpoints** - `/api/drops/:slug/signup` allows unauthenticated signups
- **Referral chain tracking** - Self-referencing `referred_by` field builds referral trees
- **Slug-based URLs** - Auto-generated slugs for shareable drop pages
- **Status workflow** - draft → active → ended

### Integration Points
- **No external services required** - Self-contained viral mechanics
- **Email sending** - Will need integration with SES/email service for notifications
- **Image hosting** - `image_url` field expects external CDN/storage

---

## Implementation Priority

### Phase 1: Core Data Model (P0) ⚠️ CRITICAL
- [ ] **Create `004_drops.js` migration** (move from 001_initial.sql)
- [ ] **Create `004_drop_signups.js` migration** (move from 001_initial.sql)
- [ ] **Create DropRepo.js** (new file)
- [ ] **Create DropSignupRepo.js** (new file)
- [ ] Migrate existing @custom repos (BrandRepo, UserRepo, ErrorEventRepo, CollaboratorRepo, ApiKeyRepo)
- [ ] Test database initialization

### Phase 2: Backend Logic (P1) ⚠️ CRITICAL
- [ ] **Refactor `api/@custom/drops/index.js`** to use DropRepo and DropSignupRepo
- [ ] Migrate `api/@custom/errors/index.js` ✅
- [ ] Migrate `api/@custom/search/index.js` ✅
- [ ] Update `routes/@custom/index.js` ✅
- [ ] Custom config and utilities ✅

### Phase 3: Frontend Core (P1)
- [ ] **DropMagicDashboardPage.tsx** - Main dashboard
- [ ] **Create DropRepo API client** methods in frontend
- [ ] ErrorTrackingPage.tsx ✅
- [ ] Custom routes configuration
- [ ] Sentry integration ✅

### Phase 4: Drop Management UI (P2)
- [ ] **CreateDropPage.tsx** - Drop creation form
- [ ] **DropDetailPage.tsx** - Drop management/settings
- [ ] **DropCard component** - Reusable drop display
- [ ] **Update routes** to include create/detail pages

### Phase 5: Public Signup Flow (P2) ⚠️ HIGH VALUE
- [ ] **PublicDropPage.tsx** - Public landing page
- [ ] **SignupForm component** - Email capture form
- [ ] **CountdownTimer component** - Launch countdown
- [ ] **ReferralWidget component** - Show user's referral code + count
- [ ] **Public routes** for `/drop/:slug`

### Phase 6: Viral Mechanics Enhancement (P3)
- [ ] Referral leaderboard view
- [ ] Email notifications for signup confirmations
- [ ] Email notifications for referral milestones
- [ ] Social share buttons with pre-filled referral links

### Phase 7: Testing (P4)
- [ ] Unit tests for DropRepo and DropSignupRepo
- [ ] API integration tests for drops endpoints
- [ ] E2E tests for signup flow
- [ ] E2E tests for referral tracking

---

## Migration Checklist

### Pre-Migration
- [ ] Backup legacy database
- [ ] Document current drop count and signup count
- [ ] Export CSV of active drops for validation

### During Migration
- [ ] Run new migrations in order
- [ ] Verify `drops` and `drop_signups` tables exist
- [ ] Test referral chain integrity (referred_by references)
- [ ] Verify unique constraints (slug, email per drop, referral_code)

### Post-Migration
- [ ] Verify drop count matches pre-migration
- [ ] Test public signup flow end-to-end
- [ ] Test referral code generation and tracking
- [ ] Verify dashboard stats accuracy

---

## Acceptance Criteria
1. ✅ All custom features work exactly as in legacy version
2. ✅ Zero modifications to @system files
3. ✅ All tests pass
4. ✅ Dev server runs without errors
5. ✅ Database migrations execute cleanly
6. ✅ Public signup flow works without authentication
7. ✅ Referral tracking increments correctly
8. ✅ Dashboard displays accurate statistics

---

## Risk Areas & Notes

### 🚨 Critical Risks
1. **Drops table in wrong location** - Currently in 001_initial.sql, NOT in @custom/migrations
   - This breaks the product-template architecture
   - MUST be moved to @custom/migrations/004_drops.js

2. **No DropRepo** - API uses raw SQL queries (db.any, db.one)
   - Violates repository pattern used elsewhere
   - MUST create DropRepo.js and DropSignupRepo.js
   - MUST refactor drops/index.js API to use repos

3. **Missing public routes** - No frontend routes for `/drop/:slug`
   - Public signup flow is broken without this
   - High priority for Phase 5

### 📝 Implementation Notes
- Legacy code location: `/Users/ruipedro/.openclaw/workspace-assimetria/legacy/dropmagic/`
- New structure: `/Users/ruipedro/.openclaw/workspace-assimetria/dropmagic/`
- Reference legacy `001_initial.sql` when creating `004_drops.js` and `004_drop_signups.js`
- Study `api/@custom/drops/index.js` logic carefully when creating repos
- DO NOT copy-paste blindly - adapt to new template structure and repo pattern

### 🎯 Success Metrics
- [ ] Can create a drop from dashboard
- [ ] Can access public drop page via `/drop/:slug`
- [ ] Can sign up with email and receive referral code
- [ ] Referral count increments when someone uses my code
- [ ] Dashboard shows accurate stats for drops, signups, shares
- [ ] Error tracking works (shared feature)

---

## File Inventory

**Total custom files:** 35

**Backend files:** 24
- Repos: 6 (5 existing + need 2 new)
- Migrations: 7 (need 2-3 more)
- Schemas: 7 SQL files
- API endpoints: 3
- Config/lib: 5

**Frontend files:** 7
- Pages: 2 (need 3 more)
- Components: 1 (empty, need several)
- Routes: 1
- Config: 1
- Integrations: 2

**Missing/Incomplete:** ~8 files need creation, 2 files need major refactoring
