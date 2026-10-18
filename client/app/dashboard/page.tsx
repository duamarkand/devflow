"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, getStoredUser, UserSession } from "@/lib/api";

interface Project {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  techStack: string[];
  visibility: string;
  status: string;
  progress: number;
  githubUrl?: string;
  liveUrl?: string;
  taskCount: number;
  issueCount: number;
  updatedAt: string;
  owner: { name: string; email: string };
  members: Array<{ user: { name: string; avatar?: string } }>;
}

interface Stats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalMembers: number;
  openTasks: number;
  pendingTasks: number;
  completedTasks: number;
  openIssues: number;
  overallProgress: number;
}

interface Activity {
  id: string;
  action: string;
  details?: string;
  createdAt: string;
  user: { name: string };
  project?: { name: string; slug: string };
}

interface Task {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  dueDate?: string;
  createdAt: string;
  project: { id: string; name: string };
}

interface Issue {
  id: string;
  title: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  createdAt: string;
  project: { id: string; name: string };
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Project Modal State
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Web Development");
  const [techStack, setTechStack] = useState("Next.js, TypeScript, Express, PostgreSQL");
  const [visibility, setVisibility] = useState("PUBLIC");
  const [githubUrl, setGithubUrl] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch projects & stats
      const projectRes = await apiFetch("/api/projects");
      if (projectRes.success) {
        setStats(projectRes.stats);
        setProjects(projectRes.data ?? []);
      }

      // Fetch recent activity
      const activityRes = await apiFetch("/api/activity");
      if (activityRes.success) {
        setActivities(activityRes.data?.slice(0, 6) ?? []);
      }

      // Fetch tasks
      const taskRes = await apiFetch("/api/tasks/my-tasks");
      if (taskRes.success) {
        setTasks(taskRes.data ?? []);
      }

      // Fetch issues
      const issueRes = await apiFetch("/api/issues/my-issues");
      if (issueRes.success) {
        setIssues(issueRes.data ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setUser(getStoredUser());
    loadDashboardData();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    if (!name || !description) {
      setModalError("Please fill in project name and description.");
      return;
    }

    try {
      setCreating(true);
      const res = await apiFetch("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name,
          description,
          category,
          techStack: techStack.split(",").map((s) => s.trim()).filter(Boolean),
          visibility,
          githubUrl: githubUrl || undefined,
          liveUrl: liveUrl || undefined,
        }),
      });

