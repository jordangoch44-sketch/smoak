# SMOAC privacy data inventory

**For legal counsel.** Product snapshot as of 10 September 2026. Public copy lives in `src/lib/legal-content.ts` and is **not** counsel-approved.

Support inbox: `support@smoac.com`.

## What this product is

Wellness marketplace (smoac.com). Clients discover independent specialists and send inquiries. Specialists apply, list a public profile, and may buy membership or Boosts. SMOAC is not the session provider and does not process client-to-specialist session payments.

## Data by flow

| Flow | Data | Stored / processed | Who sees it |
|------|------|--------------------|-------------|
| Client signup (full, save-heart, inquiry) | First name, email, password | Supabase Auth + `profiles` / `user_roles` | SMOAC; password hashed by Auth |
| Specialist apply / onboard | Name, email, phone, password, specialties, bio, service area, media, pricing prefs | Supabase + storage | SMOAC staff (review); approved fields become public |
| Client profile | Goals, budget, ZIP/city, search radius, optional coordinates | `profiles` + browser storage | SMOAC; location used to rank Explore |
| Inquiries | Message, topics, names, emails | Inquiry tables + Resend notification email | The other party on the thread + SMOAC |
| Saves | Specialist IDs | `saved_trainers` | The signed-in client |
| Public listing | Name, photo, videos, bio, area, rates display, reviews | Catalog / storage | Anyone on the site |
| Specialist billing | Stripe customer id, plan, invoices, Boost campaign | Stripe + `specialist_billing` / profile flags | Specialist + SMOAC; card data stays with Stripe |
| Traffic analytics | Random `smoac_visitor_key`, path, referrer, UTM | First-party `/api/analytics/*` then DB | Internal admin |
| Marketing email (admin) | Recipient email, open/click/unsubscribe | Admin email tables + `/email/unsubscribe` | Internal admin |
| Maps / address | ZIP, place search, map view | Google Places (server), Apple Maps or OpenFreeMap (browser) | Those vendors as needed to render the feature |
| Google review connect | Place details the specialist chooses to attach | Google Places API (server) | Public profile if connected |
| Internal admin copilot | Operational prompts | OpenAI when `OPENAI_API_KEY` is set | Internal only — confirm whether any end-user PII is sent |

## Browser storage (not just cookies)

- Auth session cookies (Supabase)
- `localStorage`: visitor key, location/ZIP, recent searches, pending inquiry, save/inquiry flags, some dashboard drafts
- No third-party ad pixel in the app as of this inventory
- No cookie-consent banner

## Retention / deletion (today)

- No in-app hard-delete. Users email support (`accountDeletionMailto` in `src/lib/site-contact.ts`).
- No documented retention schedule for analytics, backups, or Stripe records.
- Counsel should define: account wipe vs billing/legal holds, inquiry copies already emailed, public CDN/media, and visitor-key analytics.

## Public pages wired

`/privacy` `/terms` `/cookies` `/pricing` `/safety` `/community-guidelines` `/report` `/support` `/contact` `/faq` `/accessibility` `/about` plus `/email/unsubscribe`.

Signup shows “By continuing, you agree to Terms and Privacy” (`LegalAgreementNotice`).

## Ask counsel to add / decide

1. Legal entity name, address, governing law, venue (site currently says “SMOAC” only).
2. CCPA/CPRA (San Diego / California market) and whether GDPR applies.
3. Cookie banner vs first-party-only analytics.
4. Formal refund policy for Pro / PRO+ / Boosts (product currently case-by-case).
5. Age gate enforcement beyond the 18+ sentence in Terms.
6. Processor list / DPA with Supabase, Resend, Stripe, Google, Apple, OpenAI.
7. Whether admin AI may receive customer content.
8. Insurance (marketplace E&O) and independent-contractor language.
9. Replace `LEGAL_COUNSEL_NOTICE` and bump `LEGAL_EFFECTIVE_DATE` when signed off.
