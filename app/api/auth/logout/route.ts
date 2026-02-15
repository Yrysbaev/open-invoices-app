import { NextResponse } from "next/server";
import { getSalesCookieName } from "@/lib/sales-auth";

function clearSessionCookie(response: NextResponse) {
  response.cookies.set(getSalesCookieName(), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}

export async function GET(req: Request) {
  const response = NextResponse.redirect(new URL("/login", req.url));
  clearSessionCookie(response);
  return response;
}
