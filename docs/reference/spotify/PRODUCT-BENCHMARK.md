# Spotify — Product benchmark (NOT a clone target)

**Use with:** annotated screenshots in this folder · **NOT** for Kebu Builder storefront — reference for **app shell**, discovery UX, persistent subordinate chrome.

---

## What it is

A **complete music streaming product** — discovery, library, social context, and playback — **not** “a big music player.”

---

## Systems to study

- Persistent **application shell** (desktop + mobile)  
- Discovery home · search · library · playlists  
- Album · artist · track pages  
- Queue · playback controls · recently played · recommendations · liked music  
- User profiles · responsive navigation  
- **Persistent playback state** — player always available but **visually subordinate**  

---

## What NOT to do (common AI mistake)

- Giant central player dominating the product  
- Single-screen “Spotify clone” with no discovery/library  
- Assuming dark theme + green = Spotify from the name alone  

---

| Area | Expected |
|------|----------|
| Navigation | Multi-level app shell |
| Search | Full search experience |
| Home | Personalized discovery |
| Library | Albums, artists, playlists, podcasts |
| Player | Persistent global player — **visually subordinate** |
| Queue | Dedicated interaction |
| Artist | Full artist page experience |
| Album | Full album page experience |
| Playlist | Full playlist management |
| Mobile | Different responsive composition (not shrunk desktop) |
| States | Loading · empty · error · offline |

**Spotify ≠ music player.** Decompose before code: `docs/product/KEBU-PRODUCT-ARCHITECT-PHASE.md`

---

## Kebu translation

- **Kebu Search** / Culture (RECT) = discovery-first patterns — not music player UI in Builder  
- **App chrome** lessons: persistent tools without hijacking the canvas (e.g. command bar, not modal hell)  
- Study **information density and hierarchy** from screenshots — not green gradients  

---

## Visual references

Add: `home.png`, `search.png`, `library.png`, `artist.png`, `album.png`, `player-chrome.png`
