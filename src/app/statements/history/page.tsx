"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Statement } from "@/lib/types";

export default function StatementHistoryPage() {
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/statements")
      .then(r => r.json())
      .then(data => {
        setStatements(data.statements || []);
        setLoading(false);
      });
  }, []);

  const handleDownload = async (id: string, format: string) => {
    try {
      const res = await fetch(`/api/statements/${id}/download?format=${format}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `statement-${id}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // silent
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-neutral-400">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">Statement History</h1>
          <p className="mt-1 text-sm text-neutral-500">Previously generated statements.</p>
        </div>
        <Link href="/statements">
          <Button variant="outline" size="sm">&larr; Statement Generator</Button>
        </Link>
      </div>

      {/* Statement list */}
      {statements.length > 0 ? (
        <div className="space-y-3">
          {statements.map(s => (
            <Card key={s.id}>
              <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="font-medium text-neutral-900 dark:text-white">
                    {s.title || "Untitled Statement"}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                    <span>{formatDate(s.periodStart)} &mdash; {formatDate(s.periodEnd)}</span>
                    <Badge variant="secondary">{s.totalReceipts} receipts</Badge>
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                      {formatCurrency(s.totalAmount, s.totalAmountCurrency)}
                    </span>
                    {s.applyMarkup && s.totalWithMarkup != null && (
                      <span className="text-emerald-600">
                        (with {s.markupPercent}% markup: {formatCurrency(s.totalWithMarkup, s.outputCurrency)})
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-neutral-400">Created {formatDate(s.createdAt)}</div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {["pdf", "csv", "xlsx", "zip"].map(fmt => (
                    <Button key={fmt} variant="outline" size="sm" onClick={() => handleDownload(s.id, fmt)}>
                      {fmt.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="text-4xl">📄</div>
            <div className="mt-3 text-sm text-neutral-400">
              No statements generated yet.{" "}
              <Link href="/statements" className="text-neutral-600 hover:text-neutral-800 dark:text-neutral-300 dark:hover:text-white underline">
                Go to Statement Generator
              </Link>{" "}
              to create one.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
