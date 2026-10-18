"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

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
}

export default function ProjectsDirectoryPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  const loadProjects = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/api/projects");
      if (res.success) {
        setProjects(res.data);
      }
    } catch (err) {
      console.error("Failed to load projects:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === "ALL" || p.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

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

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white">My Projects</h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage your workspace projects, tasks, issues, and deployments.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
        >
          + New Project
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects by name or description..."
          className="w-full md:w-80 rounded-xl border border-gray-800 bg-gray-900 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"
        />

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          {["ALL", "PLANNING", "IN_PROGRESS", "BUILDING", "COMPLETED", "LIVE"].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-wider transition shrink-0 ${
                filterStatus === st
                  ? "bg-blue-600 text-white"
                  : "bg-gray-900 text-gray-400 border border-gray-800 hover:text-white"
              }`}
            >
              {st.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-gray-900 border border-gray-800 animate-pulse" />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-800 bg-gray-900/50 p-12 text-center space-y-3">
          <p className="text-gray-400 text-base">No matching projects found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 space-y-5 flex flex-col justify-between hover:border-gray-700 transition"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <Link
                    href={`/dashboard/projects/${project.id}`}
                    className="text-xl font-bold text-white hover:text-blue-400 transition"
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

                <p className="text-sm text-gray-400 line-clamp-2">
                  {project.description}
                </p>

                <div className="flex flex-wrap gap-2">
                  {project.techStack.map((tech, idx) => (
                    <span
                      key={idx}
                      className="rounded-lg bg-gray-800 px-2.5 py-1 text-xs text-gray-300 border border-gray-700/50"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-800/80">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-gray-400">
                    <span>Task Completion</span>
                    <span className="text-white">{project.progress}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>📋 {project.taskCount} tasks</span>
                    <span>🐛 {project.issueCount} issues</span>
                  </div>

                  <Link
                    href={`/dashboard/projects/${project.id}`}
                    className="rounded-xl bg-blue-600/10 border border-blue-500/20 px-4 py-2 text-xs font-semibold text-blue-400 hover:bg-blue-600/20 transition"
                  >
                    Manage Workspace →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
