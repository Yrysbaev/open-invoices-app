"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type OverdueRow = {
  customerId: string;
  displayName: string;
  phone: string;
  totalOverdue: number;
  responsible: string;
};

type Analytics = {
  totalOverdue: number;
  totalOpen: number;
  overdueCount: number;
  openInvoiceCount: number;
  comingSoonAmount: number;
  comingSoonCount: number;
  customersWithOpenBalance: number;
  overdueList?: OverdueRow[];
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

          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              All overdue invoices (by customer)
            </h2>
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100">
                      <th className="text-left py-2.5 px-3 font-semibold text-slate-700">Customer</th>
                      <th className="text-left py-2.5 px-3 font-semibold text-slate-700">Phone</th>
                      <th className="text-left py-2.5 px-3 font-semibold text-slate-700">Responsible</th>
                      <th className="text-right py-2.5 px-3 font-semibold text-slate-700">Total overdue</th>
                      <th className="text-right py-2.5 px-3 font-semibold text-slate-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(analytics.overdueList ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 px-3 text-center text-slate-500">
                          No overdue invoices.
                        </td>
                      </tr>
                    ) : (
                      (analytics.overdueList ?? []).map((row) => (
                        <tr key={row.customerId} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                          <td className="py-2.5 px-3 text-slate-800">{row.displayName}</td>
                          <td className="py-2.5 px-3 text-slate-600">{row.phone}</td>
                          <td className="py-2.5 px-3 text-slate-700">{row.responsible ?? "—"}</td>
                          <td className="py-2.5 px-3 text-right font-medium tabular-nums text-slate-800">
                            ${fmt(row.totalOverdue)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <a
                              href={`/api/qbo/download-all?customerId=${encodeURIComponent(row.customerId)}&overdueOnly=true`}
                              className="inline-block px-3 py-1.5 text-xs font-medium rounded-lg bg-[#004f96] text-white hover:opacity-95 active:scale-[0.98]"
                            >
                              Download ZIP
                            </a>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {(analytics.overdueList ?? []).length > 0 && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => {
                    const rows = analytics.overdueList ?? [];
                    const header = "Customer Name,Phone,Responsible,Total Overdue\n";
                    const body = rows
                      .map((r) => {
                        const name = `"${String(r.displayName).replace(/"/g, '""')}"`;
                        const phone = `"${String(r.phone).replace(/"/g, '""')}"`;
                        const responsible = `"${String(r.responsible ?? "").replace(/"/g, '""')}"`;
                        return `${name},${phone},${responsible},${r.totalOverdue.toFixed(2)}`;
                      })
                      .join("\n");
                    const csv = "\uFEFF" + header + body;
                    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "overdue-invoices-table.csv";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="w-full py-3 px-4 bg-slate-700 text-white rounded-xl font-medium hover:opacity-95 active:scale-[0.99]"
                >
                  Download table as Excel
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
