import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { notificationPreferencesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function getAuthUserId(req: Express.Request): string {
  if (!req.user) {
    throw new Error("getAuthUserId called without authenticated user");
  }
  return req.user.id;
}

router.get("/notifications/preferences", async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const [prefs] = await db
      .select()
      .from(notificationPreferencesTable)
      .where(eq(notificationPreferencesTable.userId, userId))
      .limit(1);

    if (!prefs) {
      return res.json({
        buildComplete: true,
        buildError: true,
        teamInvite: true,
        subscriptionRenewal: true,
      });
    }

    return res.json({
      buildComplete: prefs.buildComplete,
      buildError: prefs.buildError,
      teamInvite: prefs.teamInvite,
      subscriptionRenewal: prefs.subscriptionRenewal,
    });
  } catch (error) {
    console.error("Get notification preferences error:", error);
    return res.status(500).json({ error: { code: "INTERNAL", message: "Failed to get notification preferences" } });
  }
});

router.patch("/notifications/preferences", async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const { buildComplete, buildError, teamInvite, subscriptionRenewal } = req.body;

    const updates: Record<string, boolean | Date> = { updatedAt: new Date() };
    if (typeof buildComplete === "boolean") updates.buildComplete = buildComplete;
    if (typeof buildError === "boolean") updates.buildError = buildError;
    if (typeof teamInvite === "boolean") updates.teamInvite = teamInvite;
    if (typeof subscriptionRenewal === "boolean") updates.subscriptionRenewal = subscriptionRenewal;

    const [existing] = await db
      .select()
      .from(notificationPreferencesTable)
      .where(eq(notificationPreferencesTable.userId, userId))
      .limit(1);

    if (existing) {
      await db
        .update(notificationPreferencesTable)
        .set(updates)
        .where(eq(notificationPreferencesTable.userId, userId));
    } else {
      await db.insert(notificationPreferencesTable).values({
        userId,
        buildComplete: typeof buildComplete === "boolean" ? buildComplete : true,
        buildError: typeof buildError === "boolean" ? buildError : true,
        teamInvite: typeof teamInvite === "boolean" ? teamInvite : true,
        subscriptionRenewal: typeof subscriptionRenewal === "boolean" ? subscriptionRenewal : true,
      });
    }

    const [prefs] = await db
      .select()
      .from(notificationPreferencesTable)
      .where(eq(notificationPreferencesTable.userId, userId))
      .limit(1);

    return res.json({
      buildComplete: prefs!.buildComplete,
      buildError: prefs!.buildError,
      teamInvite: prefs!.teamInvite,
      subscriptionRenewal: prefs!.subscriptionRenewal,
    });
  } catch (error) {
    console.error("Update notification preferences error:", error);
    return res.status(500).json({ error: { code: "INTERNAL", message: "Failed to update notification preferences" } });
  }
});

export default router;
