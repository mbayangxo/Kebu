import JSZip from "jszip";
import { beforeEach, describe, expect, it, vi } from "vitest";

const deps = vi.hoisted(() => ({ auth: vi.fn() }));
vi.mock("@/lib/create/auth", () => ({ requireUser: deps.auth, logCreate: vi.fn() }));

const serviceClientMock = vi.hoisted(() => ({ client: null as unknown }));
vi.mock("@/lib/opportunity/admin", () => ({ createServiceClient: () => serviceClientMock.client }));

const notifyDeps = vi.hoisted(() => ({ maybeNotify: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ fakeAdminClient: true }) }));
vi.mock("@/lib/cloud/storage-notify", () => ({ maybeNotifyCloudStorageThreshold: notifyDeps.maybeNotify }));

import { POST as uploadVersion } from "@/app/api/cloud/deployments/[deploymentId]/versions/route";
import { POST as promoteVersion } from "@/app/api/cloud/deployments/[deploymentId]/versions/[versionId]/promote/route";
import { POST as createBucket } from "@/app/api/cloud/buckets/route";
import { GET as serveCloudSite } from "@/app/cloud-sites/[slug]/[...path]/route";

const owner = "11111111-1111-4111-8111-111111111111";
const deploymentId = "33333333-3333-4333-8333-333333333333";
const versionId = "44444444-4444-4444-8444-444444444444";

function chain(result: { data: unknown; error: unknown }) {
  const q: Record<string, unknown> = {};
  const methods = ["select", "insert", "update", "delete", "eq", "gt", "order", "limit", "maybeSingle", "single", "in"];
  for (const m of methods) q[m] = vi.fn(() => q);
  (q.single as ReturnType<typeof vi.fn>).mockImplementation(async () => result);
  (q.maybeSingle as ReturnType<typeof vi.fn>).mockImplementation(async () => result);
  // A bare await on the chain (no terminal call) resolves to `result` too —
  // several routes just `await supabase.from(...).select(...).eq(...)`.
  q.then = ((resolve: (v: unknown) => void) => resolve(result)) as unknown;
  return q;
}

function storageMock(overrides: Partial<Record<string, (...args: unknown[]) => unknown>> = {}) {
  const bucketApi = {
    upload: vi.fn(async () => ({ data: { path: "x" }, error: null })),
    remove: vi.fn(async () => ({ data: [], error: null })),
    download: vi.fn(async () => ({ data: new Blob(["hi"]), error: null })),
    createSignedUrl: vi.fn(async () => ({ data: { signedUrl: "https://signed" }, error: null })),
    ...overrides,
  };
  return { from: vi.fn(() => bucketApi), _bucketApi: bucketApi };
}

async function zipBuffer(files: Record<string, string>): Promise<Buffer> {
  const zip = new JSZip();
  for (const [p, c] of Object.entries(files)) zip.file(p, c);
  return zip.generateAsync({ type: "nodebuffer" });
}

function bundleFormData(buf: Buffer): FormData {
  const fd = new FormData();
  fd.set("bundle", new File([new Uint8Array(buf)], "site.zip", { type: "application/zip" }));
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  notifyDeps.maybeNotify.mockResolvedValue(false);
});

