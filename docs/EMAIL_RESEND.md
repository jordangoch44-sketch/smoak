# SMOAC transactional email (Resend)

Inquiry + application confirmation emails go through `src/lib/email/email-transport.ts`.

- **With `RESEND_API_KEY`:** real sends via Resend  
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
```

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

API: `POST /api/email` (browser-safe; key stays on server).
