import { Router, type Response } from "express";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { chatMessagesTable, usersTable, settingsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { requireAuth, requireAdmin, type AuthRequest } from "../middlewares/auth";
import { SendChatMessageBody } from "@workspace/api-zod";
import { containsProfanity } from "../lib/profanity";

const router = Router();
const JWT_SECRET = process.env.SESSION_SECRET ?? "mdw-panel-secret-key";

const clients = new Map<string, Response>();
let clientIdCounter = 0;

function broadcast(data: unknown) {
  const payload = `event: message\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients.values()) {
    try { res.write(payload); } catch { /* client disconnected */ }
  }
}

// ─── Cek apakah chat sedang di-mute ──────────────────────────
async function isChatMuted(): Promise<boolean> {
  const rows = await db.select().from(settingsTable)
    .where(eq(settingsTable.key, "chat_muted")).limit(1);
  return rows[0]?.value === "true";
}

// ─── SSE Stream ───────────────────────────────────────────────
router.get("/chat/stream", async (req, res) => {
  const token = req.query.token as string;
  if (!token) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
    const users = await db.select().from(usersTable)
      .where(eq(usersTable.id, payload.userId)).limit(1);
    if (!users.length || users[0].banned) {
      res.status(401).json({ error: "Unauthorized" }); return;
    }
  } catch {
    res.status(401).json({ error: "Invalid token" }); return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const clientId = String(++clientIdCounter);
  clients.set(clientId, res);

  const muted = await isChatMuted();
  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true, online: clients.size, muted })}\n\n`);
  broadcast({ type: "online_count", count: clients.size });

  req.on("close", () => {
    clients.delete(clientId);
    broadcast({ type: "online_count", count: clients.size });
  });
});

// ─── GET Messages ─────────────────────────────────────────────
router.get("/chat/messages", requireAuth, async (req: AuthRequest, res) => {
  const limit = Math.min(parseInt(String(req.query.limit ?? "50")), 100);
  const messages = await db.select()
    .from(chatMessagesTable)
    .orderBy(desc(chatMessagesTable.createdAt))
    .limit(limit);
  res.json(messages.reverse().map((m) => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
  })));
});

// ─── POST Send Message ────────────────────────────────────────
router.post("/chat/messages", requireAuth, async (req: AuthRequest, res) => {
  const parsed = SendChatMessageBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Pesan tidak valid" }); return; }

  const user = req.user!;

  // Admin tidak kena batasan
  if (user.role !== "admin") {
    // Cek chat muted
    const muted = await isChatMuted();
    if (muted) {
      res.status(403).json({ error: "Chat sedang dinonaktifkan oleh admin" });
      return;
    }

    // Cek akun frozen
    const freshUser = await db.select().from(usersTable).where(eq(usersTable.id, user.id)).limit(1);
    const u = freshUser[0];
    if (u?.frozenUntil && new Date(u.frozenUntil) > new Date()) {
      const until = new Date(u.frozenUntil).toLocaleString("id-ID");
      res.status(403).json({ error: `Akun Anda dibekukan hingga ${until} karena kata kasar` });
      return;
    }

    // Deteksi kata kotor
    if (containsProfanity(parsed.data.message)) {
      const newCount = (u?.profanityCount ?? 0) + 1;

      if (newCount >= 3) {
        // Pelanggaran ke-3+: cek apakah sudah pernah dibekukan sebelumnya
        const alreadyFrozenBefore = u?.frozenUntil !== null && u?.frozenUntil !== undefined;

        if (alreadyFrozenBefore) {
          // Pernah dibekukan sebelumnya → blokir permanen
          await db.update(usersTable).set({
            banned: true,
            profanityCount: newCount,
          }).where(eq(usersTable.id, user.id));
          broadcast({ type: "user_banned", userId: user.id, username: user.username });
          res.status(403).json({ error: "Akun Anda diblokir permanen karena berulang kali menggunakan kata kasar" });
        } else {
          // Pertama kali 3x → bekukan 1 hari
          const frozenUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
          await db.update(usersTable).set({
            profanityCount: newCount,
            frozenUntil,
          }).where(eq(usersTable.id, user.id));
          const until = frozenUntil.toLocaleString("id-ID");
          res.status(403).json({ error: `Akun Anda dibekukan 1 hari hingga ${until} karena kata kasar (peringatan ke-${newCount})` });
        }
        return;
      } else {
        // Peringatan 1-2
        await db.update(usersTable).set({ profanityCount: newCount }).where(eq(usersTable.id, user.id));
        res.status(400).json({ error: `Pesan mengandung kata kasar. Peringatan ${newCount}/3 — akun akan dibekukan jika mencapai 3` });
        return;
      }
    }
  }

  const [msg] = await db.insert(chatMessagesTable).values({
    userId: user.id,
    username: user.username,
    message: parsed.data.message,
  }).returning();

  const out = {
    id: msg.id,
    userId: msg.userId,
    username: msg.username,
    message: msg.message,
    createdAt: msg.createdAt.toISOString(),
  };

  broadcast({ type: "chat", ...out });
  res.status(201).json(out);
});

// ─── DELETE Message (admin only) ─────────────────────────────
router.delete("/chat/messages/:id", requireAdmin, async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(chatMessagesTable).where(eq(chatMessagesTable.id, id));
  broadcast({ type: "message_deleted", id });
  res.json({ success: true });
});

// ─── GET Chat Mute Status ─────────────────────────────────────
router.get("/chat/mute", requireAuth, async (_req, res) => {
  const muted = await isChatMuted();
  res.json({ muted });
});

// ─── POST Toggle Chat Mute (admin only) ──────────────────────
router.post("/chat/mute", requireAdmin, async (_req: AuthRequest, res) => {
  const current = await isChatMuted();
  const newVal = !current;

  const existing = await db.select().from(settingsTable)
    .where(eq(settingsTable.key, "chat_muted")).limit(1);

  if (existing.length) {
    await db.update(settingsTable).set({ value: String(newVal), updatedAt: new Date() })
      .where(eq(settingsTable.key, "chat_muted"));
  } else {
    await db.insert(settingsTable).values({ key: "chat_muted", value: String(newVal) });
  }

  broadcast({ type: "chat_muted", muted: newVal });
  res.json({ muted: newVal });
});

export default router;
