export type UserRole = "Admin" | "Member";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  members: string[]; // List of User ids who belong to this project
  createdAt: string;
}

export type TaskStatus = "Todo" | "In Progress" | "In Review" | "Done";
export type TaskPriority = "Low" | "Medium" | "High" | "Urgent";

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  dueDate: string; // YYYY-MM-DD
  creatorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardMetrics {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  inReviewTasks: number;
  overdueTasks: number;
  priorityStats: {
    Low: number;
    Medium: number;
    High: number;
    Urgent: number;
  };
  projectsCount: number;
}
