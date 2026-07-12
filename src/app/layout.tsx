import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { SpaceBackground } from "@/components/theme/space-background";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { CommandPalette } from "@/components/command/command-palette";
import { PageTransition } from "@/components/layout/page-transition";
import { readPreset } from "@/lib/preset/preset-service";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ccBilly 工作台",
  description: "本地优先的个人工作台 · 深空玻璃拟态",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#060913" },
    { media: "(prefers-color-scheme: light)", color: "#F4F6FC" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read the active preset server-side (ADR-020) and pass its id to the client
  // nav so only the modules for this persona show. Passing the id (a string),
  // not the filtered items, keeps icon components out of the RSC prop boundary.
  const { active: preset } = readPreset();
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      {/* suppressHydrationWarning: some browser extensions inject attributes
          (e.g. mpa-version) onto <body> before React hydrates, which is harmless
          but triggers a hydration mismatch warning. */}
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <SpaceBackground />
          <div className="flex min-h-screen">
            <Sidebar preset={preset} />
            <div className="flex min-w-0 flex-1 flex-col">
              <Topbar />
              <main className="flex-1 px-4 pb-24 pt-2 md:px-6 md:pb-8">
                <PageTransition>{children}</PageTransition>
              </main>
            </div>
          </div>
          <MobileNav preset={preset} />
          <CommandPalette />
        </ThemeProvider>
      </body>
    </html>
  );
}
