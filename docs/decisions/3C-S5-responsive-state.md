# S5 responsive state operation

Decision: add `setResponsiveState { id, value }` to the KCD vocabulary.

The user authorized the development agent to resolve this open S5 decision on
2026-10-01 (America/New_York). This closes the explicit S1 handoff item in
`3C-DESIGN-FREEZE.md` without changing responsive inheritance.

Device edits submit their override changes and responsive metadata in the same
transaction. The Builder adapter computes the existing 3B normalized base hash;
the renderer-independent core validates metadata but does not compute a
Builder-specific hash. Reset to Auto clears the required buckets and metadata
atomically. Inversion restores the previous metadata, including absence.

The operation uses existing authorization, expected versions, transaction
limits, rollback, and minimal journal rules. It increments a node version once
per transaction even when combined with override edits. SQL stores metadata at
the existing `props.deviceOverrides._state` location. The S4 migration is
unchanged; a follow-up migration extends its internal implementation while
retaining the existing RPC entry point and grants.

Scope: development only. No production access, deployment, release, or remote
migration is authorized. S5 remains incomplete until its full Builder and QA
gates pass.
