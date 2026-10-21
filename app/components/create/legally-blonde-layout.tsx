"use client";
import type { CollageVideo } from "@/lib/create/collage-video";

import { LegallyBlondeEditCanvas } from "./legally-blonde-edit-canvas";
import { SiteThemeFonts } from "./site-theme-fonts";
import type { LayerMotion } from "./circular-brand-ring";
import type { BuilderElementSelection } from "@/lib/create/builder-selection";

export type ExtraCutout = {
  id: string;
  src: string;
  alt?: string;
  href?: string;
  topPct: number;
  leftPct: number;
  widthPct: number;
  rotate?: number;
  zIndex?: number;
  /** city scrolls behind May; figure stays forward. */
  parallaxRole?: "city" | "figure" | "none";
};

export type LegallyBlondeHeroProps = {
  title: string;
  subtitle: string;
  brandLabel?: string;
  backgroundLayer: string;
  titleLogo: string;
  cutoutLeft: string;
  cutoutRight: string;
  cutoutAccent: string;
  cutoutSparkle?: string;
  macbook: string;
  sparkleGif?: string;
  heroPhoto: string;
  accentColor: string;
  displayFont?: string;
  motionEnabled: boolean;
  appearance?: "light" | "dark";
  navLinks?: {
    label: string;
    href: string;
    multiNav?: boolean;
    children?: { label: string; href: string; iconUrl?: string }[];
    iconUrl?: string;
    showLabel?: boolean;
  }[];
  navScale?: number;
  navSize?: "compact" | "comfortable" | "large" | "fullscreen";
  navLayout?: "top" | "side";
  /** words · built-in icons · custom photos/icons */
  navDisplay?: "text" | "icons" | "photos";
  /** Small May logo in upper chrome (click → home). */
  chromeLogo?: string;
  showChromeLogo?: boolean;
  /** Independent header controls — do not force logo/type/padding to scale together. */
  chromeLogoScale?: number;
  headerHeightScale?: number;
  headerBgColor?: string;
  navFontFamily?: string;
  navFontSizePx?: number;
  navFontWeight?: number;
  socialLinks?: { label: string; iconUrl: string; href: string }[];
  socialRailVisible?: boolean;
  socialRailBg?: string;
  socialRailLeftPct?: number;
  socialRailTopPct?: number;
  socialRailIconSize?: number;
  showNavigation?: boolean;
  sceneVideos?: CollageVideo[];
  layerScroll?: Record<string, { x: number; y: number }>;
  layerPositions?: Record<string, { leftPct: number; topPct: number }>;
  layerMoves?: Record<string, { dx: number; dy: number }>;
  layerScales?: Record<string, number>;
  layerWidthScale?: Record<string, number>;
  layerHeightScale?: Record<string, number>;
  layerFrameAspectRatio?: Record<string, number>;
  layerFrameFit?: Record<string, "cover" | "contain" | "fill">;
  layerCrop?: Record<string, number>;
  layerMotions?: Record<string, LayerMotion>;
  layerMotionDuration?: Record<string, number>;
  layerMotionDelay?: Record<string, number>;
  layerLinks?: Record<string, string>;
  /** Paint order for built-in slots + extras (1 = back, 80 = front). Survives publish. */
  layerZIndex?: Record<string, number>;
  layerOpacity?: Record<string, number>;
  layerRotation?: Record<string, number>;
  lockedLayers?: string[];
  hiddenLayers?: string[];
  /** When true, hero shows solid accent color — no photo background. */
  backgroundHidden?: boolean;
  extraCutouts?: ExtraCutout[];
  ctaLabel?: string;
  ctaHref?: string;
  showExtras?: boolean;
  scrollMode?: "viewport" | "parallax";
  /** Replace spinning Russian logo circle with editable brand text around the circle. */
  titleAsText?: boolean;
  titleTextFontFamily?: string;
  titleTextFontSize?: number;
  titleTextFontWeight?: number;
  titleTextLetterSpacing?: number;
  titleTextLineHeight?: number;
  titleTextColor?: string;
  sectionMinHeightPx?: number;
  embeddedFooterPaddingTop?: number;
  embeddedFooterPaddingBottom?: number;
};

type EditorHooks = {
  sectionId?: string;
  selectedElement?: BuilderElementSelection | null;
  onPatchSection?: (sectionId: string, patch: Record<string, unknown>) => void;
  onSelectSection?: (sectionId: string) => void;
  onSelectElement?: (selection: BuilderElementSelection) => void;
  onNavigatePage?: (slug: string) => void;
};

/** The same saved composition renders in the editor, draft preview and live site. */
export function LegallyBlondeHeroLayout({
  props, fillCanvas = true, sectionId, editor, projectId, siteBase = "", pageSlug = "home", responsiveSocialProps,
}: {
  props: LegallyBlondeHeroProps;
  responsiveSocialProps?: Record<string, unknown>;
  siteBase?: string;
  contained?: boolean;
  fillCanvas?: boolean;
  sectionId?: string;
  editor?: EditorHooks;
  projectId?: string;
  pageSlug?: string;
}) {
  const editable = Boolean(sectionId && editor?.onPatchSection);
  return (
    <>
      <SiteThemeFonts fontDisplay={props.displayFont ?? "Oswald"} fontBody="system-ui" />
      <LegallyBlondeEditCanvas
        props={props as unknown as Record<string, unknown>}
        responsiveSocialProps={responsiveSocialProps}
        editable={editable}
        projectId={editable ? projectId : undefined}
        siteBase={siteBase}
        currentSlug={pageSlug}
        fillCanvas={fillCanvas}
        onPatch={(patch) => {
          if (sectionId) editor?.onPatchSection?.(sectionId, patch);
        }}
        selectedElement={editor?.selectedElement?.sectionId === sectionId ? editor?.selectedElement : null}
        onSelectSection={() => { if (sectionId) editor?.onSelectSection?.(sectionId); }}
        onSelectElement={(element) => {
          if (sectionId) editor?.onSelectElement?.({ ...element, sectionId });
        }}
        onNavigatePage={editor?.onNavigatePage}
      />
      {props.showExtras && props.heroPhoto ? (
        <section id="music" className="relative px-6 py-16">
          <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={props.heroPhoto} alt="" className="w-full rounded-2xl object-cover" />
            <div><h2 className="text-3xl font-bold">{props.title}</h2><p className="mt-4">{props.subtitle}</p></div>
          </div>
        </section>
      ) : null}
    </>
  );
}
