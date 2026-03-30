/**
 * Grant is_admin for a user by normalized phone (digits only).
 * Usage: npx tsx scripts/grant-admin.ts 249912345678
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { getDb, users } from "../src/db";

async function main() {
  const raw = process.argv[2];
  if (!raw?.trim()) {
    console.error("Usage: npx tsx scripts/grant-admin.ts <phone_digits>");
    process.exit(1);
  }
  const phone = raw.replace(/\D/g, "");
  if (phone.length < 9) {
    console.error("Phone too short after normalization.");
    process.exit(1);
  }
  const db = getDb();
  const updated = await db
    .update(users)
    .set({ isAdmin: true })
    .where(eq(users.phone, phone))
    .returning({ id: users.id, phone: users.phone });
  if (!updated.length) {
    console.error("No user found with that phone.");
    process.exit(1);
  }
  console.log("Admin granted:", updated[0]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
