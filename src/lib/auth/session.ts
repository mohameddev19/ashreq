import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb, users } from "@/db";
import { COOKIE_NAME, verifySessionToken } from "./jwt";

export type SessionUser = {
  userId: string;
  phone: string;
  isAdmin: boolean;
};

export async function getSessionPayload(): Promise<{
  userId: string;
  isAdmin: boolean;
} | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const v = await verifySessionToken(token);
  if (!v) return null;
  return { userId: v.sub, isAdmin: v.isAdmin };
}

/** Verified JWT + fresh `is_admin` from DB (do not trust JWT admin claim alone). */
export async function getSessionUser(): Promise<SessionUser | null> {
  const payload = await getSessionPayload();
  if (!payload) return null;
  const db = getDb();
  const row = await db
    .select({
      id: users.id,
      phone: users.phone,
      isAdmin: users.isAdmin,
    })
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1)
    .then((r) => r[0]);
  if (!row) return null;
  return {
    userId: row.id,
    phone: row.phone,
    isAdmin: row.isAdmin,
  };
}
