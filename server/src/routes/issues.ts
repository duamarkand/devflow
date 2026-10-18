import { Router } from "express";
import { prisma } from "../lib/prisma.ts";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.ts";

const router = Router();

// GET /api/issues/my-issues
router.get("/my-issues", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    const issues = await prisma.issue.findMany({
      where: {
        OR: [{ assigneeId: userId }, { creatorId: userId }],
      },
      include: {
        project: { select: { id: true, name: true, slug: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
        creator: { select: { id: true, name: true } },
        comments: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ success: true, data: issues });
  } catch (error) {
    console.error("Get my issues error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch user issues" });
  }
});

// GET /api/projects/:id/issues
router.get("/projects/:id/issues", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;

    const issues = await prisma.issue.findMany({
      where: { projectId: id },
      include: {
        assignee: { select: { id: true, name: true, avatar: true, email: true } },
        creator: { select: { id: true, name: true } },
        comments: {
          include: { author: { select: { id: true, name: true, avatar: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ success: true, data: issues });
  } catch (error) {
    console.error("Get project issues error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch issues" });
  }
});

// POST /api/projects/:id/issues
router.post("/projects/:id/issues", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;
    const creatorId = req.user!.id;
    const { title, description, priority, assigneeId } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: "Issue title is required" });
    }

    const issue = await prisma.issue.create({
      data: {
        title: title.trim(),
        description: description ? description.trim() : null,
        status: "OPEN",
        priority: priority || "MEDIUM",
        projectId: id,
        assigneeId: assigneeId || null,
        creatorId,
      },
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        creator: { select: { id: true, name: true } },
        comments: true,
      },
    });

    await prisma.activity.create({
      data: {
        action: `opened issue "${issue.title}"`,
        projectId: id,
        userId: creatorId,
      },
    });

    return res.status(201).json({ success: true, data: issue });
  } catch (error) {
    console.error("Create issue error:", error);
    return res.status(500).json({ success: false, message: "Failed to create issue" });
  }
});

// PATCH /api/issues/:id
router.patch("/issues/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;
    const { title, description, status, priority, assigneeId } = req.body;

    const existingIssue = await prisma.issue.findUnique({ where: { id } });

    if (!existingIssue) {
      return res.status(404).json({ success: false, message: "Issue not found" });
    }

    const dataToUpdate: any = {};
    if (title !== undefined) dataToUpdate.title = title.trim();
    if (description !== undefined) dataToUpdate.description = description ? description.trim() : null;
    if (status !== undefined) dataToUpdate.status = status;
    if (priority !== undefined) dataToUpdate.priority = priority;
    if (assigneeId !== undefined) dataToUpdate.assigneeId = assigneeId || null;

    const updatedIssue = await prisma.issue.update({
      where: { id },
      data: dataToUpdate,
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        creator: { select: { id: true, name: true } },
        comments: {
          include: { author: { select: { id: true, name: true, avatar: true } } },
        },
      },
    });

    if (status && status !== existingIssue.status) {
      await prisma.activity.create({
        data: {
          action: status === "RESOLVED" || status === "CLOSED" ? `closed issue "${updatedIssue.title}"` : `updated issue status to ${status}`,
          projectId: existingIssue.projectId,
          userId,
        },
      });
    }

    return res.json({ success: true, data: updatedIssue });
  } catch (error) {
    console.error("Update issue error:", error);
    return res.status(500).json({ success: false, message: "Failed to update issue" });
  }
});

// DELETE /api/issues/:id
router.delete("/issues/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;
    const issue = await prisma.issue.findUnique({ where: { id } });

    if (!issue) {
      return res.status(404).json({ success: false, message: "Issue not found" });
    }

    await prisma.issue.delete({ where: { id } });
    return res.json({ success: true, message: "Issue deleted successfully" });
  } catch (error) {
    console.error("Delete issue error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete issue" });
  }
});

// POST /api/issues/:id/comments
router.post("/issues/:id/comments", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;
    const authorId = req.user!.id;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, message: "Comment content is required" });
    }

    const issue = await prisma.issue.findUnique({ where: { id } });

    if (!issue) {
      return res.status(404).json({ success: false, message: "Issue not found" });
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        issueId: id,
        authorId,
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
      },
    });

    return res.status(201).json({ success: true, data: comment });
  } catch (error) {
    console.error("Add comment error:", error);
    return res.status(500).json({ success: false, message: "Failed to add comment" });
  }
});

export default router;
