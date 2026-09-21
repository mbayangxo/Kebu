"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { BUILDER } from "@/lib/create/builder-ui";
import {
  BUILDER_SECTION_CATALOG,
  BUILDER_SECTION_CATEGORIES,
  type BuilderSectionCategory,
} from "@/lib/create/builder-section-catalog";
import { builderAppForSection } from "@/lib/create/builder-block-registry";

/* ─── Visual thumbnail renderers ─────────────────────────────────────── */

function ThumbHero() {
  return (
    <div style={{ background: "linear-gradient(160deg,#0a0a1a 0%,#1a1a3e 100%)", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "6px 8px", gap: 3 }}>
      <div style={{ width: "75%", height: 6, borderRadius: 3, background: "rgba(255,255,255,0.9)" }} />
      <div style={{ width: "55%", height: 3.5, borderRadius: 2, background: "rgba(255,255,255,0.4)" }} />
      <div style={{ marginTop: 3, width: 24, height: 9, borderRadius: 3, background: "#FF5500", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 14, height: 2.5, borderRadius: 1, background: "white" }} />
      </div>
    </div>
  );
}

function ThumbEditorialHero() {
  return (
    <div style={{ background: "linear-gradient(0deg,rgba(0,0,0,0.65) 45%,rgba(0,0,0,0.1) 100%)", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: "5px 7px", gap: 2, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,#2d1b69 0%,#8B4513 100%)", zIndex: 0 }} />
      <div style={{ position: "relative", zIndex: 1, width: "80%", height: 5.5, borderRadius: 2, background: "rgba(255,255,255,0.95)" }} />
      <div style={{ position: "relative", zIndex: 1, width: "55%", height: 3, borderRadius: 1.5, background: "rgba(255,255,255,0.55)" }} />
    </div>
  );
}

function ThumbSplit() {
  return (
    <div style={{ height: "100%", display: "flex", overflow: "hidden" }}>
      <div style={{ flex: 1, background: "linear-gradient(135deg,#e8d5c0 0%,#c9a882 100%)" }} />
      <div style={{ flex: 1, background: "#faf9f7", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 7px", gap: 3 }}>
        <div style={{ width: "85%", height: 4.5, borderRadius: 2, background: "#0a0a0a" }} />
        <div style={{ width: "70%", height: 3, borderRadius: 1.5, background: "#5c5348" }} />
        <div style={{ width: "60%", height: 3, borderRadius: 1.5, background: "#5c5348" }} />
        <div style={{ marginTop: 3, width: 20, height: 8, borderRadius: 2.5, background: "#0a0a0a" }} />
      </div>
    </div>
  );
}

function ThumbAnnouncementBar() {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#faf9f7" }}>
      <div style={{ height: "28%", background: "#FF5500", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "55%", height: 3, borderRadius: 2, background: "rgba(255,255,255,0.9)" }} />
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 8px", gap: 3 }}>
        <div style={{ width: "70%", height: 5, borderRadius: 2, background: "#0a0a0a", opacity: 0.15 }} />
        <div style={{ width: "50%", height: 3.5, borderRadius: 2, background: "#0a0a0a", opacity: 0.1 }} />
      </div>
    </div>
  );
}

function ThumbNavigation() {
  return (
    <div style={{ height: "100%", background: "#fff", display: "flex", flexDirection: "column" }}>
      <div style={{ height: "38%", borderBottom: "1px solid #e8e4df", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px" }}>
        <div style={{ width: 18, height: 6, borderRadius: 2, background: "#0a0a0a" }} />
        <div style={{ display: "flex", gap: 4 }}>
          {[1, 2, 3].map(i => <div key={i} style={{ width: 10, height: 3, borderRadius: 1.5, background: "#8a8074" }} />)}
        </div>
        <div style={{ width: 16, height: 7, borderRadius: 2, background: "#0a0a0a" }} />
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 8px", gap: 3, opacity: 0.15 }}>
        <div style={{ width: "60%", height: 5, borderRadius: 2, background: "#0a0a0a" }} />
      </div>
    </div>
  );
}

function ThumbCategoryTiles() {
  return (
    <div style={{ height: "100%", background: "#faf9f7", padding: 5, display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 3 }}>
      {["#c9a882","#8B4513","#2d1b69","#FF5500"].map((bg, i) => (
        <div key={i} style={{ borderRadius: 3, background: bg, display: "flex", alignItems: "flex-end", padding: 3 }}>
          <div style={{ width: "60%", height: 2.5, borderRadius: 1, background: "rgba(255,255,255,0.8)" }} />
        </div>
      ))}
    </div>
  );
}

function ThumbText() {
  return (
    <div style={{ height: "100%", background: "#fff", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "0 10px", gap: 4 }}>
      <div style={{ width: "70%", height: 7, borderRadius: 3, background: "#0a0a0a" }} />
      <div style={{ width: "90%", height: 3, borderRadius: 1.5, background: "#8a8074" }} />
      <div style={{ width: "85%", height: 3, borderRadius: 1.5, background: "#8a8074" }} />
      <div style={{ width: "60%", height: 3, borderRadius: 1.5, background: "#8a8074" }} />
    </div>
  );
}

function ThumbFeatures() {
  return (
    <div style={{ height: "100%", background: "#fff", display: "flex", flexDirection: "column", justifyContent: "center", padding: "4px 6px", gap: 3 }}>
      <div style={{ display: "flex", gap: 4 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <div style={{ width: 12, height: 12, borderRadius: 4, background: i === 0 ? "#FF5500" : i === 1 ? "#0a0a0a" : "#c9a882" }} />
            <div style={{ width: "90%", height: 3, borderRadius: 1.5, background: "#0a0a0a" }} />
            <div style={{ width: "75%", height: 2.5, borderRadius: 1, background: "#8a8074" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ThumbImage() {
  return (
    <div style={{ height: "100%", background: "linear-gradient(135deg, #d5c4b0 0%, #b8a090 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="22" height="18" viewBox="0 0 22 18" fill="none">
        <rect x="0.5" y="0.5" width="21" height="17" rx="2" stroke="rgba(255,255,255,0.6)" strokeWidth="1"/>
        <path d="M0.5 13L6 8L9 11L13 7L21.5 13" stroke="rgba(255,255,255,0.6)" strokeWidth="1" strokeLinejoin="round" />
        <circle cx="16" cy="5" r="2" fill="rgba(255,255,255,0.6)" />
      </svg>
    </div>
  );
}

function ThumbGallery() {
  return (
    <div style={{ height: "100%", background: "#faf9f7", padding: 4, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 3 }}>
      {["#c9a882","#8a6542","#e8d5c0","#2d1b69","#c9a882","#8a6542"].map((bg, i) => (
        <div key={i} style={{ borderRadius: 2, background: bg }} />
      ))}
    </div>
  );
}

function ThumbVideo() {
  return (
    <div style={{ height: "100%", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,#1a1a3e 0%,#0a0a0a 100%)" }} />
      <div style={{ position: "relative", width: 20, height: 20, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 0, height: 0, marginLeft: 2, borderTop: "5px solid transparent", borderBottom: "5px solid transparent", borderLeft: "8px solid rgba(255,255,255,0.9)" }} />
      </div>
    </div>
  );
}

function ThumbAudio() {
  return (
    <div style={{ height: "100%", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 8px", gap: 2 }}>
      {[4, 8, 12, 18, 14, 9, 16, 11, 6, 13, 10, 7].map((h, i) => (
        <div key={i} style={{ flex: 1, height: `${h}px`, borderRadius: 2, background: i < 6 ? "#FF5500" : "rgba(255,255,255,0.3)" }} />
      ))}
    </div>
  );
}

function ThumbProducts() {
  return (
    <div style={{ height: "100%", background: "#faf9f7", padding: "4px 5px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>
      {[0,1,2,3].map(i => (
        <div key={i} style={{ borderRadius: 3, background: "#fff", border: "1px solid #e8e4df", padding: "3px 4px", display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ height: 18, borderRadius: 2, background: i % 2 === 0 ? "#e8d5c0" : "#c9a882" }} />
          <div style={{ width: "75%", height: 3, borderRadius: 1.5, background: "#0a0a0a" }} />
          <div style={{ width: "50%", height: 3, borderRadius: 1.5, background: "#FF5500" }} />
        </div>
      ))}
    </div>
  );
}

function ThumbTestimonials() {
  return (
    <div style={{ height: "100%", background: "#fff", display: "flex", flexDirection: "column", justifyContent: "center", padding: "4px 10px", gap: 3 }}>
      <div style={{ fontSize: 22, lineHeight: 1, color: "#FF5500", fontFamily: "Georgia,serif", opacity: 0.7, marginBottom: -2 }}>"</div>
      <div style={{ width: "90%", height: 3, borderRadius: 1.5, background: "#5c5348" }} />
      <div style={{ width: "75%", height: 3, borderRadius: 1.5, background: "#5c5348" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 3 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#e8d5c0" }} />
        <div style={{ width: 25, height: 3, borderRadius: 1.5, background: "#0a0a0a" }} />
      </div>
    </div>
  );
}

function ThumbNewsletter() {
  return (
    <div style={{ height: "100%", background: "#0a0a0a", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "4px 8px", gap: 3 }}>
      <div style={{ width: "65%", height: 5, borderRadius: 2, background: "rgba(255,255,255,0.85)" }} />
      <div style={{ display: "flex", gap: 2, width: "90%" }}>
        <div style={{ flex: 1, height: 12, borderRadius: 2, border: "1px solid rgba(255,255,255,0.25)", background: "transparent" }} />
        <div style={{ width: 22, height: 12, borderRadius: 2, background: "#FF5500" }} />
      </div>
    </div>
  );
}

function ThumbMarquee() {
  return (
    <div style={{ height: "100%", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", padding: "0 4px", gap: 8 }}>
      {["⟵", "NEW ARRIVAL", "•", "SOLDES", "•", "⟶"].map((t, i) => (
        <span key={i} style={{ color: i % 2 === 0 ? "rgba(255,255,255,0.4)" : i === 1 ? "#fff" : "#FF5500", fontSize: i === 0 || i === 5 ? 11 : i % 2 === 0 ? 7 : 7, fontWeight: 700, whiteSpace: "nowrap", letterSpacing: 1 }}>{t}</span>
      ))}
    </div>
  );
}

function ThumbFooter() {
  return (
    <div style={{ height: "100%", background: "#faf9f7", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 8px", gap: 3, opacity: 0.15 }}>
        <div style={{ width: "50%", height: 4, borderRadius: 2, background: "#0a0a0a" }} />
      </div>
      <div style={{ height: "38%", borderTop: "1px solid #e8e4df", background: "#f0ede8", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px" }}>
        <div style={{ width: 24, height: 3.5, borderRadius: 1.5, background: "#5c5348" }} />
        <div style={{ display: "flex", gap: 5 }}>
          {[1,2,3].map(i => <div key={i} style={{ width: 12, height: 3, borderRadius: 1.5, background: "#8a8074" }} />)}
        </div>
      </div>
    </div>
  );
}

function ThumbFaq() {
  return (
    <div style={{ height: "100%", background: "#fff", display: "flex", flexDirection: "column", justifyContent: "center", padding: "3px 7px", gap: 2 }}>
      {[1,2,3].map(i => (
        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e8e4df", paddingBottom: 2 }}>
          <div style={{ width: "65%", height: 3.5, borderRadius: 1.5, background: "#0a0a0a" }} />
          <div style={{ width: 8, height: 8, borderRadius: "50%", border: "1.5px solid #8a8074", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 4, height: 1.5, background: "#8a8074", borderRadius: 1 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ThumbContact() {
  return (
    <div style={{ height: "100%", background: "#fff", display: "flex", flexDirection: "column", justifyContent: "center", padding: "3px 7px", gap: 3 }}>
      <div style={{ width: "55%", height: 5, borderRadius: 2, background: "#0a0a0a" }} />
      {[1,2].map(i => (
        <div key={i} style={{ height: 11, borderRadius: 2, border: "1px solid #e8e4df", background: "#faf9f7", padding: "0 5px", display: "flex", alignItems: "center" }}>
          <div style={{ width: "40%", height: 3, borderRadius: 1.5, background: "#8a8074" }} />
        </div>
      ))}
      <div style={{ width: 28, height: 10, borderRadius: 2.5, background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 16, height: 2.5, borderRadius: 1, background: "white" }} />
      </div>
    </div>
  );
}

function ThumbCountdown() {
  return (
    <div style={{ height: "100%", background: "#0a0a0a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
      <div style={{ display: "flex", gap: 3 }}>
        {["24",":",":"," "].filter((_,i) => i < 3).map((_, i) => i % 2 === 0 ? (
          <div key={i} style={{ width: 14, height: 18, borderRadius: 3, background: "#FF5500", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 8, height: 3, borderRadius: 1.5, background: "rgba(255,255,255,0.9)" }} />
          </div>
        ) : (
          <div key={i} style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, display: "flex", alignItems: "center" }}>:</div>
        ))}
        <div style={{ width: 14, height: 18, borderRadius: 3, background: "#FF5500", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 8, height: 3, borderRadius: 1.5, background: "rgba(255,255,255,0.9)" }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 9 }}>
        {["HH","MM","SS"].map(t => (
          <div key={t} style={{ color: "rgba(255,255,255,0.35)", fontSize: 5.5, letterSpacing: 1, fontWeight: 700 }}>{t}</div>
        ))}
      </div>
    </div>
  );
}

function ThumbReviews() {
  return (
    <div style={{ height: "100%", background: "#fff", display: "flex", flexDirection: "column", justifyContent: "center", padding: "3px 7px", gap: 2 }}>
      <div style={{ display: "flex", gap: 1.5 }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{ width: 7, height: 7, clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)", background: i < 5 ? "#FF5500" : "#e8e4df" }} />
        ))}
      </div>
      <div style={{ width: "80%", height: 3, borderRadius: 1.5, background: "#5c5348" }} />
      <div style={{ width: "65%", height: 3, borderRadius: 1.5, background: "#5c5348" }} />
    </div>
  );
}

function ThumbTrustBadges() {
  return (
    <div style={{ height: "100%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-around", padding: "0 6px" }}>
      {["🔒","📦","↩"].map((ico, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <span style={{ fontSize: 13 }}>{ico}</span>
          <div style={{ width: 18, height: 2.5, borderRadius: 1, background: "#8a8074" }} />
        </div>
      ))}
    </div>
  );
}

function ThumbWhatsApp() {
  return (
    <div style={{ height: "100%", background: "#faf9f7", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 56, height: 18, borderRadius: 9, background: "#25D366", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        <div style={{ width: 20, height: 3, borderRadius: 1.5, background: "rgba(255,255,255,0.9)" }} />
      </div>
    </div>
  );
}

function ThumbEvents() {
  return (
    <div style={{ height: "100%", background: "#fff", display: "flex", flexDirection: "column", justifyContent: "center", padding: "3px 7px", gap: 3 }}>
      {[1,2].map(i => (
        <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{ width: 14, height: 14, borderRadius: 2, border: "1px solid #e8e4df", background: "#faf9f7", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <div style={{ width: 8, height: 2.5, borderRadius: 1, background: "#FF5500" }} />
            <div style={{ width: 6, height: 2.5, borderRadius: 1, background: "#5c5348", marginTop: 1 }} />
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ width: "80%", height: 3.5, borderRadius: 1.5, background: "#0a0a0a" }} />
            <div style={{ width: "60%", height: 2.5, borderRadius: 1, background: "#8a8074" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ThumbBeforeAfter() {
  return (
    <div style={{ height: "100%", display: "flex", overflow: "hidden", position: "relative" }}>
      <div style={{ flex: 1, background: "linear-gradient(135deg,#e8d5c0 0%,#c9a882 100%)" }} />
      <div style={{ flex: 1, background: "linear-gradient(135deg,#2d1b69 0%,#8B4513 100%)" }} />
      <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 2, background: "white", boxShadow: "0 0 6px rgba(0,0,0,0.3)" }} />
      <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 12, height: 12, borderRadius: "50%", background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", gap: 1 }}>
          <div style={{ width: 0, height: 0, borderTop: "3px solid transparent", borderBottom: "3px solid transparent", borderRight: "4px solid #5c5348" }} />
          <div style={{ width: 0, height: 0, borderTop: "3px solid transparent", borderBottom: "3px solid transparent", borderLeft: "4px solid #5c5348" }} />
        </div>
      </div>
    </div>
  );
}

function ThumbFreeText() {
  return (
    <div style={{ height: "100%", background: "#fff", position: "relative" }}>
      <div style={{ position: "absolute", left: 8, top: 12, width: 35, height: 6, borderRadius: 2, background: "#0a0a0a", transform: "rotate(-3deg)" }} />
      <div style={{ position: "absolute", right: 12, top: 20, width: 28, height: 4, borderRadius: 2, background: "#FF5500", transform: "rotate(2deg)" }} />
      <div style={{ position: "absolute", left: 15, bottom: 14, width: 40, height: 5, borderRadius: 2, background: "#5c5348", transform: "rotate(1deg)" }} />
    </div>
  );
}

function ThumbGeneric({ icon, bg = "#fff" }: { icon: string; bg?: string }) {
  return (
    <div style={{ height: "100%", background: bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3 }}>
      <div style={{ fontSize: 16, opacity: 0.6 }}>{icon}</div>
      <div style={{ width: 28, height: 2.5, borderRadius: 1.5, background: bg === "#fff" ? "#0a0a0a" : "rgba(255,255,255,0.6)", opacity: 0.4 }} />
    </div>
  );
}

const SECTION_THUMB_MAP: Record<string, () => React.ReactElement> = {
  "hero": ThumbHero,
  "editorial-hero": ThumbEditorialHero,
  "split": ThumbSplit,
  "announcement-bar": ThumbAnnouncementBar,
  "navigation": ThumbNavigation,
  "category-tiles": ThumbCategoryTiles,
  "text": ThumbText,
  "free-text": ThumbFreeText,
  "features": ThumbFeatures,
  "image": ThumbImage,
  "gallery": ThumbGallery,
  "video": ThumbVideo,
  "audio": ThumbAudio,
  "products": ThumbProducts,
  "testimonials": ThumbTestimonials,
  "newsletter": ThumbNewsletter,
  "marquee": ThumbMarquee,
  "footer": ThumbFooter,
  "faq": ThumbFaq,
  "contact": ThumbContact,
  "countdown": ThumbCountdown,
  "reviews": ThumbReviews,
  "trust-badges": ThumbTrustBadges,
  "whatsapp": ThumbWhatsApp,
  "events": ThumbEvents,
  "before-after": ThumbBeforeAfter,
};

const SECTION_GENERIC_ICONS: Record<string, string> = {
  "joko": "💳",
  "map": "📍",
  "form": "📋",
  "blog-list": "📝",
  "email-popup": "📩",
  "hotspot-image": "⊕",
  "social-proof": "🔔",
  "floating-cta": "💬",
};

function SectionThumb({ type }: { type: string }) {
  const Renderer = SECTION_THUMB_MAP[type];
  if (Renderer) return <Renderer />;
  const icon = SECTION_GENERIC_ICONS[type] ?? "□";
  return <ThumbGeneric icon={icon} />;
}

/* ─── Main component ─────────────────────────────────────────────────── */

/** Visual thumbnail grid section picker. */
export function AddSectionPicker({
  pageTitle,
  busy,
  onAdd,
}: {
  pageTitle: string;
  busy?: boolean;
  onAdd: (type: string) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<BuilderSectionCategory | "all">("all");
  const [adding, setAdding] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const options = useMemo(() => {
    if (category === "all") return BUILDER_SECTION_CATALOG;
    return BUILDER_SECTION_CATALOG.filter((o) => o.category === category);
  }, [category]);

  async function pick(type: string) {
    setAdding(type);
    try {
      await onAdd(type);
      setOpen(false);
    } finally {
      setAdding(null);
    }
  }

  return (
    <div ref={rootRef}>
      {/* Toggle button */}
      <button
        type="button"
        disabled={busy || Boolean(adding)}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-semibold transition-colors disabled:opacity-40"
        style={{
          background: open ? BUILDER.ink : `${BUILDER.orange}15`,
          color: open ? "#fff" : BUILDER.orange,
          border: `1.5px solid ${open ? BUILDER.ink : `${BUILDER.orange}40`}`,
        }}
      >
        <span className="text-[14px] leading-none">{open ? "×" : "+"}</span>
        {open ? "Close" : "Add section"}
      </button>

      {open && (
        <div
          className="mt-2 overflow-hidden rounded-xl"
          style={{ border: `1px solid ${BUILDER.border}`, background: "#fff" }}
          role="dialog"
          aria-label="Add a section"
        >
          {/* Category pills */}
          <div className="flex gap-1 overflow-x-auto px-2 pt-2 pb-1" style={{ scrollbarWidth: "none" }}>
            {[{ id: "all" as const, label: "All" }, ...BUILDER_SECTION_CATEGORIES].map((c) => {
              const active = category === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id as BuilderSectionCategory | "all")}
                  className="flex-shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold transition-colors"
                  style={{
                    background: active ? BUILDER.ink : `${BUILDER.ink}08`,
                    color: active ? "#fff" : BUILDER.muted,
                  }}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* Thumbnail grid */}
          <div
            className="grid gap-2 p-2"
            style={{ gridTemplateColumns: "1fr 1fr" }}
          >
            {options.map((opt) => {
              const isAdding = adding === opt.type;
              const appBlock = builderAppForSection(opt.type);
              return (
                <button
                  key={opt.type}
                  type="button"
                  disabled={Boolean(adding)}
                  onClick={() => void pick(opt.type)}
                  title={opt.description}
                  className="group flex flex-col overflow-hidden rounded-lg text-left transition-all disabled:opacity-40"
                  style={{
                    border: `1.5px solid ${isAdding ? BUILDER.orange : BUILDER.border}`,
                    outline: isAdding ? `2px solid ${BUILDER.orange}40` : "none",
                    outlineOffset: 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!adding) {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = `${BUILDER.orange}80`;
                      (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.02)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!adding) {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = isAdding ? BUILDER.orange : BUILDER.border;
                      (e.currentTarget as HTMLButtonElement).style.transform = "";
                    }
                  }}
                >
                  {/* Visual preview */}
                  <div style={{ height: 60, overflow: "hidden", flexShrink: 0, borderBottom: `1px solid ${BUILDER.border}` }}>
                    {isAdding ? (
                      <div style={{ height: "100%", background: `${BUILDER.orange}10`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${BUILDER.orange}`, borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
                      </div>
                    ) : (
                      <SectionThumb type={opt.type} />
                    )}
                  </div>
                  {/* Label */}
                  <div className="flex items-center justify-between px-2 py-1.5" style={{ background: "#fff", minHeight: 0 }}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[10.5px] font-semibold leading-tight" style={{ color: BUILDER.ink }}>
                        {isAdding ? "Adding…" : opt.label}
                      </p>
                      {appBlock ? (
                        <span className="rounded bg-black/5 px-1 py-px text-[7.5px] uppercase tracking-wide" style={{ color: BUILDER.muted }}>App</span>
                      ) : null}
                    </div>
                    <span
                      className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[12px] transition-colors"
                      style={{ color: BUILDER.orange, background: `${BUILDER.orange}12` }}
                      aria-hidden
                    >+</span>
                  </div>
                </button>
              );
            })}
          </div>

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  );
}
