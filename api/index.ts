import "dotenv/config";
import express from "express";
import cors from "cors";
import { authMiddleware } from "../src/auth";

const app = express();

// ── CORS: accept all origins (lock down after confirming it works) ────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));

// ── Health check — hit /health first to diagnose startup issues ───────────────
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    ts: new Date().toISOString(),
    env: {
      hasDatabase: !!process.env.DATABASE_URL,
      hasDirectUrl: !!process.env.DIRECT_URL,
      hasJwt: !!process.env.JWT_SECRET,
      nodeEnv: process.env.NODE_ENV ?? "undefined",
    },
  });
});

// ── Lazy-load routes so Prisma errors show in logs, not as silent crashes ─────
app.use("/api/auth", async (req, res, next) => {
  try {
    const { default: authRouter } = await import("../src/authRoutes");
    authRouter(req, res, next);
  } catch (err: any) {
    console.error("[ROUTE LOAD ERROR /api/auth]", err.message);
    res.status(500).json({ error: "Auth router failed to load", detail: err.message });
  }
});

app.use("/api", authMiddleware, async (req, res, next) => {
  try {
    const { default: router } = await import("../src/routes");
    router(req, res, next);
  } catch (err: any) {
    console.error("[ROUTE LOAD ERROR /api]", err.message);
    res.status(500).json({ error: "API router failed to load", detail: err.message });
  }
});

app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "InventoryFin API" });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[UNHANDLED ERROR]", err.stack ?? err.message);
  res.status(500).json({ error: err.message || "Internal server error" });
});

export default app;
