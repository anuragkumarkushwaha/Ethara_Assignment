import React, { useEffect, useState } from "react";
import { PlusCircle, Users, Trash2, Key, Info, Check, UserCheck, X, FolderKanban, Loader2 } from "lucide-react";
import { Project, User } from "../types.js";

interface ProjectsProps {
  token: string | null;
  currentUser: any;
  onRefreshMetrics?: () => void;
}

export default function Projects({ token, currentUser, onRefreshMetrics }: ProjectsProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New Project Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjName, setNewProjName] = useState("");
  const [newProjDesc, setNewProjDesc] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Add Member State
  const [openAddMemberMap, setOpenAddMemberMap] = useState<{ [projectId: string]: string }>({});

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Fetch projects
      const pRes = await fetch("/api/projects", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!pRes.ok) throw new Error("Could not retrieve projects.");
      const pData = await pRes.json();
      setProjects(pData);

      // 2. Fetch full users directory
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
    fetchData();
  }, [token]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;

    setActionLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newProjName.trim(),
          description: newProjDesc.trim()
        })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create project workspace.");
      }

      setProjects(prev => [data, ...prev]);
      setNewProjName("");
      setNewProjDesc("");
      setShowCreateForm(false);
      if (onRefreshMetrics) onRefreshMetrics();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Are you absolutely sure you want to delete this project? All associated tasks will be permanently deleted.")) {
      return;
    }

    setErrorMsg(null);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete project.");
      }

      setProjects(prev => prev.filter(p => p.id !== projectId));
      if (onRefreshMetrics) onRefreshMetrics();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleInviteMember = async (projectId: string) => {
    const selectedUserId = openAddMemberMap[projectId];
    if (!selectedUserId) return;

    setErrorMsg(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userId: selectedUserId })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add member.");
      }

      // Update local project member state
      setProjects(prev => prev.map(p => (p.id === projectId ? data : p)));
      setOpenAddMemberMap(prev => ({ ...prev, [projectId]: "" }));
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleRemoveMember = async (projectId: string, memberId: string) => {
    if (!confirm("Remove this member from the project? They will lose access and their active task assignments will be unassigned.")) {
      return;
    }

    setErrorMsg(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to remove member.");
      }

      setProjects(prev => prev.map(p => (p.id === projectId ? data : p)));
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
          <p className="mt-2 text-sm text-gray-500">Loading your project environments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-sans">
            Projects & Workspace Teams
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Create independent workspaces and invite team members. Admins or Creators maintain project management privileges.
          </p>
        </div>
        <button
          id="btn-trigger-proj-modal"
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-1.5 self-start rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 transition cursor-pointer"
        >
          <PlusCircle className="h-4 w-4" />
          Create Project
        </button>
      </div>

      {errorMsg && (
        <div id="projects-alert" className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-xs font-medium text-rose-600">
          ⚠️ Action denied: {errorMsg}
        </div>
      )}

      {/* Slide-out/Toggle Form container for Creating Projects */}
      {showCreateForm && (
        <form
          id="create-project-form"
          onSubmit={handleCreateProject}
          className="rounded-2xl border border-indigo-100 bg-indigo-50/20 p-6 space-y-4 shadow-inner"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-indigo-900">Configure New Project Workspace</h3>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <label className="block text-xs font-medium text-indigo-900 mb-1">Project Code Name</label>
              <input
                id="proj-input-name"
                type="text"
                required
                placeholder="e.g., Apollo Web Portal"
                value={newProjName}
                onChange={(e) => setNewProjName(e.target.value)}
                className="block w-full rounded-lg border border-gray-200 bg-white py-2 px-3 text-sm placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-indigo-900 mb-1">Scope / Mission Description</label>
              <input
                id="proj-input-desc"
                type="text"
                placeholder="Describe objectives, KPIs, and deliverables."
                value={newProjDesc}
                onChange={(e) => setNewProjDesc(e.target.value)}
                className="block w-full rounded-lg border border-gray-200 bg-white py-2 px-3 text-sm placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="proj-submit-btn"
              type="submit"
              disabled={actionLoading}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
            >
              {actionLoading ? "Establishing..." : "Instantiate Workspace"}
            </button>
          </div>
        </form>
      )}

      {/* Project Grid */}
      {projects.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center bg-gray-50/20">
          <FolderKanban className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-sm font-bold text-gray-900 font-sans">No workspace active</h3>
          <p className="mt-2 text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
            Begin by launching a project workspace. You can then assign tasks and track status changes with your colleagues.
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
          >
            Create first project now
          </button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {projects.map((proj) => {
            const isOwner = proj.ownerId === currentUser?.id;
            const canManage = currentUser?.role === "Admin" || isOwner;
            const ownerObj = usersList.find((u) => u.id === proj.ownerId);

            // Filter users who are NOT currently in the project membership list
            const eligibleToInvite = usersList.filter(
              (u) => !proj.members.includes(u.id)
            );

            return (
              <div
                key={proj.id}
                id={`project-card-${proj.id}`}
                className="flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm shadow-gray-100/50 hover:shadow-md transition gap-4"
              >
                {/* Meta Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-gray-900 font-sans group-hover:text-indigo-600">
                      {proj.name}
                    </h3>
                    <p className="text-xs text-gray-400 font-mono">ID: {proj.id.split("-")[0]}...</p>
                  </div>
                  
                  {canManage && (
                    <button
                      id={`delete-proj-${proj.id}`}
                      onClick={() => handleDeleteProject(proj.id)}
                      title="Deletes this workspace and all associated tasks."
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-gray-500 leading-relaxed min-h-[40px]">
                  {proj.description || "No description provided."}
                </p>

                {/* Team Owner / Creator tag */}
                <div className="flex items-center gap-2 text-[11px] text-gray-400 bg-gray-50 py-1.5 px-3 rounded-lg max-w-max">
                  <Key className="h-3 w-3 text-amber-500" />
                  <span>Workspace Creator:</span>
                  <span className="font-semibold text-gray-700">
                    {ownerObj?.name || "Original Creator"} ({ownerObj?.email})
                  </span>
                </div>

                <hr className="border-gray-50" />

                {/* Team Grid section */}
                <div className="space-y-3 flex-1">
                  <div className="flex items-center justify-between text-xs">
                    <h4 className="font-bold text-gray-800 flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-gray-400" />
                      Assigned Team Members ({proj.members.length})
                    </h4>
                  </div>

                  {/* List of members inside project */}
                  <div className="space-y-1.5 text-xs max-h-[160px] overflow-y-auto">
                    {proj.members.map((memberId) => {
                      const userObj = usersList.find((u) => u.id === memberId);
                      if (!userObj) return null;
                      const isMemberOwner = proj.ownerId === memberId;
                      return (
                        <div
                          key={memberId}
                          className="flex items-center justify-between p-2 rounded-lg bg-gray-50/50 border border-gray-100"
                        >
                          <div className="flex items-center gap-2">
                            <span className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">
                              {userObj.name[0].toUpperCase()}
                            </span>
                            <div>
                              <p className="font-medium text-gray-800">{userObj.name}</p>
                              <p className="text-[10px] text-gray-400 font-normal">{userObj.email} • {userObj.role}</p>
                            </div>
                          </div>

                          {isMemberOwner ? (
                            <span className="text-[9px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded px-1.5 uppercase">
                              Owner
                            </span>
                          ) : (
                            canManage && (
                              <button
                                id={`uninvite-${proj.id}-${memberId}`}
                                onClick={() => handleRemoveMember(proj.id, memberId)}
                                className="text-gray-400 hover:text-rose-500 p-1"
                                title="Remove user from project"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Invite Section (Admins / Owner Only) */}
                {canManage && (
                  <div className="pt-3 border-t border-gray-100 space-y-2">
                    <p className="text-[10px] font-semibold text-indigo-700">Invite Co-worker</p>
                    <div className="flex gap-2">
                      <select
                        id={`user-invite-select-${proj.id}`}
                        value={openAddMemberMap[proj.id] || ""}
                        onChange={(e) =>
                          setOpenAddMemberMap((prev) => ({
                            ...prev,
                            [proj.id]: e.target.value
                          }))
                        }
                        className="block flex-1 rounded-lg border border-gray-200 bg-white py-1.5 px-2 text-xs text-gray-700 focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="">Select Team Member...</option>
                        {eligibleToInvite.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.email}) - {u.role}
                          </option>
                        ))}
                      </select>
                      <button
                        id={`btn-invite-member-${proj.id}`}
                        onClick={() => handleInviteMember(proj.id)}
                        disabled={!openAddMemberMap[proj.id]}
                        className="rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 px-3.5 py-1 text-xs font-semibold hover:bg-indigo-100 transition disabled:opacity-40 cursor-pointer"
                      >
                        Add Member
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