describe("POST /api/cloud/deployments/[id]/versions", () => {
  it("rejects an invalid deployment id before touching the database", async () => {
    deps.auth.mockResolvedValue({ user: { id: owner }, supabase: { from: () => { throw new Error("must not query"); } } });
    const req = new Request("https://kebu.test/x", { method: "POST", body: bundleFormData(await zipBuffer({ "index.html": "<h1>hi</h1>" })) });
    const res = await uploadVersion(req, { params: Promise.resolve({ deploymentId: "not-a-uuid" }) });
    expect(res.status).toBe(400);
  });

  it("404s when the deployment isn't owned by the caller (RLS-equivalent at the app layer)", async () => {
    const supabase = { from: () => chain({ data: null, error: null }), storage: storageMock() };
    deps.auth.mockResolvedValue({ user: { id: owner }, supabase });
    const req = new Request("https://kebu.test/x", { method: "POST", body: bundleFormData(await zipBuffer({ "index.html": "hi" })) });
    const res = await uploadVersion(req, { params: Promise.resolve({ deploymentId }) });
    expect(res.status).toBe(404);
  });

  it("rejects a bundle whose decompressed size exceeds the remaining plan quota, without writing anything to storage", async () => {
    const storage = storageMock();
    let callCount = 0;
    const supabase = {
      from: (table: string) => {
        callCount += 1;
        if (table === "cloud_deployments" && callCount === 1) return chain({ data: { id: deploymentId }, error: null });
        if (table === "cloud_storage_files") return chain({ data: [], error: null });
        if (table === "cloud_deployment_versions") return chain({ data: [{ size_bytes: 495 * 1024 * 1024 }], error: null });
        return chain({ data: [], error: null });
      },
      storage,
    };
    deps.auth.mockResolvedValue({ user: { id: owner }, supabase });
    const big = Buffer.alloc(10 * 1024 * 1024, "a"); // free tier is 500MB total; 495 already used + 10MB more exceeds it
    const req = new Request("https://kebu.test/x", { method: "POST", body: bundleFormData(await zipBuffer({ "index.html": "<h1>hi</h1>", "big.js": big.toString() })) });
    const res = await uploadVersion(req, { params: Promise.resolve({ deploymentId }) });
    expect(res.status).toBe(413);
    expect(storage._bucketApi.upload).not.toHaveBeenCalled();
  });

  it("rejects a bundle with a disallowed file extension before uploading anything", async () => {
    const storage = storageMock();
    const supabase = {
      from: (table: string) => {
        if (table === "cloud_deployments") return chain({ data: { id: deploymentId }, error: null });
        return chain({ data: [], error: null });
      },
      storage,
    };
    deps.auth.mockResolvedValue({ user: { id: owner }, supabase });
    const req = new Request("https://kebu.test/x", { method: "POST", body: bundleFormData(await zipBuffer({ "index.html": "hi", "shell.exe": "MZ" })) });
    const res = await uploadVersion(req, { params: Promise.resolve({ deploymentId }) });
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toMatch(/unsupported file type/i);
    expect(storage._bucketApi.upload).not.toHaveBeenCalled();
  });

  it("uploads each extracted asset and records a real version row on a valid bundle", async () => {
    const storage = storageMock();
    let versionsCalls = 0;
    const supabase = {
      from: (table: string) => {
        if (table === "cloud_deployments") return chain({ data: { id: deploymentId }, error: null });
        if (table === "cloud_storage_files") return chain({ data: [], error: null });
        if (table === "cloud_deployment_versions") {
          versionsCalls += 1;
          // 1st call: quota's plain select (expects an array). 2nd: the
          // lastVersion lookup (.order().limit().maybeSingle()). 3rd: the
          // insert().select().single() that actually records the version.
          if (versionsCalls === 1) return chain({ data: [], error: null });
          if (versionsCalls === 2) return chain({ data: null, error: null });
          return chain({ data: { id: versionId, version_number: 1, size_bytes: 20, file_count: 2, created_at: "2026-01-01" }, error: null });
        }
        return chain({ data: [], error: null });
      },
      storage,
    };
    deps.auth.mockResolvedValue({ user: { id: owner }, supabase });
    const req = new Request("https://kebu.test/x", { method: "POST", body: bundleFormData(await zipBuffer({ "index.html": "<h1>hi</h1>", "style.css": "body{}" })) });
    const res = await uploadVersion(req, { params: Promise.resolve({ deploymentId }) });
    expect(res.status).toBe(200);
    expect(storage._bucketApi.upload).toHaveBeenCalledTimes(2);
  });

  it("checks the storage-warning threshold after a successful version upload, using real post-upload usage", async () => {
    const storage = storageMock();
    let versionsCalls = 0;
    const supabase = {
      from: (table: string) => {
        if (table === "cloud_deployments") return chain({ data: { id: deploymentId }, error: null });
        if (table === "cloud_storage_files") return chain({ data: [], error: null });
        if (table === "cloud_deployment_versions") {
          versionsCalls += 1;
          // 1: pre-upload quota select (array). 2: lastVersion lookup
          // (single row via maybeSingle). 3: insert().select().single() for
          // the new version. 4: post-upload quota re-check select (array
          // again) -- usage now sits at 490MB of the free tier's 500MB cap.
          if (versionsCalls === 1) return chain({ data: [], error: null });
          if (versionsCalls === 2) return chain({ data: null, error: null });
          if (versionsCalls === 3) return chain({ data: { id: versionId, version_number: 1, size_bytes: 20, file_count: 2, created_at: "2026-01-01" }, error: null });
          return chain({ data: [{ size_bytes: 490 * 1024 * 1024 }], error: null });
        }
        return chain({ data: [], error: null });
      },
      storage,
    };
    deps.auth.mockResolvedValue({ user: { id: owner }, supabase });
    const req = new Request("https://kebu.test/x", { method: "POST", body: bundleFormData(await zipBuffer({ "index.html": "<h1>hi</h1>" })) });
    const res = await uploadVersion(req, { params: Promise.resolve({ deploymentId }) });
    expect(res.status).toBe(200);
    expect(notifyDeps.maybeNotify).toHaveBeenCalledTimes(1);
    const [adminArg, ownerArg, quotaArg] = notifyDeps.maybeNotify.mock.calls[0]!;
    expect(adminArg).toEqual({ fakeAdminClient: true });
    expect(ownerArg).toBe(owner);
    expect(quotaArg.usedBytes).toBe(490 * 1024 * 1024);
  });
});

