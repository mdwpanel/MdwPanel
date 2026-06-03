import { Router, type Response } from "express";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { chatMessagesTable, usersTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { SendChatMessageBody } from "@workspace/api-zod";

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

  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true, online: clients.size })}\n\n`);

  broadcast({ type: "online_count", count: clients.size });

  req.on("close", () => {
    clients.delete(clientId);
    broadcast({ type: "online_count", count: clients.size });
  });
});

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

router.post("/chat/messages", requireAuth, async (req: AuthRequest, res) => {
  const parsed = SendChatMessageBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Pesan tidak valid" }); return; }

  const user = req.user!;
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

export default router;
