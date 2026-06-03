import { Router } from "express";
import { db } from "@workspace/db";
import { keysTable, activityLogsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// Token formula must match the C++ client verification:
// MD5("{game}-{user_key}-{serial}-Vm8Lk7Uj2JmsjCPVPVjrLa7zgfx3uz9E")
// bValid = (server_token == CalcMD5(game + "-" + user_key + "-" + UUID + "-" + secret))
const TOKEN_SECRET = "Vm8Lk7Uj2JmsjCPVPVjrLa7zgfx3uz9E";

function generateToken(game: string, key: string, serial: string): string {
  return crypto.createHash("md5").update(`${game}-${key}-${serial}-${TOKEN_SECRET}`).digest("hex");
}

router.post("/connect", async (req, res) => {
  const game = (req.body.game as string) ?? "";
  const user_key = (req.body.user_key as string) ?? "";
  const serial = (req.body.serial as string) ?? "";

  const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0] ?? req.socket.remoteAddress ?? "";

  if (!user_key || !game) {
    await db.insert(activityLogsTable).values({
      action: "connect",
      key: user_key || "UNKNOWN",
      game: game || "UNKNOWN",
      success: false,
      ipAddress: ip,
      hwid: serial || null,
      reason: "Missing required fields",
    }).catch(() => {});
    res.json({ status: false, reason: "Missing required fields" });
    return;
  }

  try {
    const keys = await db.select().from(keysTable)
      .where(and(eq(keysTable.key, user_key), eq(keysTable.game, game)))
      .limit(1);

    if (!keys.length) {
      await db.insert(activityLogsTable).values({
        action: "connect",
        key: user_key,
        game,
        success: false,
        ipAddress: ip,
        hwid: serial || null,
        reason: "Invalid key",
      });
      res.json({ status: false, reason: "Invalid key" });
      return;
    }

    const keyRecord = keys[0];

    if (keyRecord.status === "banned") {
      await db.insert(activityLogsTable).values({
        action: "connect",
        key: user_key,
        game,
        success: false,
        ipAddress: ip,
        hwid: serial || null,
        reason: "Key has been banned",
      });
      res.json({ status: false, reason: "Key has been banned" });
      return;
    }

    if (keyRecord.status === "expired") {
      await db.insert(activityLogsTable).values({
        action: "connect",
        key: user_key,
        game,
        success: false,
        ipAddress: ip,
        hwid: serial || null,
        reason: "Key has expired",
      });
      res.json({ status: false, reason: "Key has expired" });
      return;
    }

    if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
      await db.update(keysTable).set({ status: "expired" }).where(eq(keysTable.id, keyRecord.id));
      await db.insert(activityLogsTable).values({
        action: "connect",
        key: user_key,
        game,
        success: false,
        ipAddress: ip,
        hwid: serial || null,
        reason: "Key has expired",
      });
      res.json({ status: false, reason: "Key has expired" });
      return;
    }

    if (keyRecord.hwid && serial && keyRecord.hwid !== serial) {
      await db.insert(activityLogsTable).values({
        action: "connect",
        key: user_key,
        game,
        success: false,
        ipAddress: ip,
        hwid: serial,
        reason: "HWID mismatch",
      });
      res.json({ status: false, reason: "HWID mismatch — key is bound to another device" });
      return;
    }

    if (!keyRecord.hwid && serial) {
      await db.update(keysTable).set({ hwid: serial }).where(eq(keysTable.id, keyRecord.id));
    }

    await db.update(keysTable).set({ lastUsedAt: new Date() }).where(eq(keysTable.id, keyRecord.id));

    const rng = Math.floor(Date.now() / 1000);
    const token = generateToken(game, user_key, serial);
    const exp = keyRecord.expiresAt
      ? keyRecord.expiresAt.toISOString().split("T")[0]
      : new Date(Date.now() + keyRecord.duration * 86400000).toISOString().split("T")[0];

    await db.insert(activityLogsTable).values({
      action: "connect",
      key: user_key,
      game,
      success: true,
      ipAddress: ip,
      hwid: serial || null,
      reason: null,
    });

    res.json({
      status: true,
      data: {
        token,
        rng,
        EXP: exp,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Connect error");
    res.json({ status: false, reason: "Internal server error" });
  }
});

export default router;
