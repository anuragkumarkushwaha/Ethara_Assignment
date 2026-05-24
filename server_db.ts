import fs from "fs";
import path from "path";
import crypto from "crypto";
import { User, Project, Task, UserRole, TaskStatus, TaskPriority } from "./src/types.js";

// Database storage structure
interface DatabaseSchema {
  users: UserWithHash[];
  projects: Project[];
  tasks: Task[];
  sessions: Session[];
}

export interface UserWithHash extends User {
  passwordHash: string;
}

export interface Session {
  token: string;
  userId: string;
  expiresAt: string;
}

const DB_FILE = path.join(process.cwd(), "manager_db.json");

// Helper: load database
function loadDb(): DatabaseSchema {
  if (!fs.existsSync(DB_FILE)) {
    const defaultDb: DatabaseSchema = {
      users: [],
      projects: [],
      tasks: [],
      sessions: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb, null, 2), "utf8");
    return defaultDb;
  }
  try {
    const data = fs.readFileSync(DB_FILE, "utf8");
    return JSON.parse(data) as DatabaseSchema;
  } catch (error) {
    console.error("Failed to read database file, returning empty schema", error);
    return { users: [], projects: [], tasks: [], sessions: [] };
  }
}

// Helper: save database
function saveDb(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
  } catch (error) {
    console.error("Failed to write to database file", error);
  }
}

