import { z } from "zod";

export const studioFolderNameSchema = z
  .string()
  .trim()
  .min(1, "Folder name is required.")
  .max(80, "Folder name is too long.");

export const createStudioFolderSchema = z.object({
  name: studioFolderNameSchema,
});

export const patchStudioFolderSchema = z.object({
  name: studioFolderNameSchema.optional(),
});

export const moveDesignFolderSchema = z.object({
  folderId: z.string().uuid().nullable(),
});

export type StudioFolder = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  designCount?: number;
};

export function normalizeFolderName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

/** Filter designs by library folder view. */
export function designsInFolderView<T extends { folder_id?: string | null }>(
  designs: T[],
  view: "all" | "unfiled" | string,
): T[] {
  if (view === "all") return designs;
  if (view === "unfiled") return designs.filter((d) => !d.folder_id);
  return designs.filter((d) => d.folder_id === view);
}

export function countDesignsByFolder(
  designs: { folder_id?: string | null }[],
): Map<string | null, number> {
  const map = new Map<string | null, number>();
  for (const d of designs) {
    const key = d.folder_id ?? null;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}
