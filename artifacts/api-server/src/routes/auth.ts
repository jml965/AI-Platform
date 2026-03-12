import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const SEED_USER_ID = "00000000-0000-0000-0000-000000000001";

router.get("/auth/me", async (_req, res) => {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, SEED_USER_ID));

    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    return res.json({
      id: user.id,
      replitId: user.replitId,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      locale: user.locale,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/logout", (_req, res) => {
  return res.json({ success: true, message: "Logged out successfully" });
});

router.get("/auth/login", (_req, res) => {
  return res.redirect("/");
});

export default router;
