import { Router } from "express";
import bcryptjs from "bcryptjs";
import rateLimit from "express-rate-limit";
import { sql, initializeAccount, seedInitialInventory } from "./db";
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
    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing.length > 0) return res.status(400).json({ error: "Email already registered" });

    const hashed = await bcryptjs.hash(password, 10);
    const rows = await sql`
      INSERT INTO users (email, password, name) VALUES (${email}, ${hashed}, ${name})
      RETURNING id, email, name
    `;
    const user = rows[0];

    await initializeAccount(user.id);
    await seedInitialInventory(user.id);

    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken();
    const expiresAt = refreshTokenExpiresAt();

    await sql`
      INSERT INTO refresh_tokens (token, user_id, expires_at)
      VALUES (${refreshToken}, ${user.id}, ${expiresAt.toISOString()})
    `;

    res.status(201).json({ user: { id: user.id, email: user.email, name: user.name }, token, refreshToken });
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
    const rows = await sql`SELECT id, email, name, password FROM users WHERE email = ${email}`;
    if (rows.length === 0) return res.status(401).json({ error: "Invalid email or password" });

    const user = rows[0];
    const valid = await bcryptjs.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid email or password" });

    await initializeAccount(user.id);
    await seedInitialInventory(user.id);

    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken();
    const expiresAt = refreshTokenExpiresAt();

    await sql`
      INSERT INTO refresh_tokens (token, user_id, expires_at)
      VALUES (${refreshToken}, ${user.id}, ${expiresAt.toISOString()})
    `;

    res.json({ user: { id: user.id, email: user.email, name: user.name }, token, refreshToken });
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
    const rows = await sql`
      SELECT id, user_id, revoked, expires_at FROM refresh_tokens WHERE token = ${refreshToken}
    `;
    if (rows.length === 0) return res.status(401).json({ error: "Invalid or expired refresh token" });

    const dbToken = rows[0];
    if (dbToken.revoked || new Date(dbToken.expires_at) < new Date()) {
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }

    const token = generateToken(dbToken.user_id);
    res.json({ token });
  } catch (err) {
    console.error("Refresh error:", err);
    res.status(500).json({ error: "Unable to refresh token" });
  }
});

// ─── Forgot Password ──────────────────────────────────────────────────────────

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    const rows = await sql`SELECT id FROM users WHERE email = ${email}`;
    // Always return 200 to avoid email enumeration
    if (rows.length === 0) return res.json({ ok: true });

    const userId = rows[0].id;
    const resetToken = generateRefreshToken(); // reuse random token generator
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    // Store reset token in refresh_tokens table with a special marker
    await sql`
      INSERT INTO refresh_tokens (token, user_id, expires_at)
      VALUES (${"reset_" + resetToken}, ${userId}, ${expiresAt.toISOString()})
    `;

    // In production, send email here with:
    // Reset link: https://yourdomain.com/reset-password?token=<resetToken>
    // For now, return token in response (dev only)
    const isProd = process.env.NODE_ENV === "production";
    res.json({
      ok: true,
      ...(isProd ? {} : { resetToken, resetUrl: `/reset-password?token=${resetToken}` }),
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Failed to process request" });
  }
});

// ─── Reset Password ───────────────────────────────────────────────────────────

router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: "Token and new password are required" });
  if (newPassword.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

  try {
    const rows = await sql`
      SELECT id, user_id, revoked, expires_at
      FROM refresh_tokens
      WHERE token = ${"reset_" + token}
    `;
    if (rows.length === 0) return res.status(400).json({ error: "Invalid or expired reset token" });

    const dbToken = rows[0];
    if (dbToken.revoked || new Date(dbToken.expires_at) < new Date()) {
      return res.status(400).json({ error: "Reset link has expired. Please request a new one." });
    }

    const hashed = await bcryptjs.hash(newPassword, 10);
    await sql`UPDATE users SET password = ${hashed}, updated_at = NOW() WHERE id = ${dbToken.user_id}`;
    await sql`UPDATE refresh_tokens SET revoked = TRUE WHERE token = ${"reset_" + token}`;

    res.json({ ok: true });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Failed to reset password" });
  }
});



router.post("/logout", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: "Missing refreshToken" });

  try {
    await sql`UPDATE refresh_tokens SET revoked = TRUE WHERE token = ${refreshToken}`;
    res.json({ ok: true });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ error: "Logout failed" });
  }
});

export default router;
