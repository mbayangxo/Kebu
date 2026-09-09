# ADR: Paid hosting cron · shop checkout email OTP · AI section accept/reject polish

## Decision

1. **Paid hosting loop** — schedule Vercel crons for `/api/cron/billing-monthly` (daily). When JOKO autopay returns `charged`, activate the pending subscription in-cron (same helper as webhook) so renew does not stall. Email owner when autopay fails.
2. **Shop checkout email OTP** — buyer enters email → Resend sends 6-digit code → verify → proof token required on cart/order APIs. Signed-in Kebu users placing with their own account email skip OTP. Not Kebu Mail product.
3. **AI improve B6** — section accept/reject already existed in sidebar; command bar now has the same checkboxes; canvas preview merges only accepted sections.

## Apply

Paste [`APPLY_082_SHOP_CHECKOUT_EMAIL_OTP.sql`](../../APPLY_082_SHOP_CHECKOUT_EMAIL_OTP.sql) (or `082_shop_checkout_email_otp.sql`).

Env: `CRON_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` / `NOTIFY_FROM_EMAIL`, JOKO webhook secrets.
