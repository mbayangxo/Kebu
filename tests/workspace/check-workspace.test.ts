import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const script = resolve("scripts/check-workspace-checkpoint.mjs");
const branch = "work/kebu-completion-audit-oct13";
const roots: string[] = [];
const git = (cwd: string, ...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
function repository() {
  const root = mkdtempSync(join(tmpdir(), "kebu-continuity-")); roots.push(root);
  const work = join(root, "work"), origin = join(root, "origin.git");
  git(root, "init", "--bare", origin);
  git(root, "init", "--initial-branch", branch, work);
  git(work, "config", "user.name", "Local fixture");
  git(work, "config", "user.email", "fixture@example.test");
  writeFileSync(join(work, "base.txt"), "Remote base\n");
  git(work, "add", "base.txt"); git(work, "commit", "-m", "Remote fixture base");
  // All transport is between temporary local repositories. Never push or contact GitHub.
  git(origin, "fetch", work, `refs/heads/${branch}:refs/heads/${branch}`);
  git(work, "remote", "add", "origin", origin);
  git(work, "branch", "stale-feature");
  writeFileSync(join(work, "consolidated.txt"), "New local fixes\n");
  git(work, "add", "consolidated.txt"); git(work, "commit", "-m", "Consolidated fixture fix");
  return work;
}
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

describe("workspace local consolidation guard", () => {
  it("rejects a checkout that matches GitHub but lacks the newer local checkpoint without changing its work", () => {
    const work = repository(); git(work, "switch", "stale-feature");
    writeFileSync(join(work, "preserved.txt"), "Keep this draft\n");
    const before = git(work, "rev-parse", "HEAD");
    const result = spawnSync(process.execPath, [script], { cwd: work, encoding: "utf8" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("consolidated local");
    expect(git(work, "rev-parse", "HEAD")).toBe(before);
    expect(readFileSync(join(work, "preserved.txt"), "utf8")).toBe("Keep this draft\n");
  });
  it("accepts a feature checkout containing the newer local checkpoint while retaining the push hold", () => {
    const work = repository(); git(work, "switch", "-c", "current-feature");
    const result = spawnSync(process.execPath, [script], { cwd: work, encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ branch: "current-feature", localCheckpoint: git(work, "rev-parse", branch), behind: 0, ahead: 1, durable: false });
    expect(result.stderr).toContain("push only when authorized");
  });
});
