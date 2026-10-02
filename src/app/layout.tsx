import type { Metadata, Viewport } from "next";
import { IM_Fell_English, IM_Fell_English_SC, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const fell = IM_Fell_English({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-fell",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

const fellSC = IM_Fell_English_SC({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-fellsc",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

const jbMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-jbmono",
  display: "swap",
  fallback: ["ui-monospace", "Menlo", "Consolas", "monospace"],
});

export const metadata: Metadata = {
  title: "NEVERTWICE — NUST NET Preparation",
  description:
    "Study app for NUST Entry Test re-preparation. Never lose the same mark twice.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#F5DEB3",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fell.variable} ${fellSC.variable} ${jbMono.variable}`}>
      <body className="min-h-[100dvh] bg-parchment font-display text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
