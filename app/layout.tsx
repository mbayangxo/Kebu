import type { Metadata, Viewport } from "next";
import { Syne, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { PWARegister } from "@/app/components/pwa-register";
import { LocaleProvider } from "@/app/components/locale-context";
import { ProfileProvider } from "@/app/components/user-profile";
import { AppChrome } from "@/app/components/app-chrome";
import { AuthSessionKeeper } from "@/app/components/auth-session-keeper";
import { EducationProvider } from "@/app/components/education-system";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${syne.variable} ${jakarta.variable} h-full antialiased`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-full text-ink bg-ivory">
        <PWARegister />
        <ProfileProvider>
          <LocaleProvider>
            <EducationProvider>
              <AuthSessionKeeper />
              <AppChrome />
              {children}
            </EducationProvider>
          </LocaleProvider>
        </ProfileProvider>
      </body>
    </html>
  );
}
