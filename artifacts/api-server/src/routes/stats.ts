import { Router } from "express";
import { db } from "@workspace/db";
import { keysTable, usersTable, gamesTable, activityLogsTable } from "@workspace/db";
import { eq, gte, count, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { GetRecentActivityQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/stats/dashboard", requireAuth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalKeysResult,
      activeKeysResult,
      expiredKeysResult,
      bannedKeysResult,
      totalUsersResult,
      totalGamesResult,
      todayConnectsResult,
      recentConnectsResult,
    ] = await Promise.all([
      db.select({ count: count() }).from(keysTable),
      db.select({ count: count() }).from(keysTable).where(eq(keysTable.status, "active")),
      db.select({ count: count() }).from(keysTable).where(eq(keysTable.status, "expired")),
      db.select({ count: count() }).from(keysTable).where(eq(keysTable.status, "banned")),
      db.select({ count: count() }).from(usersTable),
      db.select({ count: count() }).from(gamesTable),
      db.select({ count: count() }).from(activityLogsTable).where(gte(activityLogsTable.createdAt, today)),
      db.select({ count: count() }).from(activityLogsTable).where(eq(activityLogsTable.success, true)),
    ]);

    res.json({
      totalKeys: totalKeysResult[0].count,
      activeKeys: activeKeysResult[0].count,
      expiredKeys: expiredKeysResult[0].count,
      bannedKeys: bannedKeysResult[0].count,
      totalUsers: totalUsersResult[0].count,
      totalGames: totalGamesResult[0].count,
      todayConnects: todayConnectsResult[0].count,
      recentConnects: recentConnectsResult[0].count,
    });
  } catch (err) {
    req.log.error({ err }, "Dashboard stats error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/stats/activity", requireAuth, async (req, res) => {
  const parsed = GetRecentActivityQueryParams.safeParse(req.query);
  const limit = parsed.success ? (parsed.data.limit ?? 20) : 20;

  try {
    const logs = await db.select().from(activityLogsTable)
      .orderBy(desc(activityLogsTable.createdAt))
      .limit(limit);

    res.json(logs.map(l => ({
      id: l.id,
      action: l.action,
      key: l.key,
      game: l.game,
      success: l.success,
      ipAddress: l.ipAddress,
      hwid: l.hwid,
      reason: l.reason,
      createdAt: l.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Activity logs error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
