"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, getStoredUser, UserSession } from "@/lib/api";
import { useToast } from "@/components/Toast";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | "CRITICAL";
  assignee?: { id: string; name: string; avatar?: string };
}

interface Issue {
  id: string;
  title: string;
  description?: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | "CRITICAL";
  assignee?: { id: string; name: string; avatar?: string };
  creator: { name: string };
  comments: Array<{ id: string; content: string; author: { name: string }; createdAt: string }>;
}

interface Member {
  id: string;
  role: "OWNER" | "ADMIN" | "DEVELOPER" | "DESIGNER" | "VIEWER";
  user: { id: string; name: string; email: string; avatar?: string };
}

interface Activity {
  id: string;
  action: string;
  details?: string;
  createdAt: string;
  user: { name: string };
}

interface ProjectDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  techStack: string[];
  visibility: "PRIVATE" | "TEAM" | "PUBLIC";
  status: "PLANNING" | "IN_PROGRESS" | "BUILDING" | "IN_REVIEW" | "COMPLETED" | "LIVE" | "ARCHIVED";
  progress: number;
  startDate?: string;
  targetDate?: string;
  githubUrl?: string;
  liveUrl?: string;
  deploymentProvider?: string;
  deploymentStatus?: string;
  githubOwner?: string;
  githubRepository?: string;
  userRole: string;
  owner: { id: string; name: string; email: string };
  members: Member[];
  tasks: Task[];
  issues: Issue[];
  activities: Activity[];
}

