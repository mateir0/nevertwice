import type { Metadata, Viewport } from "next";
import "./globals.css";

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
  themeColor: "#F7F1E3",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-[100dvh] bg-parchment font-mono text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
