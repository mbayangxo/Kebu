# User flows

Journey narratives and diagrams for Kebu products.

**UX architecture:** `docs/product/UX_SPECIFICATION.md`  
**Screen specs:** `docs/screens/`

---

## Format

One file per major journey, e.g.:

```
first-publish.md
shop-checkout.md
team-invite-accept.md
kebu-id-create.md
```

Each flow should include:

1. **Actor** (persona + auth state)  
2. **Entry point**  
3. **Steps** (with screen spec links)  
4. **Success outcome**  
5. **Failure branches**  
6. **Persistence checkpoints** (what must survive refresh)  

Optional: Mermaid diagram in the markdown file.

---

## Status

Add flows when a vertical slice is **assigned** — do not invent empty placeholder flows for future products.
