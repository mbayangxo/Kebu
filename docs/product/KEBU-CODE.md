# Kebu Code

Kebu Code is a signed-in source workspace for building browser apps. It is separate from Kebu Builder's visual editor. It uses the existing Yande model gateway. The product goal is to support ordinary browser apps and apps attached to a Kebu store, including the future use case of a creamery with pickup, a kiosk, and rewards.

## First implemented slice

Open `/code` from a Kebu account. Create a private project, edit HTML/CSS/JavaScript, save a revision, compare a model proposal against saved source, accept it explicitly, and export the three files as a ZIP. There is a static, sandboxed HTML/CSS layout preview. Source is not executed on Kebu servers or in the workspace preview. The last eight prior revisions are retained; restoring creates a new revision. Saves cannot silently overwrite newer UI edits from another tab.

The server only accepts a proposal for the signed-in owner's existing project, and generation cannot save changes. A store subdomain supplies only a verified public storefront link as context. It does not grant access to the store, a service credential, private catalog data, or customer records. Generated source, store context, and prompt go to the configured AI provider when the owner requests a proposal. Keep secrets and customer data out of source and prompts.

## Store connection and design direction

Select a Store project that you own, attach it to the workspace, and read the current active products, price labels and tracked product stock. Variant counts remain in Shop. The connection is saved, can be removed, and does not grant generated apps or their customers access to the owner's catalog. Store ownership and project type are verified again on every read; database policy also checks attachments. If a store changes owners, disconnect it before saving further source changes.

A separate Design direction field guides the proposal. Describe the visual style, colors, layout, mobile behavior and what to keep. The app's behavior belongs in the main request. Source review is available before either kind of change is saved. Visual reference uploads and click-to-edit selection are separate future slices.

### Cart order integrity checkpoint

The storefront cart now calls one service-only database transaction for the order header, order lines, tracked product stock, discount use, gift-card debit, and any JOKKO fulfillment record. Insufficient stock or a failed item insert rolls back the order and all these effects. An exact replay of a checkout attempt returns the recorded order without repeating effects; a retry that changes the details is rejected. The checkout UI holds that attempt ID in memory while retrying the same cart. A replay does not restart a payment attempt or imply payment succeeded.

Verified with a local PostgreSQL-compatible engine and route/service tests. Hosted schema, signed-in browser/provider acceptance, independent concurrent database sessions, and a durable recovery flow for lost payment links or a refreshed tab are open. Variants with their own stock are refused in this path until both reservation and cancellation can handle that stock consistently. No generated app has checkout or rewards access. Keep this isolated until these gates are verified.

## Next build for real store apps

1. Add an owner-approved app-to-store attachment with separate development and production scopes, stable Store SDK contracts, public catalog and server-owned stock/price checks. Use Kebu sign-in for the workspace and separately add app-user sign-in and guest checkout.
2. Add reusable orders, kitchen/pickup status, membership roles, order recovery, and provider-verified checkout/refunds. Use durable idempotency so retries cannot duplicate orders, stock deductions, or credits.
3. Add separate audited ledgers for customer loyalty, gift card credit, and creator earnings, including refund offsets and payout states. A creator's rate is captured at sale time. These are reusable commerce features, not part of the generated source's authority.
4. Add isolated interactive execution/preview, browser and integration checks, and an explicit release gate. No general shell, live credentials or backend code execution is enabled in this slice.

Use a generic store fixture to verify the flow before building YANMAY itself. A signed-in shop owner should be able to create a mobile ordering app, preview a test order through pickup, inspect exactly one points award and creator earning after a retry, and see both reverse correctly on a test refund.

## Verification and rollout

The checked-in SQL migration provisions workspace storage and owner-only RLS. It has only been applied in an isolated test database. Hosted readiness requires applying the reviewed migration to QA, opening the app as an ordinary test account, and checking a configured Yande provider, save/restore, and ZIP download. No live production write or deployment is part of this checkpoint.
