import type { ReactNode, SVGProps } from "react";

export type KebuIconName =
  | "home" | "search" | "universe" | "spaces" | "library" | "create" | "yande"
  | "notifications" | "more" | "builder" | "studio" | "commerce" | "opportunity"
  | "work" | "calendar" | "people" | "message" | "settings" | "arrowRight";

type Props = SVGProps<SVGSVGElement> & { name: KebuIconName; size?: number };

const paths: Record<KebuIconName, ReactNode> = {
  home: <><path d="M4 10.2 12 3l8 7.2V20H7v-6h10v6" /><path d="M4 10v10" /></>,
  search: <><circle cx="10.7" cy="10.7" r="6.7" /><path d="m16 16 4.5 4.5" /></>,
  universe: <><circle cx="12" cy="12" r="8.5" /><path d="M3.8 12h16.4M12 3.5c2.7 2.7 3.8 5.5 3.8 8.5S14.7 17.8 12 20.5C9.3 17.8 8.2 15 8.2 12S9.3 6.2 12 3.5Z" /></>,
  spaces: <><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" /><path d="M14 17h6M17 14v6" /></>,
  library: <><path d="M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4Z" /><path d="M7 16h12M9 4v12" /></>,
  create: <><path d="M12 3v18M3 12h18" /><path d="m17.5 4 .7 1.8L20 6.5l-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z" /></>,
  yande: <path d="M12 2.8c.8 5.7 1.5 6.4 7.2 7.2-5.7.8-6.4 1.5-7.2 7.2-.8-5.7-1.5-6.4-7.2-7.2 5.7-.8 6.4-1.5 7.2-7.2Z" />,
  notifications: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8Z" /><path d="M10 21h4" /></>,
  more: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/></>,
  builder: <><path d="M4 4h16v5H4zM4 13h7v7H4zM15 13h5v7h-5z" /></>,
  studio: <><path d="M12 4c2.2 0 3.5 1.8 3.5 4S14.2 12 12 12 8.5 10.2 8.5 8 9.8 4 12 4Z" /><path d="M12 12c2.2 0 4 1.3 4 3.5S14.2 19 12 19s-4-1.3-4-3.5 1.8-3.5 4-3.5Z" /></>,
  commerce: <><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></>,
  opportunity: <><path d="M12 3v18M3 12h18" /><path d="m5.5 5.5 13 13m0-13-13 13" /></>,
  work: <><path d="M5 3h10l4 4v14H5z" /><path d="M15 3v5h4M8 12h8M8 16h6" /></>,
  calendar: <><path d="M4 6h16v14H4zM8 3v6M16 3v6M4 10h16" /></>,
  people: <><circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M3.5 20c.4-4 2.2-6 5.5-6s5.1 2 5.5 6M14 15c3.7-.5 5.8 1.2 6.5 5" /></>,
  message: <path d="M4 5h16v11H9l-5 4V5Z" />,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" /></>,
  arrowRight: <><path d="M5 12h14M14 7l5 5-5 5" /></>,
};

export function KebuIcon({ name, size = 20, ...props }: Props) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden={props["aria-label"] ? undefined : true} {...props}>{paths[name]}</svg>;
}
