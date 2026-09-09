const COLORS = ["#E05A2B", "#2F9E44", "#1C7ED6", "#9C36B5", "#F08C00", "#0CA678"];

export function liveCursorColorForUser(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h + userId.charCodeAt(i) * 17) % COLORS.length;
  return COLORS[h]!;
}

export const LIVE_CURSOR_COLORS = COLORS;
