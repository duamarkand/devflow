"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

interface ShowcaseDetail {
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
  createdAt: string;
  updatedAt: string;
  owner: { id: string; name: string; avatar?: string; githubUsername?: string; email: string };
  members: Array<{ user: { id: string; name: string; avatar?: string; githubUsername?: string } }>;
  tasks: Array<{ id: string; title: string; status: string; priority: string }>;
  issues: Array<{ id: string; title: string; status: string; priority: string }>;
  activities: Array<{
    id: string;
    action: string;
    createdAt: string;
    user: { id: string; name: string; avatar?: string };
  }>;
}

export default function ShowcaseDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [project, setProject] = useState<ShowcaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await apiFetch(`/api/showcase/${slug}`);
        if (res.success) {
          setProject(res.data);
        } else {
          setError(res.message || "Failed to load public project");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Project not found or private");
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-gray-900 rounded-xl animate-pulse" />
        <div className="h-64 bg-gray-900 rounded-2xl border border-gray-800 animate-pulse" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 text-center py-16">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-3xl">
          🔒
        </div>
        <h2 className="text-2xl font-bold text-white">Public Project Not Found</h2>
        <p className="text-gray-400 max-w-md mx-auto text-sm">
          {error || "This project is either private or does not exist."}
        </p>
        <Link
          href="/dashboard/showcase"
          className="inline-flex items-center gap-2 rounded-xl bg-gray-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 transition"
        >
          ← Back to Showcase
        </Link>
      </div>
    );
  }

  const completedTasks = project.tasks.filter((t) => t.status === "DONE").length;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Back button */}
      <div>
        <Link
          href="/dashboard/showcase"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-white transition"
        >
          ← Back to Showcase
        </Link>
      </div>

      {/* Hero Header */}
      <div className="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900 via-gray-900 to-blue-950/40 p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono uppercase text-blue-400 tracking-wider">
                {project.category}
              </span>
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-0.5 text-xs font-semibold text-emerald-400 uppercase">
                {project.status.replace("_", " ")}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              {project.name}
            </h1>
            <p className="text-gray-300 text-base leading-relaxed max-w-2xl">
              {project.description}
            </p>
          </div>

          {/* Action Links */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {project.githubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-xs font-semibold text-white hover:bg-gray-700 transition flex items-center gap-2"
              >
                <span>GitHub Repository</span>
                <span>↗</span>
              </a>
            )}
            {project.liveUrl && (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 transition shadow-lg shadow-blue-600/30 flex items-center gap-2"
              >
                <span>Live Demo</span>
                <span>↗</span>
              </a>
            )}
          </div>
        </div>

        {/* Tech Stack */}
        {project.techStack.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {project.techStack.map((tech, idx) => (
              <span
                key={idx}
                className="rounded-lg bg-gray-800/90 px-3 py-1 text-xs font-medium text-gray-200 border border-gray-700/60"
              >
                {tech}
              </span>
            ))}
          </div>
        )}

        {/* Owner Info */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-800/80 text-sm text-gray-400">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
            {project.owner.name[0]?.toUpperCase()}
          </div>
          <div>
            <span className="text-white font-medium">{project.owner.name}</span>
            <span className="mx-2">•</span>
            <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 space-y-1">
          <p className="text-xs font-semibold uppercase text-gray-400">Completion</p>
          <p className="text-2xl font-black text-white">{project.progress}%</p>
        </div>
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 space-y-1">
          <p className="text-xs font-semibold uppercase text-gray-400">Tasks Done</p>
          <p className="text-2xl font-black text-white">
            {completedTasks} / {project.tasks.length}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 space-y-1">
          <p className="text-xs font-semibold uppercase text-gray-400">Open Issues</p>
          <p className="text-2xl font-black text-white">{project.issues.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 space-y-1">
          <p className="text-xs font-semibold uppercase text-gray-400">Team Contributors</p>
          <p className="text-2xl font-black text-white">{project.members.length + 1}</p>
        </div>
      </div>

      {/* Main Grid: Tasks & Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Public Tasks */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Tasks</span>
            <span className="rounded-full bg-gray-800 px-2.5 py-0.5 text-xs text-gray-400 font-semibold">
              {project.tasks.length}
            </span>
          </h2>
          {project.tasks.length === 0 ? (
            <p className="text-sm text-gray-500">No public tasks created yet.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {project.tasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-xl border border-gray-800 bg-gray-950 p-3 flex items-center justify-between text-xs"
                >
                  <span className="font-medium text-gray-200 truncate max-w-[240px]">
                    {task.title}
                  </span>
                  <span
                    className={`rounded-md px-2 py-0.5 font-semibold text-[10px] uppercase ${
                      task.status === "DONE"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-gray-800 text-gray-400"
                    }`}
                  >
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 space-y-4">
          <h2 className="text-lg font-bold text-white">Recent Activity</h2>
          {project.activities.length === 0 ? (
            <p className="text-sm text-gray-500">No recent activity recorded.</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {project.activities.map((act) => (
                <div key={act.id} className="text-xs space-y-1 border-b border-gray-800/60 pb-2.5 last:border-0">
                  <p className="text-gray-300">
                    <span className="font-semibold text-white">{act.user.name}</span> {act.action}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {new Date(act.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
