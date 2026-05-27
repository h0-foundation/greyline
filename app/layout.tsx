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

// Display / headings / scores — warm humanist geometry.
const jakarta = localFont({
  src: "./fonts/jakarta.woff2",
  variable: "--font-jakarta",
  weight: "200 800",
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
      className={`${inter.variable} ${jakarta.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
