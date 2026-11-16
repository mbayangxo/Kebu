import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
export const sources = [
  "20260920081000_workspace_items.sql",
  "20260920082000_space_chat.sql",
  "20260920083000_workspace_scope_hardening.sql",
  "20260920085000_kebu_rooms.sql",
  "20260920086000_room_scope_hardening.sql",
  "20260920090000_room_files.sql",
  "20261014034852_room_file_storage_identity.sql",
  "20261014043916_workspace_item_identity_guard.sql",
  "20261016120000_library_sharing.sql",
  "20261016150000_workspace_item_visibility.sql",
  "20261016160000_room_chat_read_policy.sql",
  "20261016161000_room_creation_returning_fix.sql",
  "20261016162000_room_members_recursion_fix.sql",
  "20261016180000_liguey_worker_profiles.sql",
  "20261016190000_liguey_job_listings_applications.sql",
  "20261016200000_liguey_profile_visibility_for_reviewers.sql",
  "20261016210000_liguey_applicant_listing_visibility.sql",
  "20261020002000_liguey_yande_applicant_insight.sql",
  "20261020020000_liguey_listing_pay_photo_and_company_reviews.sql",
  "20261106074222_kebu_builtin_app_installs.sql",
  "20261107010000_sheet_bodies.sql",
  "20261107040000_workspace_item_rich_content.sql",
  "20261108010000_slide_bodies.sql",
  "20261108020000_room_calls_mesh.sql",
  "20261109010001_room_call_join_created_flag.sql",
  "20261109010000_cloud_storage.sql",
  "20261109020000_room_call_default_cap.sql",
  "20261112075207_editor_revision_guards.sql",
  "20261112075718_document_collaboration_state.sql",
  "20261112075919_cloud_deployment_version_ownership.sql",
  "20261112081206_private_room_call_signaling.sql",
  "20261116015115_company_team_invite_atomic.sql",
  "20261116015814_liguey_optional_app_and_employer_safety.sql",
  "20261116020225_company_worker_portal.sql",
  "20261116022036_liguey_interviews_and_reports.sql",
  "20261116022755_business_name_shortlists.sql",
];
export const target =
  "supabase/migrations/20261116060247_qa_company_foundations.sql";
export function build() {
  const entries = sources.map((name) => {
    const original = readFileSync("supabase/migrations/" + name, "utf8");
    let sql = original;
    if (name === "20261108020000_room_calls_mesh.sql")
      sql = sql
        .replace(
          "drop function if exists public.room_call_exchange(uuid, text, uuid, uuid, text);",
          "",
        )
        .replace("drop table if exists public.room_calls cascade;", "");
    if (name === "20261016180000_liguey_worker_profiles.sql")
      sql = sql.replace(
        /create or replace function public\.set_updated_at\(\)[\s\S]*?\$\$;/,
        "",
      );
    return {
      name,
      sha256: createHash("sha256").update(original).digest("hex"),
      sql,
    };
  });
  entries.push({
    name: "../rollouts/company-notifications.sql",
    sha256: createHash("sha256")
      .update(
        readFileSync("supabase/rollouts/company-notifications.sql", "utf8"),
      )
      .digest("hex"),
    sql: readFileSync("supabase/rollouts/company-notifications.sql", "utf8"),
  });
  const tables = [
    ...new Set(
      entries.flatMap((x) =>
        [
          ...x.sql.matchAll(
            /create table(?: if not exists)? public\.([a-z_]+)/gi,
          ),
        ].map((m) => m[1]),
      ),
    ),
  ];
  const payload = entries
    .map((x) => `\n-- SOURCE: ${x.name} SHA256: ${x.sha256}\n${x.sql}`)
    .join("\n");
  const quoted = tables.map((t) => `'${t}'`).join(",");
  const preamble = `-- Additive convergence for an explicitly inspected legacy QA database.\n-- Refuse mixed states. No archived seeds, old call-history DROP, or fabricated migration ledger.\nset local lock_timeout='5s';\ncreate schema if not exists private;\nrevoke all on schema private from public,anon;\ngrant usage on schema private to authenticated,service_role;\ndo $converge$\ndeclare n int; total int;begin\n select count(*),count(to_regclass('public.'||t)) into total,n from unnest(array[${quoted}]) t;\n if n=total then return;end if;\n if to_regprocedure('public.set_updated_at()') is null then raise exception 'Existing updated_at helper required for legacy convergence';end if;\n if n<>0 then raise exception 'Mixed company foundation state: % of % tables exist; inspect before repair',n,total;end if;\n if exists(select 1 from storage.buckets where id in ('cloud-user-storage','cloud-deployments')) then raise exception 'Cloud buckets already exist without matching foundations; review their data first';end if;\n execute $payload$${payload}$payload$;\nend $converge$;\n`;
  const permissions = `\ndo $permissions$declare t text;begin foreach t in array array[${quoted}] loop\n execute format('revoke all on public.%I from public,anon',t);\n execute format('revoke truncate,references,trigger on public.%I from authenticated',t);\n execute format('grant all on public.%I to service_role',t);\nend loop;end $permissions$;\ngrant select,insert,update,delete on public.workspace_items,public.space_channels,public.space_messages,public.rooms,public.room_members,public.room_posts,public.room_links,public.room_decisions,public.room_files to authenticated;\nrevoke all on public.business_invites from public,anon;\nrevoke truncate,references,trigger on public.business_invites from authenticated;\n`;
  const roster = readFileSync(
    "supabase/migrations/20261116020225_company_worker_portal.sql",
    "utf8",
  )
    .split("create or replace function public.company_roster")[1]
    .split("create or replace function public.company_portfolio")[0];
  const sql =
    preamble +
    permissions +
    "\ncreate or replace function public.company_roster" +
    roster +
    readFileSync("supabase/rollouts/company-call-serialization.sql", "utf8") +
    "\nnotify pgrst,'reload schema';\n";
  return {
    sql,
    tables,
    manifest: entries.map(({ name, sha256 }) => ({
      name,
      sha256,
      transformation:
        name === "20261108020000_room_calls_mesh.sql"
          ? "Omit obsolete function/table DROP; guarded new-table path only"
          : name === "20261016180000_liguey_worker_profiles.sql"
            ? "Preserve existing set_updated_at definition; omit redundant replacement"
            : "verbatim",
    })),
  };
}
if (process.argv.includes("--write")) {
  const b = build();
  writeFileSync(target, b.sql);
  writeFileSync(
    "supabase/rollouts/qa-company-foundations.json",
    JSON.stringify({ target, tables: b.tables, sources: b.manifest }, null, 2) +
      "\n",
  );
  console.log(
    `${target}: ${b.tables.length} tables, ${b.manifest.length} source migrations`,
  );
}

if (
  process.argv.includes("--check") &&
  readFileSync(target, "utf8") !== build().sql
)
  throw Error(
    "QA convergence bundle differs from its reviewed source manifest; regenerate and rehearse before committing.",
  );
