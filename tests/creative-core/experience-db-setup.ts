import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { setupPublishDatabase, type PublishSqlExecutor } from "./publish-db-setup";

/** Real migration chain, shared by SQL authority and browser→database verification. */
export async function setupExperienceDatabase(db: PublishSqlExecutor) {
  await setupPublishDatabase(db);
  await db.exec("alter table businesses add column created_by uuid references auth.users(id)");
  const legacy = readFileSync(resolve("supabase/migrations/064_creation_stack_slices.sql"), "utf8");
  const start = legacy.indexOf("create table if not exists public.business_brand_kits"), end = legacy.indexOf("alter table public.project_products", start);
  if (start < 0 || end < start) throw Error("Brand kit migration boundaries changed");
  await db.exec(legacy.slice(start, end));
  const dna = readFileSync(resolve("supabase/migrations/076_brand_dna_campaign_projects.sql"), "utf8"), boundary = dna.indexOf("-- ── Creative Director");
  if (boundary < 0) throw Error("Brand DNA migration boundary changed");
  await db.exec(dna.slice(0, boundary));
  for (const file of ["20261008194553_brand_brain_profiles.sql", "20261009011958_brand_brain_site_binding.sql", "20261009040802_experience_dna.sql", "081_account_ai_usage.sql", "20261009083046_experience_engine.sql"]) await db.exec(readFileSync(resolve("supabase/migrations", file), "utf8"));
  await db.exec(readFileSync(resolve("supabase/migrations/20261010020643_remaining_privileged_rpc_security.sql"), "utf8"));
  await db.exec(readFileSync(resolve("supabase/migrations/20261010134141_atomic_account_ai_reservations.sql"), "utf8"));
}
