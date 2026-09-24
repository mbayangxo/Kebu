/**
 * Asset lifecycle reconciliation — unit tests
 *
 * Tests reconcileProjectAssets() against a mocked Supabase service client.
 * Covers:
 *   1. Orphan detection — storage-exists / DB-missing
 *   2. Grace period — orphan within 10 min is skipped
 *   3. Referenced asset protection — stale marking never deletes DB records
 *   4. Missing storage objects — DB-exists / storage-missing → stale marking
 *   5. Idempotency — already-stale records are not re-marked
 *   6. Stale clearing — storage reappears → stale_at is cleared
 *   7. Authorization scoping — only lists ownerId/projectId folder
 *   8. Retry safety — partial errors do not corrupt clean records
 *   9. DB fetch failure — returns immediately with error
 *  10. Storage list failure — falls back to marking all DB records stale
 *  11. URL-encoding safety — percent-encoded DB URLs match literal storage names
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  reconcileProjectAssets,
  extractStoragePath,
  buildPublicUrl,
  ORPHAN_GRACE_PERIOD_MS,
} from "@/lib/create/asset-reconciliation";

const SUPABASE_URL = "https://test.supabase.co";
const PROJECT_ID = "proj-abc123";
const OWNER_ID = "user-xyz789";
const FOLDER = `${OWNER_ID}/${PROJECT_ID}`;
const NOW = new Date("2026-06-01T12:00:00Z");

function makeUrl(filename: string) {
  return buildPublicUrl(SUPABASE_URL, `${FOLDER}/${filename}`);
}

function makeStorageObj(name: string, ageMinutes = 60) {
  const createdAt = new Date(NOW.getTime() - ageMinutes * 60 * 1000).toISOString();
  return { name, created_at: createdAt };
}

// ── Mock builder ──────────────────────────────────────────────────────────────

type MockSetup = {
  dbAssets?: Array<{ id: string; url: string; stale_at: string | null }>;
  storageObjects?: Array<{ name: string; created_at?: string }>;
  dbError?: string;
  storageError?: string;
  updateError?: string;
  storageDeleteError?: string;
};

function makeClient(setup: MockSetup) {
  const updateCalls: Array<{ id: string; patch: Record<string, unknown> }> = [];
  const deleteCalls: string[] = [];

  // Make the select/update chain for website_assets.
  const makeDbChain = () => {
    const resolveWith = setup.dbError
      ? { data: null, error: { message: setup.dbError } }
      : { data: setup.dbAssets ?? [], error: null };
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      // update() breaks out of the thenable chain and returns its own object.
      update: vi.fn((patch: Record<string, unknown>) => ({
        eq: vi.fn((col: string, id: string) => {
          if (col === "id") updateCalls.push({ id, patch });
          return Promise.resolve({
            error: setup.updateError ? { message: setup.updateError } : null,
          });
        }),
      })),
      // Thenable so that `await select().eq()` resolves correctly.
      then: (
        res: (v: unknown) => unknown,
        rej?: (e: unknown) => unknown,
      ) => Promise.resolve(resolveWith).then(res, rej),
    };
    return chain;
  };

  const storageMock = {
    from: vi.fn().mockReturnValue({
      list: vi.fn().mockResolvedValue(
        setup.storageError
          ? { data: null, error: { message: setup.storageError } }
          : { data: setup.storageObjects ?? [], error: null },
      ),
      remove: vi.fn((paths: string[]) => {
        deleteCalls.push(...paths);
        return Promise.resolve({
          error: setup.storageDeleteError ? { message: setup.storageDeleteError } : null,
        });
      }),
    }),
  };

  const client = {
    from: vi.fn((table: string) => {
      if (table === "website_assets") return makeDbChain();
      return {};
    }),
    storage: storageMock,
  };

  return { client, updateCalls, deleteCalls };
}

// ── 1. Orphan detection ───────────────────────────────────────────────────────

describe("asset reconciliation — orphan detection (storage-exists / DB-missing)", () => {
  it("deletes a storage object older than grace period with no DB record", async () => {
    const filename = "section-1234.jpg";
    const { client, deleteCalls } = makeClient({
      dbAssets: [], // no DB records
      storageObjects: [makeStorageObj(filename, 60)], // 60-min-old object
    });

    const result = await reconcileProjectAssets(
      client as never,
      PROJECT_ID,
      OWNER_ID,
      SUPABASE_URL,
      { now: NOW },
    );

    expect(result.orphansDeleted).toBe(1);
    expect(result.orphansSkipped).toBe(0);
    expect(deleteCalls).toContain(`${FOLDER}/${filename}`);
    expect(result.errors).toHaveLength(0);
  });

  it("skips a DB-matched storage object (not an orphan)", async () => {
    const filename = "section-1234.jpg";
    const { client, deleteCalls } = makeClient({
      dbAssets: [{ id: "asset-1", url: makeUrl(filename), stale_at: null }],
      storageObjects: [makeStorageObj(filename, 60)],
    });

    const result = await reconcileProjectAssets(
      client as never,
      PROJECT_ID,
      OWNER_ID,
      SUPABASE_URL,
      { now: NOW },
    );

    expect(result.orphansDeleted).toBe(0);
    expect(deleteCalls).toHaveLength(0);
  });
});

// ── 2. Grace period ───────────────────────────────────────────────────────────

describe("asset reconciliation — grace period", () => {
  it("skips an orphaned storage object younger than grace period (5 min)", async () => {
    const { client, deleteCalls } = makeClient({
      dbAssets: [],
      storageObjects: [makeStorageObj("new-section-9999.jpg", 5)], // 5-min-old
    });

    const result = await reconcileProjectAssets(
      client as never,
      PROJECT_ID,
      OWNER_ID,
      SUPABASE_URL,
      { now: NOW },
    );

    expect(result.orphansSkipped).toBe(1);
    expect(result.orphansDeleted).toBe(0);
    expect(deleteCalls).toHaveLength(0);
  });

  it("deletes once past the grace period (11 min > 10 min default)", async () => {
    const { client, deleteCalls } = makeClient({
      dbAssets: [],
      storageObjects: [makeStorageObj("old-orphan.jpg", 11)],
    });

    const result = await reconcileProjectAssets(
      client as never,
      PROJECT_ID,
      OWNER_ID,
      SUPABASE_URL,
      { now: NOW },
    );

    expect(result.orphansDeleted).toBe(1);
    expect(deleteCalls).toHaveLength(1);
  });

  it("grace period is configurable via options.gracePeriodMs", async () => {
    const { client, deleteCalls } = makeClient({
      dbAssets: [],
      storageObjects: [makeStorageObj("obj.jpg", 6)], // 6 min old
    });

    // With a 5-minute grace period, 6-minute-old orphan should be deleted.
    const result = await reconcileProjectAssets(
      client as never,
      PROJECT_ID,
      OWNER_ID,
      SUPABASE_URL,
      { now: NOW, gracePeriodMs: 5 * 60 * 1000 },
    );

    expect(result.orphansDeleted).toBe(1);
    expect(deleteCalls).toHaveLength(1);
  });

  it("ORPHAN_GRACE_PERIOD_MS constant is 10 minutes", () => {
    expect(ORPHAN_GRACE_PERIOD_MS).toBe(10 * 60 * 1000);
  });
});

// ── 3. Referenced-asset protection: stale marking never deletes DB records ────

describe("asset reconciliation — referenced asset protection", () => {
  it("marks missing-storage DB record stale — does not delete the DB record", async () => {
    const filename = "logo-used.jpg";
    const { client, updateCalls, deleteCalls } = makeClient({
      dbAssets: [{ id: "asset-ref", url: makeUrl(filename), stale_at: null }],
      storageObjects: [], // storage object is missing
    });

    const result = await reconcileProjectAssets(
      client as never,
      PROJECT_ID,
      OWNER_ID,
      SUPABASE_URL,
      { now: NOW },
    );

    expect(result.staleMarked).toBe(1);
    // The DB record is marked stale — not deleted.
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0]?.id).toBe("asset-ref");
    expect(updateCalls[0]?.patch).toMatchObject({ stale_at: NOW.toISOString() });
    // Storage delete is NOT called for the DB record's path.
    expect(deleteCalls).toHaveLength(0);
  });
});

// ── 4. DB-exists / storage-missing → stale marking ───────────────────────────

describe("asset reconciliation — stale marking (DB-exists / storage-missing)", () => {
  it("marks stale_at on the DB record when storage object is absent", async () => {
    const { client, updateCalls } = makeClient({
      dbAssets: [
        { id: "a1", url: makeUrl("section-1.jpg"), stale_at: null },
        { id: "a2", url: makeUrl("section-2.jpg"), stale_at: null },
      ],
      storageObjects: [makeStorageObj("section-1.jpg", 60)], // only section-1 exists
    });

    const result = await reconcileProjectAssets(
      client as never,
      PROJECT_ID,
      OWNER_ID,
      SUPABASE_URL,
      { now: NOW },
    );

    expect(result.staleMarked).toBe(1);
    expect(result.checked).toBe(2);
    // Only section-2 (missing) is marked stale.
    expect(updateCalls.find((c) => c.id === "a2")).toBeDefined();
    expect(updateCalls.find((c) => c.id === "a1")).toBeUndefined();
  });
});

// ── 5. Idempotency — already-stale records ────────────────────────────────────

describe("asset reconciliation — idempotency", () => {
  it("already-stale records are counted but not re-marked (idempotent)", async () => {
    const { client, updateCalls } = makeClient({
      dbAssets: [
        { id: "a1", url: makeUrl("missing.jpg"), stale_at: "2026-05-01T00:00:00Z" },
      ],
      storageObjects: [], // still missing
    });

    const result = await reconcileProjectAssets(
      client as never,
      PROJECT_ID,
      OWNER_ID,
      SUPABASE_URL,
      { now: NOW },
    );

    expect(result.alreadyStale).toBe(1);
    expect(result.staleMarked).toBe(0);
    // No DB update was issued.
    expect(updateCalls).toHaveLength(0);
  });

  it("running twice on clean DB + storage is a no-op (no writes on second run)", async () => {
    const filename = "logo.jpg";
    const { client, updateCalls, deleteCalls } = makeClient({
      dbAssets: [{ id: "a1", url: makeUrl(filename), stale_at: null }],
      storageObjects: [makeStorageObj(filename, 60)], // both present
    });

    const r1 = await reconcileProjectAssets(client as never, PROJECT_ID, OWNER_ID, SUPABASE_URL, { now: NOW });
    const r2 = await reconcileProjectAssets(client as never, PROJECT_ID, OWNER_ID, SUPABASE_URL, { now: NOW });

    // Nothing stale, no orphans either run.
    expect(r1.staleMarked).toBe(0);
    expect(r1.orphansDeleted).toBe(0);
    expect(r2.staleMarked).toBe(0);
    expect(r2.orphansDeleted).toBe(0);
    expect(updateCalls).toHaveLength(0);
    expect(deleteCalls).toHaveLength(0);
  });
});

// ── 6. Stale clearing ─────────────────────────────────────────────────────────

describe("asset reconciliation — stale clearing", () => {
  it("clears stale_at when the storage object reappears", async () => {
    const filename = "restored.jpg";
    const { client, updateCalls } = makeClient({
      dbAssets: [{ id: "a1", url: makeUrl(filename), stale_at: "2026-05-01T00:00:00Z" }],
      storageObjects: [makeStorageObj(filename, 60)], // object is back
    });

    const result = await reconcileProjectAssets(
      client as never,
      PROJECT_ID,
      OWNER_ID,
      SUPABASE_URL,
      { now: NOW },
    );

    // staleMarked should be 0 — the object IS in storage.
    expect(result.staleMarked).toBe(0);
    // But stale_at should be cleared.
    const clearCall = updateCalls.find((c) => c.id === "a1");
    expect(clearCall).toBeDefined();
    expect(clearCall?.patch).toMatchObject({ stale_at: null });
  });
});

// ── 7. Authorization scoping ──────────────────────────────────────────────────

describe("asset reconciliation — authorization scoping", () => {
  it("lists storage only in ownerId/projectId folder", async () => {
    const { client } = makeClient({ dbAssets: [], storageObjects: [] });

    await reconcileProjectAssets(
      client as never,
      PROJECT_ID,
      OWNER_ID,
      SUPABASE_URL,
      { now: NOW },
    );

    const storageCalls = (client.storage.from as ReturnType<typeof vi.fn>).mock.calls;
    expect(storageCalls[0]?.[0]).toBe("site-assets");
    const listCalls = (client.storage.from("site-assets").list as ReturnType<typeof vi.fn>).mock.calls;
    const listedFolder = listCalls[0]?.[0] as string;
    expect(listedFolder).toBe(`${OWNER_ID}/${PROJECT_ID}`);
    // Must NOT list a different user's folder.
    expect(listedFolder).not.toContain("other-user");
  });
});

// ── 8. Retry safety ───────────────────────────────────────────────────────────

describe("asset reconciliation — retry safety", () => {
  it("collects non-fatal errors without aborting other records", async () => {
    const { client } = makeClient({
      dbAssets: [
        { id: "a1", url: makeUrl("a.jpg"), stale_at: null },
        { id: "a2", url: makeUrl("b.jpg"), stale_at: null },
      ],
      storageObjects: [], // both missing
      updateError: "DB update timed out",
    });

    const result = await reconcileProjectAssets(
      client as never,
      PROJECT_ID,
      OWNER_ID,
      SUPABASE_URL,
      { now: NOW },
    );

    // Both update attempts failed and are captured in errors.
    expect(result.errors.length).toBeGreaterThan(0);
    // But checked count reflects both were inspected.
    expect(result.checked).toBe(2);
  });

  it("reports storage delete error in errors without crashing", async () => {
    const { client } = makeClient({
      dbAssets: [],
      storageObjects: [makeStorageObj("orphan.jpg", 60)],
      storageDeleteError: "storage quota exceeded",
    });

    const result = await reconcileProjectAssets(
      client as never,
      PROJECT_ID,
      OWNER_ID,
      SUPABASE_URL,
      { now: NOW },
    );

    expect(result.orphansDeleted).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("storage quota exceeded");
  });
});

// ── 9. DB fetch failure ───────────────────────────────────────────────────────

describe("asset reconciliation — DB fetch failure", () => {
  it("returns immediately with error when DB fetch fails", async () => {
    const { client } = makeClient({ dbError: "connection refused" });

    const result = await reconcileProjectAssets(
      client as never,
      PROJECT_ID,
      OWNER_ID,
      SUPABASE_URL,
      { now: NOW },
    );

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("connection refused");
    expect(result.checked).toBe(0);
  });
});

// ── 10. Storage list failure ──────────────────────────────────────────────────

describe("asset reconciliation — storage list failure", () => {
  it("continues to mark stale DB records even if storage list fails", async () => {
    const { client, updateCalls } = makeClient({
      dbAssets: [{ id: "a1", url: makeUrl("photo.jpg"), stale_at: null }],
      storageObjects: undefined,
      storageError: "bucket not found",
    });

    const result = await reconcileProjectAssets(
      client as never,
      PROJECT_ID,
      OWNER_ID,
      SUPABASE_URL,
      { now: NOW },
    );

    // Storage list error is captured.
    expect(result.errors.some((e) => e.includes("bucket not found"))).toBe(true);
    // When storage list fails, storageObjects is empty — so all DB records look stale.
    expect(result.staleMarked).toBe(1);
    expect(updateCalls).toHaveLength(1);
  });
});

// ── 11. URL-encoding safety ───────────────────────────────────────────────────
//
// The storage API returns literal filenames (e.g. "my photo.jpg") while the DB
// may store the asset URL percent-encoded (e.g. "my%20photo.jpg").  Comparing
// reconstructed public URLs directly would treat such a file as an orphan and
// delete it.  The fix is to compare decoded storage paths, which normalises both
// sides to the same representation.

describe("asset reconciliation — URL-encoding safety", () => {
  it("does NOT delete a storage object whose DB URL is percent-encoded (spaces)", async () => {
    // The storage API returns the literal filename with a space.
    const literalName = "my photo.jpg";
    // The DB URL was stored with %20 encoding (as browsers/Supabase would generate it).
    const encodedUrl =
      `${SUPABASE_URL}/storage/v1/object/public/site-assets/${FOLDER}/my%20photo.jpg`;

    const { client, deleteCalls } = makeClient({
      dbAssets: [{ id: "a1", url: encodedUrl, stale_at: null }],
      storageObjects: [makeStorageObj(literalName, 60)],
    });

    const result = await reconcileProjectAssets(
      client as never,
      PROJECT_ID,
      OWNER_ID,
      SUPABASE_URL,
      { now: NOW },
    );

    // The file should NOT be treated as an orphan.
    expect(result.orphansDeleted).toBe(0);
    expect(deleteCalls).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it("does NOT delete a storage object whose DB URL has other percent-encoded chars", async () => {
    // Parentheses and plus signs in filenames are sometimes percent-encoded in URLs.
    const literalName = "hero (final)+v2.png";
    const encodedUrl =
      `${SUPABASE_URL}/storage/v1/object/public/site-assets/${FOLDER}/hero%20(final)%2Bv2.png`;

    const { client, deleteCalls } = makeClient({
      dbAssets: [{ id: "a2", url: encodedUrl, stale_at: null }],
      storageObjects: [makeStorageObj(literalName, 60)],
    });

    const result = await reconcileProjectAssets(
      client as never,
      PROJECT_ID,
      OWNER_ID,
      SUPABASE_URL,
      { now: NOW },
    );

    expect(result.orphansDeleted).toBe(0);
    expect(deleteCalls).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it("still deletes an actual orphan alongside URL-encoded matched files", async () => {
    const matchedLiteral = "matched photo.jpg";
    const matchedEncodedUrl =
      `${SUPABASE_URL}/storage/v1/object/public/site-assets/${FOLDER}/matched%20photo.jpg`;
    const orphanName = "orphan-file.jpg"; // no DB record at all

    const { client, deleteCalls } = makeClient({
      dbAssets: [{ id: "a1", url: matchedEncodedUrl, stale_at: null }],
      storageObjects: [
        makeStorageObj(matchedLiteral, 60),
        makeStorageObj(orphanName, 60),
      ],
    });

    const result = await reconcileProjectAssets(
      client as never,
      PROJECT_ID,
      OWNER_ID,
      SUPABASE_URL,
      { now: NOW },
    );

    // Only the real orphan is deleted; the matched (encoded) file is preserved.
    expect(result.orphansDeleted).toBe(1);
    expect(deleteCalls).toContain(`${FOLDER}/${orphanName}`);
    expect(deleteCalls).not.toContain(`${FOLDER}/${matchedLiteral}`);
    expect(result.errors).toHaveLength(0);
  });
});

// ── Utility functions ─────────────────────────────────────────────────────────

describe("asset reconciliation — utility functions", () => {
  it("extractStoragePath extracts path from well-formed public URL", () => {
    const url = "https://abc.supabase.co/storage/v1/object/public/site-assets/user/proj/img.jpg";
    expect(extractStoragePath(url)).toBe("user/proj/img.jpg");
  });

  it("extractStoragePath decodes percent-encoded paths", () => {
    const url = "https://abc.supabase.co/storage/v1/object/public/site-assets/user/proj/my%20photo.jpg";
    expect(extractStoragePath(url)).toBe("user/proj/my photo.jpg");
  });

  it("extractStoragePath returns null for non-storage URLs", () => {
    expect(extractStoragePath("https://example.com/image.jpg")).toBeNull();
    expect(extractStoragePath("not-a-url")).toBeNull();
  });

  it("buildPublicUrl constructs the expected URL", () => {
    const url = buildPublicUrl("https://abc.supabase.co", "user/proj/file.jpg");
    expect(url).toBe("https://abc.supabase.co/storage/v1/object/public/site-assets/user/proj/file.jpg");
  });
});
