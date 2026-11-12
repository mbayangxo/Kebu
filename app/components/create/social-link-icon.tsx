"use client";
import { useState } from "react";
import { socialPlatform, stockSocialPlatform, type SocialLink } from "@/lib/create/social-links";

export function SocialPlatformIcon({ platform, className = "h-5 w-5" }: { platform?: string; className?: string }) {
  const common = className;
  if (platform === "spotify") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.52 17.34c-.24.36-.66.48-1.02.24-2.82-1.74-6.36-2.1-10.56-1.14-.42.12-.78-.18-.9-.54-.12-.42.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.48.66.3 1.02zm1.44-3.18c-.3.42-.84.6-1.26.3-3.24-1.98-8.16-2.58-11.94-1.38-.48.12-.96-.12-1.08-.6-.12-.48.12-.96.6-1.08 4.38-1.32 9.76-.66 13.5 1.62.36.18.54.78.18 1.14zm.12-3.3C15.24 8.4 8.82 8.16 5.16 9.3c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.2-1.26 11.28-1.02 15.72 1.62.54.3.72 1.02.42 1.56-.3.48-1.02.66-1.56.36z" />
      </svg>
    );
  }
  if (platform === "apple") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
    );
  }
  if (platform === "youtube") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31.5 31.5 0 000 12a31.5 31.5 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31.5 31.5 0 0024 12a31.5 31.5 0 00-.5-5.8zM9.75 15.5v-7l6.5 3.5-6.5 3.5z" />
      </svg>
    );
  }
  if (platform === "instagram") return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>;
  if (platform === "facebook") return <svg className={common} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M14 22v-9h3l.5-4H14V7c0-1 .3-2 2-2h2V1h-3c-4 0-5 2-5 6v2H7v4h3v9z"/></svg>;
  if (platform === "soundcloud") return <svg className={common} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M1 11h1v7H1zm3-3h1v10H4zm3-2h1v12H7zm3-1h1v13h-1zm3 1a6 6 0 0 1 8 5 3.5 3.5 0 1 1-.5 7H13z"/></svg>;
  return (
    <svg className={common} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 3v10.55A4 4 0 1014 17V7h4V3h-6z" />
    </svg>
  );
}

/** Known template icons render locally; uploaded icons remain the owner's chosen artwork. */
export function SocialLinkIcon({ link, size }: { link: SocialLink; size: number }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const stock = stockSocialPlatform(link.iconUrl);
  const platform = stock ?? socialPlatform(link.label);
  return <span aria-hidden style={{ display: "inline-flex", width: size, height: size, flex: "0 0 auto" }}>
    {link.iconUrl.trim() && !stock && failedUrl !== link.iconUrl ? (
      <img src={link.iconUrl} alt="" width={size} height={size} draggable={false} style={{ width: size, height: size, objectFit: "contain" }} onError={() => setFailedUrl(link.iconUrl)} />
    ) : <SocialPlatformIcon platform={platform} className="h-full w-full" />}
  </span>;
}
