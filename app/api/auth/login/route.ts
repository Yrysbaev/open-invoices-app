import { NextResponse } from "next/server";
import { getSalesCookieName } from "@/lib/sales-auth";
import { verifyUser } from "@/lib/users";

export async function POST(req: Request) {
  let email = "";
  let password = "";
  try {
    const body = await req.json();
    email = String(body?.email ?? "");
    password = String(body?.password ?? "");
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const user = verifyUser(email, password);
  if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(getSalesCookieName(), user.email, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 12,
    path: "/",
  });

  return response;
}
