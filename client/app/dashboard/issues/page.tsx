"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

interface Issue {
  id: string;
  title: string;
  description?: string;
  status: "OPEN" | "IN_PROGRESS" | "IN_REVIEW" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  createdAt: string;
  project: { id: string; name: string; slug: string };
  assignee?: { id: string; name: string; avatar?: string };
  creator: { id: string; name: string };
  comments: { id: string }[];
}

const STATUS_META: Record<Issue["status"], { label: string; color: string; bg: string; dot: string }> = {
  OPEN:        { label: "Open",        color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", dot: "bg-emerald-400" },
  IN_PROGRESS: { label: "In Progress", color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20",   dot: "bg-amber-400" },
  IN_REVIEW:   { label: "In Review",   color: "text-purple-400",  bg: "bg-purple-500/10 border-purple-500/20",  dot: "bg-purple-400" },
  RESOLVED:    { label: "Resolved",    color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20",      dot: "bg-blue-400" },
  CLOSED:      { label: "Closed",      color: "text-gray-400",    bg: "bg-gray-800/80 border-gray-700",         dot: "bg-gray-500" },
};

const PRIORITY_META: Record<Issue["priority"], { label: string; color: string }> = {
  LOW:      { label: "Low",      color: "text-gray-400" },
  MEDIUM:   { label: "Medium",   color: "text-blue-400" },
  HIGH:     { label: "High",     color: "text-amber-400" },
  CRITICAL: { label: "Critical", color: "text-red-400" },
};

const ALL_STATUSES: Issue["status"][] = ["OPEN", "IN_PROGRESS", "IN_REVIEW", "RESOLVED", "CLOSED"];

export default function IssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<Issue["status"] | "ALL">("ALL");
  const [filterPriority, setFilterPriority] = useState<Issue["priority"] | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadIssues = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch("/api/issues/my-issues");
      setIssues(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch issues");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadIssues(); }, []);

  const handleStatusChange = async (issueId: string, newStatus: Issue["status"]) => {
    setUpdatingId(issueId);
    try {
      await apiFetch(`/api/issues/${issueId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setIssues((prev) =>
        prev.map((i) => (i.id === issueId ? { ...i, status: newStatus } : i))
      );
    } catch (err) {
      console.error("Failed to update issue status:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = issues.filter((i) => {
    const matchStatus = filterStatus === "ALL" || i.status === filterStatus;
    const matchPriority = filterPriority === "ALL" || i.priority === filterPriority;
    const matchSearch =
      search === "" ||
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      i.project.name.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchPriority && matchSearch;
  });

  const openCount = issues.filter((i) => i.status === "OPEN").length;
  const inProgressCount = issues.filter((i) => i.status === "IN_PROGRESS" || i.status === "IN_REVIEW").length;
  const closedCount = issues.filter((i) => i.status === "RESOLVED" || i.status === "CLOSED").length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-800">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">My Issues</h1>
          <p className="mt-1 text-gray-400 text-sm">
            All issues assigned to or created by you across every project.
          </p>
        </div>
        <Link
          href="/dashboard/projects"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm font-semibold text-gray-300 hover:bg-gray-800 transition"
        >
          📁 Go to Projects
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Open",        value: openCount,        dot: "bg-emerald-400", color: "text-emerald-400" },
          { label: "In Progress", value: inProgressCount,  dot: "bg-amber-400",   color: "text-amber-400" },
          { label: "Resolved",    value: closedCount,      dot: "bg-blue-400",    color: "text-blue-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-gray-800 bg-gray-900/80 p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={`h-2 w-2 rounded-full ${s.dot}`} />
              <span className={`text-xs font-semibold uppercase tracking-wider ${s.color}`}>{s.label}</span>
            </div>
            <p className="text-2xl font-black text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search issues or projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-xl border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500 placeholder-gray-500"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as Issue["status"] | "ALL")}
          className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"
        >
          <option value="ALL">All Statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value as Issue["priority"] | "ALL")}
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
          <button onClick={loadIssues} className="mt-4 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500 transition">
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-800 bg-gray-900/50 p-14 text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-3xl">🐛</div>
          <h3 className="text-lg font-bold text-white">
            {issues.length === 0 ? "No issues yet" : "No issues match your filters"}
          </h3>
          <p className="text-sm text-gray-400">
            {issues.length === 0
              ? "Issues assigned to or created by you will appear here."
              : "Try adjusting your search or filter criteria."}
          </p>
          {issues.length > 0 && (
            <button onClick={() => { setFilterStatus("ALL"); setFilterPriority("ALL"); setSearch(""); }}
              className="text-sm text-blue-400 hover:underline">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((issue) => {
            const sm = STATUS_META[issue.status];
            const pm = PRIORITY_META[issue.priority];
            return (
              <div key={issue.id}
                className="group rounded-2xl border border-gray-800 bg-gray-900/80 p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-gray-700 hover:bg-gray-900 transition"
              >
                <span className={`hidden sm:block h-2.5 w-2.5 rounded-full shrink-0 ${sm.dot}`} />

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-semibold text-white text-sm">{issue.title}</span>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${sm.bg} ${sm.color}`}>
                      {sm.label}
                    </span>
                    <span className={`text-xs font-medium ${pm.color}`}>{pm.label}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <Link href={`/dashboard/projects/${issue.project.id}`}
                      className="text-blue-400 hover:underline font-medium">
                      📁 {issue.project.name}
                    </Link>
                    {issue.assignee && <span>👤 {issue.assignee.name}</span>}
                    {issue.comments.length > 0 && <span>💬 {issue.comments.length} comments</span>}
                    <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <select
                  value={issue.status}
                  disabled={updatingId === issue.id}
                  onChange={(e) => handleStatusChange(issue.id, e.target.value as Issue["status"])}
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
