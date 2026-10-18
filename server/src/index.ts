import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";

import authRoutes from "./routes/auth.ts";
import projectRoutes from "./routes/projects.ts";
import memberRoutes from "./routes/members.ts";
import taskRoutes from "./routes/tasks.ts";
import issueRoutes from "./routes/issues.ts";
import activityRoutes from "./routes/activity.ts";
import gitRoutes from "./routes/git.ts";
import showcaseRoutes from "./routes/showcase.ts";

const app = express();
const PORT = process.env.PORT || process.env.SERVER_PORT || 5000;

// CORS & Body parsing
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Health Check Endpoint
app.get("/api/health", (_req: Request, res: Response) => {
  return res.json({
    success: true,
    message: "DevFlow API is running",
  });
});

// Mounted API Routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/projects", memberRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api", issueRoutes); // Mount for /projects/:id/issues sub-routes
app.use("/api/activity", activityRoutes);
app.use("/api/git", gitRoutes);
app.use("/api", gitRoutes); // Mount for /projects/:id/git/* sub-routes
app.use("/api/showcase", showcaseRoutes);

// Fallback 404 Handler for undefined API routes
app.use((_req: Request, res: Response) => {
  return res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

// Global Error Handler Middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled API Error:", err);
  return res.status(500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log(`DevFlow API running on http://localhost:${PORT}`);
});