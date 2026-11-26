# Platform continuity and real browser gates — October 20

This is a verified implementation checkpoint, not full Kebu, May, 3J or 99-group completion.

## Recovery and preserved history

The execution host restored an older filesystem snapshot. All 2,603 tracked files were reconstructed and blob-checked against authoritative `ee9852431d3cfadcc178b2cbd81644ede7c4fbe0`, including Claude's Mail, Liguey, shared Yande gateway, commerce durability and Studio marketplace work. Original workspaces were preserved. The unpushed crop-hitbox/gesture changes and their final browser report were absent from the restored snapshot; they are not claimed recovered, committed or accepted. Existing responsive image persistence and phases 3C–3I remain preserved.

May navigation repair `6bdfcb72d7b695b30f100154cedce85354ca11c5` and locale repair `2113075aef66ae5004eb3118c184a9da239801ae` were reconciled as `82dd16f947c0198c2db75104233134a939ab906d`, retaining both parents. This audit's follow-up adds listing failure recovery.

## Reproduced defects and repairs

- Saved May menus rewrote Contact to the foundation, deleting the team-contact destination and duplicating Mayjor Good. Eight regression cases failed before repair; canonical and historical first-party contact URLs now stay `/contact`, authored external/mailto links survive, and legacy Inquire compatibility remains. Seventeen focused navigation/i18n tests passed. Nine actual collage/navigation browser cases passed locally. Full GitHub CI `39499450974` and expanded Builder SQL/browser `39499451225` passed on the navigation checkpoint; the latter executed 58 cases with zero skips/failures, including all nine strict 100/500/2,000-node desktop/tablet/phone performance probes.
- LocaleProvider swapped a Fragment for a Provider after saved settings loaded. React remounted the screens below it and lost early form edits. The actual Liguey create-listing journey reproduced title loss locally and in GitHub run `39498661242`. The provider now stays mounted from SSR onward. A real-browser component-identity/draft regression fails against the old provider and passes against the repair. Switching French/Wolof/English retains the controlled draft. Eleven complete Liguey journeys then passed sequentially; an earlier concurrent local run timed out at the photo case and is not counted as passed.
- Listing creation had no catch for fetch rejection or non-JSON upstream responses. An injected connection failure reproduced the missing accessible error. The repaired handler retains typed fields, announces a translated error, releases busy state and allows a real retry. Both network-abort and invalid-JSON tests verify zero writes before retry and one persisted draft afterward, with zero page errors. The full expanded Liguey suite passed **13/13, zero skips/failures** locally; focused translation/API tests passed **15/15**, and changed-file lint had zero findings. This verifies failures before a write; response loss after an already committed creation is not an idempotency certification. Wolof remains subject to the dictionary's existing native-speaker review caveat.

## Permanent platform verification

`.github/workflows/platform-sql-ui.yml` runs 17 existing actual migration/RLS suites sequentially using pinned PGlite 0.5.10, rejects skipped/todo/failed/empty test reports, then runs the existing Mail and Liguey UI → Next API → supabase-js → isolated SQL harnesses and the locale lifecycle regression. Evidence is retained per exact run. It supplies no production credentials. External forwarding only enqueues a disposable local delivery job; no external email is sent. Yande responses and storage/auth/REST transports in these harnesses are explicitly loopback fixtures, not real-provider or hosted-auth acceptance.

Initial platform run `39498661242` verified all 17 SQL suites and all seven Mail browser journeys, then correctly failed on the locale-induced Liguey defect. Combined checkpoint CI `39500316137` passed; combined Builder `39500316570`, platform `39500316396` and hosted Preview E2E `39500636256` were still running when this audit was written. Re-read exact conclusions before authoritative integration. Do not reuse pending status as success.

## Hosted release status

Combined preview `dpl_C3Zoy5hgZ73As7BR775wNmVStrnF` is READY at `https://kebu-93lzmbcqc-mbayangxos-projects.vercel.app`. This is a preview, not production promotion.

Read-only production inspection of project `tnygqgcqlnlsmjpygrca` confirms `kcd_operation_protocol()`, `apply_node_ops(uuid,jsonb)`, `apply_experience_plan(uuid,jsonb)` and `publish_kcd_document(uuid,uuid,text,jsonb,jsonb,text)` are absent. `mail_forwarding_rules`, `worker_profiles`, `job_listings`, `liguey_applicant_insights`, `yande_interactions`, `marketplace_creative_assets` and `creative_asset_library` are also absent. Hosted migration history ends at `20260922012040_fix_studio_design_owner_returning_rls`, and its historical versions differ from canonical source filenames. Blindly applying the full canonical chain would not be a reviewed deployment plan.

No production migration, production promotion or DNS change occurred in this slice. Required hosted schema reconciliation, signed-in Auth/REST/Storage/RLS QA, actual providers, all May pages and exact-reference choreography, crop hitbox/rotated manipulation, independent frame axes, remaining Studio COS and 3J/99 acceptance remain open.
