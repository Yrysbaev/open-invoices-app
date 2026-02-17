import { NextRequest, NextResponse } from "next/server";
const SALES_COOKIE_NAME = "sales_session";

function isAuthorized(req: NextRequest) {
  return Boolean(req.cookies.get(SALES_COOKIE_NAME)?.value);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const authed = isAuthorized(req);

  // Intuit redirects here after OAuth; do not block it by app session middleware.
  if (pathname.startsWith("/api/qbo/callback")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/login")) {
    if (authed) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  if (!authed && pathname.startsWith("/api/qbo/connect")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (!authed && pathname.startsWith("/api/qbo")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!authed && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/qbo/:path*", "/login"],
};
