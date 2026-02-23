import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#f4f8fd]">
      <div className="w-24 h-24 rounded-full bg-[#004f96] flex items-center justify-center shadow-md mb-4">
        <div className="w-16 h-16 rounded-full bg-[#d60052] flex items-center justify-center text-white text-4xl font-black">
          M
        </div>
      </div>
      <h1 className="text-2xl font-bold text-[#004f96] mb-2">Makro Food Invoices</h1>
      <p className="text-slate-600 text-center mb-8 max-w-sm">
        Sign in and manage open invoices for your customers.
      </p>
      <Link
        href="/login"
        className="px-6 py-3 bg-[#004f96] text-white rounded-xl font-medium hover:opacity-95 active:scale-[0.98] transition"
      >
        Sales Team Sign In
      </Link>
    </div>
  );
}
