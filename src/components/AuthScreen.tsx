import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mail, Lock, User as UserIcon, Shield, Layers, HelpCircle, Loader2 } from "lucide-react";
import { UserRole } from "../types.js";

interface AuthScreenProps {
  onAuthSuccess: (token: string, user: any) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("Member");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const url = isLogin ? "/api/auth/login" : "/api/auth/register";
    const payload = isLogin
      ? { email, password }
      : { name, email, password, role };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "An authentication error occurred.");
      }

      onAuthSuccess(data.token, data.user);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50/50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Brand Header */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
            <Layers className="h-8 w-8" />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900 font-sans">
            Atlas TeamHub
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Collaborative team, task, and project engine
          </p>
        </div>

        {/* Auth Box */}
        <div id="auth-card" className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-8 shadow-xl shadow-gray-100/80">
          <div className="flex border-b border-gray-100 pb-4">
            <button
              id="tab-login-btn"
              onClick={() => {
                setIsLogin(true);
                setErrorMsg(null);
              }}
              className={`relative flex-1 py-2 text-center text-sm font-semibold transition-colors ${
                isLogin ? "text-indigo-600" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              Log In
              {isLogin && (
                <motion.div
                  layoutId="authTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
                />
              )}
            </button>
            <button
              id="tab-register-btn"
              onClick={() => {
                setIsLogin(false);
                setErrorMsg(null);
              }}
              className={`relative flex-1 py-2 text-center text-sm font-semibold transition-colors ${
                !isLogin ? "text-indigo-600" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              Sign Up / Register
              {!isLogin && (
                <motion.div
                  layoutId="authTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
                />
              )}
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={isLogin ? "login" : "register"}
              initial={{ opacity: 0, x: isLogin ? -10 : 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isLogin ? 10 : -10 }}
              transition={{ duration: 0.15 }}
              onSubmit={handleSubmit}
              className="mt-6 space-y-4"
            >
              {errorMsg && (
                <div id="auth-error" className="rounded-lg bg-rose-50 p-3 text-xs font-medium text-rose-600 border border-rose-100">
                  {errorMsg}
                </div>
              )}

              {!isLogin && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Your Name
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <UserIcon className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      id="register-name"
                      type="text"
                      required
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full rounded-lg border border-gray-200 bg-gray-50/30 py-2.5 pl-10 pr-3 text-sm placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Email Address
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Mail className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-lg border border-gray-200 bg-gray-50/30 py-2.5 pl-10 pr-3 text-sm placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Password
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    id="auth-password"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-lg border border-gray-200 bg-gray-50/30 py-2.5 pl-10 pr-3 text-sm placeholder-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                {!isLogin && (
                  <p className="mt-1 text-[11px] text-gray-400">
                    Must be at least 6 characters
                  </p>
                )}
              </div>

              {!isLogin && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Workspace Role
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      id="role-member-select"
                      type="button"
                      onClick={() => setRole("Member")}
                      className={`flex items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-all ${
                        role === "Member"
                          ? "border-indigo-600 bg-indigo-50/50 text-indigo-700"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <UserIcon className="h-3.5 w-3.5" />
                      Member Role
                    </button>
                    <button
                      id="role-admin-select"
                      type="button"
                      onClick={() => setRole("Admin")}
                      className={`flex items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-all ${
                        role === "Admin"
                          ? "border-indigo-600 bg-indigo-50/50 text-indigo-700"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <Shield className="h-3.5 w-3.5" />
                      Admin Role
                    </button>
                  </div>
                  <div className="mt-2 text-[11px] bg-gray-50 border border-gray-100 p-2 rounded text-gray-400 flex gap-2">
                    <HelpCircle className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                    <span>
                      {role === "Admin"
                        ? "Admins can create/delete any project & assign any user."
                        : "Members can update task statuses but cannot delete projects."}
                    </span>
                  </div>
                </div>
              )}

              <button
                id="auth-submit-btn"
                type="submit"
                disabled={loading}
                className="mt-4 flex w-full items-center justify-center rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isLogin ? "Logging in..." : "Creating account..."}
                  </>
                ) : isLogin ? (
                  "Log In"
                ) : (
                  "Create Account"
                )}
              </button>
            </motion.form>
          </AnimatePresence>
        </div>

        {/* Testing Info Helper Badge */}
        <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 text-center text-xs text-amber-800">
          <p className="font-semibold mb-1 flex items-center justify-center gap-1.5">
            💡 Testing Simulation Node
          </p>
          <p className="text-[11px] text-amber-700/90 leading-relaxed">
            Create an <b>Admin</b> to design layouts, create first projects and draft tasks. Then create a <b>Member</b> to demonstrate restricted workflows.
          </p>
        </div>
      </div>
    </div>
  );
}
