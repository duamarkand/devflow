import { Router } from "express";
import { prisma } from "../lib/prisma.ts";

const router = Router();

// GET /api/showcase - Public projects listing
router.get("/", async (_req, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        visibility: "PUBLIC",
      },
      include: {
        owner: { select: { id: true, name: true, avatar: true, githubUsername: true } },
        members: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
        tasks: { select: { id: true, status: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const formatted = projects.map((p) => {
      const total = p.tasks.length;
      const completed = p.tasks.filter((t) => t.status === "DONE").length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : p.progress;

      return {
        ...p,
        progress,
        taskCount: total,
      };
    });

    return res.json({ success: true, data: formatted });
  } catch (error) {
    console.error("Get showcase error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch showcase projects" });
  }
});

// GET /api/showcase/:slug - Single public project detail
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const project = await prisma.project.findFirst({
      where: {
        OR: [{ slug }, { id: slug }],
        visibility: "PUBLIC",
      },
      include: {
        owner: { select: { id: true, name: true, avatar: true, githubUsername: true, email: true } },
        members: {
          include: { user: { select: { id: true, name: true, avatar: true, githubUsername: true } } },
        },
        tasks: {
          select: { id: true, title: true, status: true, priority: true },
          orderBy: { createdAt: "desc" },
        },
        issues: {
          select: { id: true, title: true, status: true, priority: true },
          orderBy: { createdAt: "desc" },
        },
        activities: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found or private" });
    }

    const total = project.tasks.length;
    const completed = project.tasks.filter((t) => t.status === "DONE").length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : project.progress;

    return res.json({
      success: true,
      data: {
        ...project,
        progress,
      },
    });
  } catch (error) {
    console.error("Get public project detail error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch project" });
  }
});

export default router;
