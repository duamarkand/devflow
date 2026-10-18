"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

interface GitProject {
  id: string;
  name: string;
  slug: string;
  category: string;
  githubOwner?: string;
  githubRepository?: string;
  githubUrl?: string;
  deploymentStatus?: string;
  status: string;
  progress: number;
  updatedAt: string;
}

export default function GitIntegrationPage() {
  const [connected, setConnected] = useState(false);
  const [githubUsername, setGithubUsername] = useState<string | null>(null);
  const [projects, setProjects] = useState<GitProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Connect form state
  const [inputUsername, setInputUsername] = useState("");
  const [connecting, setConnecting] = useState(false);

  // Link repository modal state
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [githubOwner, setGithubOwner] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [linking, setLinking] = useState(false);

  // Publish release state
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [releaseTag, setReleaseTag] = useState("v1.0.0");
  const [commitMessage, setCommitMessage] = useState("Production build release");

  const loadGitData = async () => {
    try {
      setLoading(true);
      setError(null);

      const statusRes = await apiFetch("/api/git/status");
      if (statusRes.success) {
        setConnected(statusRes.data.connected);
        setGithubUsername(statusRes.data.githubUsername);
        if (statusRes.data.githubUsername) {
          setGithubOwner(statusRes.data.githubUsername);
        }
      }

      const projectsRes = await apiFetch("/api/git/projects");
      if (projectsRes.success) {
        setProjects(projectsRes.data ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Git integration data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGitData();
  }, []);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUsername.trim()) return;

    try {
      setConnecting(true);
      const res = await apiFetch("/api/git/connect", {
        method: "POST",
        body: JSON.stringify({ githubUsername: inputUsername.trim() }),
      });

      if (res.success) {
        setConnected(true);
        setGithubUsername(inputUsername.trim());
        setGithubOwner(inputUsername.trim());
        setInputUsername("");
        loadGitData();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to connect GitHub account");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect your GitHub account from DevFlow?")) return;
    try {
      await apiFetch("/api/git/disconnect", { method: "POST" });
      setConnected(false);
      setGithubUsername(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to disconnect account");
    }
  };

  const handleLinkRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !githubOwner || !githubRepo) return;

    try {
      setLinking(true);
      const res = await apiFetch(`/api/projects/${selectedProjectId}/git/link`, {
        method: "POST",
        body: JSON.stringify({ githubOwner, githubRepo }),
      });

      if (res.success) {
        setSelectedProjectId(null);
        setGithubRepo("");
        loadGitData();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to link repository");
    } finally {
      setLinking(false);
    }
  };

  const handlePublish = async (projectId: string) => {
    try {
      setPublishingId(projectId);
      const res = await apiFetch(`/api/projects/${projectId}/git/publish`, {
        method: "POST",
        body: JSON.stringify({ commitMessage, releaseTag }),
      });

      if (res.success) {
        alert("🚀 Project published to GitHub successfully!");
        loadGitData();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to publish project");
    } finally {
      setPublishingId(null);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-800">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <span>Git Integration</span>
            <span className="text-2xl">🐙</span>
          </h1>
          <p className="mt-1 text-gray-400 text-sm">
            Sync projects with GitHub repositories, track deployments, and manage automated releases.
          </p>
        </div>
      </div>

      {/* Account Connection Status Card */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gray-800 flex items-center justify-center text-2xl shrink-0">
              🐙
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">GitHub Account</h2>
              {connected ? (
                <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 mt-0.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Connected as @{githubUsername}
                </p>
              ) : (
                <p className="text-xs text-gray-400 mt-0.5">
                  Not connected yet. Enter your GitHub username below to link your account.
                </p>
              )}
            </div>
          </div>

          {connected ? (
            <button
              onClick={handleDisconnect}
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition"
            >
              Disconnect Account
            </button>
          ) : null}
        </div>

        {!connected && (
          <form onSubmit={handleConnect} className="flex flex-col sm:flex-row gap-3 pt-2">
            <input
              type="text"
              required
              placeholder="e.g. octocat"
              value={inputUsername}
              onChange={(e) => setInputUsername(e.target.value)}
              className="flex-1 rounded-xl border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500 placeholder-gray-500"
            />
            <button
              type="submit"
              disabled={connecting}
              className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition"
            >
              {connecting ? "Connecting..." : "Connect GitHub"}
            </button>
          </form>
        )}
      </div>

      {/* Linked Repositories & Projects */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Project Repositories</span>
            <span className="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-400 font-semibold">
              {projects.length}
            </span>
          </h2>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-2xl bg-gray-900 border border-gray-800 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center">
            <p className="text-red-400 font-semibold">⚠️ {error}</p>
            <button
              onClick={loadGitData}
              className="mt-4 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500 transition"
            >
              Retry
            </button>
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-800 bg-gray-900/50 p-12 text-center space-y-3">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-800 text-3xl">
              📁
            </div>
            <h3 className="text-lg font-bold text-white">No projects found</h3>
            <p className="text-sm text-gray-400">
              Create a project first to link a GitHub repository.
            </p>
            <Link
              href="/dashboard/projects"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition"
            >
              + Create Project
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map((proj) => {
              const isLinked = Boolean(proj.githubUrl);
              return (
                <div
                  key={proj.id}
                  className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-gray-700 transition"
                >
                  <div className="space-y-2 max-w-lg">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/dashboard/projects/${proj.id}`}
                        className="text-lg font-bold text-white hover:text-blue-400 transition"
                      >
                        {proj.name}
                      </Link>
                      <span className="rounded-full border border-gray-700 bg-gray-800 px-2.5 py-0.5 text-xs text-gray-400 font-mono">
                        {proj.category}
                      </span>
                    </div>

                    {isLinked ? (
                      <div className="flex items-center gap-3 text-xs">
                        <a
                          href={proj.githubUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 hover:underline font-semibold flex items-center gap-1"
                        >
                          <span>{proj.githubOwner}/{proj.githubRepository}</span>
                          <span>↗</span>
                        </a>
                        <span className="text-gray-600">•</span>
                        <span className="text-gray-400 font-mono">
                          Status: {proj.deploymentStatus || "LINKED"}
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">
                        No GitHub repository linked to this project yet.
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <button
                      onClick={() => {
                        setSelectedProjectId(proj.id);
                        if (proj.githubOwner) setGithubOwner(proj.githubOwner);
                        if (proj.githubRepository) setGithubRepo(proj.githubRepository);
                      }}
                      className="rounded-xl border border-gray-700 bg-gray-800 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-700 transition"
                    >
                      {isLinked ? "Edit Repository Link" : "+ Link Repository"}
                    </button>

                    {isLinked && (
                      <button
                        onClick={() => handlePublish(proj.id)}
                        disabled={publishingId === proj.id}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition shadow-lg shadow-emerald-600/20"
                      >
                        {publishingId === proj.id ? "Publishing..." : "🚀 Publish Release"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Link Repository Modal */}
      {selectedProjectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <h3 className="text-lg font-bold text-white">Link GitHub Repository</h3>
              <button
                onClick={() => setSelectedProjectId(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleLinkRepo} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
                  GitHub Owner / Organization *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. facebook or myusername"
                  value={githubOwner}
                  onChange={(e) => setGithubOwner(e.target.value)}
                  className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
                  Repository Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. react or devflow"
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setSelectedProjectId(null)}
                  className="rounded-xl border border-gray-700 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={linking}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {linking ? "Linking..." : "Save Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
