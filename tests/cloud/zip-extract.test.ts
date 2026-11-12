import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { extractDeploymentZip, sanitizeZipEntryPath } from "@/lib/cloud/zip-extract";

async function buildZip(files: Record<string, string | Buffer>): Promise<Buffer> {
  const zip = new JSZip();
  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content);
  }
  return zip.generateAsync({ type: "nodebuffer" });
}

describe("sanitizeZipEntryPath", () => {
  it("accepts a normal relative path", () => {
    expect(sanitizeZipEntryPath("index.html")).toBe("index.html");
    expect(sanitizeZipEntryPath("css/style.css")).toBe("css/style.css");
  });

  it("rejects parent-directory traversal", () => {
    expect(sanitizeZipEntryPath("../index.html")).toBeNull();
    expect(sanitizeZipEntryPath("css/../../index.html")).toBeNull();
    expect(sanitizeZipEntryPath("..")).toBeNull();
  });

  it("strips a leading slash (harmless here -- it only ever becomes a storage-key suffix, never a real filesystem path) but still rejects backslash-style traversal", () => {
    expect(sanitizeZipEntryPath("/etc/passwd")).toBe("etc/passwd");
    expect(sanitizeZipEntryPath("..\\..\\windows\\system32")).toBeNull();
  });

  it("rejects empty, directory-only, or null-byte paths", () => {
    expect(sanitizeZipEntryPath("")).toBeNull();
    expect(sanitizeZipEntryPath("dir/")).toBeNull();
    expect(sanitizeZipEntryPath("a\0b")).toBeNull();
  });
});

describe("extractDeploymentZip", () => {
  it("extracts a valid bundle with an index.html", async () => {
    const buf = await buildZip({ "index.html": "<h1>hi</h1>", "style.css": "body{}" });
    const result = await extractDeploymentZip(buf, 10 * 1024 * 1024);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.files.map((f) => f.relativePath).sort()).toEqual(["index.html", "style.css"]);
      expect(result.files.find((f) => f.relativePath === "index.html")?.mimeType).toBe("text/html");
    }
  });

  it("rejects a bundle with no index.html", async () => {
    const buf = await buildZip({ "about.html": "<p>about</p>" });
    const result = await extractDeploymentZip(buf, 10 * 1024 * 1024);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/index\.html/);
  });

  // Not tested at the extractDeploymentZip integration level: JSZip's own
  // file() writer already path-cleans a traversal entry like
  // "../../x/evil.html" down to "x/evil.html" before it's even in the zip
  // bytes (confirmed directly -- Object.keys(zip.files) after zip.file()
  // with that name shows the cleaned path), and JSZip.loadAsync normalizes
  // again on read. So a zip built with this library can't actually carry a
  // raw ".." entry into extractDeploymentZip to begin with -- the real
  // enforcement point this code controls is sanitizeZipEntryPath itself
  // (tested directly above), which is also what runs against whatever a
  // non-JSZip-built malicious zip's central directory might still contain.

  it("rejects disallowed file extensions (static web assets only)", async () => {
    const buf = await buildZip({ "index.html": "<h1>hi</h1>", "server.php": "<?php system($_GET['c']); ?>" });
    const result = await extractDeploymentZip(buf, 10 * 1024 * 1024);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/unsupported file type/i);
  });

  it("rejects a bundle whose real decompressed size exceeds the remaining quota", async () => {
    const big = Buffer.alloc(2 * 1024 * 1024, "a");
    const buf = await buildZip({ "index.html": "<h1>hi</h1>", "big.js": big });
    const result = await extractDeploymentZip(buf, 1024 * 1024); // 1 MB cap, file alone is 2MB
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/quota|limit/i);
  });

  it("rejects an invalid zip file", async () => {
    const result = await extractDeploymentZip(Buffer.from("not a zip"), 10 * 1024 * 1024);
    expect(result.ok).toBe(false);
  });

  it("rejects an empty zip", async () => {
    const buf = await new JSZip().generateAsync({ type: "nodebuffer" });
    const result = await extractDeploymentZip(buf, 10 * 1024 * 1024);
    expect(result.ok).toBe(false);
  });
});
