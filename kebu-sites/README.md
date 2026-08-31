# Kebu sites

Each folder here is a **real brand website** built with Kebu — its own Next.js app, database, and Vercel project.

| Site | Folder | Port | Notes |
| --- | --- | --- | --- |
| **K-Direction** (first site) | `k-direction/` | 3100 | Label site + `/portal` CMS. Tickets on Joko. |

## Add the next site

1. Copy `kebu-sites/k-direction` → `kebu-sites/<new-name>`
2. Update brand in `content/site.ts`, seed data, `.env`
3. Add a row to `sites.json`
4. Deploy on Vercel with **Root Directory** = `kebu-sites/<new-name>`

## K-Direction — run locally

```bash
cd kebu-sites/k-direction
cp env.example .env
npm install
npm run db:setup
npm run dev
```

- Public site: http://127.0.0.1:3100  
- Portal: http://127.0.0.1:3100/portal  

## Repo

Home: [github.com/mbayangxo/Kebu](https://github.com/mbayangxo/Kebu) (formerly Alkebulan-platform).

Do **not** deploy these inside the JOKO payments repo. Do **not** keep the canonical copy only in Rect — this folder in **Kebu** is the source of truth.
