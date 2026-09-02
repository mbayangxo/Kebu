"use client";

import { SiteImageUpload } from "@/app/components/create/site-image-upload";

/** Upload or paste a photo for a site section — Shopify-style, not raw URL boxes. */
export function SectionPhotoField({
  projectId,
  label,
  hint,
  value,
  onChange,
}: {
  projectId: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
}) {
  return (
    <SiteImageUpload
      projectId={projectId}
      kind="section"
      value={value}
      onChange={onChange}
      label={label}
    />
  );
}
