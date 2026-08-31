# K-Direction on Kebu

**Site #1** in the Kebu repo. Canonical path: `kebu-sites/k-direction/`.

## What you asked for

- Repo renamed **Alkebulan-platform → Kebu** on GitHub ✓  
- **No more `alkebulan/` folder** — now `kebu-sites/` ✓  
- **K-Direction = first Kebu-built website** ✓  
- **End-to-end verified** (contact → DB, job apply → DB) ✓  

## Two parts of Kebu (don’t mix them)

| Part | Where | What |
| --- | --- | --- |
| **Kebu platform** | Repo root | Sign in, Kebu ID, Opportunity OS, `/create` website builder |
| **K-Direction** | `kebu-sites/k-direction/` | Real label site + portal (separate Next.js app, separate Vercel project) |

K-Direction is the **template** for the next brand sites you add under `kebu-sites/`.

## Run K-Direction locally

```bash
cd kebu-sites/k-direction
cp env.example .env
npm install
npm run db:setup
npm run dev
```

- http://127.0.0.1:3100 — public site  
- http://127.0.0.1:3100/portal — staff CMS  

Verify: `npm run e2e` (with dev server running)

## Deploy on Vercel

1. New project → GitHub repo **Kebu**  
2. **Root Directory:** `kebu-sites/k-direction`  
3. Env: `DATABASE_URL`, `PORTAL_PASSWORD`, `PORTAL_SECRET`  

Platform Kebu (repo root) = separate Vercel project.

## Bug fixed today

Contact form returned “success” but did not always write to the same SQLite file as the server. Fixed in `lib/db.ts` (one absolute DB path) and verified with E2E.

## Push to GitHub

Local files are ready but **not pushed** until Cursor has **write** access to `mbayangxo/Kebu`.  
GitHub App → add **Kebu** (or All repositories) → Save → commit/push from a Kebu agent.

## Rect

Rect can keep the old branch as history. **Source of truth is now `kebu-sites/k-direction` in the Kebu repo.**
