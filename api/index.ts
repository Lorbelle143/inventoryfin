import "dotenv/config";
import express from "express";
import cors from "cors";
import { authMiddleware } from "../src/auth";
import { initDB } from "../src/db";

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));

// Initialize DB tables on cold start
initDB().catch(err => console.error("[DB INIT ERROR]", err));

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    ts: new Date().toISOString(),
    env: {
      hasDatabase: !!process.env.DATABASE_URL,
      hasJwt: !!process.env.JWT_SECRET,
      nodeEnv: process.env.NODE_ENV ?? "undefined",
    },
  });
});

// ── Auth routes ───────────────────────────────────────────────────────────────
app.use("/api/auth", async (req, res, next) => {
  try {
    const { default: authRouter } = await import("../src/authRoutes");
    authRouter(req, res, next);
  } catch (err: any) {
    console.error("[ROUTE LOAD ERROR /api/auth]", err.message);
    res.status(500).json({ error: "Auth router failed to load", detail: err.message });
  }
});

// ── Protected routes ──────────────────────────────────────────────────────────
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

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[UNHANDLED ERROR]", err.stack ?? err.message);
  res.status(500).json({ error: err.message || "Internal server error" });
});

export default app;
