"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/logo";

const features = [
  { title: "Auto-Detect Receipts", desc: "Connect Gmail or Outlook. We find every Uber, Bolt, Waymo, Careem & FREE NOW receipt automatically.", icon: "📧" },
  { title: "Multi-Currency FX", desc: "Convert PLN, GBP, CHF and 20+ currencies with real rates + configurable markup.", icon: "💱" },
  { title: "One-Click Export", desc: "PDF bundles with original receipts or Excel sheets. Filter by country, provider, month.", icon: "📄" },
  { title: "Billing Entities", desc: "Assign receipts to clients. Generate re-invoices with markup in their preferred currency.", icon: "🏢" },
];

const stats = [
  { value: "20+", label: "Currencies" },
  { value: "5", label: "Providers" },
  { value: "< 1s", label: "Parse Time" },
  { value: "99.9%", label: "Accuracy" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 z-50 w-full border-b border-neutral-200/60 bg-white/80 backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Logo height={56} />
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/dashboard">
              <Button size="sm">Open App</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <div className="mx-auto max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Now supporting Uber, Bolt, Waymo, Careem & FREE NOW
            </div>
            <h1 className="text-5xl font-bold tracking-tight text-neutral-900 sm:text-6xl dark:text-white">
              Ride receipts,<br />
              <span className="text-neutral-400">intelligently managed.</span>
            </h1>
            <p className="mt-6 text-lg text-neutral-500 dark:text-neutral-400">
              Automatic email detection, multi-currency conversion with FX markup,
              professional PDF exports, and third-party re-invoicing — all in one place.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link href="/register">
                <Button size="lg">Get Started Free</Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" size="lg">See Features</Button>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl border border-neutral-200/60 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="text-3xl font-bold text-neutral-900 dark:text-white">{s.value}</div>
                <div className="mt-1 text-sm text-neutral-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-neutral-200/60 bg-white py-20 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Everything you need for ride expense management
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-neutral-500 dark:text-neutral-400">
            Built for finance teams, consultants, and frequent travelers who deal with multi-country ride receipts.
          </p>
          <div className="mt-14 grid gap-6 sm:grid-cols-2">
            {features.map((f) => (
              <Card key={f.title}>
                <CardContent className="p-8">
                  <div className="text-3xl">{f.icon}</div>
                  <h3 className="mt-4 text-lg font-semibold text-neutral-900 dark:text-white">{f.title}</h3>
                  <p className="mt-2 text-neutral-500 dark:text-neutral-400">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Start managing your ride receipts today
          </h2>
          <p className="mt-4 text-neutral-500">No credit card required. Free for up to 50 receipts per month.</p>
          <Link href="/dashboard" className="mt-8 inline-block">
            <Button size="lg">Open Dashboard</Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200/60 py-8 dark:border-neutral-800">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-neutral-400">
          &copy; 2026 Ride &amp; Bill. Built for professionals who move.
        </div>
      </footer>
    </div>
  );
}
