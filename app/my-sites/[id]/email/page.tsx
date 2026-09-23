"use client";

import { use } from "react";
import Link from "next/link";
import { AppShell } from "@/app/components/app-shell";
import { EmailFlowsPanel } from "@/app/components/create/email-flows-panel";
import { KEBU } from "@/lib/kebu-brand";

export default function SiteEmailFlowsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <AppShell title="Email automation">
      <div className="min-h-screen bg-[#FFFCF8]">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
          <div className="mb-6 flex items-center gap-3">
            <Link
              href={`/my-sites/${id}`}
              className="text-[11px] font-semibold"
              style={{ color: KEBU.muted }}
            >
              ← Site overview
            </Link>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-black tracking-tight" style={{ color: KEBU.black }}>
              Email automation
            </h1>
            <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: KEBU.muted }}>
              Triggered email sequences that send automatically — welcome new subscribers,
              confirm orders, follow up on abandoned carts.
            </p>
          </div>

          <div
            className="overflow-hidden rounded-2xl border bg-white"
            style={{ borderColor: KEBU.borders.default }}
          >
            <div
              className="border-b px-5 py-4"
              style={{ borderColor: KEBU.borders.subtle, background: "#FAFAF8" }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-lg"
                  style={{ background: "rgba(255,106,0,0.08)", color: KEBU.orange }}
                >
                  ✉
                </span>
                <div>
                  <p className="text-[12px] font-black" style={{ color: KEBU.black }}>
                    Flows
                  </p>
                  <p className="text-[10px]" style={{ color: KEBU.muted }}>
                    Each flow fires when its trigger condition is met
                  </p>
                </div>
              </div>
            </div>
            <div className="p-5">
              <EmailFlowsPanel projectId={id} />
            </div>
          </div>

          <div
            className="mt-4 rounded-2xl border px-5 py-4"
            style={{ borderColor: KEBU.borders.subtle }}
          >
            <p className="text-[11px] font-bold" style={{ color: KEBU.black }}>
              How triggers work
            </p>
            <ul className="mt-2 space-y-1.5">
              {[
                ["Newsletter signup", "Fires when someone subscribes on your site"],
                ["Order placed", "Fires immediately after a customer completes an order"],
                ["Abandoned cart", "Fires after a cart is left idle for a set period"],
              ].map(([name, desc]) => (
                <li key={name} className="flex items-start gap-2">
                  <span
                    className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: KEBU.orange }}
                  />
                  <span className="text-[11px]" style={{ color: KEBU.muted }}>
                    <span className="font-semibold" style={{ color: KEBU.black }}>
                      {name}
                    </span>{" "}
                    — {desc}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
