import React, { useEffect, useState } from "react";
import { PlusCircle, Search, User, Calendar, AlertCircle, Edit, Trash2, ArrowRight, ArrowLeft, Loader2, Info, CheckCircle, Clock } from "lucide-react";
import { Task, Project, User as WorkspaceUser, TaskStatus, TaskPriority } from "../types.js";

interface TasksBoardProps {
  token: string | null;
  currentUser: any;
  onRefreshMetrics?: () => void;
}

export default function TasksBoard({ token, currentUser, onRefreshMetrics }: TasksBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [usersList, setUsersList] = useState<WorkspaceUser[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters State
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Create Task Form / Dialog State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [taskProjId, setTaskProjId] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("Medium");
  const [taskAssignee, setTaskAssignee] = useState<string>("");
  const [taskDueDate, setTaskDueDate] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);

  // Edit Task Status Form State (Quick Dropdown toggle index)
  const [activeTaskMoveId, setActiveTaskMoveId] = useState<string | null>(null);

  const fetchBoardData = async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Tasks
      const tRes = await fetch("/api/tasks", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!tRes.ok) throw new Error("Could not retrieve tasks.");
      const tData = await tRes.json();
      setTasks(tData);

      // 2. Projects
      const pRes = await fetch("/api/projects", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!pRes.ok) throw new Error("Could not retrieve projects.");
      const pData = await pRes.json();
      setProjects(pData);
      
      // Auto-select first project in the dropdown form as default
      if (pData.length > 0) {
        setTaskProjId(pData[0].id);
      }

      // 3. Registered Users Directory
      const uRes = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!uRes.ok) throw new Error("Could not retrieve user directory.");
      const uData = await uRes.json();
      setUsersList(uData);

    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoardData();
  }, [token]);

  // Handle creating tasks (Only project owner or global admin)
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskProjId || !taskTitle.trim()) return;

    setActionLoading(true);
    setErrorMsg(null);

    const payload = {
      projectId: taskProjId,
      title: taskTitle.trim(),
      description: taskDesc.trim(),
      status: "Todo" as TaskStatus,
      priority: taskPriority,
      assigneeId: taskAssignee || null,
      dueDate: taskDueDate || undefined
    };

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create task card.");
      }

      setTasks(prev => [data, ...prev]);
      
      // Clear fields
      setTaskTitle("");
      setTaskDesc("");
      setTaskPriority("Medium");
      setTaskAssignee("");
      setTaskDueDate("");
      setShowCreateModal(false);
      
      if (onRefreshMetrics) onRefreshMetrics();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Perform quick task status transition
  const handleTransitionTask = async (taskId: string, currentStatus: TaskStatus, direction: "next" | "prev") => {
    const sequence: TaskStatus[] = ["Todo", "In Progress", "In Review", "Done"];
    const idx = sequence.indexOf(currentStatus);
    const nextIdx = direction === "next" ? idx + 1 : idx - 1;
    
    if (nextIdx < 0 || nextIdx >= sequence.length) return;
    const targetStatus = sequence[nextIdx];

    setErrorMsg(null);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: targetStatus })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update task state.");
      }

      setTasks(prev => prev.map(t => (t.id === taskId ? data : t)));
      if (onRefreshMetrics) onRefreshMetrics();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleUpdateStatusDropdown = async (taskId: string, targetStatus: TaskStatus) => {
    setErrorMsg(null);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: targetStatus })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save state.");
      }

      setTasks(prev => prev.map(t => (t.id === taskId ? data : t)));
      setActiveTaskMoveId(null);
      if (onRefreshMetrics) onRefreshMetrics();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task card?")) return;

    setErrorMsg(null);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete task.");
      }

      setTasks(prev => prev.filter(t => t.id !== taskId));
      if (onRefreshMetrics) onRefreshMetrics();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  // Helper selectors for Project information
  const getProjectName = (projId: string) => {
    return projects.find(p => p.id === projId)?.name || "External Project";
  };

  const getAssigneeNameName = (userId: string | null) => {
    if (!userId) return "Unassigned";
    const userObj = usersList.find(u => u.id === userId);
    return userObj ? userObj.name : "Unknown User";
  };

  // Find valid assignees for targeted project creation (Only users invited to this project + owner!)
  const getProjectValidRoster = (): WorkspaceUser[] => {
    if (!taskProjId) return [];
    const targetedProject = projects.find(p => p.id === taskProjId);
    if (!targetedProject) return [];
    
    // Eligible members are listed in standard members array.
    return usersList.filter(u => targetedProject.members.includes(u.id) || targetedProject.ownerId === u.id);
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    const matchesProj = selectedProjectId === "all" || t.projectId === selectedProjectId;
    const matchesQuery =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesProj && matchesQuery;
  });

  // Split tasks into Kanban columns
  const todoTasks = filteredTasks.filter(t => t.status === "Todo");
  const inProgressTasks = filteredTasks.filter(t => t.status === "In Progress");
  const inReviewTasks = filteredTasks.filter(t => t.status === "In Review");
  const doneTasks = filteredTasks.filter(t => t.status === "Done");

  const colorsByPriority = {
    Low: "bg-slate-50 text-slate-700 border-slate-200/60",
    Medium: "bg-sky-50 text-sky-700 border-sky-100",
    High: "bg-amber-50 text-amber-700 border-amber-100",
    Urgent: "bg-rose-50 text-rose-700 border-rose-100 font-bold"
  };

  const renderTaskCard = (task: Task) => {
    const parentProj = projects.find(p => p.id === task.projectId);
    const isOwnerOrAdmin = currentUser?.role === "Admin" || (parentProj && parentProj.ownerId === currentUser?.id);
    const isOverdue = task.status !== "Done" && task.dueDate && task.dueDate < new Date().toISOString().split("T")[0];

    return (
      <div
        key={task.id}
        id={`task-card-${task.id}`}
        className="group relative rounded-xl border border-gray-100 bg-white p-4.5 shadow-sm hover:shadow-md hover:border-gray-200 transition space-y-3.5"
      >
        {/* Project Tag */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded uppercase tracking-wide">
            {getProjectName(task.projectId)}
          </span>
          
          {isOwnerOrAdmin && (
            <button
              id={`delete-task-${task.id}`}
              onClick={() => handleDeleteTask(task.id)}
              className="text-gray-300 hover:text-rose-600 transition p-1 cursor-pointer"
              title="Delete task card"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Title & Desc */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-bold text-gray-800 line-clamp-2 leading-snug">
            {task.title}
          </h4>
          <p className="text-[11px] text-gray-400 font-normal line-clamp-3 leading-relaxed">
            {task.description || "No description provided."}
          </p>
        </div>

        {/* Due Date & Assignee */}
        <div className="grid grid-cols-2 gap-2 text-[10px] pt-1">
          <div className="flex items-center gap-1.5 text-gray-500 font-medium">
            <User className="h-3 w-3 flex-shrink-0 text-gray-400" />
            <span className="truncate" title={getAssigneeNameName(task.assigneeId)}>
              {getAssigneeNameName(task.assigneeId)}
            </span>
          </div>

          <div className={`flex items-center gap-1.5 font-semibold justify-end ${
            isOverdue ? "text-rose-600 font-bold" : "text-gray-400"
          }`}>
            <Calendar className="h-3 w-3 flex-shrink-0" />
            <span>{task.dueDate || "N/A"}</span>
          </div>
        </div>

        {/* Footer actions & Priority */}
        <div className="flex items-center justify-between border-t border-gray-50 pt-2.5">
          {/* Priority Badge */}
          <span className={`text-[9px] font-semibold px-2 py-0.5 rounded uppercase ${colorsByPriority[task.priority]}`}>
            {task.priority}
          </span>

          {/* Workflow Transitions */}
          <div className="flex items-center gap-1.5">
            {task.status !== "Todo" && (
              <button
                id={`task-prev-${task.id}`}
                onClick={() => handleTransitionTask(task.id, task.status, "prev")}
                className="rounded bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100 p-1 cursor-pointer"
                title="Move Left"
              >
                <ArrowLeft className="h-3 w-3" />
              </button>
            )}

            {/* Quick Status Select for mobile / touch */}
            <div className="relative">
              <button
                id={`task-move-trigger-${task.id}`}
                onClick={() => setActiveTaskMoveId(activeTaskMoveId === task.id ? null : task.id)}
                className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded cursor-pointer hover:bg-indigo-100/50"
              >
                Move To
              </button>
              
              {activeTaskMoveId === task.id && (
                <div className="absolute right-0 bottom-full mb-1.5 z-20 w-32 rounded-lg border border-gray-100 bg-white p-1 shadow-lg ring-1 ring-black/5 text-[10px]">
                  {(["Todo", "In Progress", "In Review", "Done"] as TaskStatus[]).map((st) => (
                    <button
                      key={st}
                      id={`opt-status-${task.id}-${st}`}
                      onClick={() => handleUpdateStatusDropdown(task.id, st)}
                      className={`block w-full text-left rounded-md px-2 py-1.5 ${
                        task.status === st
                          ? "bg-indigo-50 font-bold text-indigo-700"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {task.status !== "Done" && (
              <button
                id={`task-next-${task.id}`}
                onClick={() => handleTransitionTask(task.id, task.status, "next")}
                className="rounded bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 p-1 cursor-pointer"
                title="Move Right"
              >
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Red warning bar on overdue active items */}
        {isOverdue && (
          <div className="absolute top-0 bottom-0 left-0 w-1 bg-red-500 rounded-l-xl" />
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
          <p className="mt-2 text-sm text-gray-500">Opening project board metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-sans">
            Collaborative Kanban Board
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Organize, update progress, and coordinate assignments. Dropdowns reflect allowed co-workers for each project.
          </p>
        </div>
        <button
          id="btn-trigger-task-modal"
          onClick={() => {
            if (projects.length === 0) {
              alert("You must create at least one project before you can create tasks!");
              return;
            }
            setShowCreateModal(true);
          }}
          className="flex items-center gap-1.5 self-start rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 transition cursor-pointer"
        >
          <PlusCircle className="h-4 w-4" />
          Add Task Card
        </button>
      </div>

      {errorMsg && (
        <div id="tasks-alert" className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-xs font-medium text-rose-600">
          ⚠️ Operational Denied: {errorMsg}
        </div>
      )}

      {/* Interactive Filters Panel */}
      <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm shadow-gray-100/30 flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Project Selector filter */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Filter Workspace</label>
          <select
            id="filter-project-select"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="block w-full rounded-lg border border-gray-200 bg-white py-1.5 px-3 text-xs text-gray-700 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">📁 All Workspaces & Projects ({tasks.length})</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                📁 {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Text search querying */}
        <div className="flex-1 min-w-[220px]">
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Search Keywords</label>
          <div className="relative">
            <input
              id="task-search-input"
              type="text"
              placeholder="Search title or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-xs placeholder-gray-400 focus:border-indigo-500 focus:outline-none"
            />
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Kanban Board Container */}
      {projects.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center bg-gray-50/20">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-sm font-bold text-gray-900">Task Board Disabled</h3>
          <p className="mt-2 text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
            Please navigate to the <b>Projects</b> tab and create a project first. Workspaces are needed to group related tasks.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          
          {/* Column 1: Todo */}
          <div className="flex flex-col gap-3.5 bg-gray-50/50 rounded-2xl p-4 border border-gray-100 min-h-[450px]">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2 flex-shrink-0">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                <h3 className="text-xs font-bold text-gray-700 uppercase">To Do</h3>
              </span>
              <span className="text-[10px] font-bold bg-slate-200/50 text-slate-700 px-2 py-0.5 rounded-full">
                {todoTasks.length}
              </span>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-1">
              {todoTasks.length === 0 ? (
                <p className="text-[10px] text-gray-400 text-center py-8">None pending</p>
              ) : (
                todoTasks.map(renderTaskCard)
              )}
            </div>
          </div>

          {/* Column 2: In Progress */}
          <div className="flex flex-col gap-3.5 bg-blue-50/10 rounded-2xl p-4 border border-blue-50/20 min-h-[450px]">
            <div className="flex items-center justify-between border-b border-blue-50/50 pb-2 flex-shrink-0">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                <h3 className="text-xs font-bold text-blue-700 uppercase">In Progress</h3>
              </span>
              <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                {inProgressTasks.length}
              </span>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-1">
              {inProgressTasks.length === 0 ? (
                <p className="text-[10px] text-gray-400 text-center py-8">No active sprints</p>
              ) : (
                inProgressTasks.map(renderTaskCard)
              )}
            </div>
          </div>

          {/* Column 3: In Review */}
          <div className="flex flex-col gap-3.5 bg-purple-50/10 rounded-2xl p-4 border border-purple-50/20 min-h-[450px]">
            <div className="flex items-center justify-between border-b border-purple-50/50 pb-2 flex-shrink-0">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-purple-500" />
                <h3 className="text-xs font-bold text-purple-700 uppercase">In Review</h3>
              </span>
              <span className="text-[10px] font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                {inReviewTasks.length}
              </span>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-1">
              {inReviewTasks.length === 0 ? (
                <p className="text-[10px] text-gray-400 text-center py-8">No feedback items</p>
              ) : (
                inReviewTasks.map(renderTaskCard)
              )}
            </div>
          </div>

          {/* Column 4: Done */}
          <div className="flex flex-col gap-3.5 bg-emerald-50/10 rounded-2xl p-4 border border-emerald-50/20 min-h-[450px]">
            <div className="flex items-center justify-between border-b border-emerald-50/50 pb-2 flex-shrink-0">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <h3 className="text-xs font-bold text-emerald-700 uppercase">Completed</h3>
              </span>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                {doneTasks.length}
              </span>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-1">
              {doneTasks.length === 0 ? (
                <p className="text-[10px] text-gray-400 text-center py-8">No closed tasks</p>
              ) : (
                doneTasks.map(renderTaskCard)
              )}
            </div>
          </div>

        </div>
      )}

      {/* Create Task Modal Dialog Overlay */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-gray-100 bg-white p-6 shadow-xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-md font-bold text-gray-900 flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-indigo-600" />
                Assemble Workspace Task
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 pointer-events-auto cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form id="create-task-modal-form" onSubmit={handleCreateTask} className="space-y-4 text-xs">
              
              {/* Project workspace selection */}
              <div>
                <label className="block text-gray-500 font-semibold mb-1">Target Project Studio</label>
                <select
                  id="task-form-project"
                  required
                  value={taskProjId}
                  onChange={(e) => {
                    setTaskProjId(e.target.value);
                    setTaskAssignee(""); // Clear assignee when project context changes
                  }}
                  className="block w-full rounded-lg border border-gray-200 bg-white py-2 px-3 focus:outline-none focus:border-indigo-500 text-xs"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.ownerId === currentUser?.id ? "(Owner)" : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 mt-1">
                  Note: A user can only be assigned to a task if they have been added to that Project first.
                </p>
              </div>

              {/* Title & Desc */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-gray-500 font-semibold mb-1">Task Deliverable Title</label>
                  <input
                    id="task-form-title"
                    type="text"
                    required
                    placeholder="e.g. Code auth route error fallback validations"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="block w-full rounded-lg border border-gray-200 bg-white py-2 px-3 text-xs placeholder-gray-400 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-gray-500 font-semibold mb-1">Task Specifications & Descriptions</label>
                  <textarea
                    id="task-form-desc"
                    placeholder="Provide precise details, expectations, or logs."
                    value={taskDesc}
                    rows={3}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    className="block w-full rounded-lg border border-gray-200 bg-white py-2 px-3 text-xs placeholder-gray-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Priority, Assignee, and Date */}
              <div className="grid gap-3 sm:grid-cols-3">
                
                <div>
                  <label className="block text-gray-500 font-semibold mb-1">Severity / Priority</label>
                  <select
                    id="task-form-priority"
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                    className="block w-full rounded-lg border border-gray-200 bg-white py-2 px-2 focus:outline-none"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-500 font-semibold mb-1">Assign User</label>
                  <select
                    id="task-form-assignee"
                    value={taskAssignee}
                    onChange={(e) => setTaskAssignee(e.target.value)}
                    className="block w-full rounded-lg border border-gray-200 bg-white py-2 px-2 focus:outline-none"
                  >
                    <option value="">Leave Unassigned</option>
                    {getProjectValidRoster().map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-500 font-semibold mb-1">Due Date</label>
                  <input
                    id="task-form-duedate"
                    type="date"
                    required
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="block w-full rounded-lg border border-gray-200 bg-white py-2 px-2 focus:outline-none text-xs"
                  />
                </div>

              </div>

              <div className="flex gap-2.5 justify-end pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50 hover:text-gray-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="task-modal-submit-btn"
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? "Deploying..." : "Publish Task Card"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
