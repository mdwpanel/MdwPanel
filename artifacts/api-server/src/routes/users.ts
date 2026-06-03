import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, count, desc } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";
import { UpdateUserBody, ListUsersQueryParams } from "@workspace/api-zod";
import bcrypt from "bcryptjs";

const router = Router();

function serializeUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role,
    banned: u.banned,
    createdAt: u.createdAt.toISOString(),
  };
}

router.get("/users", requireAdmin, async (req, res) => {
  const parsed = ListUsersQueryParams.safeParse(req.query);
  const page = parsed.success ? (parsed.data.page ?? 1) : 1;
  const limit = parsed.success ? (parsed.data.limit ?? 20) : 20;
  const offset = (page - 1) * limit;

  try {
    const [users, totalResult] = await Promise.all([
      db.select().from(usersTable).orderBy(desc(usersTable.createdAt)).limit(limit).offset(offset),
      db.select({ count: count() }).from(usersTable),
    ]);

    res.json({
      users: users.map(serializeUser),
      total: totalResult[0].count,
      page,
      limit,
    });
  } catch (err) {
    req.log.error({ err }, "List users error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/users/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    const users = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!users.length) { res.status(404).json({ error: "User not found" }); return; }
    res.json(serializeUser(users[0]));
  } catch (err) {
    req.log.error({ err }, "Get user error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/users/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdateUserBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  try {
    const updates: Record<string, unknown> = {};
    if (parsed.data.username !== undefined) updates.username = parsed.data.username;
    if (parsed.data.email !== undefined) updates.email = parsed.data.email;
    if (parsed.data.role !== undefined) updates.role = parsed.data.role;
    if (parsed.data.banned !== undefined) updates.banned = parsed.data.banned;
    if (parsed.data.password) updates.passwordHash = await bcrypt.hash(parsed.data.password, 10);

    const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "User not found" }); return; }
    res.json(serializeUser(updated));
  } catch (err) {
    req.log.error({ err }, "Update user error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/users/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    await db.delete(usersTable).where(eq(usersTable.id, id));
    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    req.log.error({ err }, "Delete user error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