describe("POST /api/cloud/deployments/[id]/versions/[versionId]/promote", () => {
  it("404s a version that doesn't belong to this deployment", async () => {
    const supabase = {
      from: (table: string) => {
        if (table === "cloud_deployments") return chain({ data: { id: deploymentId, slug: "my-app" }, error: null });
        if (table === "cloud_deployment_versions") return chain({ data: null, error: null });
        return chain({ data: null, error: null });
      },
    };
    deps.auth.mockResolvedValue({ user: { id: owner }, supabase });
    const res = await promoteVersion(new Request("https://kebu.test/x", { method: "POST" }), {
      params: Promise.resolve({ deploymentId, versionId }),
    });
    expect(res.status).toBe(404);
  });

  it("promotes and returns the real cloud.kebu.africa live URL for the deployment's slug", async () => {
    const supabase = {
      from: (table: string) => {
        if (table === "cloud_deployments") return chain({ data: { id: deploymentId, slug: "my-app" }, error: null });
        if (table === "cloud_deployment_versions") return chain({ data: { id: versionId }, error: null });
        return chain({ data: null, error: null });
      },
    };
    deps.auth.mockResolvedValue({ user: { id: owner }, supabase });
    const res = await promoteVersion(new Request("https://kebu.test/x", { method: "POST" }), {
      params: Promise.resolve({ deploymentId, versionId }),
    });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.liveUrl).toBe("https://my-app.cloud.kebu.africa");
  });
});

describe("POST /api/cloud/buckets", () => {
  it("rejects an uppercase/invalid bucket name without querying the database", async () => {
    deps.auth.mockResolvedValue({ user: { id: owner }, supabase: { from: () => { throw new Error("must not query"); } } });
    const res = await createBucket(new Request("https://kebu.test/x", { method: "POST", body: JSON.stringify({ name: "Not Valid!" }), headers: { "Content-Type": "application/json" } }));
    expect(res.status).toBe(400);
  });

  it("maps a unique-constraint violation to a 409, not a generic 500", async () => {
    const supabase = { from: () => chain({ data: null, error: { message: "duplicate key value violates unique constraint" } }) };
    deps.auth.mockResolvedValue({ user: { id: owner }, supabase });
    const res = await createBucket(new Request("https://kebu.test/x", { method: "POST", body: JSON.stringify({ name: "docs" }), headers: { "Content-Type": "application/json" } }));
    expect(res.status).toBe(409);
  });
});

