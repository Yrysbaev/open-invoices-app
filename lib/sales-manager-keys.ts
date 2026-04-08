/** Shared keys only (safe for client components). Emails live in sales-manager-emails.ts (server). */
export const SALES_MANAGERS = ["Ismail", "Ali", "Yusuf", "Admin"] as const;
export type SalesManager = (typeof SALES_MANAGERS)[number];
