import { execFileSync } from "node:child_process";

// Read/fetch only: never reset, clean, stash, checkout, rebase or overwrite a user's work.
const expected = "work/kebu-completion-audit-oct13";
const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
try {
  const branch = git("branch", "--show-current");
  if (branch !== expected) throw Error(`Expected ${expected}; found ${branch || "detached HEAD"}. Preserve local changes before selecting the working branch.`);
  git("fetch", "--no-tags", "origin", `refs/heads/${expected}:refs/remotes/origin/${expected}`);
  const [ahead, behind] = git("rev-list", "--left-right", "--count", `HEAD...origin/${expected}`).split(/\s+/).map(Number);
  const sha = git("rev-parse", "HEAD");
  if (behind) throw Error(`Checkout is ${behind} commit(s) behind GitHub and ${ahead} ahead. Stop: reconcile without discarding local work. Never reset or force-push to bypass this check.`);
  const dirty = Boolean(git("status", "--porcelain"));
  console.log(JSON.stringify({ branch, commit: sha, ahead, behind, dirty, durable: ahead === 0 && !dirty }));
  if (ahead || dirty) console.warn("Local work is not fully backed up. Commit reviewed changes and push a checkpoint before ending the session.");
} catch (error) {
  // Do not print raw Git transport errors: remote URLs may contain credentials.
  console.error(error instanceof Error && !('status' in error) ? error.message : "Could not verify the GitHub checkpoint. Check repository access before continuing; no local files were changed.");
  process.exitCode = 1;
}
