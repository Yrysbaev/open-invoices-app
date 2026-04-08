import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { fetchOverdueListForAdmin } from "@/lib/qbo-admin-overdue";
import { getQboCredentials } from "@/lib/qbo";
import { isMailConfigured, sendMailWithAttachment } from "@/lib/mail";
import {
  getSalesManagerEmail,
  type SalesManager,
  SALES_MANAGERS,
} from "@/lib/sales-manager-emails";

function buildOverdueCsv(rows: Awaited<ReturnType<typeof fetchOverdueListForAdmin>>) {
  const header = "Customer Name,Phone,Responsible,Total Overdue\n";
  const body = rows
    .map((r) => {
      const name = `"${String(r.displayName).replace(/"/g, '""')}"`;
      const phone = `"${String(r.phone).replace(/"/g, '""')}"`;
      const responsible = `"${String(r.responsible ?? "").replace(/"/g, '""')}"`;
      return `${name},${phone},${responsible},${r.totalOverdue.toFixed(2)}`;
    })
    .join("\n");
  return Buffer.from("\uFEFF" + header + body, "utf-8");
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  if (!isMailConfigured()) {
    return NextResponse.json(
      {
        error:
          "Email is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS (and optional SMTP_PORT, SMTP_SECURE, MAIL_FROM).",
      },
      { status: 503 }
    );
  }

  let body: { manager?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const manager = body.manager as SalesManager | undefined;
  if (!manager || !SALES_MANAGERS.includes(manager as SalesManager)) {
    return NextResponse.json(
      { error: "manager must be one of: Ismail, Ali, Yusuf, Admin" },
      { status: 400 }
    );
  }

  const to = getSalesManagerEmail(manager);
  if (!to) {
    return NextResponse.json(
      {
        error: `No email configured for ${manager}. Set it in lib/sales-manager-emails.ts or SALES_EMAIL_* env vars.`,
      },
      { status: 503 }
    );
  }

  const creds = await getQboCredentials();
  if (!creds) {
    return NextResponse.json(
      { error: "Not connected to QuickBooks. Connect first." },
      { status: 401 }
    );
  }

  const allRows = await fetchOverdueListForAdmin({
    accessToken: creds.accessToken,
    realmId: creds.realmId,
  });

  const rows =
    manager === "Admin"
      ? allRows
      : allRows.filter((r) => r.responsible === manager);
  const csv = buildOverdueCsv(rows);

  const filename = `overdue-${manager.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;

  try {
    await sendMailWithAttachment({
      to,
      subject:
        manager === "Admin"
          ? "Overdue customers report (all)"
          : `Overdue customers report (${manager})`,
      text:
        manager === "Admin"
          ? `Attached: all overdue customers (company-wide).\n\nRows: ${rows.length}\n`
          : `Attached: overdue customers with balances for ${manager}.\n\nRows: ${rows.length}\n`,
      filename,
      content: csv,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to send email";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true, sentTo: to, rowCount: rows.length });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }
  return NextResponse.json({
    mailConfigured: isMailConfigured(),
    managers: {
      Ismail: Boolean(getSalesManagerEmail("Ismail")),
      Ali: Boolean(getSalesManagerEmail("Ali")),
      Yusuf: Boolean(getSalesManagerEmail("Yusuf")),
      Admin: Boolean(getSalesManagerEmail("Admin")),
    },
  });
}
