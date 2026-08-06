# AI Website Builder — Vertical Slice

## Scope

Authenticated business members can: choose template / AI / blank → validated structured site → editor with autosave → preview → publish to `/sites/{subdomain}` (and `*.kebu.africa` rewrite when DNS points here).

**Not in this slice:** stores, checkout, payments, analytics, community, funding.

## Apply migrations

`004_create_projects.sql` then `008_website_builder.sql` (and business migrations if linking businesses).

## Key routes

- `/create/new?businessId=` — wizard
- `/create/[id]` — editor
- `/create/[id]/preview` — preview
- `/sites/[subdomain]` — public published site
- `POST /api/projects/create-website`
- `POST /api/projects/[id]/publish`
- `GET /api/public/sites/[subdomain]`
- `GET /api/templates`

## AI

Server-side Anthropic only. Output must pass `website-v1` schema; one repair retry; no arbitrary code.

## Manual verify after migrate

1. Register business → Build Website → template → editor → edit → refresh  
2. Publish → open `/sites/{subdomain}`  
3. Other user cannot open `/create/{id}`  
4. Draft not visible on public URL until publish  
