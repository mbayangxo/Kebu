"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { KEBU } from "@/lib/kebu-brand";

type Notif = {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string;
  read_at: string | null;
  created_at: string;
};

/**
 * Order alerts for this shop — in-app list + browser Notification when permitted.
 */
export function ShopNotificationsBell({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [pushNote, setPushNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/notifications`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      const list = Array.isArray(data.notifications) ? (data.notifications as Notif[]) : [];
      setItems(list);
      const nextUnread = typeof data.unread === "number" ? data.unread : list.filter((n) => !n.read_at).length;
      setUnread(nextUnread);

      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted" &&
        nextUnread > 0
      ) {
        const newest = list.find((n) => !n.read_at);
        if (newest && sessionStorage.getItem(`kebu-notif-${newest.id}`) !== "1") {
          sessionStorage.setItem(`kebu-notif-${newest.id}`, "1");
          try {
            new Notification(newest.title, { body: newest.body || "New shop activity", tag: newest.id });
          } catch {
            /* ignore */
          }
        }
      }
    } catch {
      /* ignore */
    }
  }, [projectId]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 45000);
    return () => clearInterval(t);
  }, [load]);

  async function enableBrowserPush() {
    setPushNote(null);
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPushNote("This browser does not support notifications.");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      setPushNote("Permission denied — you will still see alerts inside Shop.");
      return;
    }
    setPushNote("Browser alerts on. Keep Shop open or allow notifications permanently.");
    void load();
  }

  async function markAllRead() {
    await fetch(`/api/projects/${projectId}/notifications`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    void load();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
        style={{ border: `1px solid ${KEBU.border}`, color: KEBU.black }}
        aria-label={unread ? `${unread} unread notifications` : "Notifications"}
      >
        Alerts
        {unread > 0 ? (
          <span
            className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] text-white"
            style={{ background: KEBU.orange }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          className="absolute right-0 z-40 mt-2 w-80 max-w-[90vw] rounded-2xl p-3 shadow-xl"
          style={{ background: "#fff", border: `1px solid ${KEBU.border}` }}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: KEBU.orange }}>
              Order alerts
            </p>
            <button
              type="button"
              className="text-[10px] font-semibold underline"
              style={{ color: KEBU.muted }}
              onClick={() => void markAllRead()}
            >
              Mark all read
            </button>
          </div>
          <button
            type="button"
            onClick={() => void enableBrowserPush()}
            className="mt-2 w-full rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white"
            style={{ background: KEBU.black }}
          >
            Enable browser notifications
          </button>
          {pushNote ? (
            <p className="mt-1 text-[10px] leading-relaxed" style={{ color: KEBU.muted }}>
              {pushNote}
            </p>
          ) : null}
          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {items.length === 0 ? (
              <li className="text-xs" style={{ color: KEBU.muted }}>
                No alerts yet. Order notifications will appear here.
              </li>
            ) : (
              items.map((n) => (
                <li
                  key={n.id}
                  className="rounded-xl p-2 text-xs"
                  style={{
                    background: n.read_at ? "#fff" : KEBU.cream,
                    border: `1px solid ${KEBU.border}`,
                  }}
                >
                  <p className="font-semibold" style={{ color: KEBU.black }}>
                    {n.title}
                  </p>
                  {n.body ? (
                    <p className="mt-0.5" style={{ color: KEBU.muted }}>
                      {n.body}
                    </p>
                  ) : null}
                  <div className="mt-1 flex justify-between gap-2">
                    <span className="text-[9px] opacity-60">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                    {n.href ? (
                      <Link href={n.href} className="font-bold uppercase tracking-wider underline" style={{ color: KEBU.orange }}>
                        Open
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
