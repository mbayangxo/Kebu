import { execFileSync } from "node:child_process";

// Read/fetch only: never reset, clean, stash, checkout, rebase or overwrite a user's work.
const expected = "work/kebu-completion-audit-oct13";
const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
try {
  const branch = git("branch", "--show-current");
  if (!branch) throw Error("Detached HEAD: create an isolated working branch before editing. No files were changed.");
  git("fetch", "--no-tags", "origin", `refs/heads/${expected}:refs/remotes/origin/${expected}`);
  const [ahead, behind] = git("rev-list", "--left-right", "--count", `HEAD...origin/${expected}`).split(/\s+/).map(Number);
  const sha = git("rev-parse", "HEAD");
  if (behind) throw Error(`Checkout is ${behind} commit(s) behind GitHub and ${ahead} ahead. Stop: reconcile without discarding local work. Never reset or force-push to bypass this check.`);
  // During a no-push hold, the consolidated local branch can be newer than
  // origin. A feature checkout must contain it too, or it can silently lose
  // fixes while still passing the GitHub-only continuity check above.
  let localCheckpoint = null;
  try { localCheckpoint = git("rev-parse", "--verify", `refs/heads/${expected}`); } catch { /* Fresh clones may only have the remote ref. */ }
  if (localCheckpoint && localCheckpoint !== sha) {
    const localBehind = Number(git("rev-list", "--count", `HEAD..refs/heads/${expected}`));
    if (localBehind) throw Error(`Checkout is missing ${localBehind} commit(s) from the consolidated local ${expected} branch. Stop: reconcile that branch before editing; preserve existing work. No files were changed.`);
  }
  const dirty = Boolean(git("status", "--porcelain"));
  console.log(JSON.stringify({ branch, authoritativeBranch: expected, localCheckpoint, commit: sha, ahead, behind, dirty, durable: ahead === 0 && !dirty }));
  if (ahead || dirty) console.warn("Local work is not fully backed up. Preserve a recovery checkpoint; push only when authorized and keep any deployment hold in force.");
} catch (error) {
  // Do not print raw Git transport errors: remote URLs may contain credentials.
  console.error(error instanceof Error && !('status' in error) ? error.message : "Could not verify the GitHub checkpoint. Check repository access before continuing; no local files were changed.");
  process.exitCode = 1;
}
