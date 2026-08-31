import type { WebsiteDefinition } from "@/lib/create/website-schema";
import { VideoEmbed } from "@/app/components/video-embed";
import {
  MaylecorHomeLayout,
  MaylecorMusicLayout,
  type MaylecorHomeProps,
  type MaylecorMusicProps,
} from "@/app/components/create/maylecor-layout";
import {
  LegallyBlondeHeroLayout,
  type LegallyBlondeHeroProps,
} from "@/app/components/create/legally-blonde-layout";

function resolvePage(definition: WebsiteDefinition, pageSlug?: string) {
  if (!definition.pages.length) return null;
  if (!pageSlug || pageSlug === "home") {
    return definition.pages.find((p) => p.slug === "home") ?? definition.pages[0]!;
  }
  return definition.pages.find((p) => p.slug === pageSlug) ?? definition.pages[0]!;
}

function sectionAnchor(section: { id?: string; type: string }): string | undefined {
  if (section.id) return section.id;
  switch (section.type) {
    case "text":
      return "about";
    case "features":
      return "services";
    case "gallery":
      return "gallery";
    case "events":
      return "events";
    case "map":
      return "map";
    case "testimonials":
      return "testimonials";
    case "faq":
      return "faq";
    case "contact":
      return "contact";
    case "whatsapp":
      return "whatsapp";
    default:
      return undefined;
  }
}

