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
  themeColor: "#0F3B2C",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="pcb-texture min-h-[100dvh] font-mono text-cream antialiased">
        {children}
      </body>
    </html>
  );
}
