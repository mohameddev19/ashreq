import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, users } from "@/db";
import { COOKIE_NAME, signSessionToken } from "@/lib/auth/jwt";
import { isValidPhoneNormalized, normalizePhone } from "@/lib/auth/phone";

export const runtime = "nodejs";

const bodySchema = z.object({
  phone: z.string().min(8).max(32),
  password: z.string().min(1).max(128),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const phone = normalizePhone(parsed.data.phone);
    if (!isValidPhoneNormalized(phone)) {
      return NextResponse.json(
        { error: "رقم الهاتف غير صالح" },
        { status: 400 }
      );
    }

    const db = getDb();
    const [row] = await db
      .select({
        id: users.id,
        passwordHash: users.passwordHash,
        isAdmin: users.isAdmin,
      })
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);

    if (!row) {
      return NextResponse.json(
        { error: "رقم الهاتف أو كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    const match = await bcrypt.compare(parsed.data.password, row.passwordHash);
    if (!match) {
      return NextResponse.json(
        { error: "رقم الهاتف أو كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    const token = await signSessionToken({
      sub: row.id,
      isAdmin: row.isAdmin,
    });

    const res = NextResponse.json({
      ok: true,
      user: { id: row.id, phone, isAdmin: row.isAdmin },
    });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "خطأ";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
