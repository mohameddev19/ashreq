import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({
    user: {
      id: user.userId,
      phone: user.phone,
      isAdmin: user.isAdmin,
    },
  });
}
