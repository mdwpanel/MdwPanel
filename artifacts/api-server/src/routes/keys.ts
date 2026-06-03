import { Router } from "express";
import { db } from "@workspace/db";
import { keysTable, usersTable, activityLogsTable } from "@workspace/db";
import { eq, and, count, sql, desc } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthRequest } from "../middlewares/auth";
import { CreateKeyBody, UpdateKeyBody, BulkCreateKeysBody, ListKeysQueryParams } from "@workspace/api-zod";
import crypto from "crypto";

const router = Router();

function generateKey(): string {
  const part = () => crypto.randomBytes(4).toString("hex").toUpperCase();
  return `MDW-${part()}-${part()}-${part()}`;
}

router.get("/keys", requireAuth, async (req: AuthRequest, res) => {
  const parsed = ListKeysQueryParams.safeParse(req.query);
  const page = parsed.success ? (parsed.data.page ?? 1) : 1;
  const limit = parsed.success ? (parsed.data.limit ?? 20) : 20;
  const game = parsed.success ? parsed.data.game : undefined;
  const status = parsed.success ? (parsed.data.status as "active" | "expired" | "banned" | undefined) : undefined;
  const offset = (page - 1) * limit;

  const isAdmin = req.user!.role === "admin";

  try {
    const conditions = [];
    // Non-admin users can only see their own keys
    if (!isAdmin) conditions.push(eq(keysTable.userId, req.user!.id));
    if (game) conditions.push(eq(keysTable.game, game));
    if (status) conditions.push(eq(keysTable.status, status));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [keys, totalResult] = await Promise.all([
      db.select({
        id: keysTable.id,
        key: keysTable.key,
        game: keysTable.game,
        status: keysTable.status,
        duration: keysTable.duration,
        note: keysTable.note,
        hwid: keysTable.hwid,
        lastUsedAt: keysTable.lastUsedAt,
        expiresAt: keysTable.expiresAt,
        userId: keysTable.userId,
        username: usersTable.username,
        createdAt: keysTable.createdAt,
      })
      .from(keysTable)
      .leftJoin(usersTable, eq(keysTable.userId, usersTable.id))
      .where(where)
      .orderBy(desc(keysTable.createdAt))
      .limit(limit)
      .offset(offset),
      db.select({ count: count() }).from(keysTable).where(where),
    ]);

    res.json({
      keys: keys.map(k => ({
        ...k,
        lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
        expiresAt: k.expiresAt?.toISOString() ?? null,
        createdAt: k.createdAt.toISOString(),
      })),
      total: totalResult[0].count,
      page,
      limit,
    });
  } catch (err) {
    req.log.error({ err }, "List keys error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/keys", requireAuth, async (req: AuthRequest, res) => {
  const parsed = CreateKeyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { game, duration, note, userId } = parsed.data;
  const isAdmin = req.user!.role === "admin";

  try {
    const key = generateKey();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + duration);

    // Non-admin users always create keys for themselves
    const resolvedUserId = isAdmin ? (userId ?? null) : req.user!.id;

    const [newKey] = await db.insert(keysTable).values({
      key,
      game,
      duration,
      note: note ?? null,
      userId: resolvedUserId,
      expiresAt,
    }).returning();

    let username: string | null = null;
    if (newKey.userId) {
      const user = await db.select().from(usersTable).where(eq(usersTable.id, newKey.userId)).limit(1);
      username = user[0]?.username ?? null;
    }

    res.status(201).json({
      ...newKey,
      username,
      lastUsedAt: newKey.lastUsedAt?.toISOString() ?? null,
      expiresAt: newKey.expiresAt?.toISOString() ?? null,
      createdAt: newKey.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Create key error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/keys/bulk", requireAuth, async (req: AuthRequest, res) => {
  const parsed = BulkCreateKeysBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { game, duration, count: keyCount, note } = parsed.data;
  const isAdmin = req.user!.role === "admin";

  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + duration);

    // Non-admin users always create keys assigned to themselves
    const assignedUserId = isAdmin ? null : req.user!.id;

    const records = Array.from({ length: keyCount }, () => ({
      key: generateKey(),
      game,
      duration,
      note: note ?? null,
      userId: assignedUserId,
      expiresAt,
    }));

    const newKeys = await db.insert(keysTable).values(records).returning();

    res.status(201).json(newKeys.map(k => ({
      ...k,
      username: null,
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      expiresAt: k.expiresAt?.toISOString() ?? null,
      createdAt: k.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Bulk create keys error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/keys/my", requireAuth, async (req: AuthRequest, res) => {
  try {
    const keys = await db.select().from(keysTable)
      .where(eq(keysTable.userId, req.user!.id))
      .orderBy(desc(keysTable.createdAt));

    res.json(keys.map(k => ({
      ...k,
      username: req.user!.username,
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      expiresAt: k.expiresAt?.toISOString() ?? null,
      createdAt: k.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Get my keys error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/keys/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    const keys = await db.select({
      id: keysTable.id, key: keysTable.key, game: keysTable.game,
      status: keysTable.status, duration: keysTable.duration, note: keysTable.note,
      hwid: keysTable.hwid, lastUsedAt: keysTable.lastUsedAt, expiresAt: keysTable.expiresAt,
      userId: keysTable.userId, username: usersTable.username, createdAt: keysTable.createdAt,
    })
    .from(keysTable)
    .leftJoin(usersTable, eq(keysTable.userId, usersTable.id))
    .where(eq(keysTable.id, id))
    .limit(1);

    if (!keys.length) { res.status(404).json({ error: "Key not found" }); return; }
    const k = keys[0];
    res.json({
      ...k,
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      expiresAt: k.expiresAt?.toISOString() ?? null,
      createdAt: k.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Get key error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/keys/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdateKeyBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  try {
    const updates: Record<string, unknown> = {};
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.note !== undefined) updates.note = parsed.data.note;
    if (parsed.data.duration !== undefined) updates.duration = parsed.data.duration;
    if (parsed.data.userId !== undefined) updates.userId = parsed.data.userId;
    if (parsed.data.hwid !== undefined) updates.hwid = parsed.data.hwid;

    const [updated] = await db.update(keysTable).set(updates).where(eq(keysTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Key not found" }); return; }

    let username: string | null = null;
    if (updated.userId) {
      const user = await db.select().from(usersTable).where(eq(usersTable.id, updated.userId)).limit(1);
      username = user[0]?.username ?? null;
    }

    res.json({
      ...updated,
      username,
      lastUsedAt: updated.lastUsedAt?.toISOString() ?? null,
      expiresAt: updated.expiresAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Update key error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/keys/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    await db.delete(keysTable).where(eq(keysTable.id, id));
    res.json({ success: true, message: "Key deleted" });
  } catch (err) {
    req.log.error({ err }, "Delete key error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
