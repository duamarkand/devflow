"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

interface ShowcaseProject {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  techStack: string[];
  status: string;
  progress: number;
  githubUrl?: string;
  liveUrl?: string;
  taskCount: number;
  updatedAt: string;
  owner: { id: string; name: string; avatar?: string; githubUsername?: string };
  members: Array<{ user: { id: string; name: string; avatar?: string } }>;
}

export default function ShowcasePage() {
  const [projects, setProjects] = useState<ShowcaseProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  const loadShowcase = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch("/api/showcase");
      setProjects(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch showcase projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShowcase();
  }, []);

  const categories = Array.from(new Set(projects.map((p) => p.category).filter(Boolean)));

  const filtered = projects.filter((p) => {
    const matchCategory = selectedCategory === "ALL" || p.category === selectedCategory;
    const matchSearch =
      search === "" ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      p.techStack.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    return matchCategory && matchSearch;
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-800">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <span>Project Showcase</span>
            <span className="text-2xl">🚀</span>
          </h1>
          <p className="mt-1 text-gray-400 text-sm">
            Discover public projects built by the DevFlow community.
          </p>
        </div>

        <Link
          href="/dashboard/projects"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition shadow-lg shadow-blue-600/20 shrink-0"
        >
          + Submit Project
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by project name, description or tech stack..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-xl border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500 placeholder-gray-500"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"
        >
          <option value="ALL">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-gray-900 border border-gray-800 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center">
          <p className="text-red-400 font-semibold">⚠️ {error}</p>
          <button
            onClick={loadShowcase}
            className="mt-4 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500 transition"
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-800 bg-gray-900/50 p-14 text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 text-3xl">
            🚀
          </div>
          <h3 className="text-lg font-bold text-white">
            {projects.length === 0 ? "No public projects showcased yet" : "No projects match your filter"}
          </h3>
          <p className="text-sm text-gray-400 max-w-sm mx-auto">
            {projects.length === 0
              ? "Set your project visibility to PUBLIC in Project Settings to showcase it here."
              : "Try adjusting your search query or category filter."}
          </p>
          {projects.length > 0 && (
            <button
              onClick={() => {
                setSelectedCategory("ALL");
                setSearch("");
              }}
              className="text-sm text-blue-400 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((project) => (
            <div
              key={project.id}
              className="group rounded-2xl border border-gray-800 bg-gray-900/80 p-6 flex flex-col justify-between hover:border-gray-700 hover:bg-gray-900 transition duration-200"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-mono uppercase text-blue-400 tracking-wider">
                      {project.category}
                    </span>
                    <h2 className="text-xl font-bold text-white mt-1 group-hover:text-blue-400 transition">
                      <Link href={`/dashboard/showcase/${project.slug || project.id}`}>
                        {project.name}
                      </Link>
                    </h2>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider shrink-0 ${getStatusBadge(
                      project.status
                    )}`}
                  >
                    {project.status.replace("_", " ")}
                  </span>
                </div>

                <p className="text-sm text-gray-400 line-clamp-3 leading-relaxed">
                  {project.description}
                </p>

                {/* Tech Stack */}
                {project.techStack.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {project.techStack.map((tech, idx) => (
                      <span
                        key={idx}
                        className="rounded-lg bg-gray-800/80 px-2 py-0.5 text-xs font-medium text-gray-300 border border-gray-700/50"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-5 mt-5 border-t border-gray-800/80">
                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-gray-400">
                    <span>Completion</span>
                    <span className="text-white">{project.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>

                {/* Owner & Action links */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-gray-400">
                    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">
                      {project.owner.name[0]?.toUpperCase()}
                    </div>
                    <span className="truncate max-w-[100px]">{project.owner.name}</span>
                  </div>

                  <Link
                    href={`/dashboard/showcase/${project.slug || project.id}`}
                    className="rounded-xl bg-gray-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-700 transition"
                  >
                    View Project →
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
