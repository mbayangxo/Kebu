"use client";

import Link from "next/link";
import { KEBU } from "@/lib/kebu-brand";
import { KebuBusinessNavTree } from "@/app/components/business/kebu-business-nav-tree";
import { mySiteDetailHref } from "@/lib/navigation/product-nav";

/**
 * Kebu Business Home — merchant OS entry for one site/project.
 */
export function SiteMerchantHub({
  projectId,
  businessId,
  published,
  siteTitle,
}: {
  projectId: string;
  businessId: string | null;
  published: boolean;
  siteTitle?: string;
}) {
  const editor = `/create/${projectId}`;
  const shop = `/shop/${projectId}`;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(260px,300px)_1fr] lg:items-start">
      <KebuBusinessNavTree
        projectId={projectId}
        businessId={businessId}
        published={published}
        siteTitle={siteTitle}
      />

      <div className="space-y-6 min-w-0">
        <div>
          <h1
            className="text-2xl font-bold sm:text-3xl"
            style={{ fontFamily: "var(--font-fraunces)", color: KEBU.black }}
          >
            Home
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed" style={{ color: KEBU.muted }}>
            Run your website, shop, marketing, and growth from one business OS — not scattered tools. Use the
            navigation tree for every workspace. Items marked <strong>Soon</strong> are not built yet.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <QuickAction
            title="Edit website"
            desc="Pages, sections, design, publish"
            href={editor}
            accent
          />
          <QuickAction title="Open shop" desc="Products, orders, checkout" href={shop} />
          <QuickAction title="Analytics" desc="Sales, traffic, AI insights" href={`${shop}?tab=analytics`} />
          <QuickAction
            title="Ask Yande"
            desc="Create from idea or redesign"
            href={`/create/new?mode=ai${businessId ? `&businessId=${businessId}` : ""}`}
          />
        </div>

        <div
          className="rounded-2xl p-4 text-xs leading-relaxed"
          style={{ background: KEBU.cream, border: `1px solid ${KEBU.border}` }}
        >
          <p className="font-semibold" style={{ color: KEBU.black }}>
            Next actions
          </p>
          <ul className="mt-2 space-y-1 list-disc pl-4" style={{ color: KEBU.muted }}>
            {!published ? (
              <li>
                <Link href={editor} className="underline" style={{ color: KEBU.orange }}>
                  Publish your site
                </Link>{" "}
                to start real visitor analytics.
              </li>
            ) : (
              <li>
                <Link href={mySiteDetailHref(projectId) + "#traffic"} className="underline" style={{ color: KEBU.orange }}>
                  Review traffic
                </Link>{" "}
                below on this page.
              </li>
            )}
            <li>
              <Link href={`${shop}?tab=products`} className="underline" style={{ color: KEBU.orange }}>
                Add or update products
              </Link>{" "}
              if you sell online.
            </li>
            {!businessId ? (
              <li>
                <Link href="/business" className="underline" style={{ color: KEBU.orange }}>
                  Link a Kebu ID business
                </Link>{" "}
                for team, score, and registration.
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  title,
  desc,
  href,
  accent,
}: {
  title: string;
  desc: string;
  href: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl p-4 transition-shadow hover:shadow-md"
      style={{
        border: `1px solid ${accent ? KEBU.orange : KEBU.border}`,
        background: accent ? "rgba(255,85,0,0.06)" : KEBU.white,
      }}
    >
      <p className="text-sm font-bold" style={{ fontFamily: "var(--font-fraunces)" }}>
        {title}
      </p>
      <p className="mt-1 text-xs" style={{ color: KEBU.muted }}>
        {desc}
      </p>
    </Link>
  );
}
