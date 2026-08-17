import { Response, NextFunction } from "express";
import { AdminScope } from "@prisma/client";
import { prisma } from "../db";
import { asyncHandler } from "./asyncHandler";
import { AuthedRequest } from "./auth";

// Porte d'entrée de /admin : il faut être isAdmin pour accéder au panneau, quelles
// que soient les permissions détenues. requireScope (ci-dessous) filtre ensuite
// chaque section.
export const requireAdmin = asyncHandler(async (req: AuthedRequest, res: Response, next: NextFunction) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user?.isAdmin) return res.status(403).json({ error: "forbidden" });
  next();
});

// Restreint une section du back-office à un scope précis (voir AdminScope dans
// schema.prisma). Un compte détenant le scope USERS choisit qui a accès à quoi
// via PATCH /admin/users/:id/permissions.
export function requireScope(scope: AdminScope) {
  return asyncHandler(async (req: AuthedRequest, res: Response, next: NextFunction) => {
    const granted = await prisma.adminPermission.findUnique({
      where: { userId_scope: { userId: req.userId!, scope } },
    });
    if (!granted) return res.status(403).json({ error: "forbidden", scope });
    next();
  });
}