export default function ProjectWorkspacePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.projectId;
  const router = useRouter();
  const { toast } = useToast();

  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "tasks" | "issues" | "team" | "activity" | "git" | "analytics" | "settings"
  >("overview");

  // Modals state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskPriority, setTaskPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [taskAssignee, setTaskAssignee] = useState("");

  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueTitle, setIssueTitle] = useState("");
  const [issueDesc, setIssueDesc] = useState("");
  const [issuePriority, setIssuePriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");

  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<"ADMIN" | "DEVELOPER" | "DESIGNER" | "VIEWER">("DEVELOPER");

  const [showPublishModal, setShowPublishModal] = useState(false);
  const [commitMessage, setCommitMessage] = useState("Final project build & production release");

  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [commentText, setCommentText] = useState("");

  // Edit Settings State
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editTechStack, setEditTechStack] = useState("");
  const [editVisibility, setEditVisibility] = useState<"PRIVATE" | "TEAM" | "PUBLIC">("PUBLIC");
  const [editStatus, setEditStatus] = useState<string>("PLANNING");
  const [editStartDate, setEditStartDate] = useState("");
  const [editTargetDate, setEditTargetDate] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  // Delete Confirmation Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  const loadProject = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/api/projects/${projectId}`);
      if (res.success) {
        setProject(res.data);
        // Populate edit form states
        setEditName(res.data.name);
        setEditDescription(res.data.description);
        setEditCategory(res.data.category);
        setEditTechStack(res.data.techStack.join(", "));
        setEditVisibility(res.data.visibility);
        setEditStatus(res.data.status);
        setEditStartDate(res.data.startDate ? res.data.startDate.split("T")[0] : "");
        setEditTargetDate(res.data.targetDate ? res.data.targetDate.split("T")[0] : "");
      }
    } catch (err) {
      console.error("Failed to load project:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentUser(getStoredUser());
    loadProject();
  }, [projectId]);

  // Handlers
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle) return;
    try {
      const res = await apiFetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        body: JSON.stringify({
          title: taskTitle,
          description: taskDesc,
          priority: taskPriority,
          assigneeId: taskAssignee || undefined,
        }),
      });
      if (res.success) {
        setShowTaskModal(false);
        setTaskTitle("");
        setTaskDesc("");
        toast("Task created successfully", "success");
        loadProject();
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to create task", "error");
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: Task["status"]) => {
    try {
      const res = await apiFetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.success) {
        toast(`Task updated to ${newStatus}`, "success");
        loadProject();
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to update task status", "error");
    }
  };

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueTitle) return;
    try {
      const res = await apiFetch(`/api/projects/${projectId}/issues`, {
        method: "POST",
        body: JSON.stringify({
          title: issueTitle,
          description: issueDesc,
          priority: issuePriority,
        }),
      });
      if (res.success) {
        setShowIssueModal(false);
        setIssueTitle("");
        setIssueDesc("");
        toast("Issue reported successfully", "success");
        loadProject();
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to create issue", "error");
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberEmail) return;
    try {
      const res = await apiFetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        body: JSON.stringify({ email: memberEmail, role: memberRole }),
      });
      if (res.success) {
        setShowMemberModal(false);
        setMemberEmail("");
        toast("Team member added successfully", "success");
        loadProject();
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to add team member", "error");
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue || !commentText) return;
    try {
      const res = await apiFetch(`/api/issues/${selectedIssue.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: commentText }),
      });
      if (res.success) {
        setCommentText("");
        toast("Comment added", "success");
        loadProject();
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to add comment", "error");
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      const res = await apiFetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.success) {
        toast(`Project status updated to ${newStatus}`, "success");
        loadProject();
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to update project status", "error");
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      const res = await apiFetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim(),
          category: editCategory,
          techStack: editTechStack.split(",").map((s) => s.trim()).filter(Boolean),
          visibility: editVisibility,
          status: editStatus,
          startDate: editStartDate || null,
          targetDate: editTargetDate || null,
        }),
      });

      if (res.success) {
        toast("Project details updated successfully!", "success");
        loadProject();
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to update settings", "error");
    } finally {
      setSavingSettings(false);
    }
  };

  const handlePublishProject = async () => {
    try {
      const res = await apiFetch(`/api/projects/${projectId}/git/publish`, {
        method: "POST",
        body: JSON.stringify({ commitMessage }),
      });
      if (res.success) {
        setShowPublishModal(false);
        toast("🎉 Project successfully published to GitHub!", "success");
        loadProject();
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to publish", "error");
    }
  };

  const handleDeleteProject = async () => {
    if (deleteConfirmInput !== "DELETE") {
      toast("Please type DELETE to confirm project deletion", "error");
      return;
    }

    try {
      setDeleting(true);
      const res = await apiFetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (res.success) {
        toast("Project deleted successfully", "success");
        router.push("/dashboard");
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to delete project", "error");
    } finally {
      setDeleting(false);
    }
  };

  if (loading || !project) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="h-20 rounded-2xl bg-gray-900 animate-pulse border border-gray-800" />
        <div className="h-96 rounded-2xl bg-gray-900 animate-pulse border border-gray-800" />
      </div>
    );
  }

  const isOwnerOrAdmin = project.userRole === "OWNER" || project.userRole === "ADMIN";

  // Analytics Metrics
  const totalTasks = project.tasks.length;
  const completedTasks = project.tasks.filter((t) => t.status === "DONE").length;
  const totalIssues = project.issues.length;
  const resolvedIssues = project.issues.filter((i) => i.status === "RESOLVED" || i.status === "CLOSED").length;

  const priorityCounts = {
    CRITICAL: project.tasks.filter((t) => t.priority === "URGENT" || t.priority === "CRITICAL").length,
    HIGH: project.tasks.filter((t) => t.priority === "HIGH").length,
    MEDIUM: project.tasks.filter((t) => t.priority === "MEDIUM").length,
    LOW: project.tasks.filter((t) => t.priority === "LOW").length,
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Workspace Header Banner */}
      <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900 via-gray-900 to-blue-950/40 p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800/80 pb-5">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/projects"
              className="text-xs font-semibold text-gray-400 hover:text-white transition"
            >
              ← My Projects
            </Link>
            <span className="text-gray-600">/</span>
            <span className="text-xs font-mono text-blue-400 uppercase">{project.category}</span>
          </div>

          <Link
            href={`/dashboard/showcase/${project.slug || project.id}`}
            target="_blank"
            className="rounded-xl border border-gray-800 bg-gray-900 px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white hover:bg-gray-800 transition shrink-0"
          >
            Public Showcase ↗
          </Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold text-white tracking-tight">{project.name}</h1>
              <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-0.5 text-xs font-semibold text-blue-400 uppercase">
                {project.status.replace("_", " ")}
              </span>
            </div>
            <p className="text-sm text-gray-300 max-w-3xl">{project.description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setShowTaskModal(true)}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 transition shadow-lg shadow-blue-600/20"
            >
              + Create Task
            </button>
            <button
              onClick={() => setShowIssueModal(true)}
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition"
            >
              + Report Issue
            </button>
            {isOwnerOrAdmin && (
              <button
                onClick={() => setShowMemberModal(true)}
                className="rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-xs font-semibold text-gray-300 hover:bg-gray-700 transition"
              >
                + Invite Member
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pt-4 border-t border-gray-800/80">
          {[
            { id: "overview", label: "Overview", icon: "📊" },
            { id: "tasks", label: `Tasks (${project.tasks.length})`, icon: "📋" },
            { id: "issues", label: `Issues (${project.issues.length})`, icon: "🐛" },
            { id: "team", label: `Team (${project.members.length})`, icon: "👥" },
            { id: "activity", label: "Activity", icon: "⚡" },
            { id: "analytics", label: "Analytics", icon: "📈" },
            { id: "git", label: "Git", icon: "🐙" },
            { id: "settings", label: "Settings", icon: "⚙️" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "bg-gray-900/60 text-gray-400 border border-gray-800/80 hover:text-white hover:bg-gray-800"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 space-y-4">
              <h3 className="text-lg font-bold text-white">Project Scope & Tech Stack</h3>
              {project.techStack.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {project.techStack.map((tech, idx) => (
                    <span
                      key={idx}
                      className="rounded-lg bg-gray-800/80 px-3 py-1 text-xs font-medium text-gray-300 border border-gray-700/50"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 space-y-4">
              <h3 className="text-lg font-bold text-white">Progress Timeline</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold text-gray-400">
                  <span>Task Completion Rate</span>
                  <span className="text-white">{project.progress}%</span>
                </div>
                <div className="h-3 w-full rounded-full bg-gray-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 space-y-4">
              <h3 className="text-lg font-bold text-white">Project Info</h3>
              <div className="space-y-3 text-xs text-gray-400">
                <div className="flex justify-between py-1 border-b border-gray-800">
                  <span>Owner</span>
                  <span className="text-white font-medium">{project.owner.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-800">
                  <span>Visibility</span>
                  <span className="text-white font-medium">{project.visibility}</span>
                </div>
                {project.startDate && (
                  <div className="flex justify-between py-1 border-b border-gray-800">
                    <span>Start Date</span>
                    <span className="text-white font-medium">{new Date(project.startDate).toLocaleDateString()}</span>
                  </div>
                )}
                {project.targetDate && (
                  <div className="flex justify-between py-1 border-b border-gray-800">
                    <span>Target Date</span>
                    <span className="text-white font-medium">{new Date(project.targetDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TASKS */}
      {activeTab === "tasks" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as const).map((column) => {
              const columnTasks = project.tasks.filter((t) => t.status === column);
              return (
                <div key={column} className="rounded-2xl border border-gray-800 bg-gray-900/80 p-4 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">{column.replace("_", " ")}</h3>
                    <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">{columnTasks.length}</span>
                  </div>
                  <div className="space-y-3">
                    {columnTasks.map((task) => (
                      <div key={task.id} className="rounded-xl border border-gray-800 bg-gray-950 p-4 space-y-3">
                        <p className="text-sm font-semibold text-white">{task.title}</p>
                        <select
                          value={task.status}
                          onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value as any)}
                          className="w-full rounded-lg border border-gray-800 bg-gray-900 px-2.5 py-1 text-xs text-gray-300"
                        >
                          <option value="TODO">TODO</option>
                          <option value="IN_PROGRESS">IN PROGRESS</option>
                          <option value="IN_REVIEW">IN REVIEW</option>
                          <option value="DONE">DONE</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: ISSUES */}
      {activeTab === "issues" && (
        <div className="space-y-4">
          {project.issues.map((issue) => (
            <div key={issue.id} className="rounded-2xl border border-gray-800 bg-gray-900/80 p-5 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-base font-bold text-white">{issue.title}</h4>
                  <p className="text-xs text-gray-400 mt-1">{issue.description}</p>
                </div>
                <span className="rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-0.5 text-xs text-rose-400">
                  {issue.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 4: TEAM */}
      {activeTab === "team" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {project.members.map((m) => (
            <div key={m.id} className="rounded-2xl border border-gray-800 bg-gray-900/80 p-5 space-y-2">
              <p className="font-bold text-white text-sm">{m.user.name}</p>
              <p className="text-xs text-gray-500">{m.user.email}</p>
              <span className="inline-block rounded-full bg-blue-500/10 text-blue-400 px-2.5 py-0.5 text-xs font-semibold border border-blue-500/20">
                {m.role}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* TAB 5: ACTIVITY */}
      {activeTab === "activity" && (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 space-y-4">
          {project.activities.map((a) => (
            <div key={a.id} className="flex gap-3 text-xs text-gray-300 border-b border-gray-800/60 pb-3">
              <span className="font-bold text-white">{a.user.name}</span>
              <span>{a.action}</span>
              <span className="text-gray-500 ml-auto">{new Date(a.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* TAB 6: ANALYTICS */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
              <p className="text-xs font-semibold uppercase text-gray-400">Task Completion</p>
              <p className="text-2xl font-black text-white mt-1">{completedTasks} / {totalTasks}</p>
            </div>
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
              <p className="text-xs font-semibold uppercase text-gray-400">Completion %</p>
              <p className="text-2xl font-black text-blue-400 mt-1">{project.progress}%</p>
            </div>
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
              <p className="text-xs font-semibold uppercase text-gray-400">Issue Resolution</p>
              <p className="text-2xl font-black text-white mt-1">{resolvedIssues} / {totalIssues}</p>
            </div>
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
              <p className="text-xs font-semibold uppercase text-gray-400">Team Size</p>
              <p className="text-2xl font-black text-purple-400 mt-1">{project.members.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Task Priority Distribution */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Task Priority Breakdown</h3>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between text-gray-400 mb-1">
                    <span>Critical / Urgent</span>
                    <span className="text-red-400 font-bold">{priorityCounts.CRITICAL}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-800 overflow-hidden">
                    <div className="h-full bg-red-500" style={{ width: `${totalTasks > 0 ? (priorityCounts.CRITICAL / totalTasks) * 100 : 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-gray-400 mb-1">
                    <span>High Priority</span>
                    <span className="text-amber-400 font-bold">{priorityCounts.HIGH}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-800 overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${totalTasks > 0 ? (priorityCounts.HIGH / totalTasks) * 100 : 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-gray-400 mb-1">
                    <span>Medium Priority</span>
                    <span className="text-blue-400 font-bold">{priorityCounts.MEDIUM}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-800 overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${totalTasks > 0 ? (priorityCounts.MEDIUM / totalTasks) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Issue Status Breakdown */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Issue Status Distribution</h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-400">Open Issues</span>
                  <span className="text-rose-400 font-bold">{project.issues.filter((i) => i.status === "OPEN").length}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-400">In Progress Issues</span>
                  <span className="text-amber-400 font-bold">{project.issues.filter((i) => i.status === "IN_PROGRESS").length}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-400">Resolved / Closed Issues</span>
                  <span className="text-emerald-400 font-bold">{resolvedIssues}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: GIT */}
      {activeTab === "git" && (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 space-y-4 max-w-xl">
          <h3 className="text-lg font-bold text-white">GitHub Integration</h3>
          <p className="text-xs text-gray-400">Linked Repository: {project.githubOwner}/{project.githubRepository || "Not linked"}</p>
        </div>
      )}

      {/* TAB 8: SETTINGS & EDIT */}
      {activeTab === "settings" && (
        <div className="space-y-6 max-w-2xl">
          {!isOwnerOrAdmin && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs font-semibold text-amber-400">
              ⚠️ Only project owners and admins can modify project settings or delete this project.
            </div>
          )}

          <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-white">Project Details & Settings</h3>
              <p className="text-xs text-gray-400">Update project configuration, lifecycle phase, and dates.</p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  disabled={!isOwnerOrAdmin}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Description</label>
                <textarea
                  required
                  rows={3}
                  disabled={!isOwnerOrAdmin}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500 disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Category</label>
                  <select
                    disabled={!isOwnerOrAdmin}
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-white outline-none disabled:opacity-50"
                  >
                    <option value="Web Development">Web Development</option>
                    <option value="Mobile App">Mobile App</option>
                    <option value="AI / ML">AI / ML</option>
                    <option value="DevOps Infrastructure">DevOps Infrastructure</option>
                    <option value="Open Source">Open Source</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Status</label>
                  <select
                    disabled={!isOwnerOrAdmin}
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-white outline-none disabled:opacity-50"
                  >
                    <option value="PLANNING">PLANNING</option>
                    <option value="IN_PROGRESS">IN PROGRESS (ACTIVE)</option>
                    <option value="BUILDING">BUILDING</option>
                    <option value="IN_REVIEW">IN REVIEW (ON HOLD)</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="LIVE">LIVE</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    disabled={!isOwnerOrAdmin}
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-2 text-sm text-white outline-none disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Target Date</label>
                  <input
                    type="date"
                    disabled={!isOwnerOrAdmin}
                    value={editTargetDate}
                    onChange={(e) => setEditTargetDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-2 text-sm text-white outline-none disabled:opacity-50"
                  />
                </div>
              </div>

              {isOwnerOrAdmin && (
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    {savingSettings ? "Saving..." : "Save Settings"}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Danger Zone */}
          {isOwnerOrAdmin && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 space-y-4">
              <h3 className="text-lg font-bold text-red-400">Danger Zone</h3>
              <p className="text-xs text-gray-400">Permanently delete this project and all associated tasks.</p>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="rounded-xl bg-red-600 px-5 py-2 text-xs font-semibold text-white hover:bg-red-500"
              >
                Delete Project
              </button>
            </div>
          )}
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-gray-900 p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-red-400">Confirm Project Deletion</h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              This action cannot be undone. To permanently delete <span className="font-bold text-white">{project.name}</span>, please type <span className="font-mono text-red-400 font-bold">DELETE</span> below.
            </p>
            <input
              type="text"
              placeholder="Type DELETE to confirm"
              value={deleteConfirmInput}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-2 text-sm text-white outline-none focus:border-red-500"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmInput(""); }}
                className="rounded-xl border border-gray-700 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={deleting || deleteConfirmInput !== "DELETE"}
                className="rounded-xl bg-red-600 px-5 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE TASK MODAL */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Create New Task</h3>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Task title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"
              />
              <textarea
                placeholder="Description"
                rows={3}
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"
              />
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="rounded-xl border border-gray-700 px-4 py-2 text-xs font-semibold text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-500"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE ISSUE MODAL */}
      {showIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Report New Issue</h3>
            <form onSubmit={handleCreateIssue} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Issue title"
                value={issueTitle}
                onChange={(e) => setIssueTitle(e.target.value)}
                className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"
              />
              <textarea
                placeholder="Description"
                rows={3}
                value={issueDesc}
                onChange={(e) => setIssueDesc(e.target.value)}
                className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"
              />
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="rounded-xl border border-gray-700 px-4 py-2 text-xs font-semibold text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-semibold text-white hover:bg-rose-500"
                >
                  Report Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVITE MEMBER MODAL */}
      {showMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Invite Team Member</h3>
            <form onSubmit={handleAddMember} className="space-y-4">
              <input
                type="email"
                required
                placeholder="User email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"
              />
              <select
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value as any)}
                className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-white outline-none"
              >
                <option value="ADMIN">ADMIN</option>
                <option value="DEVELOPER">DEVELOPER</option>
                <option value="DESIGNER">DESIGNER</option>
                <option value="VIEWER">VIEWER</option>
              </select>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  className="rounded-xl border border-gray-700 px-4 py-2 text-xs font-semibold text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-500"
                >
                  Invite Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
