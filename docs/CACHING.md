# Caching rules (Kebu)

## Problem we fixed

An old root service worker (`alkebulan-v1` / `kebu-app-v*`) cached HTML. After deploys, browsers kept showing the old landing (sidebar, Sign in) and broke login.

## Rules now

| Asset | Cache |
|-------|--------|
| App HTML / pages / APIs | **no-store** (middleware + `next.config.ts`) |
| `/_next/static/*` | long-lived immutable (fingerprinted) |
| `/sw.js` | kill-switch only — **no-store**, never caches pages |
| `/sw-site.js` | published sites only; **HTML network-first**, media cache-first |

## Client behavior

`PWARegister` detects legacy root workers / caches → clears them → one reload. Clean browsers register **nothing** at `/`.

## Do not

- Re-introduce a root SW that `cache.addAll(["/"])` or stale-while-revalidate HTML
- Cache `login`, `signup`, or marketing HTML offline
