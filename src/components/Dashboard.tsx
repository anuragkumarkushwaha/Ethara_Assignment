import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { CheckCircle2, AlertTriangle, Clock, Library, Compass, ChevronRight, CheckSquare, Loader2, RefreshCw } from "lucide-react";
import { Task, DashboardMetrics } from "../types.js";

interface DashboardProps {
  token: string | null;
  currentUser: any;
  onNavigateToTab: (tabId: string) => void;
}

export default function Dashboard({ token, currentUser, onNavigateToTab }: DashboardProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Fetch metrics
      const mRes = await fetch("/api/dashboard/metrics", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!mRes.ok) throw new Error("Failed to load dashboard metrics.");
      const metricsData = await mRes.json();
      setMetrics(metricsData);

      // 2. Fetch tasks
      const tRes = await fetch("/api/tasks", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!tRes.ok) throw new Error("Failed to load tasks list.");
      const tasksData = await tRes.json();
      
      // Filter tasks assigned to me, or if none, show the most recent ones
      const assignedToMe = tasksData.filter((t: Task) => t.assigneeId === currentUser?.id);
      setMyTasks(assignedToMe.slice(0, 10)); // Get up to 10 items
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token, currentUser]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
          <p className="mt-2 text-sm text-gray-500 font-sans">Compiling analytics engine...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-6 text-center max-w-2xl mx-auto my-12">
        <p className="text-sm font-semibold text-rose-700">Error loading intelligence dashboard</p>
        <p className="mt-1 text-xs text-rose-600">{errorMsg}</p>
        <button
          onClick={fetchDashboardData}
          className="mt-4 px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
        >
          Retry Fetching Data
        </button>
      </div>
    );
  }

  // Calculate percentage
  const total = metrics?.totalTasks || 0;
  const completed = metrics?.completedTasks || 0;
  const inProgress = metrics?.inProgressTasks || 0;
  const inReview = metrics?.inReviewTasks || 0;
  const todo = metrics?.pendingTasks || 0;
  
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Helpers for Priority styling
  const prColors = {
    Low: "bg-gray-100 text-gray-700 border-gray-200",
    Medium: "bg-blue-50 text-blue-700 border-blue-100",
    High: "bg-amber-50 text-amber-700 border-amber-100",
    Urgent: "bg-rose-50 text-rose-700 border-rose-100"
  };

  const statusColors = {
    "Todo": "border-slate-200 text-slate-700 bg-slate-50",
    "In Progress": "border-blue-100 text-blue-700 bg-blue-50/30",
    "In Review": "border-purple-100 text-purple-700 bg-purple-50/30",
    "Done": "border-emerald-100 text-emerald-700 bg-emerald-50/30",
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Hero Area */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-sans">
            Good day, {currentUser?.name || "Team Member"} 👋
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            You are logged in as <span className="font-semibold text-indigo-700">{currentUser?.role}</span>. Here is your team overview.
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="flex items-center gap-1.5 self-start rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refreshed Stats
        </button>
      </div>

      {/* Grid: 4 Metric Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card: Completion */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm shadow-gray-100/50 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Completion</p>
            <h3 className="text-2xl font-bold text-gray-900">{completionRate}%</h3>
            <p className="text-[11px] text-gray-500">{completed} of {total} completed</p>
          </div>
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-7 w-7" />
          </div>
        </div>

        {/* Card: Overdue Warnings */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm shadow-gray-100/50 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Overdue Tasks</p>
            <h3 className={`text-2xl font-bold ${(metrics?.overdueTasks || 0) > 0 ? "text-rose-600" : "text-gray-900"}`}>
              {metrics?.overdueTasks || 0}
            </h3>
            <p className="text-[11px] text-gray-500">Require immediate response</p>
          </div>
          <div className={`relative flex h-14 w-14 items-center justify-center rounded-2xl ${
            (metrics?.overdueTasks || 0) > 0 ? "bg-rose-50 text-rose-600" : "bg-gray-50 text-gray-400"
          }`}>
            <AlertTriangle className="h-7 w-7" />
          </div>
        </div>

        {/* Card: Pending / In Progress */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm shadow-gray-100/50 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Active Cycle</p>
            <h3 className="text-2xl font-bold text-gray-900">{inProgress + inReview}</h3>
            <p className="text-[11px] text-gray-500">{inProgress} In-Progress, {inReview} In-Review</p>
          </div>
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Clock className="h-7 w-7" />
          </div>
        </div>

        {/* Card: Total Projects */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm shadow-gray-100/50 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Active Projects</p>
            <h3 className="text-2xl font-bold text-gray-900">{metrics?.projectsCount || 0}</h3>
            <p className="text-[11px] text-gray-500">Accessible workspaces</p>
          </div>
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Library className="h-7 w-7" />
          </div>
        </div>
      </div>

      {/* Grid: 2 Columns - Main charts & assignments */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Left Col: Analytics Box (2/3 width on desktop) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Status Dist. + Priority Distribution Panel */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm shadow-gray-100/50 space-y-6">
            <h2 className="text-md font-bold text-gray-900">Task Demographics Breakdown</h2>
            
            {/* Status Percentage Bars */}
            <div className="space-y-4">
              <p className="text-xs font-semibold text-gray-500">Workflow Stat Distribution</p>
              
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Todo Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 font-medium">To Do ({todo})</span>
                    <span className="text-gray-500">{total > 0 ? Math.round((todo/total)*100) : 0}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full bg-slate-400 rounded-full" style={{ width: `${total > 0 ? (todo/total)*100 : 0}%` }} />
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 font-medium">In Progress ({inProgress})</span>
                    <span className="text-gray-500">{total > 0 ? Math.round((inProgress/total)*100) : 0}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${total > 0 ? (inProgress/total)*100 : 0}%` }} />
                  </div>
                </div>

                {/* Review Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 font-medium">In Review ({inReview})</span>
                    <span className="text-gray-500">{total > 0 ? Math.round((inReview/total)*100) : 0}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${total > 0 ? (inReview/total)*100 : 0}%` }} />
                  </div>
                </div>

                {/* Completed Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 font-medium">Completed ({completed})</span>
                    <span className="text-gray-500">{total > 0 ? Math.round((completed/total)*100) : 0}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${total > 0 ? (completed/total)*100 : 0}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Micro-bar Chart for Priority */}
            <div className="space-y-4">
              <p className="text-xs font-semibold text-gray-500">Priority Spread Index</p>
              
              <div className="grid grid-cols-4 gap-3">
                {/* Low */}
                <div className="bg-gray-50/50 rounded-xl p-3 text-center border border-gray-100">
                  <p className="text-xs font-medium text-gray-400">Low</p>
                  <h4 className="text-lg font-bold text-gray-800 mt-1">{metrics?.priorityStats.Low || 0}</h4>
                  <div className="w-full bg-gray-100 h-1 rounded-full mt-2 overflow-hidden">
                    <div className="bg-gray-400 h-full" style={{ width: `${total > 0 ? ((metrics?.priorityStats.Low || 0)/total)*100 : 0}%` }} />
                  </div>
                </div>

                {/* Medium */}
                <div className="bg-blue-50/20 rounded-xl p-3 text-center border border-blue-50/50">
                  <p className="text-xs font-medium text-blue-500">Medium</p>
                  <h4 className="text-lg font-bold text-blue-700 mt-1">{metrics?.priorityStats.Medium || 0}</h4>
                  <div className="w-full bg-blue-100 h-1 rounded-full mt-2 overflow-hidden">
                    <div className="bg-blue-400 h-full" style={{ width: `${total > 0 ? ((metrics?.priorityStats.Medium || 0)/total)*100 : 0}%` }} />
                  </div>
                </div>

                {/* High */}
                <div className="bg-amber-50/20 rounded-xl p-3 text-center border border-amber-50/50">
                  <p className="text-xs font-medium text-amber-600 border-amber-100">High</p>
                  <h4 className="text-lg font-bold text-amber-700 mt-1">{metrics?.priorityStats.High || 0}</h4>
                  <div className="w-full bg-amber-100 h-1 rounded-full mt-2 overflow-hidden">
                    <div className="bg-amber-400 h-full" style={{ width: `${total > 0 ? ((metrics?.priorityStats.High || 0)/total)*100 : 0}%` }} />
                  </div>
                </div>

                {/* Urgent */}
                <div className="bg-rose-50/20 rounded-xl p-3 text-center border border-rose-50/50">
                  <p className="text-xs font-medium text-rose-600">Urgent</p>
                  <h4 className="text-lg font-bold text-rose-700 mt-1">{metrics?.priorityStats.Urgent || 0}</h4>
                  <div className="w-full bg-rose-100 h-1 rounded-full mt-2 overflow-hidden">
                    <div className="bg-rose-500 h-full" style={{ width: `${total > 0 ? ((metrics?.priorityStats.Urgent || 0)/total)*100 : 0}%` }} />
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Quick-Help Guidelines */}
          <div className="rounded-2xl border border-gray-100 bg-amber-50/30 p-5 shadow-sm flex gap-3.5 items-start">
            <Compass className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-amber-900">Workspace Role-Based Privileges Reminder</h4>
              <p className="text-xs text-amber-700/90 leading-relaxed">
                As a logged-in <span className="font-semibold text-amber-800">{currentUser?.role}</span>, {
                  currentUser?.role === "Admin"
                    ? "you enjoy master control across all project environments. You can create projects, delete project scopes, assign team members, and override values at any stage."
                    : "you are authorized to move cards on the Task Board and participate in workspaces where you are a member. Project-level structural configurations remain restricted to Admins and designated Project Owners."
                } Use the navigation tabs above to switch work contexts.
              </p>
            </div>
          </div>

        </div>

        {/* Right Col: Personal Inbox / Assigned to Me (1/3 width) */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm shadow-gray-100/50 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-md font-bold text-gray-900 flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-indigo-600" />
              My Task Inbox ({myTasks.length})
            </h2>
            <button
              id="dashboard-go-tasks"
              onClick={() => onNavigateToTab("tasks")}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 cursor-pointer"
            >
              Go to Board
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {myTasks.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <p className="text-xs">No active assignments</p>
                <p className="text-[10px] mt-1 text-gray-400 font-normal">All your tasks are completed or unassigned.</p>
              </div>
            ) : (
              myTasks.map((t) => {
                const isOverdue = t.status !== "Done" && t.dueDate && t.dueDate < new Date().toISOString().split("T")[0];
                return (
                  <div
                    key={t.id}
                    className="group border border-gray-100 rounded-xl p-3.5 hover:border-gray-200 hover:shadow-sm transition bg-gray-50/30 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-gray-800 group-hover:text-indigo-700 transition line-clamp-1">
                        {t.title}
                      </h4>
                      <span className={`text-[10px] px-2 py-0.5 font-semibold rounded-full border ${statusColors[t.status] || "border-gray-100"}`}>
                        {t.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-400 line-clamp-2">
                      {t.description || "No full description added."}
                    </p>

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className={`px-1.5 py-0.5 font-semibold text-[9px] rounded uppercase ${prColors[t.priority] || prColors.Low}`}>
                        {t.priority}
                      </span>
                      <span className={`flex items-center gap-1 font-medium ${isOverdue ? "text-rose-600 font-semibold" : "text-gray-400"}`}>
                        {isOverdue && <AlertTriangle className="h-3 w-3 text-rose-500 animate-pulse" />}
                        Due: {t.dueDate || "N/A"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
