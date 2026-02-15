import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
      <h1 className="text-2xl font-bold text-slate-800 mb-4">Open Invoices</h1>
      <p className="text-slate-600 text-center mb-8">
        Sign in and manage open invoices for your customers.
      </p>
      <Link
        href="/dashboard"
        className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 active:scale-[0.98] transition"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
