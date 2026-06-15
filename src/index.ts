import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import router from "./routes";
import authRouter from "./authRoutes";
import { authMiddleware } from "./auth";
import { initDB } from "./db";

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(cors());
app.use(express.json());

// Auth routes (public)
app.use("/api/auth", authRouter);

// Protected routes
app.use("/api", authMiddleware, router);

app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "InventoryFin API" });
});

async function main() {
  await initDB();
  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
