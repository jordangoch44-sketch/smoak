# Stripe — specialist membership + paid placement

## Product model

### Paid placement (Boost campaigns)
Timed campaigns — specialist picks a surface, days, and daily budget, then pays the total up front. Not a monthly add-on. Pro Plus still gets 20% off the campaign total.

Webhook `payment_intent.succeeded` (metadata `smoac_kind=boost_campaign`) turns the placement on until `boost_campaign_ends_at`.

Legacy monthly add-on price IDs still exist for existing subscribers; new Boost checkout does not use them.

### Membership (analytics) — display names: Free · Pro · Pro Plus
1. **Specialist approved** → automatic **30-day free Pro trial** (no card)
2. **Day 30** → Free + option to continue **Pro ($9.99/mo)** (Stripe product key: `premium`)
3. **Pro Plus ($19.99/mo)** → everything in Pro, plus client transformations on the profile and **20% off Boosts** (Stripe product key: `platinum`)
4. Pro / Pro Plus membership **never** grants Homepage Sponsored or Featured by itself

### Paid placement add-ons (optional, stackable, do not require Pro)
| Product | Price | Entitlement flag |
|---------|-------|------------------|
| Boosted profile | $49/mo | `sponsored` |
| Category spotlight | $99/mo | `category_spotlight` |
| Homepage spotlight | $199/mo | `featured` |
| Top ranking boost | $149/mo | `top_ranked` |

Webhook sync aggregates **all** active Stripe subscriptions for the customer and writes flags on `specialist_profiles` + `plan` / `active_addons` on `specialist_billing`.

## 1. API keys

| Env var | Value |
|---------|--------|
| `STRIPE_SECRET_KEY` | Secret key (`sk_test_…` / `sk_live_…`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Publishable key — **required** for embedded Payment Element (boost checkout) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret |

## 2. Create products / prices

```bash
STRIPE_SECRET_KEY=sk_test_... npm run setup:stripe
```

Copy every printed `STRIPE_PRICE_*` line into `.env.local` and Vercel:

- `STRIPE_PRICE_PREMIUM`
- `STRIPE_PRICE_PLATINUM`
- `STRIPE_PRICE_BOOSTED_PROFILE`
- `STRIPE_PRICE_CATEGORY_SPOTLIGHT`
- `STRIPE_PRICE_HOMEPAGE_SPOTLIGHT`
- `STRIPE_PRICE_TOP_RANKING_BOOST`

Safe to re-run — reuses products matched by `metadata.smoac_product`.

## 3. Migrations (Supabase SQL Editor)

1. `supabase/migrations/20260725180000_specialist_billing_stripe.sql`
2. `supabase/migrations/20260725190000_specialist_premium_trial.sql`
3. `supabase/migrations/20260731020000_specialist_billing_products.sql`
4. `supabase/migrations/20260905180000_boost_campaigns.sql`

## 4. Webhook

- URL: `https://smoac.com/api/stripe/webhook`
- Events: `checkout.session.completed`, `customer.subscription.created|updated|deleted`, `payment_intent.succeeded`
- Secret → `STRIPE_WEBHOOK_SECRET`

## 5. Cron (expire complimentary trials)

`vercel.json` → `GET /api/cron/expire-premium-trials` daily. Set `CRON_SECRET` in Vercel.

## 6. Specialist UX

- **Pro / Pro Plus** → in-dashboard checkout (`POST /api/stripe/subscription-intent`) — Apple Pay, Google Pay, Link, or card
- **Boost modal** → where you'll be seen → days + budget → wallets / card (`POST /api/stripe/boost-campaign-intent`)
- **Ad spend** → Subscription / account settings via `GET /api/stripe/billing-summary`
- **Manage billing** → `POST /api/stripe/portal`
- **Hosted Checkout** (`POST /api/stripe/checkout`) remains as a fallback API; the dashboard no longer redirects off-site

## 7. Apple Pay / Google Pay / Link (one-tap)

Wallets show automatically in the Express Checkout row when the browser supports them. Card stays as fallback.

| Requirement | Notes |
|-------------|--------|
| HTTPS | Live site (`smoac.com`) already qualifies. `localhost` usually will not show Apple Pay. |
| Stripe Dashboard | Settings → Payment methods → enable **Apple Pay**, **Google Pay**, and **Link** |
| Payment method domains | Register `smoac.com` (and `www.smoac.com` if you use it) under Payment method domains. Stripe handles Apple merchant validation — no association file on our origin. |
| Safari + Wallet | Apple Pay only appears in Safari (or an iOS in-app browser) with a card in Wallet |
| Google Pay | Chrome / Android when a Google account has a card |
| Link | Stripe remembers returning specialists by email |

Test wallets with Stripe test mode keys. Card fallback: `4242 4242 4242 4242`, any future expiry, any CVC.
