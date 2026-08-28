"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Sun, Moon, Menu, X, Sparkles } from "lucide-react";
import TempleBell from "./TempleBell";
import ProfileAvatar from "./ProfileAvatar";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  useEffect(() => {
  const isDark = document.documentElement.classList.contains("dark");
  setIsDarkMode(isDark);

  const updateUser = () => {
  const name = localStorage.getItem("fullName");
  const userRole = localStorage.getItem("role");
  // Read fresh every time so a different user's login/logout never
  // leaves a stale photo behind (localStorage.clear() on logout already
  // wipes this key too).
  const photoUrl = localStorage.getItem("profileImageUrl");

  setFullName(name || "");
  setRole(userRole || "");
  setProfileImageUrl(photoUrl || null);
};

  updateUser();

  window.addEventListener("focus", updateUser);
  // Fired by Edit Profile immediately after a successful photo save, so
  // the navbar updates in the same tab without needing a refresh.
  window.addEventListener("profile-photo-updated", updateUser);

  return () => {
    window.removeEventListener("focus", updateUser);
    window.removeEventListener("profile-photo-updated", updateUser);
  };
}, [pathname]);

  const toggleDarkMode = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove("dark");
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add("dark");
      setIsDarkMode(true);
    }
  };

  const triggerHarathiPooja = () => {
    // Dispatch custom event for flower shower animation
    window.dispatchEvent(new Event("trigger-flower-rain"));
  };

  const navLinks = [
    { name: "Home", path: "/home" },
    { name: "About", path: "/about" },
    { name: "Events", path: "/events" },
    { name: "Schedule", path: "/schedule" },
    { name: "Competitions", path: "/competitions" },
    { name: "Gallery", path: "/gallery" },
    { name: "Live Darshan", path: "/live" },
    { name: "Donate", path: "/donate" },
    { name: "Volunteers", path: "/volunteers" },
    { name: "Sponsors", path: "/sponsors" },
    { name: "Contact", path: "/contact" },
    { name: "Profile", path: "/profile" }
  ];

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-saffron-500/10 bg-white/70 dark:bg-stone-950/70 backdrop-blur-md transition-colors duration-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo & Branding */}
          <div className="flex items-center">
            <Link href="/home" className="flex flex-col select-none">
              <span className="text-[10px] tracking-widest text-saffron-600 dark:text-gold-400 font-bold uppercase leading-none">
                UDDANAM RAMAKRISHNA PURAM
              </span>
              <span className="text-lg font-extrabold text-stone-850 dark:text-stone-100 leading-tight">
                Sri Vinayaka 2026
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center space-x-1.5">
            {navLinks.map((link) => {
              const isActive = pathname === link.path;
              return (
                <Link
                  key={link.name}
                  href={link.path}
                  className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-all duration-300 ${
                    isActive
                      ? "bg-saffron-500 text-white shadow-sm"
                      : "text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-900 hover:text-saffron-600 dark:hover:text-gold-400"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* Actions & Toggles */}
          <div className="hidden sm:flex items-center space-x-3">
            {/* Harathi Trigger Button */}
            <button
              onClick={triggerHarathiPooja}
              className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-saffron-500 to-gold-500 hover:from-saffron-600 hover:to-gold-600 text-white px-4 py-1.5 text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              Harathi Pooja
            </button>

            {/* Temple Bell */}
            <TempleBell />

            {/* Dark Mode Switcher */}
            <button
              onClick={toggleDarkMode}
              className="rounded-full p-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-900 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors focus:outline-none"
              title={isDarkMode ? "Light Mode" : "Dark Mode"}
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
{fullName && (
  <button
    onClick={() => router.push("/profile")}
    className="flex items-center gap-2 text-sm font-semibold text-gold-400 hover:underline cursor-pointer"
  >
    <ProfileAvatar photoUrl={profileImageUrl} name={fullName} sizeClassName="h-7 w-7" />
    Welcome, {fullName} 👋
  </button>
)}
            {/* Admin Portal Button */}
{role === "ADMIN" && (
  <Link
    href="/admin"
    className="rounded-full bg-stone-850 hover:bg-stone-900 dark:bg-stone-800 dark:hover:bg-stone-700 text-white px-3.5 py-1.5 text-xs font-semibold transition-all"
  >
    Admin Dashboard
  </Link>
)}
            <button
  onClick={() => {
    localStorage.clear();
    window.location.href = "/login";
  }}
  className="rounded-full bg-red-600 hover:bg-red-700 text-white px-3.5 py-1.5 text-xs font-semibold transition-all"
>
  Logout
</button>
          </div>

          {/* Mobile menu button */}
          <div className="flex lg:hidden items-center gap-2">
            {/* Temple Bell for mobile */}
            <TempleBell />

            <button
              onClick={toggleDarkMode}
              className="rounded-full p-2 bg-stone-100 dark:bg-stone-900 text-stone-600 dark:text-stone-300"
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="rounded-md p-1.5 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-900 focus:outline-none"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {isOpen && (
        <div className="lg:hidden px-4 pt-2 pb-4 space-y-1 bg-white dark:bg-stone-950 border-b border-stone-200 dark:border-stone-800">
          {navLinks.map((link) => {
            const isActive = pathname === link.path;
            return (
              <Link
                key={link.name}
                href={link.path}
                onClick={() => setIsOpen(false)}
                className={`block rounded-md px-3 py-2 text-sm font-semibold ${
                  isActive
                    ? "bg-saffron-500 text-white"
                    : "text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-900"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
          <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex flex-col gap-2">
            <button
              onClick={() => {
                setIsOpen(false);
                triggerHarathiPooja();
              }}
              className="flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-saffron-500 to-gold-500 text-white py-2 text-xs font-bold shadow-md"
            >
              <Sparkles className="h-4 w-4" />
              Harathi Pooja
            </button>
            {role === "ADMIN" && (
  <Link
    href="/admin"
    onClick={() => setIsOpen(false)}
    className="flex justify-center rounded-full bg-stone-800 text-white py-2 text-xs font-semibold"
  >
    Admin Dashboard
  </Link>
)}
          </div>
        </div>
      )}
    </nav>
  );
}