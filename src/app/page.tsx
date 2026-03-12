"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import Script from "next/script";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Ride & Bill",
  alternateName: "Ride & Bill — Admin'Easy",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Automatically collect Uber, Bolt, Waymo, Careem & FREE NOW receipts. Multi-currency conversion, PDF exports, and re-invoicing.",
  url: "https://ride-and-bill.netlify.app",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",

    description: "Free for up to 50 receipts per month",
  },
  publisher: {
    "@type": "Organization",
    name: "Tropos Group",
  },
  featureList: [
    "Automatic receipt detection from Gmail and Outlook",
    "Multi-currency conversion with configurable FX markup",
    "Professional PDF and CSV exports",
    "Third-party re-invoicing with billing entities",
    "Support for Uber, Bolt, Waymo, Careem, FREE NOW",
  ],
};

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

function NavDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
      >
        Menu
        <svg className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-xl border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
          <Link href="#about" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800">
            About Us
          </Link>
          <Link href="#pricing" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800">
            Pricing
          </Link>
          <Link href="#faq" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800">
            FAQ
          </Link>
        </div>
      )}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Script
        id="json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Nav */}
      <header>
      <nav aria-label="Main navigation" className="fixed top-0 z-50 w-full border-b border-neutral-200/60 bg-white/80 backdrop-blur-xl dark:border-neutral-800 dark:bg-neutral-950/80">
        <div className="mx-auto flex h-24 max-w-6xl items-center justify-between px-6">
          <Logo height={80} />
          <div className="flex items-center gap-6">
            <NavDropdown />
            <div className="flex items-center gap-3">
              <Link href="/register">
                <Button variant="outline" size="sm">Sign Up</Button>
              </Link>
              <Link href="/login">
                <Button size="sm">Log In</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>
      </header>

      <main>
      {/* Hero */}
      <section className="pt-40 pb-20">
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

      {/* About Us */}
      <section id="about" className="py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            About Us
          </h2>
          <div className="mt-10 space-y-6 text-neutral-600 leading-relaxed dark:text-neutral-400">
            <p>
              Ride &amp; Bill helps rideshare drivers using platforms like Uber, Bolt, and others keep track of their ride-related expenses by easily collecting and organizing their receipts in one place. Instead of searching through emails or screenshots, users can quickly consolidate all their ride receipts for clear and accurate record-keeping.
            </p>
            <p>
              The platform makes it simple to prepare expense reports for employers or clients by automatically organizing receipts and providing a structured overview of travel costs. This saves time, reduces administrative work, and ensures that no reimbursable expense is missed.
            </p>
            <p>
              Ride &amp; Bill is designed for professionals who rely on rideshare services and need a simple, reliable way to manage receipts and account for their transportation expenses.
            </p>
            <p>
              Created by Vincent Ruiz, a former pilot and C-suite executive who has been travelling around the globe for 30 years.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Simple, transparent pricing
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-neutral-500 dark:text-neutral-400">
            Start free. Upgrade when you need more power.
          </p>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Free */}
            <div className="flex flex-col rounded-2xl border border-neutral-200/60 bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="text-sm font-medium text-neutral-500">Free</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-neutral-900 dark:text-white">&euro;0</span>
                <span className="text-sm text-neutral-400">/mo</span>
              </div>
              <p className="mt-3 text-sm text-neutral-500">For trying things out</p>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-neutral-600 dark:text-neutral-400">
                <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-500">&#10003;</span>20 receipts/month</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-500">&#10003;</span>Manual upload only</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-500">&#10003;</span>Summary PDF export</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-500">&#10003;</span>30-day retention</li>
              </ul>
              <Link href="/register" className="mt-8">
                <Button variant="outline" className="w-full">Get Started</Button>
              </Link>
            </div>

            {/* Solo */}
            <div className="flex flex-col rounded-2xl border border-neutral-200/60 bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="text-sm font-medium text-neutral-500">Solo</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-neutral-900 dark:text-white">&euro;9</span>
                <span className="text-sm text-neutral-400">/mo</span>
              </div>
              <p className="mt-3 text-sm text-neutral-500">For individuals</p>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-neutral-600 dark:text-neutral-400">
                <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-500">&#10003;</span>150 receipts/month</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-500">&#10003;</span>1 Gmail inbox sync</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-500">&#10003;</span>Full PDF &amp; CSV export</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-500">&#10003;</span>Company details in reports</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-500">&#10003;</span>1-year retention</li>
              </ul>
              <Link href="/register" className="mt-8">
                <Button variant="outline" className="w-full">Start Free Trial</Button>
              </Link>
            </div>

            {/* Pro — highlighted */}
            <div className="relative flex flex-col rounded-2xl border-2 border-[#1e3a5f] bg-white p-8 shadow-lg dark:bg-neutral-900">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#1e3a5f] px-3 py-0.5 text-xs font-semibold text-white">
                Most Popular
              </div>
              <div className="text-sm font-medium text-[#1e3a5f]">Pro</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-neutral-900 dark:text-white">&euro;29</span>
                <span className="text-sm text-neutral-400">/mo</span>
              </div>
              <p className="mt-3 text-sm text-neutral-500">For power users &amp; small teams</p>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-neutral-600 dark:text-neutral-400">
                <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-500">&#10003;</span>500 receipts/month</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-500">&#10003;</span>3 seats &amp; 3 inboxes</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-500">&#10003;</span>Gmail &amp; Outlook sync</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-500">&#10003;</span>Branded reports</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-500">&#10003;</span>Duplicate detection</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-500">&#10003;</span>Priority sync</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-500">&#10003;</span>3-year retention</li>
              </ul>
              <Link href="/register" className="mt-8">
                <Button className="w-full">Start Free Trial</Button>
              </Link>
            </div>

            {/* Team */}
            <div className="flex flex-col rounded-2xl border border-neutral-200/60 bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="text-sm font-medium text-neutral-500">Team</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-neutral-900 dark:text-white">&euro;79</span>
                <span className="text-sm text-neutral-400">/mo</span>
              </div>
              <p className="mt-3 text-sm text-neutral-500">For organizations</p>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-neutral-600 dark:text-neutral-400">
                <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-500">&#10003;</span>1,500 receipts/month</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-500">&#10003;</span>10 seats &amp; 10 inboxes</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-500">&#10003;</span>Everything in Pro</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-500">&#10003;</span>Roles &amp; permissions</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-500">&#10003;</span>Shared workspace</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-500">&#10003;</span>Accountant access</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-500">&#10003;</span>Priority support</li>
                <li className="flex items-start gap-2"><span className="mt-0.5 text-emerald-500">&#10003;</span>7-year retention</li>
              </ul>
              <Link href="/register" className="mt-8">
                <Button variant="outline" className="w-full">Contact Sales</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-neutral-200/60 py-20 dark:border-neutral-800">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Start managing your ride receipts today
          </h2>
          <p className="mt-4 text-neutral-500">No credit card required. Free for up to 50 receipts per month.</p>
          <Link href="/register" className="mt-8 inline-block">
            <Button size="lg">Get Started Free</Button>
          </Link>
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200/60 py-8 dark:border-neutral-800">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-neutral-400">
          &copy; 2026 Ride &amp; Bill. Built for professionals who move.
          <br />
          <span className="text-neutral-300">Part of the Tropos group of companies</span>
        </div>
      </footer>
    </div>
  );
}
