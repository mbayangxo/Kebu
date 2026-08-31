# K-Direction

**Site #1 on Kebu.** Music label website + staff portal. Brand: **K-DIRECTION / K-DIRECTION CORP.** Not Rect Sound.

Registry: [`../sites.json`](../sites.json) · Kebu sites guide: [`../README.md`](../README.md)

The `/portal` on this site is this brand’s CMS (artists, events, news, jobs, inquiries).

## Direct answers

| Question | Answer |
| --- | --- |
| **Where does it live?** | `kebu-sites/k-direction` in the [Kebu](https://github.com/mbayangxo/Kebu) repo |
| **Vercel?** | Separate project. **Root Directory:** `kebu-sites/k-direction` |
| **Photos?** | Portal upload on artists, blog posts, and events |
| **Edit blogs?** | `/portal` → Blog |
| **Portal?** | `/portal` — artists, events, settings |
| **Jobs + resumes?** | Careers apply form. Staff view at `/portal/applications` |
| **Tickets?** | **Joko only** — this site never checkouts |
| **Contact?** | Saved to portal inbox (`/portal/inquiries`) |
| **Database?** | Prisma + SQLite locally. Supabase SQL draft in `supabase/migrations/` |

## Run

```bash
cd kebu-sites/k-direction
cp env.example .env
npm install
npm run db:setup
npm run dev
```

- Site: http://127.0.0.1:3100  
- Portal: http://127.0.0.1:3100/portal  

## Verify (E2E)

With `npm run dev` running:

```bash
npm run e2e
```

Tests health, contact form → DB, job apply + resume → DB.
