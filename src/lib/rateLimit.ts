import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { usageBuckets } from "@/db/schema";

function hourBucketUtc(): Date {
  const d = new Date();
  d.setUTCMinutes(0, 0, 0);
  return d;
}

function dayBucketUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Increments chat usage for the current UTC hour and returns whether the request is allowed.
 */
export async function consumeChatQuota(userId: string): Promise<{
  allowed: boolean;
  limit: number;
  count: number;
}> {
  const limit = Math.max(
    1,
    parseInt(process.env.MASHREQ_RATE_CHAT_PER_HOUR ?? "60", 10)
  );
  const bucketStart = hourBucketUtc();
  const db = getDb();
  const [row] = await db
    .insert(usageBuckets)
    .values({
      userId,
      action: "chat",
      bucketStart,
      count: 1,
    })
    .onConflictDoUpdate({
      target: [
        usageBuckets.userId,
        usageBuckets.action,
        usageBuckets.bucketStart,
      ],
      set: { count: sql`${usageBuckets.count} + 1` },
    })
    .returning({ count: usageBuckets.count });

  const count = row?.count ?? 0;
  return { allowed: count <= limit, limit, count };
}

/**
 * Increments feedback usage for the current UTC day and returns whether the request is allowed.
 */
export async function consumeFeedbackQuota(userId: string): Promise<{
  allowed: boolean;
  limit: number;
  count: number;
}> {
  const limit = Math.max(
    1,
    parseInt(process.env.MASHREQ_RATE_FEEDBACK_PER_DAY ?? "10", 10)
  );
  const bucketStart = dayBucketUtc();
  const db = getDb();
  const [row] = await db
    .insert(usageBuckets)
    .values({
      userId,
      action: "feedback",
      bucketStart,
      count: 1,
    })
    .onConflictDoUpdate({
      target: [
        usageBuckets.userId,
        usageBuckets.action,
        usageBuckets.bucketStart,
      ],
      set: { count: sql`${usageBuckets.count} + 1` },
    })
    .returning({ count: usageBuckets.count });

  const count = row?.count ?? 0;
  return { allowed: count <= limit, limit, count };
}
