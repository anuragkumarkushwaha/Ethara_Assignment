import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { DbService, hashPassword } from "./server_db.js";
import { User, UserRole, TaskStatus, TaskPriority } from "./src/types.js";

// Extend Request interface to support parsed user context
interface AuthenticatedRequest extends Request {
  user?: User;
  token?: string;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Standard JSON logging and parsing middleware
  app.use(express.json());

  // CORS-like / API check logging helper
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      console.log(`[API Request] ${req.method} ${req.path}`);
    }
    next();
  });

  // Authentication validation middleware
  const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({ error: "Access denied. Authorization token missing." });
    }
    
    const user = DbService.verifySession(token);
    if (!user) {
      return res.status(401).json({ error: "Invalid, expired, or revoked token." });
    }
    
    req.user = user;
    req.token = token;
    next();
  };

  // --- API Routes ---

  // Health probe
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Register
  app.post("/api/auth/register", (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return res.status(400).json({ error: "Name must be at least 2 characters long." });
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }
    if (role !== "Admin" && role !== "Member") {
      return res.status(400).json({ error: "Role must be either 'Admin' or 'Member'." });
    }

    const existingUser = DbService.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: "A user with this email already exists." });
    }

    try {
      const newUser = DbService.createUser(name.trim(), email, password, role);
      const token = DbService.createSession(newUser.id);
      res.status(201).json({ user: newUser, token });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to register user: " + e.message });
    }
  });

  // Login
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = DbService.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const userDbHash = user.passwordHash;
    const providedHash = hashPassword(password);

    if (userDbHash !== providedHash) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    try {
      const token = DbService.createSession(user.id);
      const { passwordHash, ...safeUser } = user;
      res.json({ user: safeUser, token });
    } catch (e: any) {
      res.status(500).json({ error: "Login failed: " + e.message });
    }
  });

  // Logout
  app.post("/api/auth/logout", authenticateToken, (req: AuthenticatedRequest, res) => {
    if (req.token) {
      DbService.deleteSession(req.token);
    }
    res.json({ success: true, message: "Logged out successfully" });
  });

  // Profile data fetcher
  app.get("/api/auth/me", authenticateToken, (req: AuthenticatedRequest, res) => {
    res.json({ user: req.user });
  });

  // Retrieve global users list (for assignments/project invite selection)
  app.get("/api/users", authenticateToken, (req: AuthenticatedRequest, res) => {
    const list = DbService.getAllUsers();
    res.json(list);
  });

  // --- Projects API ---

  // Get all projects user belongs to
  app.get("/api/projects", authenticateToken, (req: AuthenticatedRequest, res) => {
    const list = DbService.getProjectsForUser(req.user!);
    res.json(list);
  });

  // Create a new project
  app.post("/api/projects", authenticateToken, (req: AuthenticatedRequest, res) => {
    const { name, description } = req.body;
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Project name is required and cannot be empty." });
    }

    try {
      const project = DbService.createProject(name.trim(), (description || "").trim(), req.user!.id);
      res.status(201).json(project);
    } catch (e: any) {
      res.status(500).json({ error: "Failed to create project: " + e.message });
    }
  });

  // Update project details (Admin or Creator only)
  app.put("/api/projects/:id", authenticateToken, (req: AuthenticatedRequest, res) => {
    const projectId = req.params.id;
    const { name, description } = req.body;

    const project = DbService.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found." });
    }

    // Role Enforcement: Must be Admin OR Project Owner to update title/description
    if (req.user!.role !== "Admin" && project.ownerId !== req.user!.id) {
      return res.status(403).json({ error: "Unauthorized. Only Admins or project owners can modify project properties." });
    }

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Project name cannot be empty." });
    }

    const updated = DbService.updateProject(projectId, name.trim(), (description || "").trim());
    res.json(updated);
  });

  // Add member to project
  app.post("/api/projects/:id/members", authenticateToken, (req: AuthenticatedRequest, res) => {
    const projectId = req.params.id;
    const { userId } = req.body;

    const project = DbService.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found." });
    }

    // Role Enforcement: Must be Admin OR Project Owner to invite members
    if (req.user!.role !== "Admin" && project.ownerId !== req.user!.id) {
      return res.status(403).json({ error: "Unauthorized. Only Project Admins or owners can manage team members." });
    }

    const invitedUser = DbService.findUserById(userId);
    if (!invitedUser) {
      return res.status(400).json({ error: "Target user not found." });
    }

    const updated = DbService.addProjectMember(projectId, userId);
    res.json(updated);
  });

  // Remove member from project
  app.delete("/api/projects/:projectId/members/:memberId", authenticateToken, (req: AuthenticatedRequest, res) => {
    const { projectId, memberId } = req.params;

    const project = DbService.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found." });
    }

    // Role Enforcement: Must be Admin OR Project Owner to remove team members
    if (req.user!.role !== "Admin" && project.ownerId !== req.user!.id) {
      return res.status(403).json({ error: "Unauthorized. Only Project Admins or owners can remove team members." });
    }

    if (project.ownerId === memberId) {
      return res.status(400).json({ error: "Owner cannot be removed from the project team." });
    }

    const updated = DbService.removeProjectMember(projectId, memberId);
    res.json(updated);
  });

  // Delete a project
  app.delete("/api/projects/:id", authenticateToken, (req: AuthenticatedRequest, res) => {
    const projectId = req.params.id;

    const project = DbService.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Role Enforcement
    if (req.user!.role !== "Admin" && project.ownerId !== req.user!.id) {
      return res.status(403).json({ error: "Unauthorized. Only project owners or administrators can delete projects." });
    }

    DbService.deleteProject(projectId);
    res.json({ success: true, message: "Project deleted successfully." });
  });

  // --- Tasks API ---

  // Get tasks for a specific project
  app.get("/api/projects/:id/tasks", authenticateToken, (req: AuthenticatedRequest, res) => {
    const projectId = req.params.id;

    const project = DbService.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found." });
    }

    // Access check: User must be Admin, project owner, or member
    if (req.user!.role !== "Admin" && project.ownerId !== req.user!.id && !project.members.includes(req.user!.id)) {
      return res.status(403).json({ error: "Unauthorized. You are not a member of this project." });
    }

    const projectTasks = DbService.getTasksForProject(projectId);
    res.json(projectTasks);
  });

  // Get all visible tasks
  app.get("/api/tasks", authenticateToken, (req: AuthenticatedRequest, res) => {
    const list = DbService.getTasksForUser(req.user!);
    res.json(list);
  });

  // Create task
  app.post("/api/tasks", authenticateToken, (req: AuthenticatedRequest, res) => {
    const { projectId, title, description, status, priority, assigneeId, dueDate } = req.body;

    const project = DbService.getProjectById(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found." });
    }

    // Role Enforcement: Project Owner or Admins can create tasks
    if (req.user!.role !== "Admin" && project.ownerId !== req.user!.id) {
      return res.status(403).json({ error: "Unauthorized. Only project owners or administrators can create tasks." });
    }

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return res.status(400).json({ error: "Task title is required." });
    }

    const statuses: TaskStatus[] = ["Todo", "In Progress", "In Review", "Done"];
    const priorities: TaskPriority[] = ["Low", "Medium", "High", "Urgent"];

    if (status && !statuses.includes(status)) {
      return res.status(400).json({ error: `Invalid task status. Must be one of: ${statuses.join(", ")}` });
    }
    if (priority && !priorities.includes(priority)) {
      return res.status(400).json({ error: `Invalid task priority. Must be one of: ${priorities.join(", ")}` });
    }

    // If assignee provided, verify they are a member of the project
    if (assigneeId) {
      if (!project.members.includes(assigneeId) && project.ownerId !== assigneeId) {
        return res.status(400).json({ error: "Selected assignee must be a member of this project." });
      }
    }

    try {
      const task = DbService.createTask({
        projectId,
        title: title.trim(),
        description: (description || "").trim(),
        status: status || "Todo",
        priority: priority || "Medium",
        assigneeId: assigneeId || null,
        dueDate: dueDate || new Date(Date.now() + 7*24*60*60*1000).toISOString().split("T")[0], // Default 7 days from now
        creatorId: req.user!.id
      });
      res.status(201).json(task);
    } catch (e: any) {
      res.status(500).json({ error: "Could not create task: " + e.message });
    }
  });

  // Update a task
  app.put("/api/tasks/:id", authenticateToken, (req: AuthenticatedRequest, res) => {
    const taskId = req.params.id;
    const task = DbService.getTaskById(taskId);
    if (!task) {
      return res.status(404).json({ error: "Task not found." });
    }

    const project = DbService.getProjectById(task.projectId);
    if (!project) {
      return res.status(404).json({ error: "Parent project not found." });
    }

    // Role Enforcement: Check access to project first
    const isOwnerOrAdmin = req.user!.role === "Admin" || project.ownerId === req.user!.id;
    const isMemberOfProject = project.members.includes(req.user!.id);

    if (!isOwnerOrAdmin && !isMemberOfProject) {
      return res.status(403).json({ error: "Unauthorized. You are not a member of this project." });
    }

    // Role update split:
    // If user is Admin or Project Owner, they can edit anything.
    // If user is a regular Member, they can ONLY update the `status` of a task.
    const { title, description, status, priority, assigneeId, dueDate } = req.body;

    const statuses: TaskStatus[] = ["Todo", "In Progress", "In Review", "Done"];
    const priorities: TaskPriority[] = ["Low", "Medium", "High", "Urgent"];

    if (status && !statuses.includes(status)) {
      return res.status(400).json({ error: "Invalid task status." });
    }
    if (priority && !priorities.includes(priority)) {
      return res.status(400).json({ error: "Invalid task priority." });
    }

    if (!isOwnerOrAdmin) {
      // Regular workspace member. Inspect what fields they are trying to update
      const attemptingTitle = title !== undefined && title !== task.title;
      const attemptingDescription = description !== undefined && description !== task.description;
      const attemptingPriority = priority !== undefined && priority !== task.priority;
      const attemptingAssignee = assigneeId !== undefined && assigneeId !== task.assigneeId;
      const attemptingDueDate = dueDate !== undefined && dueDate !== task.dueDate;

      if (attemptingTitle || attemptingDescription || attemptingPriority || attemptingAssignee || attemptingDueDate) {
        return res.status(403).json({
          error: "Unauthorized action. Workspace Members can only progress task statuses. Only Admins or project owners can edit description, metadata, or assignee assignments."
        });
      }
    }

    // If change of assignee requested, verify they are in project team
    if (assigneeId && isOwnerOrAdmin) {
      if (!project.members.includes(assigneeId) && project.ownerId !== assigneeId) {
        return res.status(400).json({ error: "New assignee must be a member of this project." });
      }
    }

    const updates: any = {};
    if (status !== undefined) updates.status = status;

    if (isOwnerOrAdmin) {
      if (title !== undefined) updates.title = title.trim();
      if (description !== undefined) updates.description = description.trim();
      if (priority !== undefined) updates.priority = priority;
      if (assigneeId !== undefined) updates.assigneeId = assigneeId || null;
      if (dueDate !== undefined) updates.dueDate = dueDate;
    }

    const updated = DbService.updateTask(taskId, updates);
    res.json(updated);
  });

  // Delete task
  app.delete("/api/tasks/:id", authenticateToken, (req: AuthenticatedRequest, res) => {
    const taskId = req.params.id;
    const task = DbService.getTaskById(taskId);
    if (!task) {
      return res.status(404).json({ error: "Task not found." });
    }

    const project = DbService.getProjectById(task.projectId);
    if (!project) {
      return res.status(404).json({ error: "Parent project not found." });
    }

    // Role Enforcement: Admin or Owner of project can delete tasks
    if (req.user!.role !== "Admin" && project.ownerId !== req.user!.id) {
      return res.status(403).json({ error: "Unauthorized. Only project managers or administrators can delete tasks." });
    }

    DbService.deleteTask(taskId);
    res.json({ success: true, message: "Task deleted." });
  });

  // --- Dashboard Analytics ---
  app.get("/api/dashboard/metrics", authenticateToken, (req: AuthenticatedRequest, res) => {
    // Collect stats from all tasks visible to this user
    const usersTasks = DbService.getTasksForUser(req.user!);
    const usersProjects = DbService.getProjectsForUser(req.user!);
    
    const todayStr = new Date().toISOString().split("T")[0];

    const totalTasks = usersTasks.length;
    const completedTasks = usersTasks.filter(t => t.status === "Done").length;
    const inProgressTasks = usersTasks.filter(t => t.status === "In Progress").length;
    const inReviewTasks = usersTasks.filter(t => t.status === "In Review").length;
    const pendingTasks = usersTasks.filter(t => t.status === "Todo").length;

    // Overdue tasks are active (not Done) whose due date is less than today
    const overdueTasks = usersTasks.filter(t => t.status !== "Done" && t.dueDate && t.dueDate < todayStr).length;

    const priorityStats = {
      Low: usersTasks.filter(t => t.priority === "Low").length,
      Medium: usersTasks.filter(t => t.priority === "Medium").length,
      High: usersTasks.filter(t => t.priority === "High").length,
      Urgent: usersTasks.filter(t => t.priority === "Urgent").length
    };

    res.json({
      totalTasks,
      completedTasks,
      pendingTasks,
      inProgressTasks,
      inReviewTasks,
      overdueTasks,
      priorityStats,
      projectsCount: usersProjects.length
    });
  });

  // --- Dev and Production Server Setup ---

  if (process.env.NODE_ENV !== "production") {
    // Developer Mode: Mount Vite in middleware mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("[Dev Server] Vite middleware plugged.");
  } else {
    // Production Mode: static file server matching production paths
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("[Production Server] Serving output from /dist directory.");
  }

  // Fallback global error handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("Unhandled Global Server Error:", err);
    res.status(500).json({ error: "Internal Server Error", message: err.message || String(err) });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Full-Stack Server] Ready and listening on http://0.0.0.0:${PORT}`);
  });
}

// Global process exception handling to prevent server crashes
process.on("uncaughtException", (err) => {
  console.error("CRITICAL: Uncaught Exception in Server process:", err);
});
process.on("unhandledRejection", (reason, p) => {
  console.error("CRITICAL: Unhandled Promise Rejection:", reason);
});

startServer().catch((error) => {
  console.error("Failed to boot full-stack Express server:", error);
});
