import type { Metadata, Viewport } from "next";
import { Russo_One, Courier_Prime } from "next/font/google";
import "./globals.css";

const russo = Russo_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-russo",
  display: "swap",
  fallback: ["Arial Black", "sans-serif"],
});

const courier = Courier_Prime({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-courier",
  display: "swap",
  fallback: ["Courier New", "monospace"],
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
  themeColor: "#0B0906",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${russo.variable} ${courier.variable}`}>
      <body className="min-h-[100dvh] bg-night font-type text-parchment antialiased">
        {children}
      </body>
    </html>
  );
}
