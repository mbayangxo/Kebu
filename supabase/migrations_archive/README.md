# Historical Supabase SQL archive

Files in this directory are preserved archaeological records. They are **not** an executable migration chain and must never be replayed automatically against an existing database.

`legacy/` contains the original numbered migrations and manual `APPLY_*`, `FIX_*`, and `VERIFY_*` bundles that predate the canonical timestamped migration ledger. Some statements are duplicated across files, some depend on live state, and at least one legacy version number was reused.

Use `supabase/migrations/` only for new canonical migrations. See [`../MIGRATION_HISTORY.md`](../MIGRATION_HISTORY.md) for reconciliation rules and the current live ledger.
