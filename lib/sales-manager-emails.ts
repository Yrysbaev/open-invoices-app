import {
  SALES_MANAGERS,
  type SalesManager,
} from "@/lib/sales-manager-keys";

export { SALES_MANAGERS, type SalesManager };

/**
 * Sales manager inboxes — set these here, or leave empty and use env vars instead:
 * SALES_EMAIL_ISMAIL, SALES_EMAIL_ALI, SALES_EMAIL_YUSUF, SALES_EMAIL_ADMIN
 * (code wins when non-empty; otherwise env is used.)
 * Admin: full company overdue list (all customers). Others: that person’s customers only.
 */
export const SALES_MANAGER_EMAILS: Record<SalesManager, string> = {
  Ismail: "sales01@makrofood.com",
  Ali: "sales03@makrofood.com",
  Yusuf: "Yusuf@makrofood.com",
  Admin: "",
};

export function getSalesManagerEmail(manager: SalesManager): string | undefined {
  const fromCode = SALES_MANAGER_EMAILS[manager]?.trim();
  if (fromCode) return fromCode;

  const envMap: Record<SalesManager, string | undefined> = {
    Ismail: process.env.SALES_EMAIL_ISMAIL,
    Ali: process.env.SALES_EMAIL_ALI,
    Yusuf: process.env.SALES_EMAIL_YUSUF,
    Admin: process.env.SALES_EMAIL_ADMIN,
  };
  const v = envMap[manager]?.trim();
  return v || undefined;
}