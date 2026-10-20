# Durable Kebu development checkpoints

The authoritative development branch is `origin/work/kebu-completion-audit-oct13` in `mbayangxo/Kebu`. A temporary workspace, a chat summary or an unpushed local commit is not a durable checkpoint. Deployment serves the application; it does not repair an old source checkout.

## Start each fresh session

Run `npm run workspace:check` before editing. It fetches the named branch and reports the current SHA, ahead/behind counts, dirty state and whether all work is durable. Wrong branch, failed fetch, missing remote checkpoint, behind or diverged history stop the check. The script never changes working files or rewrites history.

If behind with a clean tree and no local commits, fast-forward to the fetched branch. If dirty or diverged, preserve a patch/untracked files and reconcile deliberately. Never reset/clean/force-push someone else's work. Claude and Codex should use separate feature branches/worktrees and exchange exact pushed commits; do not share an unstaged checkout.

## Before pausing or reporting a checkpoint

1. Review and commit development changes with accurate provenance and test status. Exclude secrets, authentication state and unrelated personal files.
2. Push without force; if rejected, fetch and reconcile. Never overwrite newer remote work.
3. Verify `git ls-remote origin refs/heads/work/kebu-completion-audit-oct13` matches local HEAD. Include the full SHA in the handoff.
4. Record tests that actually ran, local versus hosted evidence, failed checks and release blockers. A recovery/WIP push is not release certification.

The check detects stale workspaces; it cannot force ChatGPT's environment to restore a particular filesystem. GitHub supplies the recoverable source of truth. Uncommitted changes after the last verified push can still be lost.

## October 20 recovery

This session reopened at `96e24b7`, with existing uncommitted contact/video work. The previously reported local checkpoint `87fcd45f39f69e750cbad70cf2675c3aa344bb2d` is absent from this Git object database; GitHub returned “No commit found” for it. The named handoff zip was not recovered in the performed file searches. Do not claim that checkpoint, its later masks/headline work or its test records survived.

The recovery checkpoint preserves the available source, including inherited partial contact/video changes and unverified Network QA drafts. The pre-existing Mail change is a Contact-to-compose bridge; no new Mail implementation was added in this recovery. Coordinate that file with Claude. Original commit authors are preserved; no history was re-authored. Unrelated reference-photo edits/temp files stay outside the checkpoint.

Current source includes an independent repair preventing template reseeding during GET/publish and deriving chrome without updating saved drafts. The Studio creative-OS acceptance contract captures the user's 25 groups; it is a requirement, not a completion claim.

Production deployment remains gated on real CI, hosted QA and required database migrations. The user's deployment/push authorization does not imply approval to apply production migrations or change DNS.
