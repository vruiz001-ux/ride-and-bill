import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { AnalyticsScripts } from "@/components/analytics";
import "./globals.css";

const siteUrl = "https://ride-and-bill.netlify.app";

export const metadata: Metadata = {
  title: {
    default: "Ride & Bill — Admin'Easy | Ride Receipt Management",
    template: "%s | Ride & Bill",
  },
  description:
    "Automatically collect Uber, Bolt, Waymo, Careem & FREE NOW receipts from your email. Multi-currency conversion, professional PDF exports, and third-party re-invoicing for finance teams and frequent travelers.",
  keywords: [
    "ride receipts",
    "Uber receipts",
    "Bolt receipts",
    "expense management",
    "receipt automation",
    "multi-currency conversion",
    "PDF export",
    "invoice management",
    "ride expense tracker",
    "Waymo receipts",
    "Careem receipts",
    "FREE NOW receipts",
    "business travel expenses",
    "ride hailing receipts",
    "admin easy",
  ],
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Ride & Bill",
    title: "Ride & Bill — Admin'Easy | Ride Receipt Management",
    description:
      "Automatically collect ride receipts from Uber, Bolt, Waymo, Careem & FREE NOW. Multi-currency FX, PDF exports, and re-invoicing — all in one place.",
    images: [
      {
        url: "/logo-rb.png",
        width: 641,
        height: 263,
        alt: "Ride & Bill Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ride & Bill — Admin'Easy",
    description:
      "Automatically collect ride receipts from Uber, Bolt & more. Multi-currency conversion, PDF exports, and re-invoicing.",
    images: ["/logo-rb.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/logo-rb.png",
    apple: "/logo-rb.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 antialiased dark:bg-neutral-950">
        <Providers>{children}</Providers>
        <AnalyticsScripts />
      </body>
    </html>
  );
}
