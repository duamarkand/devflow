import { Router } from "express";
import { prisma } from "../lib/prisma.ts";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.ts";

const router = Router();

// GET /api/projects/:id/members
router.get("/:id/members", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;

    const members = await prisma.projectMember.findMany({
      where: { projectId: id },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true, githubUsername: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return res.json({ success: true, data: members });
  } catch (error) {
    console.error("Get members error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch members" });
  }
});

// POST /api/projects/:id/members - Invite member by email
router.post("/:id/members", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;
    const currentUserId = req.user!.id;
    const { email, role } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const currentUserRole = project.ownerId === currentUserId
      ? "OWNER"
      : project.members.find((m) => m.userId === currentUserId)?.role;

    if (currentUserRole !== "OWNER" && currentUserRole !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Only project owners and admins can add team members" });
    }

    const targetUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: `User with email "${email}" not found. Please ask them to register on DevFlow first.`,
      });
    }

    const existingMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: id,
          userId: targetUser.id,
        },
      },
    });

    if (existingMember) {
      return res.status(409).json({ success: false, message: "User is already a member of this project" });
    }

    const newMember = await prisma.projectMember.create({
      data: {
        projectId: id,
        userId: targetUser.id,
        role: role || "DEVELOPER",
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });

    await prisma.activity.create({
      data: {
        action: `added ${targetUser.name} as ${newMember.role}`,
        details: `Added ${targetUser.email} to project with role ${newMember.role}`,
        projectId: id,
        userId: currentUserId,
      },
    });

    return res.status(201).json({ success: true, data: newMember });
  } catch (error) {
    console.error("Add member error:", error);
    return res.status(500).json({ success: false, message: "Failed to add member" });
  }
});

// PATCH /api/projects/:id/members/:memberId - Change role
router.patch("/:id/members/:memberId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;
    const memberId = req.params.memberId as string;
    const currentUserId = req.user!.id;
    const { role } = req.body;

    const project = await prisma.project.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const currentUserRole = project.ownerId === currentUserId
      ? "OWNER"
      : project.members.find((m) => m.userId === currentUserId)?.role;

    if (currentUserRole !== "OWNER" && currentUserRole !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Only project owners and admins can update member roles" });
    }

    const memberToUpdate = await prisma.projectMember.findUnique({
      where: { id: memberId },
      include: { user: true },
    });

    if (!memberToUpdate || memberToUpdate.projectId !== id) {
      return res.status(404).json({ success: false, message: "Member record not found" });
    }

    if (memberToUpdate.userId === project.ownerId) {
      return res.status(400).json({ success: false, message: "Cannot change role of project owner" });
    }

    const updatedMember = await prisma.projectMember.update({
      where: { id: memberId },
      data: { role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    await prisma.activity.create({
      data: {
        action: `updated ${memberToUpdate.user.name}'s role to ${role}`,
        projectId: id,
        userId: currentUserId,
      },
    });

    return res.json({ success: true, data: updatedMember });
  } catch (error) {
    console.error("Update member role error:", error);
    return res.status(500).json({ success: false, message: "Failed to update member role" });
  }
});

// DELETE /api/projects/:id/members/:memberId - Remove member
router.delete("/:id/members/:memberId", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;
    const memberId = req.params.memberId as string;
    const currentUserId = req.user!.id;

    const project = await prisma.project.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!project) {
      return res.status(404).json({ success: false, message: "Project not found" });
    }

    const currentUserRole = project.ownerId === currentUserId
      ? "OWNER"
      : project.members.find((m) => m.userId === currentUserId)?.role;

    if (currentUserRole !== "OWNER" && currentUserRole !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Only project owners and admins can remove team members" });
    }

    const memberToRemove = await prisma.projectMember.findUnique({
      where: { id: memberId },
      include: { user: true },
    });

    if (!memberToRemove || memberToRemove.projectId !== id) {
      return res.status(404).json({ success: false, message: "Member record not found" });
    }

    if (memberToRemove.userId === project.ownerId) {
      return res.status(400).json({ success: false, message: "Cannot remove project owner from project" });
    }

    await prisma.projectMember.delete({ where: { id: memberId } });

    await prisma.activity.create({
      data: {
        action: `removed ${memberToRemove.user.name} from project`,
        projectId: id,
        userId: currentUserId,
      },
    });

    return res.json({ success: true, message: "Member removed from project successfully" });
  } catch (error) {
    console.error("Remove member error:", error);
    return res.status(500).json({ success: false, message: "Failed to remove member" });
  }
});

export default router;
