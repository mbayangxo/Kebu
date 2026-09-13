import type { Metadata, Viewport } from "next";
import { Syne, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { PWARegister } from "@/app/components/pwa-register";
import { LocaleProvider } from "@/app/components/locale-context";
import { ProfileProvider } from "@/app/components/user-profile";
import { AppChrome } from "@/app/components/app-chrome";
import { AuthSessionKeeper } from "@/app/components/auth-session-keeper";
import { EducationProvider } from "@/app/components/education-system";
import { KebuDataModeRoot } from "@/app/components/kebu-data-mode-root";
import { cookies } from "next/headers";
import { DATA_MODE_COOKIE, parseDataMode } from "@/lib/create/data-mode";

const syne = Syne({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Kebu — Africa's Opportunity OS",
  description:
    "Grants, government tenders, and bids — mapped to your country, city, and town. See African resources, entrepreneur paths, and build the site to capture the opportunity.",
  keywords: [
    "Kebu",
    "African opportunity",
    "grants Africa",
    "government tenders",
    "African resources",
    "entrepreneurs Africa",
    "build in Africa",
    "Opportunity OS",
    "AfCFTA",
  ],
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "64x64", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  openGraph: {
    title: "Kebu — Africa's Opportunity OS",
    description:
      "Daily opportunity from public sources. Every resource. Every country, city, and town. Build when you find it.",
    type: "website",
    siteName: "Kebu",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kebu — Africa's Opportunity OS",
    description:
      "Daily opportunity from public sources. Every resource. Every country, city, and town. Build when you find it.",
  },
};

export const viewport: Viewport = {
  themeColor: "#FF5500",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jar = await cookies();
  const mode = parseDataMode(jar.get(DATA_MODE_COOKIE)?.value, "data_saver");
  const modeClass =
    mode === "offline"
      ? "kebu-mode-offline kebu-mode-data-saver"
      : mode === "ultra"
        ? "kebu-mode-ultra"
        : mode === "normal"
          ? "kebu-mode-normal"
          : "kebu-mode-data-saver";

  return (
    <html
      lang="en"
      className={`${syne.variable} ${jakarta.variable} h-full antialiased ${modeClass}`}
      data-kebu-data-mode={mode}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        {/* Preconnect for Google Fonts used by site templates — cuts DNS + TLS round-trips. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body className="min-h-full text-ink bg-ivory">
        <PWARegister />
        <ProfileProvider>
          <LocaleProvider>
            <EducationProvider>
              <KebuDataModeRoot>
                <AuthSessionKeeper />
                <AppChrome />
                {children}
              </KebuDataModeRoot>
            </EducationProvider>
          </LocaleProvider>
        </ProfileProvider>
      </body>
    </html>
  );
}
