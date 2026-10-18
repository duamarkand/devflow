import { Router } from "express";
import { prisma } from "../lib/prisma.ts";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.ts";

const router = Router();

// GET /api/activity - Workspace-wide activities
router.get("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    const userProjects = await prisma.project.findMany({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      select: { id: true },
    });

    const projectIds = userProjects.map((p) => p.id);

    const activities = await prisma.activity.findMany({
      where: {
        OR: [
          { projectId: { in: projectIds } },
          { userId },
        ],
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        project: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return res.json({ success: true, data: activities });
  } catch (error) {
    console.error("Get activity error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch activities" });
  }
});

// GET /api/activity/projects/:id - Project-specific activities
router.get("/projects/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;

    const activities = await prisma.activity.findMany({
      where: { projectId: id },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        project: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return res.json({ success: true, data: activities });
  } catch (error) {
    console.error("Get project activity error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch project activity" });
  }
});

export default router;
