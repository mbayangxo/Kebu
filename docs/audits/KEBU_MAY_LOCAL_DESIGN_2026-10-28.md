# May native draft and Builder verification — October 28, 2026

## Result and scope

The private recovered May draft now has 14 native editable pages: Home, Music, Photos, Videos, May’s World, Shop, Updates, About May, Press, Audio, Maygazine, May by May, Mayjor Good and Contact. It is a local reference-informed candidate, not a launched website or an exact-reference acceptance claim. The original 13-page/36-section recovery snapshot is unchanged.

The user authorized sharing all reviewed source on GitHub so Claude can see it. Automatic Vercel deployment is disabled for the shared development branch. No production project, managed database, migration, DNS, worker or provider was activated.

## Repairs

- Normal Builder controls now add independent outlined text to collage scenes: body, typeface, size, colors, outline, alignment, stacking, rotation and geometry. Pointer/keyboard placement and per-device edits traverse existing canonical operations and responsive storage; text is not flattened into a picture.
- Videos have saved rectangle, oval, torn and ticket frames. Native manual controls remain rectangular for accessibility. Existing loop, scroll scrub, retry, reduced-motion and offscreen playback behavior remains functional.
- The actual May journey exposed the canonical 12-page ceiling against the existing website-v1 20-page format. Canonical operations, page API, direction/planning and generation now agree on 20 pages. Forward migration `20261028050000_builder_twenty_pages.sql` is tested against isolated migrated PostgreSQL. It is **not applied to hosted Supabase**. Do not ship only the client limit change.
- Original public Wix logo/photo files are localized byte-for-byte with a provenance map. Wix library stock portraits are excluded from the candidate. The missing local Steelfish font is recovered and its runtime third-party fallback removed. May’s face is unchanged; the decorative skyline is generated and the notebook is a replaceable SVG background.
- Native page introductions, responsive collage composition, notebook photo scene, contact form and scoped aesthetic CSS replace incomplete presentation. Original biography is retained. Blank media, sample products, fake phone, sample coverage, repeated logo-only sections and a website URL incorrectly used as an image are removed or given honest empty states.
- The supplied SoundCloud URL returned 404; foundation endpoints could not be verified. Music now offers the internal Contact destination, and foundation navigation resolves to the real internal Mayjor Good page. No invented artist profile, release, product, impact count or video was supplied.

## Evidence

| Gate | Result |
| --- | --- |
| Actual May candidate, normal `/create/{id}` shell | Every page edited and reopened at 1440px and 390px; 28 page/device journeys |
| Persistence | Browser operations → migrated isolated PostgreSQL → reload; zero legacy section writes |
| Published native snapshot | All 14 pages × both widths return 200; images load, no horizontal overflow, internal destinations resolve |
| Actual page interactions | Scroll transform changes and a real navigation click on each of the 28 page/device combinations |
| Collage/video browser suite | 20/20 pass, zero skips/failures/flakes |
| Contact UI → API → SQL/RLS | 6/6 pass, including phone inbox, ownership, failures, pagination and duplicate-safe retries; no real mail sent |
| SQL boundaries | 2/2 pass: responsive text/image persistence and pages 14/20 accepted, page 21 rejected atomically, stranger denied |
| Draft application | 3/3 pass: original preservation, native schema and repeat application; actual private export also validated |
| Required repository gates | TypeScript passes; lint 0 errors / 346 existing warnings; 6,752 tests pass / 415 explicit skips; production build passes |
| Migration hygiene | 114 unique canonical timestamped migrations; archived legacy bundles not executable |

One final combined CI attempt reached a generated `.next/build/chunks` ENOTEMPTY cleanup error after the first three gates passed. With prior build processes completed and generated cache removed, the standalone production build passed and generated 231 routes. This was a build-cache retry, not a hidden source failure.

Full-page Chromium captures can omit an offscreen composited image even when it reports loaded. A direct scrolled viewport review showed both notebook portraits painted correctly. The optional media review suite captures each portrait in its actual viewport and checks its rendered JPEG has image detail; full-page screenshots alone are not media acceptance.

The local harness uses controlled auth/API transport backed by real isolated SQL migrations and RLS. It does **not** establish managed Supabase GoTrue login, hosted owner editing, hosted submission delivery or public production acceptance. The private project snapshot and browser authentication state are not committed to the public repository.

## Still required before launch / exact-reference sign-off

1. Real May audio/video assets and confirmed listening destinations. Storage readback found one JPEG and no video/audio in the actual project prefix. Fixture clips prove player behavior only; they are not artist content.
2. Owner-authorized application of the candidate through the hosted product, the tested page-limit migration, an authorized deployment, and hosted owner save/publish/contact verification. The deployment hold remains in force.
3. Exact visual/choreography comparison. The original `ksendrdesign.ru/legallyblonderu` site currently shows a subscription-renewal/402 page; its Behance Vimeo walkthrough is viewable. The recreated native title/notebook scenes and tested motion capabilities do not certify every original scene, breakpoint or timing beat. Do not call the site pixel-identical or complete on the strength of schema/CI alone.

`scripts/build-may-reference-draft.mjs INPUT OUTPUT` produces the private candidate and standard website-v1 companion without mutating the input or writing to services. Optional real-candidate browser checks are `may-draft-journey.local.spec.ts` and `may-media-review.local.spec.ts` via the isolated native Builder harness. Keep screenshots and private test snapshots outside the public repository.
