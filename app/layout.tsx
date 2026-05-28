import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/theme-provider";
import { AppShell } from "@/components/shell/app-shell";
import "./globals.css";

// Self-hosted variable fonts (latin) — no build-time network fetch, fully offline.
// Body / UI workhorse.
const inter = localFont({
  src: "./fonts/inter.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

// Display / headings — Geist, a clean geometric premium sans. Used where serif
// would feel out of place (sidebar, technical labels, dialog titles).
const geist = localFont({
  src: "./fonts/geist.woff2",
  variable: "--font-geist",
  weight: "300 700",
  display: "swap",
});

// Editorial display — Fraunces, a variable serif that carries the "dossier" voice
// for content-led headlines (page titles, country names, trip names, hero text).
// This is the *signature* type move; restrained to display sizes only.
const fraunces = localFont({
  src: "./fonts/fraunces.woff2",
  variable: "--font-fraunces",
  weight: "100 900",
  display: "swap",
});

// Data / figures — tabular companion.
const geistMono = localFont({
  src: "./fonts/geistmono.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Greyline — your private lifetime travel log",
  description:
    "Map every country you've visited, plan every trip, and see what each border knows about you. Private, offline, on your machine — no account, no cloud.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geist.variable} ${fraunces.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background font-sans text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <div className="grain" aria-hidden />
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