// Password hashing
export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Data Service API
export const DbService = {
  // --- Auth Utilities ---
  findUserByEmail(email: string): UserWithHash | undefined {
    const db = loadDb();
    return db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  },

  findUserById(id: string): User | undefined {
    const db = loadDb();
    const user = db.users.find(u => u.id === id);
    if (!user) return undefined;
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  },

  getAllUsers(): User[] {
    const db = loadDb();
    return db.users.map(({ passwordHash, ...user }) => user);
  },

  createUser(name: string, email: string, passwordPlain: string, role: UserRole): User {
    const db = loadDb();
    const newUser: UserWithHash = {
      id: crypto.randomUUID(),
      name,
      email: email.toLowerCase(),
      passwordHash: hashPassword(passwordPlain),
      role,
      createdAt: new Date().toISOString()
    };
    db.users.push(newUser);
    saveDb(db);

    const { passwordHash, ...safeUser } = newUser;
    return safeUser;
  },

  createSession(userId: string): string {
    const db = loadDb();
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours expiry
    
    // Purge expired sessions for the user to optimize space
    db.sessions = db.sessions.filter(s => s.userId !== userId && new Date(s.expiresAt) > new Date());
    
    db.sessions.push({ token, userId, expiresAt });
    saveDb(db);
    return token;
  },

  verifySession(token: string): User | null {
    const db = loadDb();
    const session = db.sessions.find(s => s.token === token);
    if (!session) return null;

    if (new Date(session.expiresAt) < new Date()) {
      // Session expired, delete it
      db.sessions = db.sessions.filter(s => s.token !== token);
      saveDb(db);
      return null;
    }

    const user = db.users.find(u => u.id === session.userId);
    if (!user) return null;

    const { passwordHash, ...safeUser } = user;
    return safeUser;
  },

  deleteSession(token: string) {
    const db = loadDb();
    db.sessions = db.sessions.filter(s => s.token !== token);
    saveDb(db);
  },

  // --- Project Service API ---
  getProjectsForUser(user: User): Project[] {
    const db = loadDb();
    if (user.role === "Admin") {
      return db.projects;
    }
    // Members only see projects where they are in "members" array, or if they are the owner
    return db.projects.filter(p => p.ownerId === user.id || p.members.includes(user.id));
  },

  getProjectById(projectId: string): Project | undefined {
    const db = loadDb();
    return db.projects.find(p => p.id === projectId);
  },

  createProject(name: string, description: string, ownerId: string): Project {
    const db = loadDb();
    const newProject: Project = {
      id: crypto.randomUUID(),
      name,
      description,
      ownerId,
      members: [ownerId], // Owner is automatically a member
      createdAt: new Date().toISOString()
    };
    db.projects.push(newProject);
    saveDb(db);
    return newProject;
  },

  updateProject(projectId: string, name: string, description: string): Project | null {
    const db = loadDb();
    const idx = db.projects.findIndex(p => p.id === projectId);
    if (idx === -1) return null;

    db.projects[idx].name = name;
    db.projects[idx].description = description;
    saveDb(db);
    return db.projects[idx];
  },

  addProjectMember(projectId: string, userId: string): Project | null {
    const db = loadDb();
    const idx = db.projects.findIndex(p => p.id === projectId);
    if (idx === -1) return null;

    if (!db.projects[idx].members.includes(userId)) {
      db.projects[idx].members.push(userId);
      saveDb(db);
    }
    return db.projects[idx];
  },

  removeProjectMember(projectId: string, userId: string): Project | null {
    const db = loadDb();
    const idx = db.projects.findIndex(p => p.id === projectId);
    if (idx === -1) return null;

    // Do not remove the owner
    if (db.projects[idx].ownerId === userId) {
      return db.projects[idx];
    }

    db.projects[idx].members = db.projects[idx].members.filter(m => m !== userId);
    
    // Also change active assignee of tasks inside this project to null if they get removed
    db.tasks = db.tasks.map(t => {
      if (t.projectId === projectId && t.assigneeId === userId) {
        return { ...t, assigneeId: null, updatedAt: new Date().toISOString() };
      }
      return t;
    });

    saveDb(db);
    return db.projects[idx];
  },

  deleteProject(projectId: string): boolean {
    const db = loadDb();
    const originalLen = db.projects.length;
    db.projects = db.projects.filter(p => p.id !== projectId);
    
    if (db.projects.length === originalLen) {
      return false;
    }

    // Cascade delete all tasks belonging to this project
    db.tasks = db.tasks.filter(t => t.projectId !== projectId);
    saveDb(db);
    return true;
  },

  // --- Task Service API ---
  getTasksForProject(projectId: string): Task[] {
    const db = loadDb();
    return db.tasks.filter(t => t.projectId === projectId);
  },

  getTasksForUser(user: User): Task[] {
    const db = loadDb();
    const visibleProjects = this.getProjectsForUser(user);
    const visibleProjectIds = visibleProjects.map(p => p.id);
    
    // Admins see all tasks
    if (user.role === "Admin") {
      return db.tasks;
    }
    
    // Members see tasks belonging to projects they have access to
    return db.tasks.filter(t => visibleProjectIds.includes(t.projectId));
  },

  getTaskById(taskId: string): Task | undefined {
    const db = loadDb();
    return db.tasks.find(t => t.id === taskId);
  },

  createTask(params: {
    projectId: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    assigneeId: string | null;
    dueDate: string;
    creatorId: string;
  }): Task {
    const db = loadDb();
    const now = new Date().toISOString();
    const newTask: Task = {
      id: crypto.randomUUID(),
      projectId: params.projectId,
      title: params.title,
      description: params.description,
      status: params.status,
      priority: params.priority,
      assigneeId: params.assigneeId,
      dueDate: params.dueDate,
      creatorId: params.creatorId,
      createdAt: now,
      updatedAt: now
    };
    db.tasks.push(newTask);
    saveDb(db);
    return newTask;
  },

  updateTask(
    taskId: string,
    updates: Partial<Omit<Task, "id" | "projectId" | "createdAt" | "creatorId">>
  ): Task | null {
    const db = loadDb();
    const idx = db.tasks.findIndex(t => t.id === taskId);
    if (idx === -1) return null;

    db.tasks[idx] = {
      ...db.tasks[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    saveDb(db);
    return db.tasks[idx];
  },

  deleteTask(taskId: string): boolean {
    const db = loadDb();
    const originalLen = db.tasks.length;
    db.tasks = db.tasks.filter(t => t.id !== taskId);
    
    if (db.tasks.length === originalLen) {
      return false;
    }
    saveDb(db);
    return true;
  }
};
