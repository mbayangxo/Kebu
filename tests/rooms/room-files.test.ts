import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Room private files", () => {
  it("uses room-scoped RLS and private storage metadata", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/20260920090000_room_files.sql"), "utf8");
    expect(sql).toContain("create table if not exists public.room_files");
    expect(sql).toContain("public.can_access_room(room_id)");
    expect(sql).toContain("uploaded_by = auth.uid()");
    expect(sql).toContain("byte_size bigint");
  });
});
