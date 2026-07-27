import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const SITE_URL = process.env.APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "QRVeda — Dynamic QR codes you can change anytime",
    template: "%s | QRVeda",
  },
  description:
    "Create dynamic QR codes for your business — change the destination anytime without reprinting. Scan analytics, smart redirects by time & device, WhatsApp, UPI, menus and more.",
  keywords: [
    "dynamic QR code",
    "QR code generator",
    "QR code with logo",
    "QR code analytics",
    "restaurant menu QR code",
    "UPI QR code",
    "WhatsApp QR code",
    "editable QR code",
  ],
  applicationName: "QRVeda",
  openGraph: {
    type: "website",
    siteName: "QRVeda",
    title: "QRVeda — Dynamic QR codes you can change anytime",
    description:
      "Create dynamic QR codes for your business — change the destination anytime without reprinting. Scan analytics, smart redirects, WhatsApp, UPI, menus and more.",
    url: SITE_URL,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "QRVeda — Dynamic QR codes you can change anytime",
    description:
      "Dynamic QR codes with scan analytics, smart redirects by time & device, WhatsApp, UPI and more.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // Browser extensions (grammar checkers etc.) inject attributes into <html>
    // before React hydrates; suppress that one-level mismatch warning.
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>{children}</body>
    </html>
  );
}
