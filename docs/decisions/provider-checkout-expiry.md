# Provider checkout and expiry repair

Root cause: a saved unpaid order can be cancelled while a provider session is being created; a later initiation update can overwrite a callback that already marked it paid. Releasing inventory based only on elapsed time could leave a payable external checkout alive.

Decision: claim a known saved checkout under its order lock before starting any provider request, binding its provider, reference and existing cash total and making it awaiting payment. A failed or lost provider creation response remains held for reconciliation. Finish initiation through an RPC that preserves a payment recorded while the request was in flight. Do not retry provider creation blindly.

Wave expiry uses the provider's returned `when_expires`, never a guessed TTL. A secret-protected worker retrieves the exact Wave session and checks ID, reference, XOF amount and currency. It releases recorded stock, discount and gift effects only after Wave reports both expired checkout and cancelled payment. Processing/unknown states remain held; succeeded payments are reconciled as paid. Release locks/rechecks the order and provider binding, commits cancellation and its ledger together, and replays harmlessly. COD/WhatsApp instructions have no automatic timer. PayPal, Paystack, Orange Money and Joko closure remain blocked until their actual provider contracts/configuration are verified; no invented generic cancellation API.

Wave signature verification must follow the documented timestamp + raw-body HMAC and reject stale/future timestamps. Only the exact completed/succeeded session with matching amount can record payment. Tests use explicit fixtures; real provider verification and deployment remain distinct completion gates.