/** Public/preview renderer — approved section types only. */
export function SiteRenderer({
  definition,
  mode = "live",
  pageSlug,
  siteBase = "",
}: {
  definition: WebsiteDefinition;
  mode?: "live" | "preview";
  pageSlug?: string;
  /** e.g. /sites/maylecor for multi-page links */
  siteBase?: string;
}) {
  const theme = definition.theme;
  const page = resolvePage(definition, pageSlug);
  if (!page) return null;

  const maylecorOnly = page.sections.every((s) =>
    s.type === "maylecor-home" || s.type === "maylecor-music",
  );
  const legallyBlondeOnly = page.sections.every((s) => s.type === "legally-blonde-hero");

  const shellStyle = maylecorOnly
    ? { background: "#000", color: "#fff", minHeight: mode === "preview" ? "100%" : "100vh" }
    : legallyBlondeOnly
      ? { background: "#fff", color: "#111", minHeight: mode === "preview" ? "100%" : "100vh" }
      : {
        background: theme.background,
        color: theme.text,
        minHeight: mode === "preview" ? "100%" : "100vh",
        fontFamily: theme.fontBody,
      };

  return (
    <div style={shellStyle}>
      {page.sections.map((section, idx) => {
        if (section.props && (section.props as { hidden?: boolean }).hidden) return null;
        const key = section.id ?? `${section.type}-${idx}`;
        const anchor = sectionAnchor(section);
        switch (section.type) {
          case "maylecor-home":
            return (
              <MaylecorHomeLayout
                key={key}
                props={section.props as MaylecorHomeProps}
                siteBase={siteBase}
              />
            );
          case "maylecor-music":
            return (
              <MaylecorMusicLayout
                key={key}
                props={section.props as MaylecorMusicProps}
                siteBase={siteBase}
              />
            );
          case "legally-blonde-hero":
            return (
              <LegallyBlondeHeroLayout
                key={key}
                props={section.props as LegallyBlondeHeroProps}
              />
            );
          case "navigation": {
            const p = section.props as { brand: string; links?: { label: string; href: string }[] };
            return (
              <header
                key={key}
                className="px-5 py-4 flex items-center justify-between"
                style={{ background: theme.primary, color: "#fff" }}
              >
                <span className="font-bold tracking-wide">{p.brand}</span>
                <nav className="flex gap-4 text-sm">
                  {(p.links ?? []).map((l) => (
                    <a key={l.label} href={l.href} className="opacity-80 hover:opacity-100">
                      {l.label}
                    </a>
                  ))}
                </nav>
              </header>
            );
          }
          case "hero": {
            const p = section.props as {
              heading: string;
              subheading?: string;
              buttonLabel?: string;
              buttonHref?: string;
              align?: string;
              background?: string;
            };
            return (
              <section
                key={key}
                className="px-5 py-16 sm:py-24"
                style={{
                  background: p.background || theme.primary,
                  color: "#fff",
                  textAlign: p.align === "left" ? "left" : "center",
                }}
              >
                <h1
                  className="text-3xl sm:text-5xl font-bold max-w-3xl mx-auto"
                  style={{ fontFamily: theme.fontDisplay }}
                >
                  {p.heading}
                </h1>
                {p.subheading && (
                  <p className="mt-4 text-base sm:text-lg opacity-80 max-w-2xl mx-auto">{p.subheading}</p>
                )}
                {p.buttonLabel && (
                  <a
                    href={p.buttonHref || "#"}
                    className="inline-block mt-8 rounded-full px-6 py-3 text-sm font-bold"
                    style={{ background: theme.accent, color: theme.primary }}
                  >
                    {p.buttonLabel}
                  </a>
                )}
              </section>
            );
          }
          case "text": {
            const p = section.props as { heading?: string; body: string };
            return (
              <section key={key} id={anchor} className="px-5 py-12 max-w-3xl mx-auto scroll-mt-20">
                {p.heading && (
                  <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: theme.fontDisplay }}>
                    {p.heading}
                  </h2>
                )}
                <p className="leading-relaxed opacity-80 whitespace-pre-wrap">{p.body}</p>
              </section>
            );
          }
          case "features": {
            const p = section.props as { heading?: string; items?: { title: string; body: string }[] };
            return (
              <section key={key} id={anchor} className="px-5 py-12 max-w-5xl mx-auto scroll-mt-20">
                <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: theme.fontDisplay }}>
                  {p.heading || "Features"}
                </h2>
                <div className="grid sm:grid-cols-3 gap-6">
                  {(p.items ?? []).map((item) => (
                    <div key={item.title} className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid #E8E6DF" }}>
                      <h3 className="font-semibold mb-2">{item.title}</h3>
                      <p className="text-sm opacity-70">{item.body}</p>
                    </div>
                  ))}
                </div>
              </section>
            );
          }
          case "testimonials": {
            const p = section.props as { heading?: string; items?: { quote: string; name: string }[] };
            return (
              <section key={key} id={anchor} className="px-5 py-12 max-w-4xl mx-auto scroll-mt-20">
                <h2 className="text-2xl font-bold mb-6">{p.heading || "Testimonials"}</h2>
                <div className="space-y-4">
                  {(p.items ?? []).map((item) => (
                    <blockquote key={item.name} className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid #E8E6DF" }}>
                      <p className="text-sm italic opacity-80">“{item.quote}”</p>
                      <cite className="text-xs not-italic mt-2 block font-semibold">{item.name}</cite>
                    </blockquote>
                  ))}
                </div>
              </section>
            );
          }
          case "faq": {
            const p = section.props as { heading?: string; items?: { question: string; answer: string }[] };
            return (
              <section key={key} id={anchor} className="px-5 py-12 max-w-3xl mx-auto scroll-mt-20">
                <h2 className="text-2xl font-bold mb-6">{p.heading || "FAQ"}</h2>
                <div className="space-y-4">
                  {(p.items ?? []).map((item) => (
                    <div key={item.question}>
                      <p className="font-semibold">{item.question}</p>
                      <p className="text-sm opacity-70 mt-1">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </section>
            );
          }
          case "contact": {
            const p = section.props as { heading?: string; email?: string; phone?: string; address?: string };
            return (
              <section key={key} id={anchor} className="px-5 py-12 max-w-3xl mx-auto scroll-mt-20">
                <h2 className="text-2xl font-bold mb-4">{p.heading || "Contact"}</h2>
                <ul className="text-sm space-y-2 opacity-80">
                  {p.email && <li>Email: {p.email}</li>}
                  {p.phone && <li>Phone: {p.phone}</li>}
                  {p.address && <li>{p.address}</li>}
                  {!p.email && !p.phone && !p.address && <li>Contact details coming soon.</li>}
                </ul>
              </section>
            );
          }
          case "whatsapp": {
            const p = section.props as { label?: string; phone: string; message?: string };
            const phone = p.phone.replace(/\D/g, "");
            const href = `https://wa.me/${phone}${p.message ? `?text=${encodeURIComponent(p.message)}` : ""}`;
            return (
              <section key={key} id={anchor} className="px-5 py-8 text-center scroll-mt-20">
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded-full px-6 py-3 text-sm font-bold"
                  style={{ background: "#25D366", color: "#fff" }}
                >
                  {p.label || "WhatsApp"}
                </a>
              </section>
            );
          }
          case "image": {
            const p = section.props as { src?: string; alt?: string; caption?: string };
            if (!p.src) return null;
            return (
              <figure key={key} className="px-5 py-8 max-w-4xl mx-auto">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.src} alt={p.alt || ""} className="w-full rounded-2xl" />
                {p.caption && <figcaption className="text-xs mt-2 opacity-60">{p.caption}</figcaption>}
              </figure>
            );
          }
          case "gallery": {
            const p = section.props as { items?: { src: string; alt?: string }[] };
            const items = (p.items ?? []).filter((item) => item.src);
            if (!items.length) return null;
            return (
              <section key={key} id={anchor} className="px-5 py-8 max-w-5xl mx-auto scroll-mt-20">
                <div className="grid sm:grid-cols-3 gap-3">
                  {items.map((item, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={`${item.src}-${i}`}
                      src={item.src}
                      alt={item.alt || ""}
                      className="rounded-xl w-full object-cover aspect-square"
                    />
                  ))}
                </div>
              </section>
            );
          }
          case "video": {
            const p = section.props as { heading?: string; src: string; title?: string; caption?: string };
            if (!p.src) return null;
            return (
              <section key={key} id={anchor} className="px-5 py-12 max-w-4xl mx-auto scroll-mt-20">
                {p.heading && (
                  <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: theme.fontDisplay }}>
                    {p.heading}
                  </h2>
                )}
                <VideoEmbed src={p.src} title={p.title} caption={p.caption} />
              </section>
            );
          }
          case "audio": {
            const p = section.props as { heading?: string; src: string; title?: string; artist?: string };
            if (!p.src) return null;
            const src = p.src.trim();
            const isMp3 = /\.mp3(\?|$)/i.test(src);
            const spotifyEmbed = src.includes("open.spotify.com")
              ? src.replace("open.spotify.com/", "open.spotify.com/embed/")
              : null;
            return (
              <section key={key} id={anchor} className="px-5 py-12 max-w-2xl mx-auto scroll-mt-20">
                {p.heading && <h2 className="text-2xl font-bold mb-4">{p.heading}</h2>}
                {(p.title || p.artist) && (
                  <p className="text-sm opacity-70 mb-3">
                    {p.title}
                    {p.artist ? ` · ${p.artist}` : ""}
                  </p>
                )}
                {isMp3 ? (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <audio controls className="w-full" src={src} />
                ) : spotifyEmbed ? (
                  <iframe
                    src={spotifyEmbed}
                    title={p.title || "Audio"}
                    className="w-full rounded-xl"
                    style={{ height: 152, border: 0 }}
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                  />
                ) : (
                  <iframe
                    src={src}
                    title={p.title || "Audio embed"}
                    className="w-full rounded-xl"
                    style={{ height: 166, border: 0 }}
                    allow="autoplay"
                    loading="lazy"
                  />
                )}
              </section>
            );
          }
          case "map": {
            const p = section.props as {
              heading?: string;
              address?: string;
              latitude: number;
              longitude: number;
              zoom?: number;
            };
            const z = p.zoom ?? 14;
            const bbox = `${p.longitude - 0.02},${p.latitude - 0.02},${p.longitude + 0.02},${p.latitude + 0.02}`;
            const embed = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${p.latitude}%2C${p.longitude}`;
            return (
              <section key={key} id={anchor} className="px-5 py-12 max-w-4xl mx-auto scroll-mt-20">
                <h2 className="text-2xl font-bold mb-2">{p.heading || "Find us"}</h2>
                {p.address && <p className="text-sm opacity-70 mb-4">{p.address}</p>}
                <iframe
                  title={p.heading || "Map"}
                  src={embed}
                  className="w-full rounded-2xl border border-black/10"
                  style={{ height: 320 }}
                  loading="lazy"
                />
              </section>
            );
          }
          case "events": {
            const p = section.props as {
              heading?: string;
              items?: {
                title: string;
                date: string;
                location?: string;
                description?: string;
                ticketUrl?: string;
              }[];
            };
            const items = p.items ?? [];
            if (!items.length) return null;
            return (
              <section key={key} id={anchor} className="px-5 py-12 max-w-3xl mx-auto scroll-mt-20">
                <h2 className="text-2xl font-bold mb-6">{p.heading || "Events"}</h2>
                <ul className="space-y-4">
                  {items.map((ev) => (
                    <li
                      key={`${ev.title}-${ev.date}`}
                      className="rounded-2xl p-5"
                      style={{ background: "#fff", border: "1px solid #E8E6DF" }}
                    >
                      <p className="text-xs font-bold uppercase tracking-wider opacity-50">{ev.date}</p>
                      <h3 className="font-semibold text-lg mt-1">{ev.title}</h3>
                      {ev.location && <p className="text-sm opacity-70 mt-1">{ev.location}</p>}
                      {ev.description && <p className="text-sm opacity-80 mt-2">{ev.description}</p>}
                      {ev.ticketUrl && ev.ticketUrl !== "#" && (
                        <a
                          href={ev.ticketUrl}
                          className="inline-block mt-3 text-sm font-bold"
                          style={{ color: theme.primary }}
                        >
                          Tickets / RSVP →
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          }
          case "footer": {
            const p = section.props as { text?: string; links?: { label: string; href: string }[] };
            return (
              <footer key={key} className="px-5 py-8 mt-8 text-center text-sm opacity-60" style={{ borderTop: "1px solid #E8E6DF" }}>
                <p>{p.text}</p>
                <div className="flex justify-center gap-4 mt-2">
                  {(p.links ?? []).map((l) => (
                    <a key={l.label} href={l.href}>
                      {l.label}
                    </a>
                  ))}
                </div>
              </footer>
            );
          }
          default:
            return null;
        }
      })}
    </div>
  );
}
