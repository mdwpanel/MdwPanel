import { Router } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { UpdateInviteCodeBody } from "@workspace/api-zod";

const router = Router();

router.get("/settings/apk", async (req, res) => {
  const rows = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, "apk_download_url"));
  const urlRow = rows[0];

  const versionRows = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, "apk_version"));
  const versionRow = versionRows[0];

  const notesRows = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, "apk_notes"));
  const notesRow = notesRows[0];

  res.json({
    url: urlRow?.value ?? "",
    version: versionRow?.value ?? "1.0.0",
    notes: notesRow?.value ?? "",
  });
});

router.put("/settings/apk", requireAuth, requireAdmin, async (req, res) => {
  const { url, version, notes } = req.body as { url?: string; version?: string; notes?: string };

  if (url !== undefined) {
    await db
      .insert(settingsTable)
      .values({ key: "apk_download_url", value: url })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value: url, updatedAt: new Date() } });
  }

  if (version !== undefined) {
    await db
      .insert(settingsTable)
      .values({ key: "apk_version", value: version })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value: version, updatedAt: new Date() } });
  }

  if (notes !== undefined) {
    await db
      .insert(settingsTable)
      .values({ key: "apk_notes", value: notes })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value: notes, updatedAt: new Date() } });
  }

  res.json({ success: true });
});

router.get("/settings/invite-code", requireAuth, requireAdmin, async (req, res) => {
  const rows = await db.select().from(settingsTable)
    .where(eq(settingsTable.key, "invite_code")).limit(1);
  res.json({ code: rows[0]?.value ?? "" });
});

router.put("/settings/invite-code", requireAuth, requireAdmin, async (req, res) => {
  const parsed = UpdateInviteCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { code } = parsed.data;
  await db.insert(settingsTable)
    .values({ key: "invite_code", value: code })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value: code, updatedAt: new Date() } });
  res.json({ code });
});

export default router;
