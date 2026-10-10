# S5 operation persistence boundary

The API applies the core and the existing 3B section save boundary before
calling `apply_node_ops`, as required by the 3C design freeze. Native nodes
use their registered schema; legacy sections use `sectionPropsForSave`.
Adapter shadows are excluded from inserted and restored storage payloads.

Normalization can remove an unknown field or materialize defaults. SQL patch
operations alone cannot reproduce that result. The API therefore adds an
internal `normalizedProps` bag to the last content write for each legacy node.
The internal SQL implementation adopts that bag within the same transaction,
preserving the original operation ordering and one version bump per node.
Strict browser transaction validation rejects this internal field.

`kcd_operation_protocol()` reports version 2. The new API refuses operation
editing if that function is absent or different; it cannot silently use the
older storage implementation. Its execution privileges exclude anon. Existing
operation RPC authorization and internal function privileges are retained.

Uncertain acknowledgements retain the original transaction ID and payload.
Offline replay serializes transactions per project; a terminal conflict blocks
its successors. The coordinator checks returned versions and canonical node
presence before allowing publishing or recording successful history.

The opted-in Builder now owns the coordinator and operation history. It leases
its project queue so global replay cannot race the live editor. Uncertain sends
and page exit checkpoint unsent intents in immutable order. Local-storage
failures surface a keep-page-open error; malformed success replies are not
accepted as saved. In-page reload flushes first and preserves unresolved edits.

Legacy section routes and whole-site replacement refuse opted-in writes. The
legacy publisher refuses opted-in documents pending S7. Operation writes have
a separate QA-only opt-in flag, disabled by default, as well as protocol checks.
Site chrome remains on its explicit single-source API.

This is a development checkpoint, not S5 sign-off. Remaining requirements
include the complete writer audit, QA concurrency, authenticated browser gates,
and full Builder edit-to-canvas performance evidence. The eight local browser
checks use a controlled authority and do not replace those gates.
No persistent remote migration was applied.
