import { Router } from "express";
import { prisma } from "../db";
import { asyncHandler } from "../middleware/asyncHandler";
import { requireAuth, AuthedRequest } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const MEMBER_SELECT = {
  role: true,
  createdAt: true,
  user: { select: { id: true, email: true, name: true } },
};

function getMembership(userId: string, organizationId: string) {
  return prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  });
}

// POST /organizations { name, vatNumber? } — crée l'organisation, le créateur en devient OWNER.
router.post("/", asyncHandler(async (req: AuthedRequest, res) => {
  const { name, vatNumber } = req.body;
  if (!name) return res.status(400).json({ error: "name_required" });

  const organization = await prisma.organization.create({
    data: {
      name,
      vatNumber,
      memberships: { create: { userId: req.userId!, role: "OWNER" } },
    },
    include: { memberships: { select: MEMBER_SELECT } },
  });
  res.status(201).json(organization);
}));

// GET /organizations — organisations dont l'utilisateur est membre, avec son rôle.
router.get("/", asyncHandler(async (req: AuthedRequest, res) => {
  const memberships = await prisma.membership.findMany({
    where: { userId: req.userId! },
    include: { organization: true },
  });
  res.json(memberships.map((m) => ({ ...m.organization, role: m.role })));
}));

// GET /organizations/:id — détail + membres, réservé aux membres.
router.get("/:id", asyncHandler(async (req: AuthedRequest, res) => {
  const membership = await getMembership(req.userId!, req.params.id);
  if (!membership) return res.status(403).json({ error: "not_a_member" });

  const organization = await prisma.organization.findUnique({
    where: { id: req.params.id },
    include: { memberships: { select: MEMBER_SELECT } },
  });
  if (!organization) return res.status(404).json({ error: "organization_not_found" });
  res.json({ ...organization, role: membership.role });
}));

// GET /organizations/:id/orders — facturation consolidée, réservé aux membres.
router.get("/:id/orders", asyncHandler(async (req: AuthedRequest, res) => {
  const membership = await getMembership(req.userId!, req.params.id);
  if (!membership) return res.status(403).json({ error: "not_a_member" });

  const orders = await prisma.order.findMany({
    where: { organizationId: req.params.id },
    include: { invoice: true, user: { select: { id: true, email: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(orders);
}));

// POST /organizations/:id/members { email, role? } — OWNER/ADMIN uniquement.
// Pas de flux d'invitation par email dans ce MVP : la personne doit déjà avoir un compte.
router.post("/:id/members", asyncHandler(async (req: AuthedRequest, res) => {
  const membership = await getMembership(req.userId!, req.params.id);
  if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
    return res.status(403).json({ error: "insufficient_role" });
  }

  const { email, role } = req.body;
  if (!email) return res.status(400).json({ error: "email_required" });
  if (role && role !== "ADMIN" && role !== "MEMBER") {
    return res.status(400).json({ error: "invalid_role" });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ error: "user_not_found" });

  const existing = await getMembership(user.id, req.params.id);
  if (existing) return res.status(409).json({ error: "already_member" });

  const created = await prisma.membership.create({
    data: { userId: user.id, organizationId: req.params.id, role: role || "MEMBER" },
    select: MEMBER_SELECT,
  });
  res.status(201).json(created);
}));

// DELETE /organizations/:id/members/:userId — OWNER/ADMIN uniquement, un OWNER ne peut pas être retiré ainsi.
router.delete("/:id/members/:userId", asyncHandler(async (req: AuthedRequest, res) => {
  const membership = await getMembership(req.userId!, req.params.id);
  if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
    return res.status(403).json({ error: "insufficient_role" });
  }

  const target = await getMembership(req.params.userId, req.params.id);
  if (!target) return res.status(404).json({ error: "member_not_found" });
  if (target.role === "OWNER") return res.status(403).json({ error: "cannot_remove_owner" });

  await prisma.membership.delete({ where: { id: target.id } });
  res.status(204).send();
}));

export default router;
