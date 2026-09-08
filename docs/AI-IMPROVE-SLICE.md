# AI Improve (Website Builder)

Vertical slice: improve an existing draft website with AI. **Preview before persist** — owner confirms before draft changes. Does **not** auto-publish.

## Flow

Owner opens `/create/[id]` → **Ask your site** or Yande sidebar → plain-language instruction →

1. `POST /api/projects/[id]/ai-improve/preview` — Anthropic returns `website-v1` JSON → validate (+ one repair) → **deterministic change summary** → response includes `intents[]` + full `definition` (not persisted)
2. Canvas shows preview definition; owner reviews intent list
3. `POST /api/projects/[id]/ai-improve/apply` — validate `definition` again → `replaceWebsiteDefinition` → `website_versions` row labeled `AI improve` → editor reloads

Legacy `POST /api/projects/[id]/ai-improve` = preview only (same as `/preview`).

Live `/sites/{subdomain}` stays on the last **publish** until the owner publishes again.

## Files

- `lib/create/ai-improve.ts`
- `lib/create/ai-change-summary.ts`
- `lib/create/ai-improve-route.ts`
- `lib/create/persist-site.ts` (`replaceWebsiteDefinition`)
- `lib/create/website-schema.ts` (`aiImproveBriefSchema`)
- `app/api/projects/[id]/ai-improve/preview/route.ts`
- `app/api/projects/[id]/ai-improve/apply/route.ts`
- `app/components/create/builder-site-command-bar.tsx`
- `app/create/[id]/page.tsx`
- `tests/create/ai-improve.test.ts`

## Security

- Auth required; non-owner → 404
- Rate-limited on preview (`aiRateLimit`)
- Apply re-validates schema + unsafe content; no arbitrary HTML/code
- Missing `ANTHROPIC_API_KEY` → 502, draft unchanged

## Manual check

1. Create a template site at `/create/new`
2. Ask Yande → **Preview** → canvas updates, draft not saved yet
3. **Apply changes** → refresh proves new copy in DB
4. **Discard** before apply → canvas reverts to saved draft
5. Public live URL unchanged until Publish
6. Other user’s project id → 404
