# 3D nested per-device ordering — blueprint

2026-10-08 UTC. Existing Move up/down buttons, hierarchy and container child lists gain independent tablet/phone ordering. Desktop remains the base order. A native section/group stores an optional `childOrder` UUID list in base props/device overrides; its descriptor uses the custom order control, realized by the existing hierarchy actions rather than a raw JSON field.

Listed live children come first; newly inserted/unlisted children follow canonical order keys. Removed or reparented stale IDs cannot affect other containers. Hidden children retain their slots. Duplicating a subtree remaps its internal order references to copied IDs. Desktop canonical moves remain unchanged unless an explicit base childOrder exists. Tablet/phone moves update only the parent override and responsive state as one transaction. A selected nested child offers Use desktop order; clearing one device leaves the other intact. Locks on the element/parent, disabled save state, errors, history, reload and conflict behavior reuse established paths.

The hierarchy and renderer use one pure resolver. Public responsive CSS orders direct flex children (including link wrappers); section canvases become column flex containers only when responsive child ordering is present. Static public markup uses the selected/server device order, while CSS covers other breakpoints before hydration; screen-reader DOM order with JavaScript disabled remains the server order. No absolute-position coordinates or z-order change.

New snapshots with childOrder require renderer 5. Extend native section/group override allowlists and the service-only publisher's version list with a forward migration, tested only on disposable PostgreSQL/WASM. No auth/RLS/ownership change and no live migration/deploy.

Verify independent ordering, reset, hidden/new/removed/reparented children, subtree copy remapping, geometry/history invariance, SQL save/replay/publish, browser save/reload/Undo/Redo and public visual order with JavaScript off/on across three sizes. Re-run the full spatial browser/performance matrix and CI, visually inspect captures, preserve previous evidence.
