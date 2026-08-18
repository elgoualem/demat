import { Router } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../db";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

// Auth minimale MVP (cf. src/middleware/auth.ts) : pas de mot de passe, un email
// suffit à s'identifier. À enrichir en v1 (mot de passe / SSO / rôles fins).
function signToken(userId: string) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || "dev-secret");
}

const ADMIN_PERMISSIONS_INCLUDE = { adminPermissions: { select: { scope: true, readOnly: true, expiresAt: true } } };

// Le front gate certains liens (nav, sections /admin) sur adminScopes, en plus
// d'isAdmin : autant l'inclure dès la connexion plutôt que d'ajouter un appel.
// Un scope expiré est exclu ici même (pas seulement bloqué côté API) : la
// session reflète l'accès réel dès la connexion. adminReadOnlyScopes permet au
// front de griser les actions d'écriture pour un accès "visiteur".
function withAdminScopes<T extends { adminPermissions: { scope: string; readOnly: boolean; expiresAt: Date | null }[] }>(user: T) {
  const { adminPermissions, ...rest } = user;
  const active = adminPermissions.filter((p) => !p.expiresAt || p.expiresAt.getTime() > Date.now());
  return {
    ...rest,
    adminScopes: active.map((p) => p.scope),
    adminReadOnlyScopes: active.filter((p) => p.readOnly).map((p) => p.scope),
  };
}

router.post("/register", asyncHandler(async (req, res) => {
  const { email, name } = req.body;
  if (!email) return res.status(400).json({ error: "email_required" });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "email_already_registered" });

  const user = await prisma.user.create({ data: { email, name }, include: ADMIN_PERMISSIONS_INCLUDE });
  res.status(201).json({ token: signToken(user.id), user: withAdminScopes(user) });
}));

router.post("/login", asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "email_required" });

  const user = await prisma.user.findUnique({ where: { email }, include: ADMIN_PERMISSIONS_INCLUDE });
  if (!user) return res.status(401).json({ error: "invalid_credentials" });

  res.json({ token: signToken(user.id), user: withAdminScopes(user) });
}));

export default router;
