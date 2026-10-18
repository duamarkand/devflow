import { Router } from "express";
import { prisma } from "../lib/prisma.ts";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.ts";

const router = Router();

async function recalculateProgress(projectId: string) {
  const tasks = await prisma.task.findMany({
    where: { projectId },
    select: { status: true },
  });

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "DONE").length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  await prisma.project.update({
    where: { id: projectId },
    data: { progress },
  });
}

// GET /api/tasks/my-tasks - All tasks for current user
router.get("/my-tasks", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    const tasks = await prisma.task.findMany({
      where: {
        OR: [{ assigneeId: userId }, { creatorId: userId }],
      },
      include: {
        project: { select: { id: true, name: true, slug: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
        creator: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ success: true, data: tasks });
  } catch (error) {
    console.error("Get my tasks error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch user tasks" });
  }
});

// GET /api/projects/:id/tasks
router.get("/projects/:id/tasks", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;

    const tasks = await prisma.task.findMany({
      where: { projectId: id },
      include: {
        assignee: { select: { id: true, name: true, avatar: true, email: true } },
        creator: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ success: true, data: tasks });
  } catch (error) {
    console.error("Get project tasks error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch tasks" });
  }
});

// GET /api/tasks/:id - Fetch single task details
router.get("/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, name: true, avatar: true, email: true } },
        creator: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }
    return res.json({ success: true, data: task });
  } catch (error) {
    console.error("Get task error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch task" });
  }
});

// POST /api/projects/:id/tasks - Create new task
router.post("/projects/:id/tasks", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;
    const creatorId = req.user!.id;
    const { title, description, status, priority, dueDate, assigneeId } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: "Task title is required" });
    }

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description ? description.trim() : null,
        status: status || "TODO",
        priority: priority || "MEDIUM",
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId: id,
        assigneeId: assigneeId || null,
        creatorId,
      },
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    await recalculateProgress(id);

    await prisma.activity.create({
      data: {
        action: `created task "${task.title}"`,
        projectId: id,
        userId: creatorId,
      },
    });

    return res.status(201).json({ success: true, data: task });
  } catch (error) {
    console.error("Create task error:", error);
    return res.status(500).json({ success: false, message: "Failed to create task" });
  }
});

// PATCH /api/tasks/:id - Update task
router.patch("/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;
    const { title, description, status, priority, dueDate, assigneeId } = req.body;

    const existingTask = await prisma.task.findUnique({ where: { id } });

    if (!existingTask) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const dataToUpdate: any = {};
    if (title !== undefined) dataToUpdate.title = title.trim();
    if (description !== undefined) dataToUpdate.description = description ? description.trim() : null;
    if (status !== undefined) dataToUpdate.status = status;
    if (priority !== undefined) dataToUpdate.priority = priority;
    if (dueDate !== undefined) dataToUpdate.dueDate = dueDate ? new Date(dueDate) : null;
    if (assigneeId !== undefined) dataToUpdate.assigneeId = assigneeId || null;

    const updatedTask = await prisma.task.update({
      where: { id },
      data: dataToUpdate,
      include: {
        assignee: { select: { id: true, name: true, avatar: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    await recalculateProgress(existingTask.projectId);

    if (status && status !== existingTask.status) {
      await prisma.activity.create({
        data: {
          action: status === "DONE" ? `completed task "${updatedTask.title}"` : `moved task "${updatedTask.title}" to ${status}`,
          projectId: existingTask.projectId,
          userId,
        },
      });
    }

    return res.json({ success: true, data: updatedTask });
  } catch (error) {
    console.error("Update task error:", error);
    return res.status(500).json({ success: false, message: "Failed to update task" });
  }
});

// DELETE /api/tasks/:id
router.delete("/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;

    const task = await prisma.task.findUnique({ where: { id } });

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    await prisma.task.delete({ where: { id } });
    await recalculateProgress(task.projectId);

    return res.json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    console.error("Delete task error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete task" });
  }
});

export default router;
