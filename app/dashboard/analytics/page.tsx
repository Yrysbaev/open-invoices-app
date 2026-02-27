"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Analytics = {
  totalOverdue: number;
  totalOpen: number;
  overdueCount: number;
  openInvoiceCount: number;
  comingSoonAmount: number;
  comingSoonCount: number;
  customersWithOpenBalance: number;
};

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const meRes = await fetch("/api/auth/me");
        const meData = await meRes.json();
        if (meData?.user?.role !== "admin") {
          if (!cancelled) setForbidden(true);
          return;
        }
        const r = await fetch("/api/qbo/analytics");
        const data = await r.json();
        if (cancelled) return;
        if (data?.error) setError(data.error);
        else if (data) setAnalytics(data);
      } catch {
        if (!cancelled) setError("Failed to load analytics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (forbidden) {
    return (
      <div className="min-h-screen p-4 max-w-xl mx-auto bg-[#f4f8fd] flex flex-col items-center justify-center">
        <p className="text-slate-600 mb-4">Admin only.</p>
        <Link
          href="/dashboard"
          className="text-[#004f96] font-medium hover:underline"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="min-h-screen p-4 max-w-xl mx-auto bg-[#f4f8fd] pb-safe">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="text-[#004f96] font-medium hover:underline"
          >
            ← Dashboard
          </Link>
        </div>
        <h1 className="text-xl font-semibold text-[#004f96]">Analytics</h1>
      </div>

      {loading && (
        <p className="text-sm text-slate-500 py-8">Loading...</p>
      )}

      {error && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          {error}
        </div>
      )}

      {!loading && analytics && (
        <div className="space-y-4">
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              All records
            </h2>
            <div className="grid gap-3">
              <div className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm">
                <div className="text-xs text-slate-500">Customers with open balance</div>
                <div className="text-2xl font-semibold text-[#004f96]">
                  {analytics.customersWithOpenBalance}
                </div>
              </div>
              <div className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm">
                <div className="text-xs text-slate-500">Open invoices (count)</div>
                <div className="text-2xl font-semibold text-[#004f96]">
                  {analytics.openInvoiceCount}
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Totals
            </h2>
            <div className="grid gap-3">
              <div className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm">
                <div className="text-xs text-slate-500">Total open balance</div>
                <div className="text-2xl font-semibold text-[#004f96]">
                  ${fmt(analytics.totalOpen)}
                </div>
              </div>
              <div className="p-4 border border-red-200 rounded-xl bg-red-50 shadow-sm">
                <div className="text-xs text-red-600">Total overdue</div>
                <div className="text-2xl font-semibold text-red-700">
                  ${fmt(analytics.totalOverdue)}
                </div>
                <div className="text-xs text-red-600 mt-1">
                  {analytics.overdueCount} overdue invoice{analytics.overdueCount === 1 ? "" : "s"}
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Coming soon (due in next 30 days)
            </h2>
            <div className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm">
              <div className="text-xs text-slate-500">Amount due soon</div>
              <div className="text-2xl font-semibold text-[#004f96]">
                ${fmt(analytics.comingSoonAmount)}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {analytics.comingSoonCount} invoice{analytics.comingSoonCount === 1 ? "" : "s"}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
