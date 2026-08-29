"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LogIn, UserPlus, Mail, Lock, User, Sparkles } from "lucide-react";

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

    const storeSessionAndRedirect = (data: {
    access_token: string;
    role: string;
    full_name: string;
    email: string;
    id: number;
    profile_image_url?: string | null;
  }) => {
    localStorage.setItem("token", data.access_token);
    const expiryTime = Date.now() + 60 * 60 * 1000; // 1 hour
localStorage.setItem("token_expiry", expiryTime.toString());
    localStorage.setItem("role", data.role);
    localStorage.setItem("fullName", data.full_name);
    localStorage.setItem("email", data.email);
    localStorage.setItem("user_id", data.id.toString());
    // Same key/pattern the profile-photo upload helper already uses, so
    // Navbar.tsx / MobileTopNavbar.tsx pick this up with no other changes.
    // Unconditionally set (not skipped when empty) so a DIFFERENT user
    // logging into the same browser always overwrites any previous
    // user's stale photo — never left over from an unclean session.
    localStorage.setItem("profileImageUrl", data.profile_image_url || "");
    router.push("/home");
  };

  const handleLogin = async (loginEmail: string, loginPassword: string) => {
    const response = await fetch("https://vinayakax-backend.onrender.com/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
  login: email,
  password: password,
}),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.detail || "Incorrect email or password.");
    }

    const data = await response.json();
    console.log("LOGIN RESPONSE =", data);
console.log("USER ID =", data.id);
    storeSessionAndRedirect(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "login") {
        await handleLogin(email, password);
      } else {
        // Register the new devotee account first
        const registerResponse = await fetch("https://vinayakax-backend.onrender.com/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, full_name: fullName, password }),
        });

        if (!registerResponse.ok) {
          const data = await registerResponse.json().catch(() => null);
          throw new Error(data?.detail || "Registration failed. Please try again.");
        }

        // Auto-login immediately after successful registration
        await handleLogin(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-[70vh] py-10 overflow-hidden">
      {/* Soft glowing festival particles (lightweight, CSS-only) */}
      <div className="pointer-events-none absolute -z-10 top-6 left-1/2 -translate-x-[220px] h-20 w-20 rounded-full bg-gold-400/25 blur-2xl animate-pulse-glow" />
      <div className="pointer-events-none absolute -z-10 bottom-10 left-1/2 translate-x-[180px] h-24 w-24 rounded-full bg-saffron-500/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -z-10 top-1/3 left-1/2 translate-x-[260px] h-3 w-3 rounded-full bg-gold-300 blur-[2px] animate-float" />
      <div className="pointer-events-none absolute -z-10 bottom-1/4 left-1/2 -translate-x-[240px] h-2.5 w-2.5 rounded-full bg-saffron-300 blur-[2px] animate-pulse-glow" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md space-y-6"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          {/* Small Om emblem */}
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-saffron-500 to-gold-500 shadow-lg shadow-saffron-500/20 animate-[pulse-glow_3s_ease-in-out_infinite]">
            <span className="text-2xl leading-none text-white select-none">ॐ</span>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-saffron-100 dark:bg-amber-950/40 text-saffron-600 dark:text-gold-400 text-xs font-bold border border-saffron-300/20">
            <Sparkles className="h-3.5 w-3.5" />
            Sri Vinayaka Navarathri Mahotsavam 2026
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 dark:text-white">
            {mode === "login" ? "Welcome Back" : "Join the Utsavam"}
          </h1>
          <p className="text-stone-600 dark:text-stone-300 text-xs sm:text-sm">
            {mode === "login"
              ? "Sign in to access the festival portal."
              : "Create your account to register, donate & volunteer."}
          </p>
        </div>

        {/* Form Card */}
        <div className="glass-panel rounded-2xl p-6 space-y-5 border border-saffron-500/15 shadow-xl shadow-black/5 dark:shadow-black/40 transition-shadow duration-300 hover:shadow-gold-500/10">
          {/* Mode Switch */}
          <div className="flex rounded-full bg-stone-100 dark:bg-stone-900 p-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => { setMode("login"); setError(""); }}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-full py-2 transition-all cursor-pointer ${
                mode === "login"
                  ? "bg-saffron-500 text-white shadow-sm"
                  : "text-stone-600 dark:text-stone-300"
              }`}
            >
              <LogIn className="h-3.5 w-3.5" />
              Login
            </button>
            <button
              type="button"
              onClick={() => { setMode("register"); setError(""); }}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-full py-2 transition-all cursor-pointer ${
                mode === "register"
                  ? "bg-saffron-500 text-white shadow-sm"
                  : "text-stone-600 dark:text-stone-300"
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="text-xs font-bold text-stone-500 dark:text-stone-400 block mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="h-4 w-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 pl-9 text-stone-800 dark:text-stone-100 focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 transition-all duration-300"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-stone-500 dark:text-stone-400 block mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 pl-9 text-stone-800 dark:text-stone-100 focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 transition-all duration-300"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-500 dark:text-stone-400 block mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="h-4 w-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={4}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 pl-9 text-stone-800 dark:text-stone-100 focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 transition-all duration-300"
                />
              </div>
            </div>
<div className="flex justify-end">
  <button
    type="button"
    onClick={() => router.push("/forgot-password")}
    className="text-sm font-semibold text-saffron-600 hover:text-saffron-700"
  >
    Forgot Password?
  </button>
</div>
            {error && (
              <p className="text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-saffron-500 to-gold-500 text-white font-bold py-2.5 transition-all duration-300 cursor-pointer text-center disabled:opacity-60 hover:shadow-lg hover:shadow-gold-500/30 hover:-translate-y-0.5"
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                ? "Login"
                : "Create Account"}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-stone-500 dark:text-stone-500">
          Admin access: use your committee-issued email &amp; password.
        </p>
      </motion.div>
    </div>
  );
}