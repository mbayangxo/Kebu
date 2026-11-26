/** Credential-free binding of an approved QA origin to reviewed source/CI. */
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const repository = process.env.GITHUB_REPOSITORY || "mbayangxo/Kebu";
const sha = process.env.KEBU_HOSTED_SOURCE_SHA || process.env.GITHUB_SHA || "";
const reportDir = process.env.KEBU_HOSTED_DEPLOYMENT_REPORT_DIR;
function record(result) {
  if (reportDir) { mkdirSync(reportDir, { recursive: true }); writeFileSync(join(reportDir, "summary.json"), JSON.stringify(result, null, 2) + "\n"); }
  console.log(JSON.stringify(result));
}
try {
  if (repository !== "mbayangxo/Kebu" || !/^[a-f\d]{40}$/i.test(sha)) throw Error("Expected the Kebu repository and an exact source commit.");
  const approved = new URL(process.env.KEBU_HOSTED_QA_ORIGIN || "");
  if (approved.protocol !== "https:" || approved.username || approved.password || approved.search || approved.hash || approved.pathname !== "/") {
    throw Error("Configure an exact approved HTTPS QA origin without credentials or query parameters.");
  }
  async function get(path) {
    const token = process.env.GH_TOKEN;
    const response = await fetch(`https://api.github.com/repos/${repository}${path}`, {
      headers: { Accept: "application/vnd.github+json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw Error(`GitHub metadata request failed with status ${response.status}.`);
    return response.json();
  }
  async function verify() {
    const [head, runs, deployments] = await Promise.all([
      get("/git/ref/heads/work/kebu-completion-audit-oct13"),
      get(`/actions/runs?head_sha=${sha}&per_page=100`),
      get(`/deployments?sha=${sha}&per_page=100`),
    ]);
    if (head.object?.sha !== sha) throw Error("The source is no longer the authoritative recovery head.");
    const ciRuns = runs.workflow_runs?.filter(run => run.name === "CI" && run.head_sha === sha) || [];
    const ci = ciRuns.find(run => run.status === "completed" && run.conclusion === "success");
    if (!ci) {
      if (ciRuns.length && ciRuns.every(run => run.status === "completed")) throw Error("Required CI has not passed for this source.");
      return null;
    }
    for (const deployment of deployments) {
      if (deployment.sha !== sha || deployment.environment !== "Preview" || deployment.production_environment === true
        || deployment.creator?.login !== "vercel[bot]" || !Number.isSafeInteger(deployment.id)) continue;
      // Construct a fixed GitHub API path; never follow payload-supplied URLs
      // with the GitHub token or send a QA cookie while checking metadata.
      const statuses = await get(`/deployments/${deployment.id}/statuses?per_page=100`);
      for (const status of statuses) {
        if (status.state !== "success" || status.creator?.login !== "vercel[bot]") continue;
        let target;
        try { target = new URL(status.environment_url); } catch { continue; }
        if (target.origin !== approved.origin || target.protocol !== "https:" || target.username || target.password || target.search || target.hash || target.pathname !== "/") continue;
        return { scope: "hosted-qa-deployment-metadata", verified: true, sourceCommit: sha,
          origin: approved.origin, githubDeploymentId: deployment.id, ciRunId: ci.id,
          authenticatedAcceptance: "not-established-by-this-check" };
      }
    }
    return null;
  }
  const deadline = Date.now() + (process.argv.includes("--wait") ? 600000 : 0);
  let result;
  do {
    result = await verify();
    if (result || Date.now() >= deadline) break;
    console.log(JSON.stringify({ scope: "hosted-qa-deployment-metadata", verified: false, status: "waiting-for-ci-and-approved-preview" }));
    await new Promise(done => setTimeout(done, 10000));
  } while (Date.now() <= deadline);
  if (!result) throw Error("No successful Vercel preview matches the approved origin and exact authoritative source.");
  record(result);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `verified=true\norigin=${result.origin}\nsource=${sha}\n`);
} catch (error) {
  // Errors never include tokens, request headers or supplied cookie contents.
  const reason = error instanceof TypeError ? "Invalid QA configuration or unavailable GitHub metadata." : error.message;
  record({ scope: "hosted-qa-deployment-metadata", verified: false, reason });
  process.exitCode = 1;
}
