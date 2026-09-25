import type { Metadata, Viewport } from "next";
import {
  Bebas_Neue,
  Cormorant_Garamond,
  Geist,
  Geist_Mono,
} from "next/font/google";
import { InstallAppBanner } from "@/components/pwa/install-app-banner";
import { InstallFirstGate } from "@/components/pwa/install-first-gate";
import { PwaProvider } from "@/components/pwa/pwa-provider";
import { ThemeInitScript } from "@/components/theme/theme-init-script";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { BRAND_LOGO_SRC } from "@/lib/brand/logo-src";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const rwDisplay = Bebas_Neue({
  variable: "--font-rw-display",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const rwSlogan = Cormorant_Garamond({
  variable: "--font-rw-slogan",
  weight: ["500", "600"],
  style: ["italic"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Red Wings Cricket",
    template: "%s · Red Wings Cricket",
  },
  description: "Red Wings Cricket — PLAY BOLD. STAND UNITED.",
  applicationName: "Red Wings Cricket",
  appleWebApp: {
    capable: true,
    title: "Red Wings",
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: BRAND_LOGO_SRC, type: "image/jpeg" }],
    apple: [{ url: BRAND_LOGO_SRC, type: "image/jpeg" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#b91c1c" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1218" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${rwDisplay.variable} ${rwSlogan.variable} h-full`}
    >
      <body className="min-h-full antialiased transition-colors duration-300">
        <ThemeInitScript />
        <ThemeProvider>
          <PwaProvider>
            <InstallFirstGate>
              {children}
              <InstallAppBanner />
            </InstallFirstGate>
          </PwaProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
