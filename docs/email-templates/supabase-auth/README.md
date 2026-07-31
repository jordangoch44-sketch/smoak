# Supabase Auth email templates (SMOAC)

These match the dark graphite / silver / lavender transactional shell used by Resend emails.

## Install in Supabase (required)

1. Open **Supabase Dashboard → Authentication → Emails** (or **Email Templates**).
2. For each template below, set the **Subject** and paste the full **Body** HTML from the matching `.html` file.
3. Save.
4. Confirm **Authentication → URL Configuration → Site URL** is `https://smoac.com` in production (logo + links use `{{ .SiteURL }}`).

Optional but recommended for production: **Project Settings → Auth → SMTP** and send Auth mail through Resend so From is `SMOAC <noreply@yourdomain.com>` instead of the default Supabase sender.

## Templates

| Supabase template | Subject | File |
|-------------------|---------|------|
| Confirm signup | `Confirm your SMOAC email` | [`confirm-signup.html`](./confirm-signup.html) |
| Magic Link | `Your SMOAC sign-in link` | [`magic-link.html`](./magic-link.html) |
| Reset password | `Reset your SMOAC password` | [`reset-password.html`](./reset-password.html) |
| Change email address | `Confirm your new SMOAC email` | [`change-email.html`](./change-email.html) |
| Invite user | `You’re invited to SMOAC` | [`invite.html`](./invite.html) |

## Regenerate

```bash
node scripts/generate-supabase-auth-emails.mjs
```

## Notes

- CTAs use `{{ .ConfirmationURL }}` (Supabase-hosted verify → redirect to your app).
- OTP fallback uses `{{ .Token }}` for clients that prefetch links.
- Logo: `{{ .SiteURL }}/smoac-mark.png` — ensure the mark is publicly reachable.

