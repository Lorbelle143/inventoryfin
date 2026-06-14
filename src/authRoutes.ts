import { Router } from "express";
import bcryptjs from "bcryptjs";
import rateLimit from "express-rate-limit";
import prisma, { initializeAccount, seedInitialInventory } from "./db";
import { generateToken, generateRefreshToken, refreshTokenExpiresAt } from "./auth";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Register ─────────────────────────────────────────────────────────────────

router.post("/register", authLimiter, async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: "Email, password, and name are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: "Email already registered" });

    const hashed = await bcryptjs.hash(password, 10);
    const user = await prisma.user.create({ data: { email, password: hashed, name } });

    await initializeAccount(user.id);
    await seedInitialInventory(user.id);

    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken();
    const expiresAt = refreshTokenExpiresAt();

    await prisma.refreshToken.create({ data: { token: refreshToken, expiresAt, userId: user.id } });

    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
      refreshToken,
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// ─── Login ────────────────────────────────────────────────────────────────────

router.post("/login", authLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    const valid = await bcryptjs.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid email or password" });

    await initializeAccount(user.id);
    await seedInitialInventory(user.id);

    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken();
    const expiresAt = refreshTokenExpiresAt();

    await prisma.refreshToken.create({ data: { token: refreshToken, expiresAt, userId: user.id } });

    res.json({
      user: { id: user.id, email: user.email, name: user.name },
      token,
      refreshToken,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ─── Refresh token ────────────────────────────────────────────────────────────

router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: "Missing refreshToken" });

  try {
    const dbToken = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });

    if (!dbToken || dbToken.revoked || new Date(dbToken.expiresAt) < new Date()) {
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }

    const token = generateToken(dbToken.userId);
    res.json({ token });
  } catch (err) {
    console.error("Refresh error:", err);
    res.status(500).json({ error: "Unable to refresh token" });
  }
});

// ─── Logout ───────────────────────────────────────────────────────────────────

router.post("/logout", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: "Missing refreshToken" });

  try {
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { revoked: true },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ error: "Logout failed" });
  }
});

export default router;
