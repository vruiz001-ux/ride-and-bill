import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "RideReceipt — Ride Receipt Intelligence",
  description: "Automatic Uber & Bolt receipt collection, multi-currency conversion, and professional invoicing.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 antialiased dark:bg-neutral-950">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
