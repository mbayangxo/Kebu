import { afterEach, describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const roots: string[] = [];
const baseline = "work/kebu-completion-audit-oct13";
const script = path.resolve("scripts/check-workspace-checkpoint.mjs");
describe("workspace recovery guard", { timeout: 30000 }, () => {
afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })));

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), "kebu-continuity-"));
  roots.push(root);
  const git = (...args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: "pipe" }).trim();
  git("init", "-b", baseline);
  git("config", "user.name", "Continuity test");
  git("config", "user.email", "test@example.invalid");
  git("commit", "--allow-empty", "-m", "baseline");
  git("clone", "--bare", ".", "remote.git");
  git("remote", "add", "origin", path.join(root, "remote.git"));
  writeFileSync(path.join(root, ".gitignore"), "remote.git/\n");
  git("add", ".gitignore");
  git("commit", "-m", "ignore fixture remote");
  git("push", "origin", baseline);
  const check = () => spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8" });
  return { root, git, check };
}

it("allows isolated feature work containing the authoritative checkpoint and reports unpushed work", () => {
  const { git, check } = fixture();
  git("switch", "-c", "codex/isolated");
  expect(check().status).toBe(0);
  expect(JSON.parse(check().stdout)).toMatchObject({ branch: "codex/isolated", behind: 0, durable: true });
  git("commit", "--allow-empty", "-m", "local work");
  const result = check();
  expect(result.status).toBe(0);
  expect(JSON.parse(result.stdout)).toMatchObject({ ahead: 1, durable: false });
});

it("refuses stale and diverged branches without altering their working files or HEAD", () => {
  const { root, git, check } = fixture();
  git("switch", "-c", "codex/stale", "HEAD~1");
  git("commit", "--allow-empty", "-m", "other work");
  writeFileSync(path.join(root, "unsaved.txt"), "preserve this");
  const head = git("rev-parse", "HEAD");
  const status = git("status", "--porcelain");
  const result = check();
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("behind GitHub");
  expect(git("rev-parse", "HEAD")).toBe(head);
  expect(git("status", "--porcelain")).toBe(status);
});

it("refuses detached HEAD and unavailable remotes", () => {
  const { git, check } = fixture();
  git("checkout", "--detach");
  expect(check().stderr).toContain("Detached HEAD");
  git("switch", baseline);
  git("remote", "set-url", "origin", "/nonexistent/kebu-continuity-test");
  const result = check();
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("Could not verify");
  expect(result.stderr).not.toContain("/nonexistent");
});
});
