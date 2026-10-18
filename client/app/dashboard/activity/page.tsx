"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

interface Activity {
  id: string;
  action: string;
  details?: string;
  createdAt: string;
  user: { id: string; name: string; avatar?: string };
  project?: { id: string; name: string; slug: string };
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const ACTION_ICON: Record<string, string> = {
  created: "✨",
  opened: "🐛",
  closed: "✅",
  completed: "✅",
  moved: "🔄",
  updated: "✏️",
  added: "👤",
  removed: "🚫",
  deleted: "🗑️",
  deployed: "🚀",
  pushed: "📤",
};

function getActionIcon(action: string) {
  const word = action.split(" ")[0].toLowerCase();
  return ACTION_ICON[word] ?? "⚡";
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadActivity = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch("/api/activity");
      setActivities(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch activity");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadActivity(); }, []);

  const filtered = activities.filter((a) => {
    if (search === "") return true;
    const q = search.toLowerCase();
    return (
      a.action.toLowerCase().includes(q) ||
      a.user.name.toLowerCase().includes(q) ||
      (a.project?.name ?? "").toLowerCase().includes(q)
    );
  });

  // Group by date
  const groups: Record<string, Activity[]> = {};
  filtered.forEach((a) => {
    const date = new Date(a.createdAt).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(a);
  });

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-800">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Activity Feed</h1>
          <p className="mt-1 text-gray-400 text-sm">
            Everything happening across your workspace.
          </p>
        </div>
        <button
          onClick={loadActivity}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm font-semibold text-gray-300 hover:bg-gray-800 transition"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Stats bar */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900/80 px-5 py-4 flex items-center gap-6 text-sm text-gray-400">
        <span>
          <span className="font-bold text-white">{activities.length}</span> total events
        </span>
        <span>
          <span className="font-bold text-white">
            {new Set(activities.map((a) => a.user.id)).size}
          </span> contributors
        </span>
        <span>
          <span className="font-bold text-white">
            {new Set(activities.filter((a) => a.project).map((a) => a.project!.id)).size}
          </span> projects
        </span>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search activity..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500 placeholder-gray-500"
      />

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-2xl bg-gray-900 border border-gray-800 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center">
          <p className="text-red-400 font-semibold">⚠️ {error}</p>
          <button onClick={loadActivity} className="mt-4 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500 transition">
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-800 bg-gray-900/50 p-14 text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-3xl">⚡</div>
          <h3 className="text-lg font-bold text-white">
            {activities.length === 0 ? "No activity yet" : "No matching activity"}
          </h3>
          <p className="text-sm text-gray-400">
            {activities.length === 0
              ? "Activity from your workspace will appear here as you use DevFlow."
              : "Try adjusting your search."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groups).map(([date, items]) => (
            <div key={date}>
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">{date}</h2>
              <div className="space-y-3">
                {items.map((activity) => (
                  <div key={activity.id}
                    className="flex items-start gap-4 rounded-2xl border border-gray-800 bg-gray-900/80 p-4 hover:border-gray-700 hover:bg-gray-900 transition"
                  >
                    {/* Avatar */}
                    <div className="shrink-0 h-9 w-9 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                      {getInitials(activity.user.name)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-200 leading-snug">
                        <span className="mr-1.5">{getActionIcon(activity.action)}</span>
                        <span className="font-semibold text-white">{activity.user.name}</span>
                        {" "}{activity.action}
                        {activity.project && (
                          <>
                            {" in "}
                            <Link href={`/dashboard/projects/${activity.project.id}`}
                              className="text-blue-400 font-medium hover:underline">
                              {activity.project.name}
                            </Link>
                          </>
                        )}
                      </p>
                      {activity.details && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{activity.details}</p>
                      )}
                    </div>

                    {/* Time */}
                    <span className="shrink-0 text-xs text-gray-500">{timeAgo(activity.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
