import { z } from "zod";

export const siteCommunityPostBodySchema = z.object({
  body: z.string().trim().min(1).max(2000),
  parentId: z.string().uuid().nullable().optional(),
  displayName: z.string().trim().max(80).optional(),
});

export const siteCommunityModerationSchema = z.object({
  isHidden: z.boolean(),
});

export type SiteCommunityPostBody = z.infer<typeof siteCommunityPostBodySchema>;

export type SiteCommunityPost = {
  id: string;
  parentId: string | null;
  role: "creator" | "member";
  displayName: string;
  body: string;
  isHidden: boolean;
  isMine: boolean;
  createdAt: string;
};

/** Thread top-level posts with their replies, newest top-level post first. */
export function threadCommunityPosts(
  rows: {
    id: string;
    parent_id: string | null;
    role: string;
    display_name: string;
    body: string;
    is_hidden: boolean;
    user_id: string;
    created_at: string;
  }[],
  viewerUserId: string,
): (SiteCommunityPost & { replies: SiteCommunityPost[] })[] {
  const toPost = (r: (typeof rows)[number]): SiteCommunityPost => ({
    id: r.id,
    parentId: r.parent_id,
    role: r.role === "creator" ? "creator" : "member",
    displayName: r.display_name,
    body: r.body,
    isHidden: r.is_hidden,
    isMine: r.user_id === viewerUserId,
    createdAt: r.created_at,
  });

  const topLevel = rows.filter((r) => !r.parent_id).map(toPost);
  const repliesByParent = new Map<string, SiteCommunityPost[]>();
  for (const r of rows) {
    if (!r.parent_id) continue;
    const list = repliesByParent.get(r.parent_id) ?? [];
    list.push(toPost(r));
    repliesByParent.set(r.parent_id, list);
  }

  return topLevel
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((post) => ({
      ...post,
      replies: (repliesByParent.get(post.id) ?? []).sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt),
      ),
    }));
}
