"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearStoredUser, getStoredUser, setStoredUser, UserSession } from "@/lib/api";

interface NavItem {
  name: string;
  href: string;
  icon: string;
}

const navItems: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: "📊" },
  { name: "My Projects", href: "/dashboard/projects", icon: "📁" },
  { name: "Tasks", href: "/dashboard/tasks", icon: "📋" },
  { name: "Issues", href: "/dashboard/issues", icon: "🐛" },
  { name: "Team", href: "/dashboard/team", icon: "👥" },
  { name: "Activity", href: "/dashboard/activity", icon: "⚡" },
  { name: "Showcase", href: "/dashboard/showcase", icon: "🚀" },
  { name: "Git Integration", href: "/dashboard/git", icon: "🐙" },
  { name: "Settings", href: "/dashboard/settings", icon: "⚙️" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let stored = getStoredUser();
    if (!stored) {
      // Fallback demo user if none stored yet
      stored = {
        id: "cmst8tj3t00003kpfb2s44ash",
        name: "Developer",
        email: "dev@devflow.io",
      };
      setStoredUser(stored);
    }
    setUser(stored);
  }, []);

  const handleSignOut = () => {
    clearStoredUser();
    router.push("/login");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col md:flex-row">
      {/* Mobile Top Navigation Header */}
      <div className="md:hidden flex items-center justify-between border-b border-gray-800 bg-gray-900 px-6 py-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-black text-white">
            DF
          </span>
          <span>DevFlow</span>
        </Link>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg border border-gray-800 bg-gray-950 p-2 text-gray-400 hover:text-white"
          aria-label="Toggle Navigation"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-gray-900 border-r border-gray-800 transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col justify-between p-6">
          <div className="space-y-6">
            {/* Logo Branding */}
            <div className="flex items-center justify-between">
              <Link href="/dashboard" className="flex items-center gap-3 font-bold text-2xl text-white tracking-tight">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-base font-black text-white shadow-lg shadow-blue-500/20">
                  DF
                </span>
                <span>DevFlow</span>
              </Link>

              <button
                onClick={() => setMobileOpen(false)}
                className="md:hidden text-gray-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                        : "text-gray-400 hover:bg-gray-800/60 hover:text-gray-200"
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* User Profile & Sign Out Footer */}
          <div className="border-t border-gray-800 pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-sm font-bold text-blue-400 border border-blue-500/30">
                  {user ? getInitials(user.name) : "DF"}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {user?.name || "Developer"}
                  </p>
                  <p className="truncate text-xs text-gray-400">
                    {user?.email || "dev@devflow.io"}
                  </p>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                title="Sign Out"
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-red-400 transition"
              >
                🚪
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Workspace Content Area */}
      <main className="flex-1 min-w-0 bg-gray-950 p-6 md:p-10 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
