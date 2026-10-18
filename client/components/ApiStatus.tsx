"use client";

import { useEffect, useState } from "react";

export default function ApiStatus() {
  const [status, setStatus] = useState("Checking backend...");

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    fetch(`${apiUrl}/api/health`)
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          setStatus("Backend connected");
        } else {
          setStatus("Backend error");
        }
      })
      .catch(() => {
        setStatus("Backend unavailable");
      });
  }, []);

  return (
    <div className="mt-6 rounded-lg border border-gray-800 bg-gray-900 px-4 py-3 text-sm text-gray-300">
      API Status:{" "}
      <span className="font-medium text-green-400">{status}</span>
    </div>
  );
}