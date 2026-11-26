"use client";
import { EditableSocialRail, socialRailStyleFromProps } from "./editable-social-rail";
import { mergeDeviceAwareSectionProps, type DeviceBucket } from "@/lib/create/device-overrides";
import type { SocialLink } from "@/lib/create/social-links";

/** Small link-only variants are CSS selected before hydration, including no-JS.
 * Never duplicate the hero, media players or editing surfaces for this purpose.
 */
export function ResponsiveSocialRail({ props, siteBase }: { props: Record<string, unknown>; siteBase?: string }) {
  const bucket = props.deviceOverrides as DeviceBucket | undefined;
  const varies = [bucket?.tablet, bucket?.mobile].some(bag => bag && Object.keys(bag).some(key => key === "socialLinks" || key.startsWith("socialRail")));
  const devices = varies ? ["desktop", "tablet", "mobile"] as const : ["desktop"] as const;
  return <>{devices.map(device => {
    const resolved = mergeDeviceAwareSectionProps(props, device);
    const rail = <EditableSocialRail links={Array.isArray(resolved.socialLinks) ? resolved.socialLinks as SocialLink[] : []} style={socialRailStyleFromProps(resolved)} siteBase={siteBase} />;
    return varies ? <div key={device} className={`kebu-social-device-${device}`}>{rail}</div> : <div key={device} style={{ display: "contents" }}>{rail}</div>;
  })}</>;
}
