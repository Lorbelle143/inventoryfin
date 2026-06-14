import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET;

// In development a missing JWT_SECRET will cause functions that sign tokens to fail.
// We intentionally avoid providing a hardcoded fallback in production.

export interface AuthRequest extends Request {
  userId?: number;
  user?: { id: number; email: string; name: string };
}

export function generateToken(userId: number): string {
  if (!JWT_SECRET) throw new Error("JWT_SECRET not set");
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "15m" });
}

export function verifyToken(token: string): { userId: number } | null {
  if (!JWT_SECRET) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as unknown as { userId: number };
    return decoded;
  } catch {
    return null;
  }
}

// Refresh token helpers (simple opaque tokens stored in DB)
export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString("hex");
}

export function refreshTokenExpiresAt(days = 30): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: "Invalid token" });
  }

  req.userId = decoded.userId;
  next();
}
