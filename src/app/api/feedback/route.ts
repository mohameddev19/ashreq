import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb, feedback } from "@/db";
import { getSessionUser } from "@/lib/auth/session";
import { consumeFeedbackQuota } from "@/lib/rateLimit";

export const runtime = "nodejs";

const bodySchema = z.object({
  body: z.string().min(3).max(4000),
});

export async function POST(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
    }

    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "نص غير صالح" }, { status: 400 });
    }

    const { allowed, limit, count } = await consumeFeedbackQuota(user.userId);
    if (!allowed) {
      return NextResponse.json(
        {
          error: `تجاوزت الحد المسموح للملاحظات اليومية (${limit}).`,
          limit,
          count,
        },
        { status: 429 }
      );
    }

    const db = getDb();
    await db.insert(feedback).values({
      userId: user.userId,
      body: parsed.data.body.trim(),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "خطأ";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
