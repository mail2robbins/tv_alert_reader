import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TradingView Alert Reader",
  description: "Professional trading alert management system with Dhan.co integration",
  keywords: ["trading", "alerts", "TradingView", "Dhan.co", "stock market", "automated trading"],
  authors: [{ name: "TradingView Alert Reader" }],
  creator: "TradingView Alert Reader",
  publisher: "TradingView Alert Reader",
  robots: "index, follow",
  openGraph: {
    title: "TradingView Alert Reader",
    description: "Professional trading alert management system with Dhan.co integration",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "TradingView Alert Reader",
    description: "Professional trading alert management system with Dhan.co integration",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/favicon.ico",
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1f2937",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
