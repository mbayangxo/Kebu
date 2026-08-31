# AI Improve (Website Builder)

Vertical slice: improve an existing draft website with AI, persist to DB, reload in the editor. Does **not** auto-publish.

## Flow

Owner opens `/create/[id]` → **Improve with AI** → optional plain-language instruction → `POST /api/projects/[id]/ai-improve` → Anthropic returns `website-v1` JSON → validate (+ one repair) → replace pages/sections → `website_versions` row labeled `AI improve` → editor reloads.

Live `/sites/{subdomain}` stays on the last **publish** until the owner publishes again.

## Files

- `lib/create/ai-improve.ts`
- `lib/create/persist-site.ts` (`replaceWebsiteDefinition`)
- `lib/create/website-schema.ts` (`aiImproveBriefSchema`)
- `app/api/projects/[id]/ai-improve/route.ts`
- `app/create/[id]/page.tsx`
- `tests/create/ai-improve.test.ts`

## Security

- Auth required; non-owner → 404
- Rate-limited (`aiRateLimit`)
- Schema + unsafe content checks; no arbitrary HTML/code
- Missing `ANTHROPIC_API_KEY` → 502, draft unchanged

## Manual check

1. Create a template site at `/create/new`
2. Improve with AI → refresh proves new copy
3. Public live URL unchanged until Publish
4. Other user’s project id → 404
