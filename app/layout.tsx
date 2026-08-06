import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { PWARegister } from "@/app/components/pwa-register";
import { LocaleProvider } from "@/app/components/locale-context";
import { LanguageBar } from "@/app/components/language-bar";
import { ProfileProvider, ProfileSetupModal, ProfileBadge } from "@/app/components/user-profile";
import { ReportBug } from "@/app/components/report-bug";
import { MobileBottomNav } from "@/app/components/mobile-nav";
import { EducationProvider } from "@/app/components/education-system";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Kebu — The African Cloud",
  description:
    "Kebu is the African Cloud: discover real opportunities, create a business or store, and operate online — built for African students, creators, and founders.",
  keywords: [
    "African Cloud",
    "Kebu",
    "African entrepreneurs",
    "Africa business",
    "build in Africa",
    "African online store",
    "opportunity discovery",
    "AfCFTA",
  ],
  openGraph: {
    title: "Kebu — The African Cloud",
    description: "Discover opportunities. Create your business. Launch and sell — one cloud for African builders.",
    type: "website",
    siteName: "Kebu",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kebu — The African Cloud",
    description: "Discover opportunities. Create your business. Launch and sell — one cloud for African builders.",
  },
};

export const viewport: Viewport = {
  themeColor: "#00C851",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${jakarta.variable} h-full antialiased`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-full text-ink bg-ivory">
        <PWARegister />
        <ProfileProvider>
          <LocaleProvider>
            <EducationProvider>
              <LanguageBar />
              {children}
              <ProfileSetupModal />
              <ProfileBadge />
              <ReportBug />
              <MobileBottomNav />
            </EducationProvider>
          </LocaleProvider>
        </ProfileProvider>
      </body>
    </html>
  );
}
