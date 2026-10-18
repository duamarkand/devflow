"use client";

import { useEffect, useState } from "react";
import { apiFetch, getStoredUser, setStoredUser } from "@/lib/api";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "workspace">("profile");

  // Profile Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load Profile Data
  useEffect(() => {
    const user = getStoredUser();
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setAvatar(user.avatar || "");
      setGithubUsername(user.githubUsername || "");
    }

    const fetchMe = async () => {
      try {
        const res = await apiFetch("/api/auth/me");
        if (res.success && res.data) {
          setName(res.data.name || "");
          setEmail(res.data.email || "");
          setAvatar(res.data.avatar || "");
          setGithubUsername(res.data.githubUsername || "");
        }
      } catch (err) {
        console.error("Failed to load user profile:", err);
      }
    };
    fetchMe();
  }, []);

  // Save Profile Handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);

    if (!name.trim()) {
      setProfileMsg({ type: "error", text: "Full name is required" });
      return;
    }

    try {
      setSavingProfile(true);
      const res = await apiFetch("/api/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          avatar: avatar.trim(),
          githubUsername: githubUsername.trim(),
        }),
      });

      if (res.success) {
        setProfileMsg({ type: "success", text: "Profile updated successfully!" });
        // Update stored user session
        const stored = getStoredUser();
        if (stored) {
          setStoredUser({
            ...stored,
            name: res.data.name,
            avatar: res.data.avatar,
            githubUsername: res.data.githubUsername,
          });
        }
      }
    } catch (err) {
      setProfileMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update profile",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  // Update Password Handler
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMsg({ type: "error", text: "Please fill in all password fields" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "New password and confirmation do not match" });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMsg({ type: "error", text: "New password must be at least 8 characters" });
      return;
    }

    try {
      setSavingPassword(true);
      const res = await apiFetch("/api/auth/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.success) {
        setPasswordMsg({ type: "success", text: "Password changed successfully!" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      setPasswordMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to change password",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="pb-6 border-b border-gray-800">
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
          <span>Settings</span>
          <span className="text-2xl">⚙️</span>
        </h1>
        <p className="mt-1 text-gray-400 text-sm">
          Manage your personal profile, security credentials, and workspace settings.
        </p>
      </div>

      {/* Tabs Header */}
      <div className="flex border-b border-gray-800 gap-6 text-sm font-semibold">
        {[
          { id: "profile", label: "Profile Settings", icon: "👤" },
          { id: "security", label: "Security & Password", icon: "🔒" },
          { id: "workspace", label: "Workspace Info", icon: "⚡" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 flex items-center gap-2 border-b-2 transition ${
              activeTab === tab.id
                ? "border-blue-500 text-white"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: PROFILE SETTINGS */}
      {activeTab === "profile" && (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white">Personal Information</h2>
            <p className="text-xs text-gray-400">
              Update your avatar, display name, and connected GitHub handle.
            </p>
          </div>

          {profileMsg && (
            <div
              className={`rounded-xl border p-4 text-xs font-semibold ${
                profileMsg.type === "success"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-red-500/30 bg-red-500/10 text-red-400"
              }`}
            >
              {profileMsg.type === "success" ? "✅ " : "⚠️ "}
              {profileMsg.text}
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your display name"
                className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
                Email Address (Primary)
              </label>
              <input
                type="email"
                disabled
                value={email}
                className="w-full rounded-xl border border-gray-800 bg-gray-900/50 px-4 py-2.5 text-sm text-gray-500 cursor-not-allowed"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Email address cannot be modified once registered.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
                Avatar Image URL (optional)
              </label>
              <input
                type="url"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://example.com/my-avatar.png"
                className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
                GitHub Username
              </label>
              <input
                type="text"
                value={githubUsername}
                onChange={(e) => setGithubUsername(e.target.value)}
                placeholder="e.g. octocat"
                className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={savingProfile}
                className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition shadow-lg shadow-blue-600/20"
              >
                {savingProfile ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: SECURITY & PASSWORD */}
      {activeTab === "security" && (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white">Change Password</h2>
            <p className="text-xs text-gray-400">
              Ensure your account is using a strong password.
            </p>
          </div>

          {passwordMsg && (
            <div
              className={`rounded-xl border p-4 text-xs font-semibold ${
                passwordMsg.type === "success"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-red-500/30 bg-red-500/10 text-red-400"
              }`}
            >
              {passwordMsg.type === "success" ? "✅ " : "⚠️ "}
              {passwordMsg.text}
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
                Current Password *
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
                New Password (min 8 characters) *
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">
                Confirm New Password *
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-500"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={savingPassword}
                className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition shadow-lg shadow-blue-600/20"
              >
                {savingPassword ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: WORKSPACE INFO */}
      {activeTab === "workspace" && (
        <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white">System Environment</h2>
            <p className="text-xs text-gray-400">
              DevFlow environment details and backend connections.
            </p>
          </div>

          <div className="space-y-3 max-w-lg">
            <div className="flex items-center justify-between py-2 border-b border-gray-800 text-xs">
              <span className="text-gray-400">Backend API URL</span>
              <span className="font-mono text-blue-400">
                {process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-800 text-xs">
              <span className="text-gray-400">Frontend Framework</span>
              <span className="font-mono text-white">Next.js 16 (App Router)</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-800 text-xs">
              <span className="text-gray-400">Database Driver</span>
              <span className="font-mono text-emerald-400">PostgreSQL + Prisma ORM</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-800 text-xs">
              <span className="text-gray-400">API Status</span>
              <span className="font-mono text-emerald-400">🟢 Connected</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
