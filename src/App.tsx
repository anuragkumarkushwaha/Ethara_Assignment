import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LayoutDashboard, Library, CheckSquare, LogOut, ShieldAlert, User, Menu, X, Terminal } from "lucide-react";
import AuthScreen from "./components/AuthScreen.js";
import Dashboard from "./components/Dashboard.js";
import Projects from "./components/Projects.js";
import TasksBoard from "./components/TasksBoard.js";
import { User as UserType } from "./types.js";

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("synergy_token"));
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Navigation Tabs state: "dashboard", "projects", "tasks"
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Verification checks for initial login
  useEffect(() => {
    const verifyUserSession = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data.user);
        } else {
          // Token expired, clear it
          handleLogout();
        }
      } catch (err) {
        console.error("Auto authentication failed:", err);
      } finally {
        setLoading(false);
      }
    };
    verifyUserSession();
  }, [token]);

  const handleAuthSuccess = (newToken: string, user: UserType) => {
    localStorage.setItem("synergy_token", newToken);
    setToken(newToken);
    setCurrentUser(user);
    setActiveTab("dashboard");
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (e) {
        console.error("Silent logout error", e);
      }
    }
    localStorage.removeItem("synergy_token");
    setToken(null);
    setCurrentUser(null);
    setActiveTab("dashboard");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50/50">
        <div className="text-center space-y-3">
          <Terminal className="mx-auto h-10 w-10 text-indigo-600 animate-pulse" />
          <h2 className="text-sm font-bold tracking-tight text-gray-900 font-sans">Synergy Core</h2>
          <p className="text-xs text-gray-500">Parsing cryptographic session tokens...</p>
        </div>
      </div>
    );
  }

  // Not logged in -> Show Auth screens
  if (!token || !currentUser) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  // Main UI render after Auth
  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900">
      
      {/* Top Banner Navigation Row */}
      <header className="sticky top-0 z-40 w-full border-b border-gray-100 bg-white/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            
            {/* Logo area */}
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow shadow-indigo-100">
                <Terminal className="h-5 w-5" />
              </div>
              <span className="text-base font-bold text-gray-950 tracking-tight font-sans">
                Synergy Workspace
              </span>
            </div>

            {/* Desktop Navigation Link buttons */}
            <nav className="hidden md:flex items-center gap-1.5">
              <button
                id="nav-dashboard-tab"
                onClick={() => setActiveTab("dashboard")}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === "dashboard"
                    ? "bg-indigo-50/60 text-indigo-700"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                Dashboard
              </button>

              <button
                id="nav-projects-tab"
                onClick={() => setActiveTab("projects")}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === "projects"
                    ? "bg-indigo-50/60 text-indigo-700"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Library className="h-3.5 w-3.5" />
                Projects & Workspace
              </button>

              <button
                id="nav-tasks-tab"
                onClick={() => setActiveTab("tasks")}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === "tasks"
                    ? "bg-indigo-50/60 text-indigo-700"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <CheckSquare className="h-3.5 w-3.5" />
                Kanban Tasks
              </button>
            </nav>

            {/* User Profile Coordinate Area */}
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-2.5 bg-gray-50 rounded-xl py-1 px-3 border border-gray-100">
                <span className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px]">
                  {currentUser.name[0].toUpperCase()}
                </span>
                <div className="text-left leading-none">
                  <p className="text-xs font-bold text-gray-800">{currentUser.name}</p>
                  <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest">{currentUser.role}</span>
                </div>
              </div>
              
              <button
                id="logout-btn-desktop"
                onClick={handleLogout}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-100 text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                title="Log Out Session"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Handheld/Mobile Menu Button */}
            <div className="flex md:hidden items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-600 focus:outline-none"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>

          </div>
        </div>

        {/* Handheld/Mobile Nav Panel drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white p-4 space-y-2">
            <button
              id="mobile-nav-dashboard"
              onClick={() => {
                setActiveTab("dashboard");
                setMobileMenuOpen(false);
              }}
              className={`flex w-full items-center gap-2 p-2.5 text-xs font-semibold rounded-lg ${
                activeTab === "dashboard" ? "bg-indigo-50 text-indigo-700" : "text-gray-500"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </button>
            <button
              id="mobile-nav-projects"
              onClick={() => {
                setActiveTab("projects");
                setMobileMenuOpen(false);
              }}
              className={`flex w-full items-center gap-2 p-2.5 text-xs font-semibold rounded-lg ${
                activeTab === "projects" ? "bg-indigo-50 text-indigo-700" : "text-gray-500"
              }`}
            >
              <Library className="h-4 w-4" />
              Projects & Workspace
            </button>
            <button
              id="mobile-nav-tasks"
              onClick={() => {
                setActiveTab("tasks");
                setMobileMenuOpen(false);
              }}
              className={`flex w-full items-center gap-2 p-2.5 text-xs font-semibold rounded-lg ${
                activeTab === "tasks" ? "bg-indigo-50 text-indigo-700" : "text-gray-500"
              }`}
            >
              <CheckSquare className="h-4 w-4" />
              Kanban Tasks
            </button>

            <hr className="border-gray-100 my-2" />

            <div className="flex items-center justify-between p-2">
              <div className="flex items-center gap-2">
                <span className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                  {currentUser.name[0].toUpperCase()}
                </span>
                <div>
                  <p className="text-xs font-bold text-gray-800">{currentUser.name}</p>
                  <p className="text-[10px] text-indigo-600 font-semibold uppercase">{currentUser.role}</p>
                </div>
              </div>
              <button
                id="logout-btn-mobile"
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-lg border border-rose-100 bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-rose-700"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === "dashboard" && (
              <Dashboard
                token={token}
                currentUser={currentUser}
                onNavigateToTab={(tab) => setActiveTab(tab)}
              />
            )}
            
            {activeTab === "projects" && (
              <Projects
                token={token}
                currentUser={currentUser}
              />
            )}
            
            {activeTab === "tasks" && (
              <TasksBoard
                token={token}
                currentUser={currentUser}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Sticky footer */}
      <footer className="border-t border-gray-100 bg-white py-6 mt-16 text-center text-xs text-gray-400">
        <div className="mx-auto max-w-7xl px-4">
          <p>© 2026 Synergy Manager Core Engine. Structured Client-Server Architecture.</p>
        </div>
      </footer>

    </div>
  );
}
