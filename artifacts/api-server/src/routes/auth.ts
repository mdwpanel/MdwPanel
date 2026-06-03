import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable, settingsTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { generateToken, requireAuth, type AuthRequest } from "../middlewares/auth";
import { RegisterBody, LoginBody } from "@workspace/api-zod";

const router = Router();

router.post("/auth/register", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { username, email, password, inviteCode } = parsed.data;

  try {
    const existing = await db.select().from(usersTable)
      .where(or(eq(usersTable.username, username), eq(usersTable.email, email)))
      .limit(1);

    if (existing.length) {
      const conflict = existing[0].username === username ? "Username already taken" : "Email already registered";
      res.status(409).json({ error: conflict });
      return;
    }

    const isFirstUser = (await db.select().from(usersTable).limit(1)).length === 0;

    if (!isFirstUser) {
      const codeRows = await db.select().from(settingsTable)
        .where(eq(settingsTable.key, "invite_code")).limit(1);
      const validCode = codeRows[0]?.value ?? "";
      if (!validCode || inviteCode !== validCode) {
        res.status(403).json({ error: "Kode undangan tidak valid atau salah" });
        return;
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const role = isFirstUser ? "admin" : "user";

    const [user] = await db.insert(usersTable).values({
      username,
      email,
      passwordHash,
      role,
    }).returning();

    const token = generateToken(user.id);
    res.status(201).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        banned: user.banned,
        createdAt: user.createdAt.toISOString(),
      },
      token,
    });
  } catch (err) {
    req.log.error({ err }, "Register error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { username, password } = parsed.data;

  try {
    const users = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
    if (!users.length) {
      res.status(401).json({ error: "User tidak tersedia, silahkan register dulu" });
      return;
    }

    const user = users[0];
    if (user.banned) {
      res.status(403).json({ error: "Account has been banned" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid password" });
      return;
    }

    const token = generateToken(user.id);
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        banned: user.banned,
        createdAt: user.createdAt.toISOString(),
      },
      token,
    });
  } catch (err) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/logout", (_req, res) => {
  res.json({ success: true, message: "Logged out" });
});

router.get("/auth/me", requireAuth, async (req: AuthRequest, res) => {
  const user = req.user!;
  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    banned: user.banned,
    createdAt: user.createdAt.toISOString(),
  });
});

export default router;
