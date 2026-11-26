# Builder frame recovery checkpoint — October 20

The authoritative verified head is 1829d3f309f9beec104708e1276020e24b5e0536. Its GitHub CI 39445282072 and hosted E2E 39445572706 are SUCCESS. Earlier b22d828 also passed remote CI and 533 hosted cases/35 explicit skips.

Builder work continued on a separate local branch. Baseline native/3J browser run passed 32 cases, with nine optional performance probes skipped, including actual migrated local PostgreSQL edits, history, reload and publish on desktop/tablet/phone. Temporary source/config/server cleanup passed. New presentation tests reproduced ten failures/one pass before repair: canonical normalization discarded width/height/crop, invalid values were accepted and phone overrides were unavailable. After bounded schema/registry/phone-validation repairs, 25 focused tests and TypeScript passed locally.

Local execution then stopped responding, including trivial pwd commands in the workspace and /tmp. The final local Builder SQL browser result could not be read. No success is claimed for that run. The uncommitted local files were not reset or overwritten.

This isolated recovery branch reconstructs the recorded edits against exact 1829d3f using connected repository tools. It is not claimed byte-identical to the inaccessible local working tree. It preserves the schema/registry fix, persistence tests, shared SQL browser bridge, the real Builder SQL journey and the frame blueprint. The new read-only GitHub Actions job runs isolated migrated SQL contracts, actual Builder/browser/publish and unchanged performance budgets in a fresh runner. It has no production credentials or production mutation step.

Do not integrate into the authoritative branch until required CI and this browser/SQL workflow pass, failures are repaired, and any difference with the local working tree is reconciled if execution returns. The actual crop frame/hit-box and resize work is still open. Full May, rich inline text, all COS groups, 3J/K001–K099, provider workflows, hosted signed-in persistence and production release remain open. No Mail, destructive migration, DNS or production promotion change.
