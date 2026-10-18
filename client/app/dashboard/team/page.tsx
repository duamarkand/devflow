"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

interface Member {
  id: string;
  role: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    githubUsername?: string;
  };
  projectId: string;
  projectName: string;
}

interface Project {
  id: string;
  name: string;
  slug: string;
}

const ROLE_META: Record<string, { color: string; bg: string }> = {
  OWNER:     { color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20" },
  ADMIN:     { color: "text-purple-400",  bg: "bg-purple-500/10 border-purple-500/20" },
  DEVELOPER: { color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20" },
  VIEWER:    { color: "text-gray-400",    bg: "bg-gray-800/80 border-gray-700" },
};

function getRoleMeta(role: string) {
  return ROLE_META[role] ?? ROLE_META.VIEWER;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const loadTeam = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all projects the user is part of
      const projRes = await apiFetch("/api/projects");
      const allProjects: Project[] = projRes.data ?? [];
      setProjects(allProjects);

      // Fetch members for each project
      const memberFetches = allProjects.map((p) =>
        apiFetch(`/api/projects/${p.id}/members`)
          .then((res) =>
            (res.data ?? []).map((m: Omit<Member, "projectId" | "projectName">) => ({
              ...m,
              projectId: p.id,
              projectName: p.name,
            }))
          )
          .catch(() => [] as Member[])
      );

      const results = await Promise.all(memberFetches);
      const allMembers = results.flat() as Member[];
      setMembers(allMembers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch team data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTeam(); }, []);

  const filtered = members.filter((m) => {
    const matchProject = selectedProject === "ALL" || m.projectId === selectedProject;
    const matchSearch =
      search === "" ||
      m.user.name.toLowerCase().includes(search.toLowerCase()) ||
      m.user.email.toLowerCase().includes(search.toLowerCase()) ||
      m.projectName.toLowerCase().includes(search.toLowerCase());
    return matchProject && matchSearch;
  });

  // Unique member count across all projects
  const uniqueUserIds = new Set(members.map((m) => m.user.id));

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-800">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Team</h1>
          <p className="mt-1 text-gray-400 text-sm">
            All members across your projects.
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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Total Members</p>
          <p className="text-2xl font-black text-white">{uniqueUserIds.size}</p>
        </div>
        <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Projects</p>
          <p className="text-2xl font-black text-white">{projects.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Memberships</p>
          <p className="text-2xl font-black text-white">{members.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by name, email or project..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-xl border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500 placeholder-gray-500"
        />
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"
        >
          <option value="ALL">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-gray-900 border border-gray-800 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center">
          <p className="text-red-400 font-semibold">⚠️ {error}</p>
          <button onClick={loadTeam} className="mt-4 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500 transition">
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-800 bg-gray-900/50 p-14 text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10 text-3xl">👥</div>
          <h3 className="text-lg font-bold text-white">
            {members.length === 0 ? "No team members yet" : "No members match your filters"}
          </h3>
          <p className="text-sm text-gray-400">
            {members.length === 0
              ? "Invite members to your projects to see them here."
              : "Try adjusting your search or filter."}
          </p>
          {members.length > 0 && (
            <button onClick={() => { setSelectedProject("ALL"); setSearch(""); }}
              className="text-sm text-blue-400 hover:underline">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((member) => {
            const rm = getRoleMeta(member.role);
            return (
              <div key={`${member.projectId}-${member.user.id}`}
                className="rounded-2xl border border-gray-800 bg-gray-900/80 p-5 hover:border-gray-700 hover:bg-gray-900 transition space-y-3"
              >
                <div className="flex items-center gap-3">
                  {member.user.avatar ? (
                    <img src={member.user.avatar} alt={member.user.name}
                      className="h-10 w-10 rounded-full object-cover border border-gray-700" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {getInitials(member.user.name)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-white text-sm truncate">{member.user.name}</p>
                    <p className="text-xs text-gray-500 truncate">{member.user.email}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${rm.bg} ${rm.color}`}>
                    {member.role}
                  </span>
                  {member.user.githubUsername && (
                    <a href={`https://github.com/${member.user.githubUsername}`} target="_blank" rel="noreferrer"
                      className="text-xs text-gray-400 hover:text-white transition">
                      @{member.user.githubUsername}
                    </a>
                  )}
                </div>

                <div className="pt-2 border-t border-gray-800">
                  <Link href={`/dashboard/projects/${member.projectId}`}
                    className="text-xs text-blue-400 hover:underline font-medium">
                    📁 {member.projectName}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
