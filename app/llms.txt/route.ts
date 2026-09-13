import { NextResponse } from "next/server";

const LLMS_TXT = `# Kebu

> Kebu is the website and online store builder for African entrepreneurs — built for the hustle, designed for the continent.

Kebu lets anyone in Africa build a professional online shop in minutes: no code, no credit card, no laptop required. Shops are published on \`.kebu.africa\` subdomains with full SEO, mobile money support, and WhatsApp ordering built in.

## What Kebu is

- A no-code website builder and online shop platform
- Built for West Africa first, expanding continent-wide
- Mobile-first, offline-tolerant, works on 2G/3G
- Currency: XOF (West African CFA franc) and other African currencies
- Payments: Wave, Orange Money, MTN Mobile Money, and cash on delivery
- Ordering: WhatsApp + Joko (messaging-native checkout)
- Languages: French and English

## Who uses Kebu

Kebu serves entrepreneurs, small businesses, and market sellers across Africa who want a professional online presence without needing technical skills or a bank account. Target markets include Senegal, Côte d'Ivoire, Mali, Burkina Faso, and the broader ECOWAS region.

## Kebu Features

- [Shop Builder](/create) — drag-and-drop site builder with sections, products, pages
- [Aesthetic Editor](/create/aesthetics) — curated design themes for African brands
- [Yande AI](/create) — AI assistant inside the builder for copy, descriptions, and setup
- [Analytics](/dashboard) — order tracking, revenue in XOF, customer insights
- [Products](/create) — product catalog with images, prices, variants
- [Pages](/create) — home, about, contact, blog, custom pages
- [Media](/create) — photo and image management

## Technical

- Built with Next.js 16 (App Router), Supabase, and TypeScript
- Shops are served at \`{shopname}.kebu.africa\`
- Each shop has its own sitemap.xml, robots.txt, and llms.txt
- JSON-LD structured data: LocalBusiness, Product, ItemList, FAQPage, SearchAction
- MCP server available at \`https://kebu.africa/api/mcp\` for AI integrations

## Notes

- All shop content is created by African entrepreneurs
- Kebu does not sell user data — data is used only to improve the platform experience
- Kebu is owned and operated from West Africa
- Contact: hello@kebu.africa

## Kebu Shops Directory

Each live shop has its own llms.txt at \`https://{shopname}.kebu.africa/llms.txt\`
`;

export async function GET() {
  return new NextResponse(LLMS_TXT, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
