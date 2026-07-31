# SMOAC transactional email (Resend)

Inquiry + application emails go through `src/lib/email/email-transport.ts` and share a branded HTML shell in `src/lib/email/email-html-shell.ts` (dark graphite, silver type, lavender CTA). Plain-text fallback is always included.

- **With `RESEND_API_KEY`:** real sends via Resend (HTML + text)
- **Without:** payloads log to the server console (safe for local UI work)

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
EMAIL_FROM=SMOAC <noreply@yourdomain.com>
```

## What sends today

| Event | Recipient | Kind |
|-------|-----------|------|
| Client inquiry | Client | `inquiry_client` |
| Client inquiry | Specialist | `inquiry_specialist` |
| Client Join Now | Client | `confirmation_client` |
| Specialist Join Now | Specialist | `confirmation_specialist` |
| Specialist approved | Specialist | `approval_specialist` |

API: `POST /api/email` (browser-safe; key stays on server). Optional `html` field is accepted with `text`.

## Auth emails

Magic link / password reset / signup confirm are **Supabase Auth** templates (dashboard), not this Resend stack.

Paste-ready branded HTML (same dark SMOAC shell):

[`docs/email-templates/supabase-auth/README.md`](./email-templates/supabase-auth/README.md)

Regenerate:

```bash
node scripts/generate-supabase-auth-emails.mjs
```

For production From-address branding, point Supabase Auth **custom SMTP** at Resend.
