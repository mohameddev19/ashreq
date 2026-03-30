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
  password: z.string().min(8).max(128),
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
        { error: "رقم الهاتف غير صالح (9–15 رقماً)" },
        { status: 400 }
      );
    }

    const db = getDb();
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);
    if (existing.length) {
      return NextResponse.json(
        { error: "هذا الرقم مسجّل مسبقاً" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const [created] = await db
      .insert(users)
      .values({
        phone,
        passwordHash,
        isAdmin: false,
      })
      .returning({ id: users.id, isAdmin: users.isAdmin });

    if (!created) {
      return NextResponse.json({ error: "فشل إنشاء الحساب" }, { status: 500 });
    }

    const token = await signSessionToken({
      sub: created.id,
      isAdmin: created.isAdmin,
    });

    const res = NextResponse.json({
      ok: true,
      user: { id: created.id, phone, isAdmin: created.isAdmin },
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