describe("Cloud mutation routes reject cross-origin requests (real assertSameOriginMutation, not mocked)", () => {
  it("createBucket rejects a request whose Origin doesn't match Host, before touching the database", async () => {
    deps.auth.mockResolvedValue({ user: { id: owner }, supabase: { from: () => { throw new Error("must not query — CSRF check should short-circuit first"); } } });
    const res = await createBucket(new Request("https://kebu.africa/api/cloud/buckets", {
      method: "POST",
      body: JSON.stringify({ name: "evil" }),
      headers: { "Content-Type": "application/json", Origin: "https://attacker.cloud.kebu.africa", Host: "kebu.africa" },
    }));
    expect(res.status).toBe(403);
  });

  it("createBucket still accepts a same-origin request (Origin matches Host)", async () => {
    const supabase = { from: () => chain({ data: { id: "b1", name: "docs", visibility: "private", created_at: "now" }, error: null }) };
    deps.auth.mockResolvedValue({ user: { id: owner }, supabase });
    const res = await createBucket(new Request("https://kebu.africa/api/cloud/buckets", {
      method: "POST",
      body: JSON.stringify({ name: "docs" }),
      headers: { "Content-Type": "application/json", Origin: "https://kebu.africa", Host: "kebu.africa" },
    }));
    expect(res.status).toBe(200);
  });

  it("promoteVersion rejects a cross-origin request before touching the database", async () => {
    deps.auth.mockResolvedValue({ user: { id: owner }, supabase: { from: () => { throw new Error("must not query — CSRF check should short-circuit first"); } } });
    const res = await promoteVersion(new Request("https://kebu.africa/x", {
      method: "POST",
      headers: { Origin: "https://attacker.cloud.kebu.africa", Host: "kebu.africa" },
    }), { params: Promise.resolve({ deploymentId, versionId }) });
    expect(res.status).toBe(403);
  });

  it("uploadVersion (multipart zip) rejects a cross-origin request before touching the database", async () => {
    deps.auth.mockResolvedValue({ user: { id: owner }, supabase: { from: () => { throw new Error("must not query — CSRF check should short-circuit first"); } } });
    const req = new Request("https://kebu.africa/x", {
      method: "POST",
      body: bundleFormData(await zipBuffer({ "index.html": "<h1>hi</h1>" })),
      headers: { Origin: "https://attacker.cloud.kebu.africa", Host: "kebu.africa" },
    });
    const res = await uploadVersion(req, { params: Promise.resolve({ deploymentId }) });
    expect(res.status).toBe(403);
  });
});

describe("GET /cloud-sites/[slug]/[...path] — public static serving", () => {
  it("refuses a request that didn't come through the x-kebu-cloud-site middleware rewrite (direct main-origin access)", async () => {
    const req = new Request("https://kebu.africa/cloud-sites/my-app/index.html");
    const res = await serveCloudSite(req, { params: Promise.resolve({ slug: "my-app", path: ["index.html"] }) });
    expect(res.status).toBe(404);
  });

  it("404s a slug with no live version, even with the correct header", async () => {
    serviceClientMock.client = { from: () => chain({ data: null, error: null }), storage: storageMock() };
    const req = new Request("https://my-app.cloud.kebu.africa/index.html", { headers: { "x-kebu-cloud-site": "1" } });
    const res = await serveCloudSite(req, { params: Promise.resolve({ slug: "my-app", path: ["index.html"] }) });
    expect(res.status).toBe(404);
  });

  it("serves the real asset bytes with the correct sniffed content-type and nosniff header when live", async () => {
    const storage = storageMock();
    serviceClientMock.client = {
      from: (table: string) => {
        if (table === "cloud_deployments") return chain({ data: { live_version_id: versionId }, error: null });
        if (table === "cloud_deployment_versions") return chain({ data: { storage_prefix: `${deploymentId}/v1` }, error: null });
        throw new Error(`unexpected table ${table}`);
      },
      storage,
    };
    const req = new Request("https://my-app.cloud.kebu.africa/style.css", { headers: { "x-kebu-cloud-site": "1" } });
    const res = await serveCloudSite(req, { params: Promise.resolve({ slug: "my-app", path: ["style.css"] }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/css");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });
});
