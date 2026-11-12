# Consolidated source and preserved local history — October 28, 2026

The application source in this checkpoint is byte-for-byte Git-tree equivalent to local commit `38e9b2be8cdef3291e81ca9f255d209a43b4eeba` (tree `87f738e1d7970eab60e7e1cb5bceb77a6679de6b`). The recovery files are the only additional files.

The authenticated GitHub connector can share a source tree but cannot recreate the original commit authors. Rather than re-author recovered commits, this checkpoint preserves their exact Git objects in the split bundle below. The new source-sharing commit advances the existing shared branch without force or rewriting its existing history. Original local history remains recoverable.

Concatenate parts in filename order, verify the SHA-256, then inspect/fetch the bundle from this repository:

```bash
cat docs/recovery/kebu-consolidated-oct28.bundle.part-* > /tmp/kebu-consolidated-oct28.bundle
sha256sum /tmp/kebu-consolidated-oct28.bundle
git bundle verify /tmp/kebu-consolidated-oct28.bundle
git fetch /tmp/kebu-consolidated-oct28.bundle HEAD:refs/heads/recovery/kebu-original-history-oct28
```

Expected SHA-256: `cdd887738d67b453460d1e77ea18fd0f40f164e838489132fd059b10f8aaad47`. Bundle head: `38e9b2be8cdef3291e81ca9f255d209a43b4eeba`. All nine bundle prerequisites are ancestors of the existing remote base `1f677e7145cdc117c3a87e34ffd11c7f81b774ab`; they are available in a complete clone of this repository. Unshallow a shallow clone before verification.

Continue application development on `work/kebu-completion-audit-oct13`. The bundled branch is historical provenance, not another application version; the checkpoint already contains its combined source. Do not blindly merge it again.

GitHub source sharing is authorized. Automatic Vercel deployment is disabled for the shared branch. No production deployment, hosted migration, worker activation or owner project overwrite is included. See the May audit for actual local evidence and remaining launch requirements. Private artist project snapshots and authentication state are excluded.
