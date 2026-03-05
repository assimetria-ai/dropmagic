// @system — Stripe checkout + webhook + portal
const express = require('express')
const router = express.Router()
const stripe = require('../../../lib/@system/Stripe')
const { authenticate } = require('../../../lib/@system/Helpers/auth')
const SubscriptionRepo = require('../../../db/repos/@system/SubscriptionRepo')
const UserRepo = require('../../../db/repos/@system/UserRepo')
const logger = require('../../../lib/@system/Logger')

// ─── Checkout ────────────────────────────────────────────────────────────────

// POST /api/stripe/create-checkout-session
router.post('/stripe/create-checkout-session', authenticate, async (req, res, next) => {
  try {
    const { priceId, trialDays } = req.body
    if (!priceId) return res.status(400).json({ message: 'priceId is required' })

    const sessionParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.APP_URL}/app/billing?checkout=success`,
      cancel_url: `${process.env.APP_URL}/pricing`,
      customer_email: req.user.email,
      client_reference_id: String(req.user.id),
      metadata: { user_id: String(req.user.id) },
    }

    if (trialDays && Number(trialDays) > 0) {
      sessionParams.subscription_data = {
        trial_period_days: Number(trialDays),
        metadata: { user_id: String(req.user.id) },
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams)
    res.json({ url: session.url })
  } catch (err) {
    next(err)
  }
})

// ─── Customer Portal ─────────────────────────────────────────────────────────

// POST /api/stripe/create-portal-session
router.post('/stripe/create-portal-session', authenticate, async (req, res, next) => {
  try {
    const subscription = await SubscriptionRepo.findActiveByUserId(req.user.id)
    if (!subscription?.stripe_customer_id) {
      return res.status(404).json({ message: 'No active subscription found' })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${process.env.APP_URL}/app/billing`,
    })

    res.json({ url: session.url })
  } catch (err) {
    next(err)
  }
})

// ─── Cancel / Uncancel ───────────────────────────────────────────────────────

// POST /api/stripe/cancel-subscription
router.post('/stripe/cancel-subscription', authenticate, async (req, res, next) => {
  try {
    const subscription = await SubscriptionRepo.findActiveByUserId(req.user.id)
    if (!subscription?.stripe_subscription_id) {
      return res.status(404).json({ message: 'No active subscription found' })
    }

    const updated = await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    })

    await SubscriptionRepo.update(subscription.id, {
      cancel_at_period_end: true,
      current_period_end: new Date(updated.current_period_end * 1000),
    })

    res.json({ message: 'Subscription will cancel at period end', cancel_at_period_end: true })
  } catch (err) {
    next(err)
  }
})

// POST /api/stripe/uncancel-subscription
router.post('/stripe/uncancel-subscription', authenticate, async (req, res, next) => {
  try {
    const subscription = await SubscriptionRepo.findActiveByUserId(req.user.id)
    if (!subscription?.stripe_subscription_id) {
      return res.status(404).json({ message: 'No active subscription found' })
    }

    const updated = await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: false,
    })

    await SubscriptionRepo.update(subscription.id, {
      cancel_at_period_end: false,
      current_period_end: new Date(updated.current_period_end * 1000),
    })

    res.json({ message: 'Subscription cancellation reversed', cancel_at_period_end: false })
  } catch (err) {
    next(err)
  }
})

// ─── Note: Webhook Handler ──────────────────────────────────────────────────
// The Stripe webhook handler has been moved to stripe-webhook.js
// It must be mounted BEFORE express.json() to preserve raw body for signature verification
// See: src/api/@system/stripe-webhook.js

module.exports = router
