import { Router } from "express";
import { db } from "@workspace/db";
import { gamesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";
import { CreateGameBody, UpdateGameBody } from "@workspace/api-zod";

const router = Router();

function serializeGame(g: typeof gamesTable.$inferSelect) {
  return {
    id: g.id,
    name: g.name,
    slug: g.slug,
    status: g.status,
    version: g.version,
    description: g.description,
    createdAt: g.createdAt.toISOString(),
  };
}

router.get("/games", async (req, res) => {
  try {
    const games = await db.select().from(gamesTable).orderBy(asc(gamesTable.name));
    res.json(games.map(serializeGame));
  } catch (err) {
    req.log.error({ err }, "List games error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/games", requireAdmin, async (req, res) => {
  const parsed = CreateGameBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  try {
    const [game] = await db.insert(gamesTable).values({
      name: parsed.data.name,
      slug: parsed.data.slug,
      status: (parsed.data.status as "active" | "maintenance" | "disabled") ?? "active",
      version: parsed.data.version ?? null,
      description: parsed.data.description ?? null,
    }).returning();
    res.status(201).json(serializeGame(game));
  } catch (err) {
    req.log.error({ err }, "Create game error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/games/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const parsed = UpdateGameBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  try {
    const updates: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.version !== undefined) updates.version = parsed.data.version;
    if (parsed.data.description !== undefined) updates.description = parsed.data.description;
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;

    const [updated] = await db.update(gamesTable).set(updates).where(eq(gamesTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Game not found" }); return; }
    res.json(serializeGame(updated));
  } catch (err) {
    req.log.error({ err }, "Update game error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/games/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  try {
    await db.delete(gamesTable).where(eq(gamesTable.id, id));
    res.json({ success: true, message: "Game deleted" });
  } catch (err) {
    req.log.error({ err }, "Delete game error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
