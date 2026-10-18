export interface UserSession {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  githubUsername?: string;
}

export function getStoredUser(): UserSession | null {
  if (typeof window === "undefined") return null;
  const userStr = localStorage.getItem("devflow_user");
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

export function setStoredUser(user: UserSession) {
  if (typeof window === "undefined") return;
  localStorage.setItem("devflow_user", JSON.stringify(user));
}

export function clearStoredUser() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("devflow_user");
}

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
  const user = getStoredUser();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (user?.id) {
    headers["x-user-id"] = user.id;
  }

  const res = await fetch(`${apiUrl}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || "An error occurred");
  }

  return data;
}
