# Developer App Store — implementation contract

November 8, 2026. Scope: publish already-hosted developer apps to KEBU’s optional App Store, alongside independent first-party Friends and Live Rooms. RECT remains separately built and is not a fixture or dependency.

Developer: create a draft, describe the app, supply HTTPS launch, privacy and support pages, submit, receive a review decision, withdraw to revise and resubmit. Kebu Record reviewers approve/reject exact revisions and can suspend published apps. Submitted and approved content cannot silently change. Review history is durable. Public visitors only see approved free apps.

Account holder: inspect the app and developer’s URLs, consent to a launcher-only installation, add to My Apps, open the reviewed HTTPS URL through a KEBU launch page, or remove it. No KEBU credentials, wallet, contacts, files or identity token are sent to a third party. Third-party login and any data entered there are controlled by that app. External apps open in a separate tab with no referrer/opener. Removal revokes the KEBU launcher, not a separate developer account. Suspended, withdrawn or changed revisions cannot launch; reinstall after approval to accept a changed revision.

Pricing: existing paid/subscription draft metadata is preserved, but submissions of these apps are blocked until real checkout, private entitlement, refund/revocation and creator earnings are connected. No fake purchase button. Arbitrary developer code hosting, iframe embedding, OAuth/scoped KEBU APIs, paid-app commerce and agents/assets are separate requirements, not capabilities of this launcher.

Design: KEBU shell, warm light surfaces, orange accents, shared typography. Usable phone layouts; no fabricated installs, reviews or featured apps. Loading, no listings, save errors and review conflicts are explicit. Listing and launch pages expose the actual destination.

Acceptance: actual Postgres RLS/trigger/RPC tests for self-publication denial, review freeze/concurrency, cross-account installs, version consent, withdrawal/suspension and audit; actual browser developer → staff review → buyer add/open/remove with persistence. Local loopback Auth/REST fixture is permitted, labelled separately from hosted QA. No Vercel deployment or hosted migration in this work.

Local acceptance details: [November 8 report](../audits/KEBU_DEVELOPER_MARKETPLACE_2026-11-08.md).
