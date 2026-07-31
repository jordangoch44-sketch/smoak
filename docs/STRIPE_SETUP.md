# Stripe — specialist membership + paid placement

## Product model

### Membership (analytics) — display names: Free · Pro · Platinum
1. **Specialist approved** → automatic **30-day free Pro trial** (no card)
2. **Day 30** → Free + option to continue **Pro ($9.99/mo)** (Stripe product key: `premium`)
3. **Platinum ($19.99/mo)** → Pro analytics **plus featured** placement
4. Pro membership **never** grants Homepage Sponsored by itself

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

## 4. Webhook

- URL: `https://smoac.com/api/stripe/webhook`
- Events: `checkout.session.completed`, `customer.subscription.created|updated|deleted`
- Secret → `STRIPE_WEBHOOK_SECRET`

## 5. Cron (expire complimentary trials)

`vercel.json` → `GET /api/cron/expire-premium-trials` daily. Set `CRON_SECRET` in Vercel.

## 6. Specialist UX

- **Pro upgrade** → Checkout Session or modal
- **Boost modal** → in-app Payment Element (`POST /api/stripe/subscription-intent`) — description + card on SMOAC
- **Ad spend** → Subscription / account settings via `GET /api/stripe/billing-summary`
- **Manage billing** → `POST /api/stripe/portal`

## Test card

`4242 4242 4242 4242`, any future expiry, any CVC.
