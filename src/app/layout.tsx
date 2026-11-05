import type { Metadata, Viewport } from "next";
import { Azeret_Mono, Bodoni_Moda, Hanken_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { WardrobeProvider } from "@/state/wardrobe";
import "./globals.css";

const display = Bodoni_Moda({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-display",
  display: "swap",
});
const body = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const mono = Azeret_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

const DESCRIPTION = "Outfit of the day from the wardrobe you already own, layered for the weather.";

export const metadata: Metadata = {
  metadataBase: new URL("https://ootd.cjarhodes.com"),
  title: { default: "OOTD", template: "%s · OOTD" },
  description: DESCRIPTION,
  applicationName: "OOTD",
  appleWebApp: { capable: true, title: "OOTD", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
  authors: [{ name: "Alex Rhodes", url: "https://cjarhodes.com" }],
  openGraph: {
    type: "website",
    siteName: "OOTD",
    title: "OOTD · Outfit of the day",
    description: DESCRIPTION,
    url: "/",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "OOTD: a layered outfit laid flat beside the wordmark" }],
  },
  twitter: { card: "summary_large_image", title: "OOTD · Outfit of the day", description: DESCRIPTION, images: ["/og.png"] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbf9" },
    { media: "(prefers-color-scheme: dark)", color: "#121211" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-GB" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>
        <WardrobeProvider>
          <AppShell>{children}</AppShell>
        </WardrobeProvider>
      </body>
    </html>
  );
}
