import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { tokenUsageTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

const SEED_USER_ID = "00000000-0000-0000-0000-000000000001";

router.get("/tokens/summary", async (_req, res) => {
  try {
    const result = await db
      .select({
        totalTokens: sql<number>`coalesce(sum(${tokenUsageTable.tokensInput} + ${tokenUsageTable.tokensOutput})::int, 0)`,
        totalCostUsd: sql<string>`coalesce(sum(${tokenUsageTable.costUsd})::numeric(10,4), '0.0000')`,
      })
      .from(tokenUsageTable)
      .where(eq(tokenUsageTable.userId, SEED_USER_ID));

    const row = result[0];

    const totalTokens = row?.totalTokens ?? 0;
    const totalCost = parseFloat(row?.totalCostUsd ?? "0");

    return res.json({
      totalTokens,
      totalCostUsd: totalCost,
      monthTokens: totalTokens,
      monthCostUsd: totalCost,
      todayTokens: 0,
      todayCostUsd: 0,
      remainingDailyUsd: 5.0,
      remainingMonthlyUsd: 50.0 - totalCost,
    });
  } catch (error) {
    console.error("Token summary error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
