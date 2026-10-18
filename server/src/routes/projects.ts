import { Router } from "express";
import { prisma } from "../lib/prisma.ts";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.ts";

const router = Router();

// GET /api/projects - Workspace statistics & list of projects
router.get("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } },
          },
        },
        tasks: { select: { id: true, status: true } },
        issues: { select: { id: true, status: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const totalProjects = projects.length;
    const activeProjects = projects.filter(
      (p) => p.status === "IN_PROGRESS" || p.status === "BUILDING" || p.status === "PLANNING"
    ).length;
    const completedProjects = projects.filter((p) => p.status === "COMPLETED" || p.status === "LIVE").length;

    const memberIds = new Set<string>();
    projects.forEach((p) => {
      memberIds.add(p.ownerId);
      p.members.forEach((m) => memberIds.add(m.userId));
    });
    const totalMembers = memberIds.size;

    let openTasks = 0;
    let completedTasks = 0;
    let openIssues = 0;

    projects.forEach((p) => {
      openTasks += p.tasks.filter((t) => t.status !== "DONE").length;
      completedTasks += p.tasks.filter((t) => t.status === "DONE").length;
      openIssues += p.issues.filter((i) => i.status === "OPEN" || i.status === "IN_PROGRESS").length;
    });

    const formattedProjects = projects.map((p) => {
      const totalTasks = p.tasks.length;
      const done = p.tasks.filter((t) => t.status === "DONE").length;
      const progress = totalTasks > 0 ? Math.round((done / totalTasks) * 100) : p.progress;

      return {
        ...p,
        progress,
        taskCount: totalTasks,
        issueCount: p.issues.length,
      };
    });

    const totalProgressSum = formattedProjects.reduce((acc, p) => acc + p.progress, 0);
    const overallProgress = totalProjects > 0 ? Math.round(totalProgressSum / totalProjects) : 0;

    return res.json({
      success: true,
      stats: {
        totalProjects,
        activeProjects,
        completedProjects,
        totalMembers,
        openTasks,
        pendingTasks: openTasks,
        completedTasks,
        openIssues,
        overallProgress,
      },
      data: formattedProjects,
    });
  } catch (error) {
    console.error("Get projects error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch projects" });
  }
});

// POST /api/projects - Create a new project
router.post("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const {
      name,
      description,
      category,
      techStack,
      visibility,
      startDate,
      targetDate,
      githubUrl,
      liveUrl,
    } = req.body;

    if (!name || !description) {
      return res.status(400).json({
        success: false,
        message: "Project name and description are required",
      });
    }

    let baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    if (!baseSlug) baseSlug = "project";

    let slug = baseSlug;
    let count = 1;
    while (await prisma.project.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${count}`;
      count++;
    }

    const parsedTechStack = Array.isArray(techStack)
      ? techStack
      : typeof techStack === "string"
      ? techStack.split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        slug,
        description: description.trim(),
        category: category || "Web Development",
        techStack: parsedTechStack,
        visibility: visibility || "PUBLIC",
        startDate: startDate ? new Date(startDate) : null,
        targetDate: targetDate ? new Date(targetDate) : null,
        githubUrl: githubUrl || null,
        liveUrl: liveUrl || null,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: "OWNER",
          },
        },
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });

    await prisma.activity.create({
      data: {
        action: "created project",
        details: `Created project "${project.name}"`,
        projectId: project.id,
        userId,
      },
    });

    return res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error("Create project error:", error);
    return res.status(500).json({ success: false, message: "Failed to create project" });
  }
});

// GET /api/projects/:id - Get project details
router.get("/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;

    const project = await prisma.project.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        owner: { select: { id: true, name: true, email: true, avatar: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true } },
          },
        },
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, avatar: true } },
            creator: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        issues: {
          include: {
            assignee: { select: { id: true, name: true, avatar: true } },
            creator: { select: { id: true, name: true } },
            comments: {
              include: { author: { select: { id: true, name: true, avatar: true } } },
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        activities: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
          orderBy: { createdAt: "desc" },
          take: 15,
        },
        gitIntegration: true,
      },
    });

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const isMember =
      project.ownerId === userId ||
      project.members.some((m) => m.userId === userId);

    if (!isMember && project.visibility === "PRIVATE") {
      return res.status(403).json({ success: false, message: "Access denied to private project" });
    }

    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter((t) => t.status === "DONE").length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : project.progress;

    return res.json({
      success: true,
      data: {
        ...project,
        progress,
        userRole: project.members.find((m) => m.userId === userId)?.role || (project.ownerId === userId ? "OWNER" : "VIEWER"),
      },
    });
  } catch (error) {
    console.error("Get project details error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch project details" });
  }
});

// PATCH /api/projects/:id - Update project info & status
router.patch("/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;
    const {
      name,
      description,
      status,
      category,
      techStack,
      visibility,
      githubUrl,
      liveUrl,
      docUrl,
      demoUrl,
      deploymentProvider,
      deploymentStatus,
    } = req.body;

    const project = await prisma.project.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const userRole = project.ownerId === userId
      ? "OWNER"
      : project.members.find((m) => m.userId === userId)?.role;

    if (userRole !== "OWNER" && userRole !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Only project owners and admins can update settings" });
    }

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name.trim();
    if (description !== undefined) dataToUpdate.description = description.trim();
    if (status !== undefined) dataToUpdate.status = status;
    if (category !== undefined) dataToUpdate.category = category;
    if (techStack !== undefined) {
      dataToUpdate.techStack = Array.isArray(techStack)
        ? techStack
        : typeof techStack === "string"
        ? techStack.split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];
    }
    if (visibility !== undefined) dataToUpdate.visibility = visibility;
    if (startDate !== undefined) dataToUpdate.startDate = startDate ? new Date(startDate) : null;
    if (targetDate !== undefined) dataToUpdate.targetDate = targetDate ? new Date(targetDate) : null;
    if (githubUrl !== undefined) dataToUpdate.githubUrl = githubUrl;
    if (liveUrl !== undefined) dataToUpdate.liveUrl = liveUrl;
    if (docUrl !== undefined) dataToUpdate.docUrl = docUrl;
    if (demoUrl !== undefined) dataToUpdate.demoUrl = demoUrl;
    if (deploymentProvider !== undefined) dataToUpdate.deploymentProvider = deploymentProvider;
    if (deploymentStatus !== undefined) dataToUpdate.deploymentStatus = deploymentStatus;

    const updatedProject = await prisma.project.update({
      where: { id },
      data: dataToUpdate,
    });

    if (status && status !== project.status) {
      await prisma.activity.create({
        data: {
          action: `updated status to ${status}`,
          details: `Changed project status from ${project.status} to ${status}`,
          projectId: project.id,
          userId,
        },
      });
    }

    return res.json({
      success: true,
      data: updatedProject,
    });
  } catch (error) {
    console.error("Update project error:", error);
    return res.status(500).json({ success: false, message: "Failed to update project" });
  }
});

// DELETE /api/projects/:id - Delete project (Owner only)
router.delete("/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;

    const project = await prisma.project.findUnique({ where: { id } });

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    if (project.ownerId !== userId) {
      return res.status(403).json({ success: false, message: "Only the project owner can delete this project" });
    }

    await prisma.project.delete({ where: { id } });

    return res.json({ success: true, message: "Project deleted successfully" });
  } catch (error) {
    console.error("Delete project error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete project" });
  }
});

export default router;
