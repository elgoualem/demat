import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Auth minimale MVP : Bearer JWT, payload { userId }.
// Pas de refresh token / rôles fins ici -> à enrichir en v1 (cf. tableau des rôles, prompt 1).
export interface AuthedRequest extends Request {
  userId?: string;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "missing_token" });
  }
  try {
    const token = header.slice("Bearer ".length);
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret") as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }
}
