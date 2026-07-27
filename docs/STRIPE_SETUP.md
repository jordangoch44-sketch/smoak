# Stripe — SMOAC Pro subscriptions

## Product model

1. **Specialist signs up** → automatic **30-day free Pro trial** (no card required)
2. **Day 30** → dropped to **Free** + modal: continue Pro for **$9.99/mo** or stay Free
3. **Paid Pro** → Stripe Checkout (no second free month)

## 1. Create a Stripe account

1. Sign up at [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Stay in **Test mode** until ready for real charges

## 2. Copy API keys

Dashboard → **Developers** → **API keys**:

| Env var | Value |
|---------|--------|
| `STRIPE_SECRET_KEY` | Secret key (`sk_test_…`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Publishable key (`pk_test_…`) |

Add to `.env.local` and Vercel (Production + Preview).

## 3. Create the Pro product / price

```bash
STRIPE_SECRET_KEY=sk_test_... npm run setup:stripe
```

Copy `STRIPE_PRICE_PREMIUM=price_…` into `.env.local` and Vercel.

## 4. Apply migrations in Supabase SQL Editor

1. `supabase/migrations/20260725180000_specialist_billing_stripe.sql`
2. `supabase/migrations/20260725190000_specialist_premium_trial.sql`

## 5. Webhook endpoint

- URL: `https://smoac.com/api/stripe/webhook`
- Events: `checkout.session.completed`, `customer.subscription.created|updated|deleted`
- Secret → `STRIPE_WEBHOOK_SECRET`

## 6. Cron (expire trials daily)

`vercel.json` schedules `GET /api/cron/expire-premium-trials` at 14:00 UTC.

1. Add `CRON_SECRET` in Vercel (Production) — any long random string
2. Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` automatically

Without `CRON_SECRET`, the cron route returns 401 (safe default).  
Trials also expire on the next specialist login if cron has not run yet.

## Test card

`4242 4242 4242 4242`, any future expiry, any CVC.