      if (res.success) {
        setShowModal(false);
        setName("");
        setDescription("");
        loadDashboardData();
      }
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "LIVE":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "COMPLETED":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "BUILDING":
      case "IN_PROGRESS":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    }
  };

  // Filter deadlines, issues, completed tasks
  const upcomingDeadlines = tasks
    .filter((t) => t.status !== "DONE" && t.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5);

  const recentIssues = issues
    .filter((i) => i.status === "OPEN" || i.status === "IN_PROGRESS")
    .slice(0, 5);

  const completedTasksList = tasks
    .filter((t) => t.status === "DONE")
    .slice(0, 5);

  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-800">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Good day, {user?.name || "Developer"} 👋
          </h1>
          <p className="mt-2 text-gray-400 text-base">
            Here&apos;s a complete overview of your developer workspace.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition duration-150 shrink-0"
        >
          <span className="text-lg font-bold">+</span>
          <span>New Project</span>
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center space-y-3">
          <p className="text-red-400 font-semibold text-sm">⚠️ {error}</p>
          <button
            onClick={loadDashboardData}
            className="rounded-xl bg-red-600 px-5 py-2 text-xs font-semibold text-white hover:bg-red-500 transition"
          >
            Retry Loading Dashboard
          </button>
        </div>
      )}

      {/* Statistics Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-gray-900 border border-gray-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {[
            { label: "Total Projects", value: stats?.totalProjects ?? 0, icon: "📁", color: "from-blue-600/20 to-blue-500/5 text-blue-400" },
            { label: "Active Projects", value: stats?.activeProjects ?? 0, icon: "⚡", color: "from-amber-600/20 to-amber-500/5 text-amber-400" },
            { label: "Pending Tasks", value: stats?.pendingTasks ?? 0, icon: "📋", color: "from-indigo-600/20 to-indigo-500/5 text-indigo-400" },
            { label: "Completed Tasks", value: stats?.completedTasks ?? 0, icon: "✅", color: "from-emerald-600/20 to-emerald-500/5 text-emerald-400" },
            { label: "Open Issues", value: stats?.openIssues ?? 0, icon: "🐛", color: "from-rose-600/20 to-rose-500/5 text-rose-400" },
            { label: "Team Members", value: stats?.totalMembers ?? 1, icon: "👥", color: "from-purple-600/20 to-purple-500/5 text-purple-400" },
            { label: "Avg Progress", value: `${stats?.overallProgress ?? 0}%`, icon: "📈", color: "from-cyan-600/20 to-cyan-500/5 text-cyan-400" },
          ].map((card, idx) => (
            <div
              key={idx}
              className={`rounded-2xl border border-gray-800 bg-gradient-to-br ${card.color} p-4 space-y-1 backdrop-blur-sm`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 truncate">
                  {card.label}
                </span>
                <span className="text-base">{card.icon}</span>
              </div>
              <p className="text-2xl font-black text-white">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Progress Breakdown Bar */}
      {!loading && stats && (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Workspace Completion Rate</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {stats.completedTasks} of {stats.completedTasks + stats.pendingTasks} tasks completed across all projects
              </p>
            </div>
            <span className="text-xl font-black text-blue-400">{stats.overallProgress}%</span>
          </div>

          <div className="h-3 w-full rounded-full bg-gray-800 overflow-hidden flex">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
              style={{ width: `${stats.overallProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Grid: Projects & Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Projects Column (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>Recent Projects</span>
              <span className="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-400 font-semibold">
                {projects.length}
              </span>
            </h2>

            <Link
              href="/dashboard/projects"
              className="text-sm font-semibold text-blue-400 hover:underline"
            >
              View all →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-40 rounded-2xl bg-gray-900 border border-gray-800 animate-pulse" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            /* Empty State */
            <div className="rounded-2xl border border-dashed border-gray-800 bg-gray-900/50 p-12 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-3xl text-blue-400">
                📁
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">No projects yet</h3>
                <p className="mt-1 text-sm text-gray-400 max-w-sm mx-auto">
                  Create your first project to start tracking tasks, issues, team progress, and GitHub activity.
                </p>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition"
              >
                + Create Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {projects.slice(0, 4).map((project) => (
                <div
                  key={project.id}
                  className="group rounded-2xl border border-gray-800 bg-gray-900/80 p-6 space-y-5 transition duration-200 hover:border-gray-700 hover:bg-gray-900"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/dashboard/projects/${project.id}`}
                          className="text-xl font-bold text-white group-hover:text-blue-400 transition"
                        >
                          {project.name}
                        </Link>
                        <span
                          className={`rounded-full border px-3 py-0.5 text-xs font-semibold uppercase tracking-wider ${getStatusBadge(
                            project.status
                          )}`}
                        >
                          {project.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-400 line-clamp-2">
                        {project.description}
                      </p>
                    </div>

                    <span className="text-xs text-gray-500 uppercase tracking-wider font-mono">
                      {project.visibility}
                    </span>
                  </div>

                  {/* Tech Stack Tags */}
                  {project.techStack.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {project.techStack.map((tech, idx) => (
                        <span
                          key={idx}
                          className="rounded-lg bg-gray-800/80 px-2.5 py-1 text-xs font-medium text-gray-300 border border-gray-700/50"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-gray-400">
                      <span>Progress</span>
                      <span className="text-white">{project.progress}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="flex items-center justify-between pt-2 text-xs text-gray-400 border-t border-gray-800/80">
                    <div className="flex items-center gap-4">
                      <span>📋 {project.taskCount} tasks</span>
                      <span>🐛 {project.issueCount} issues</span>
                    </div>

                    <Link
                      href={`/dashboard/projects/${project.id}`}
                      className="rounded-lg bg-gray-800 px-3 py-1.5 font-medium text-white hover:bg-gray-700 transition"
                    >
                      Open Workspace →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Column: Deadlines & Activity (1 col) */}
        <div className="space-y-8">
          {/* Upcoming Deadlines */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center justify-between">
              <span>Upcoming Deadlines</span>
              <span className="text-xs text-gray-400">📅</span>
            </h2>

            <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-5 space-y-3">
              {upcomingDeadlines.length === 0 ? (
                <p className="text-xs text-gray-500">No pending task deadlines.</p>
              ) : (
                upcomingDeadlines.map((task) => {
                  const isOverdue = new Date(task.dueDate!) < new Date();
                  return (
                    <div key={task.id} className="rounded-xl border border-gray-800 bg-gray-950 p-3 space-y-1">
                      <p className="text-xs font-semibold text-white truncate">{task.title}</p>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-500">{task.project.name}</span>
                        <span className={isOverdue ? "text-red-400 font-bold" : "text-amber-400"}>
                          {isOverdue ? "Overdue " : "Due "}
                          {new Date(task.dueDate!).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Recently Created Issues */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center justify-between">
              <span>Recent Open Issues</span>
              <span className="text-xs text-gray-400">🐛</span>
            </h2>

            <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-5 space-y-3">
              {recentIssues.length === 0 ? (
                <p className="text-xs text-gray-500">No open issues reported.</p>
              ) : (
                recentIssues.map((issue) => (
                  <div key={issue.id} className="rounded-xl border border-gray-800 bg-gray-950 p-3 space-y-1">
                    <p className="text-xs font-semibold text-white truncate">{issue.title}</p>
                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                      <span>{issue.project.name}</span>
                      <span className="text-rose-400 font-semibold">{issue.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Recent Activity</h2>

            <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-5 space-y-4">
              {activities.length === 0 ? (
                <p className="text-xs text-gray-500">No activity recorded yet.</p>
              ) : (
                activities.map((act) => (
                  <div key={act.id} className="flex gap-3 text-xs">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold">
                      ⚡
                    </div>
                    <div className="min-w-0">
                      <p className="text-gray-300 leading-snug">
                        <span className="font-semibold text-white">{act.user.name}</span>{" "}
                        {act.action}
                        {act.project && (
                          <span className="text-blue-400 font-medium"> in {act.project.name}</span>
                        )}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {new Date(act.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* New Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-900 p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <h3 className="text-xl font-bold text-white">Create New Project</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. DevFlow Engine"
                  className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Description *
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your project vision and goals..."
                  className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                  >
                    <option value="Web Development">Web Development</option>
                    <option value="Mobile App">Mobile App</option>
                    <option value="AI / ML">AI / ML</option>
                    <option value="DevOps Infrastructure">DevOps Infrastructure</option>
                    <option value="Open Source">Open Source</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Visibility
                  </label>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value)}
                    className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                  >
                    <option value="PUBLIC">Public (Showcaseable)</option>
                    <option value="TEAM">Team Only</option>
                    <option value="PRIVATE">Private</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                  Tech Stack (comma separated)
                </label>
                <input
                  type="text"
                  value={techStack}
                  onChange={(e) => setTechStack(e.target.value)}
                  placeholder="Next.js, TypeScript, Express, PostgreSQL"
                  className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    GitHub URL (optional)
                  </label>
                  <input
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/org/repo"
                    className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Live URL (optional)
                  </label>
                  <input
                    type="url"
                    value={liveUrl}
                    onChange={(e) => setLiveUrl(e.target.value)}
                    placeholder="https://myproject.com"
                    className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-gray-700 px-5 py-2.5 text-sm font-semibold text-gray-300 hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}