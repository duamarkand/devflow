import { Router } from "express";
import { prisma } from "../lib/prisma.ts";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.ts";

const router = Router();

// GET /api/git/status - Get user GitHub connection status
router.get("/git/status", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { githubUsername: true },
    });

    return res.json({
      success: true,
      data: {
        connected: Boolean(user?.githubUsername),
        githubUsername: user?.githubUsername || null,
      },
    });
  } catch (error) {
    console.error("Git status error:", error);
    return res.status(500).json({ success: false, message: "Failed to get git status" });
  }
});

// POST /api/git/connect - Connect GitHub username
router.post("/git/connect", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const { githubUsername } = req.body;

    if (!githubUsername) {
      return res.status(400).json({ success: false, message: "GitHub username is required" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { githubUsername: githubUsername.trim() },
      select: { id: true, name: true, email: true, githubUsername: true },
    });

    await prisma.activity.create({
      data: {
        action: `connected GitHub account (${githubUsername})`,
        userId,
      },
    });

    return res.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error("Connect GitHub error:", error);
    return res.status(500).json({ success: false, message: "Failed to connect GitHub account" });
  }
});

// POST /api/git/disconnect - Disconnect GitHub account
router.post("/git/disconnect", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    await prisma.user.update({
      where: { id: userId },
      data: { githubUsername: null },
    });

    await prisma.activity.create({
      data: {
        action: "disconnected GitHub account",
        userId,
      },
    });

    return res.json({ success: true, message: "GitHub account disconnected" });
  } catch (error) {
    console.error("Disconnect GitHub error:", error);
    return res.status(500).json({ success: false, message: "Failed to disconnect GitHub account" });
  }
});

// GET /api/git/projects - Get user's projects with Git repository info
router.get("/git/projects", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    const projects = await prisma.project.findMany({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        category: true,
        githubOwner: true,
        githubRepository: true,
        githubUrl: true,
        deploymentStatus: true,
        status: true,
        progress: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return res.json({ success: true, data: projects });
  } catch (error) {
    console.error("Get git projects error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch git projects" });
  }
});

// POST /api/projects/:id/git/link - Link GitHub repository to project
router.post("/projects/:id/git/link", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;
    const { githubOwner, githubRepo } = req.body;

    if (!githubOwner || !githubRepo) {
      return res.status(400).json({ success: false, message: "GitHub owner and repository name are required" });
    }

    const githubUrl = `https://github.com/${githubOwner.trim()}/${githubRepo.trim()}`;

    const project = await prisma.project.update({
      where: { id },
      data: {
        githubOwner: githubOwner.trim(),
        githubRepository: githubRepo.trim(),
        githubUrl,
      },
    });

    const integration = await prisma.gitIntegration.upsert({
      where: { projectId: id },
      update: {
        githubOwner: githubOwner.trim(),
        githubRepo: githubRepo.trim(),
        lastSyncedAt: new Date(),
      },
      create: {
        projectId: id,
        githubOwner: githubOwner.trim(),
        githubRepo: githubRepo.trim(),
      },
    });

    await prisma.activity.create({
      data: {
        action: `linked GitHub repository ${githubOwner}/${githubRepo}`,
        projectId: id,
        userId,
      },
    });

    return res.json({ success: true, data: { project, integration } });
  } catch (error) {
    console.error("Link git repo error:", error);
    return res.status(500).json({ success: false, message: "Failed to link GitHub repository" });
  }
});

// POST /api/projects/:id/git/publish - Publish project build to GitHub
router.post("/projects/:id/git/publish", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;
    const { commitMessage, releaseTag } = req.body;

    const project = await prisma.project.findUnique({ where: { id } });

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        status: "LIVE",
        progress: 100,
        deploymentStatus: "PUBLISHED_TO_GITHUB",
      },
    });

    await prisma.activity.create({
      data: {
        action: `published project to GitHub (${releaseTag || "v1.0.0"})`,
        details: commitMessage || "Initial release build published",
        projectId: id,
        userId,
      },
    });

    return res.json({
      success: true,
      message: "Project successfully published to GitHub!",
      data: updatedProject,
    });
  } catch (error) {
    console.error("Publish project error:", error);
    return res.status(500).json({ success: false, message: "Failed to publish project" });
  }
});

export default router;
