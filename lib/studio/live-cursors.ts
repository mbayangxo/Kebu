const COLORS = ["#E05A2B", "#2F9E44", "#1C7ED6", "#9C36B5", "#F08C00", "#0CA678"];

export function liveCursorColorForUser(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h + userId.charCodeAt(i) * 17) % COLORS.length;
  return COLORS[h]!;
}

export const LIVE_CURSOR_COLORS = COLORS;

export type LiveCursorPeer = {
  userId: string;
  label: string;
  color: string;
  x: number;
  y: number;
  updatedAt: number;
};

/**
 * Pure transform: Supabase Realtime presence state -> renderable peer list.
 * Excludes the caller's own presence key and drops any entry missing/
 * malformed `userId` rather than rendering a broken cursor.
 */
export function presenceStateToPeers(
  state: Record<string, Array<Record<string, unknown>>>,
  selfUserId: string,
): LiveCursorPeer[] {
  const peers: LiveCursorPeer[] = [];
  for (const key of Object.keys(state)) {
    for (const m of state[key] ?? []) {
      const userId = typeof m?.userId === "string" ? m.userId : null;
      if (!userId || userId === selfUserId) continue;
      peers.push({
        userId,
        label: typeof m.label === "string" && m.label ? m.label : "Collaborator",
        color: typeof m.color === "string" && m.color ? m.color : liveCursorColorForUser(userId),
        x: typeof m.x === "number" ? m.x : 0.5,
        y: typeof m.y === "number" ? m.y : 0.5,
        updatedAt: typeof m.updatedAt === "number" ? m.updatedAt : Date.now(),
      });
    }
  }
  return peers;
}
