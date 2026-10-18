"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/Toast";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  dueDate?: string;
  createdAt: string;
  project: { id: string; name: string; slug: string };
  assignee?: { id: string; name: string; avatar?: string };
  creator: { id: string; name: string };
}

const STATUS_META: Record<Task["status"], { label: string; color: string; bg: string; dot: string }> = {
  TODO: { label: "To Do", color: "text-gray-400", bg: "bg-gray-800/80 border-gray-700", dot: "bg-gray-500" },
  IN_PROGRESS: { label: "In Progress", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", dot: "bg-amber-400" },
  IN_REVIEW: { label: "In Review", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20", dot: "bg-purple-400" },
  DONE: { label: "Done", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", dot: "bg-emerald-400" },
};

const PRIORITY_META: Record<Task["priority"], { label: string; color: string }> = {
  LOW: { label: "Low", color: "text-gray-400" },
  MEDIUM: { label: "Medium", color: "text-blue-400" },
  HIGH: { label: "High", color: "text-amber-400" },
  CRITICAL: { label: "Critical", color: "text-red-400" },
};

const ALL_STATUSES: Task["status"][] = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

export default function TasksPage() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<Task["status"] | "ALL">("ALL");
  const [filterPriority, setFilterPriority] = useState<Task["priority"] | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch("/api/tasks/my-tasks");
      setTasks(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const handleStatusChange = async (taskId: string, newStatus: Task["status"]) => {
    setUpdatingId(taskId);
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await apiFetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      toast(`Task status updated to ${STATUS_META[newStatus].label}`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to update task status", "error");
      loadTasks(); // Rollback on error
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = tasks.filter((t) => {
    const matchStatus = filterStatus === "ALL" || t.status === filterStatus;
    const matchPriority = filterPriority === "ALL" || t.priority === filterPriority;
    const matchSearch =
      search === "" ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.project.name.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchPriority && matchSearch;
  });

  const counts = ALL_STATUSES.reduce((acc, s) => {
    acc[s] = tasks.filter((t) => t.status === s).length;
    return acc;
  }, {} as Record<Task["status"], number>);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-800">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">My Tasks</h1>
          <p className="mt-1 text-gray-400 text-sm">
            All tasks assigned to or created by you across every project.
          </p>
        </div>
        <Link
          href="/dashboard/projects"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm font-semibold text-gray-300 hover:bg-gray-800 transition"
        >
          📁 Go to Projects
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {ALL_STATUSES.map((s) => {
          const meta = STATUS_META[s];
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(filterStatus === s ? "ALL" : s)}
              className={`rounded-2xl border p-4 text-left transition hover:scale-[1.02] ${
                filterStatus === s
                  ? meta.bg + " ring-2 ring-offset-1 ring-offset-gray-950 ring-blue-500"
                  : "border-gray-800 bg-gray-900/80 hover:border-gray-700"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                <span className={`text-xs font-semibold uppercase tracking-wider ${meta.color}`}>
                  {meta.label}
                </span>
              </div>
              <p className="text-2xl font-black text-white">{counts[s]}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search tasks or projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-xl border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500 placeholder-gray-500"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as Task["status"] | "ALL")}
          className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"
        >
          <option value="ALL">All Statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value as Task["priority"] | "ALL")}
          className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"
        >
          <option value="ALL">All Priorities</option>
          <option value="CRITICAL">🔴 Critical</option>
          <option value="HIGH">🟠 High</option>
          <option value="MEDIUM">🔵 Medium</option>
          <option value="LOW">⚪ Low</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-gray-900 border border-gray-800 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center">
          <p className="text-red-400 font-semibold">⚠️ {error}</p>
          <button
            onClick={loadTasks}
            className="mt-4 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500 transition"
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-800 bg-gray-900/50 p-14 text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-3xl">
            📋
          </div>
          <h3 className="text-lg font-bold text-white">
            {tasks.length === 0 ? "No tasks yet" : "No tasks match your filters"}
          </h3>
          <p className="text-sm text-gray-400 max-w-sm mx-auto">
            {tasks.length === 0
              ? "Tasks assigned to you or created by you will appear here."
              : "Try adjusting your search or filter criteria."}
          </p>
          {tasks.length > 0 && (
            <button
              onClick={() => { setFilterStatus("ALL"); setFilterPriority("ALL"); setSearch(""); }}
              className="mt-2 text-sm text-blue-400 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((task) => {
            const sm = STATUS_META[task.status];
            const pm = PRIORITY_META[task.priority];
            const isOverdue =
              task.dueDate &&
              task.status !== "DONE" &&
              new Date(task.dueDate) < new Date();

            return (
              <div
                key={task.id}
                className="group rounded-2xl border border-gray-800 bg-gray-900/80 p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-gray-700 hover:bg-gray-900 transition"
              >
                {/* Status indicator */}
                <span className={`hidden sm:block h-2.5 w-2.5 rounded-full shrink-0 ${sm.dot}`} />

                {/* Task info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-semibold text-white text-sm leading-snug">
                      {task.title}
                    </span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${sm.bg} ${sm.color}`}
                    >
                      {sm.label}
                    </span>
                    <span className={`text-xs font-medium ${pm.color}`}>
                      {pm.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <Link
                      href={`/dashboard/projects/${task.project.id}`}
                      className="text-blue-400 hover:underline font-medium"
                    >
                      📁 {task.project.name}
                    </Link>
                    {task.assignee && (
                      <span>👤 {task.assignee.name}</span>
                    )}
                    {task.dueDate && (
                      <span className={isOverdue ? "text-red-400 font-semibold" : ""}>
                        📅 {isOverdue ? "Overdue · " : ""}
                        {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status changer */}
                <select
                  value={task.status}
                  disabled={updatingId === task.id}
                  onChange={(e) =>
                    handleStatusChange(task.id, e.target.value as Task["status"])
                  }
                  className="rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-xs font-semibold text-white outline-none focus:border-blue-500 disabled:opacity-50 shrink-0"
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_META[s].label}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
