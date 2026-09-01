# SMOAC transactional email (Resend)

Inquiry + application emails go through `src/lib/email/email-transport.ts` and share a branded HTML shell in `src/lib/email/email-html-shell.ts` (dark graphite, SMOAC Color spectrum rim, wordmark, spectrum CTA). Plain-text fallback is always included. Specialist inquiry emails set `reply_to` to the client so specialists can hit Reply in their inbox.

- **With `RESEND_API_KEY`:** real sends via Resend (HTML + text)
- **Without:** payloads log to the server console (safe for local UI work)

**Prod check:** `GET https://smoac.com/api/email/status` → `{"mode":"resend"}` when live.

## Setup (MVP)

1. Create a free account at [resend.com](https://resend.com)
2. **API Keys** → Create key → copy it
3. For quick testing (no custom domain), Resend allows:
   - `from`: `SMOAC <onboarding@resend.dev>`
   - `to`: **only your own Resend account email**
4. Add to `.env.local` (never commit):

```bash
RESEND_API_KEY=re_xxxxxxxx
EMAIL_FROM=SMOAC <onboarding@resend.dev>
NEXT_PUBLIC_SITE_URL=https://smoac.com
```

`NEXT_PUBLIC_SITE_URL` is used for logo + CTA absolute URLs in HTML emails.

5. Restart the Next.js server (`npm run dev` / `npm run start:lan`)

6. Smoke test:

```bash
npm run test:email -- you@your-resend-signup-email.com
```

## Production domain

Before public launch, verify your domain in Resend and switch:

```bash
EMAIL_FROM=SMOAC <noreply@smoac.com>
```

(Prod Vercel already uses verified `SMOAC <noreply@smoac.com>` per `CURRENT_STATUS.md`.)

## What sends today

| Event | Recipient | Kind | Trigger |
|-------|-----------|------|---------|
| Client inquiry | Client | `inquiry_client` | `POST /api/inquiry/submit` |
| Client inquiry | Specialist | `inquiry_specialist` | `POST /api/inquiry/submit` |
| Client Join Now / complete-account | Client | `confirmation_client` | `sendClientWelcomeEmail` (deduped per browser) |
| Specialist application submitted | Specialist | `confirmation_specialist` | Onboarding submit |
| Specialist approved | Specialist | `approval_specialist` | Admin approve |
| Specialist rejected | Specialist | `rejection_specialist` | Admin reject |
| Specialist onboarding OTP | Specialist | `specialist_email_otp` | Server (not via `/api/email`) |
| Pro trial reminders | Specialist | `premium_trial_*` | Cron (server) |

API: `POST /api/email` (browser-safe; key stays on server). Optional `html` field is accepted with `text`.

## Soft-launch email smoke checklist

Run each once against a real inbox before inviting trainers:

1. **Resend transport** — `npm run test:email -- you@…` (or confirm `/api/email/status` = `resend`)
2. **Client Join Now** — create client → receive “Welcome to SMOAC — your account is ready”
3. **Supabase confirm signup** (if confirm-email enabled) — branded “Confirm your SMOAC email”
4. **Magic link** (save/inquiry quick signup) → `/complete-account` → welcome email
5. **Forgot password** — “Reset your SMOAC password”
6. **Specialist OTP** — 6-digit code during onboarding
7. **Specialist application received** — after wizard submit
8. **Inquiry** — both client + specialist copies
9. **Admin approve / reject** — approval live email + rejection closed email

## Auth emails

Magic link / password reset / signup confirm are **Supabase Auth** templates (dashboard), not this Resend stack.

Paste-ready branded HTML (same dark SMOAC shell):

[`docs/email-templates/supabase-auth/README.md`](./email-templates/supabase-auth/README.md)

Regenerate:

```bash
node scripts/generate-supabase-auth-emails.mjs
```

For production From-address branding, point Supabase Auth **custom SMTP** at Resend so Auth mail also comes from `SMOAC <noreply@smoac.com>`.
