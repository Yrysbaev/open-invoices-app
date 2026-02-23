"use client";

import { useEffect, useMemo, useState } from "react";

type Customer = { Id: string; DisplayName: string };
type Invoice = {
  Id: string;
  DocNumber: string;
  TxnDate: string;
  TotalAmt: number;
  Balance: number;
};

export default function Dashboard() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [customersError, setCustomersError] = useState<string | null>(null);
  const [downloadingZip, setDownloadingZip] = useState(false);

  useEffect(() => {
    fetch("/api/qbo/customers")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setCustomersError(data.error);
          setCustomers([]);
        } else {
          const list = data?.QueryResponse?.Customer ?? [];
          setCustomers(list);
          setCustomersError(null);
        }
      })
      .catch(() => setCustomersError("Failed to load customers"));
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return customers.slice(0, 50);
    return customers
      .filter((c) => c.DisplayName?.toLowerCase().includes(s))
      .slice(0, 50);
  }, [customers, q]);

  async function loadInvoices(customer: Customer) {
    setSelected(customer);
    setLoading(true);
    setInvoices([]);
    try {
      const r = await fetch(`/api/qbo/open-invoices?customerId=${customer.Id}`);
      const data = await r.json();
      if (data?.error) {
        setCustomersError(data.error);
        setInvoices([]);
      } else {
        setInvoices(data?.QueryResponse?.Invoice ?? []);
      }
    } catch {
      setInvoices([]);
    }
    setLoading(false);
  }

  async function downloadAllZip() {
    if (!selected) return;
    setDownloadingZip(true);
    try {
      const r = await fetch(
        `/api/qbo/download-all?customerId=${selected.Id}`
      );
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        alert(data.error || "Download failed");
        return;
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "open-invoices.zip";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Download failed");
    }
    setDownloadingZip(false);
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen p-4 max-w-xl mx-auto bg-[#f4f8fd] pb-safe">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-[#004f96] flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-[#d60052] flex items-center justify-center text-white text-sm font-black">
              M
            </div>
          </div>
          <h1 className="text-xl font-semibold text-[#004f96]">Open Invoices</h1>
        </div>
        <div className="flex items-center gap-3">
          <a
            className="text-sm text-[#004f96] font-medium hover:underline"
            href="/api/qbo/connect"
          >
            Connect QBO
          </a>
          <button
            className="text-sm text-slate-600 font-medium hover:underline"
            onClick={signOut}
          >
            Sign out
          </button>
        </div>
      </div>

      {customersError && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          {customersError}
        </div>
      )}

      <div className="mb-4">
        <input
          className="w-full border border-slate-200 rounded-xl p-3 text-base bg-white focus:ring-2 focus:ring-[#004f96] focus:border-[#004f96] outline-none"
          placeholder="Search customer..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="mb-6 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
        {filtered.map((c) => (
          <button
            key={c.Id}
            className="w-full text-left p-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 active:bg-slate-100 transition"
            onClick={() => loadInvoices(c)}
          >
            {c.DisplayName}
          </button>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-3">
          {selected
            ? `Open invoices: ${selected.DisplayName}`
            : "Select a customer"}
        </h2>

        {loading && (
          <p className="text-sm text-slate-500 py-4">Loading...</p>
        )}

        {!loading && selected && (
          <div className="space-y-3">
            {invoices.length > 0 && (
              <button
                onClick={downloadAllZip}
                disabled={downloadingZip}
                className="w-full py-3 px-4 bg-[#004f96] text-white rounded-xl font-medium hover:opacity-95 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {downloadingZip ? "Preparing ZIP..." : "Download all as ZIP"}
              </button>
            )}

            {invoices.length === 0 && (
              <div className="p-4 border border-slate-200 rounded-xl text-sm text-slate-600 bg-white">
                No open invoices.
              </div>
            )}

            {invoices.map((inv) => (
              <div
                key={inv.Id}
                className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-slate-800">
                      #{inv.DocNumber}
                    </div>
                    <div className="text-sm text-slate-500">{inv.TxnDate}</div>
                    <div className="text-sm font-medium text-slate-700">
                      Balance: ${Number(inv.Balance).toFixed(2)}
                    </div>
                  </div>
                  <a
                    className="shrink-0 px-4 py-2 border border-[#004f96] text-[#004f96] rounded-xl text-sm font-medium hover:bg-blue-50 active:scale-[0.98] transition"
                    href={`/api/qbo/invoice-pdf?invoiceId=${inv.Id}`}
                  >
                    Download PDF
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
