import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { hasQboConnection } from "@/lib/qbo";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    user: { email: user.email, role: user.role },
    qboConnected: await hasQboConnection(),
  });
}
