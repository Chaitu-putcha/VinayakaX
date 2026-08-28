"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Menu,
  X,
  Bell,
  UserCircle,
  Home,
  Info,
  CalendarDays,
  Clock,
  Trophy,
  Image as ImageIcon,
  Radio,
  HandCoins,
  Users,
  HeartHandshake,
  Phone,
  ShieldCheck,
  LogOut,
  Sparkles,
} from "lucide-react";
import ProfileAvatar from "./ProfileAvatar";

const API = "http://localhost:8000";

const NAV_LINKS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/about", label: "About", icon: Info },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/schedule", label: "Schedule", icon: Clock },
  { href: "/competitions", label: "Competitions", icon: Trophy },
  { href: "/gallery", label: "Gallery", icon: ImageIcon },
  { href: "/live", label: "Live Darshan", icon: Radio },
  { href: "/donate", label: "Donate", icon: HandCoins },
  { href: "/volunteers", label: "Volunteers", icon: Users },
  { href: "/sponsors", label: "Sponsors", icon: HeartHandshake },
  { href: "/contact", label: "Contact", icon: Phone },
  { href: "/profile", label: "Profile", icon: UserCircle },
];

export default function MobileTopNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // FIX: Navbar.tsx (desktop) writes/reads "fullName" — this was
    // previously reading "full_name" and would always come back null.
    const readUser = () => {
      setRole(localStorage.getItem("role"));
      setFullName(localStorage.getItem("fullName"));
      // Read fresh every time so a different user's login/logout never
      // leaves a stale photo behind (localStorage.clear() on logout
      // already wipes this key too).
      setProfileImageUrl(localStorage.getItem("profileImageUrl"));
    };
    readUser();

    // Fired by Edit Profile immediately after a successful photo save, so
    // this header updates in the same tab without needing a refresh.
    window.addEventListener("profile-photo-updated", readUser);
    return () => window.removeEventListener("profile-photo-updated", readUser);
  }, [drawerOpen, pathname]);

  useEffect(() => {
    const fetchUnread = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setUnreadCount(0);
        return;
      }
      try {
        const res = await fetch(`${API}/api/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data: { is_read: boolean }[] = await res.json();
          setUnreadCount(data.filter((n) => !n.is_read).length);
        }
      } catch {
        // leave count as-is; badge simply won't update this cycle
      }
    };
    fetchUnread();
  }, [pathname]);

  const closeDrawer = () => setDrawerOpen(false);

  // Same mechanism as desktop Navbar.tsx's triggerHarathiPooja — dispatches
  // the exact event FlowerRain.tsx already listens for globally (mounted
  // once in layout.tsx). No new event, no duplicate animation logic.
  const triggerHarathiPooja = () => {
    window.dispatchEvent(new Event("trigger-flower-rain"));
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  const isAdminRole = role === "ADMIN" || role === "VOLUNTEER";

  return (
    <>
      {/* Top bar — aligned to lg to match Navbar.tsx's own lg:hidden
          mobile-menu cutover, so only one header ever renders */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 bg-stone-950/95 backdrop-blur border-b border-stone-800 h-16 flex items-center justify-between px-3">
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          className="p-2 -ml-1 text-stone-200 cursor-pointer"
        >
          <Menu className="h-6 w-6" />
        </button>

        <button
          onClick={() => router.push("/home")}
          className="flex items-center gap-2 cursor-pointer"
        >
          <div className="h-8 w-8 rounded-full bg-gradient-to-b from-saffron-400 to-saffron-600 flex items-center justify-center text-white font-extrabold text-xs shrink-0">
            VX
          </div>
          <div className="text-left leading-none">
            <p className="text-sm font-extrabold text-white leading-tight">VinayakaX</p>
            <p className="text-[8px] text-stone-400 leading-tight">Smart Festival Management</p>
          </div>
        </button>

        <div className="flex items-center gap-1">
          {/* Compact Harathi Pooja trigger — reuses the existing
              trigger-flower-rain event, same as desktop Navbar.tsx.
              Icon-only to stay compact on narrow widths (320px+). */}
          <button
            onClick={triggerHarathiPooja}
            aria-label="Harathi Pooja"
            title="Harathi Pooja"
            className="flex items-center justify-center h-8 w-8 shrink-0 rounded-full bg-gradient-to-r from-saffron-500 to-gold-500 text-white shadow-md active:scale-95 transition-transform cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
          </button>

          <Link href="/volunteers" aria-label="Notifications" className="relative p-2 text-stone-200">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[9px] font-extrabold rounded-full h-4 min-w-4 px-1 flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
          <Link href="/profile" aria-label="Profile" className="p-2 text-stone-200">
            <ProfileAvatar photoUrl={profileImageUrl} name={fullName} sizeClassName="h-6 w-6" />
          </Link>
        </div>
      </header>

      {/* Drawer + backdrop */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={closeDrawer} />
          <div className="absolute top-0 left-0 bottom-0 w-72 max-w-[80vw] bg-stone-950 border-r border-stone-800 shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-stone-800">
              <div>
                <p className="text-sm font-extrabold text-white">VinayakaX</p>
                <p className="text-[9px] text-stone-400">Smart Festival Management</p>
                {fullName && <p className="text-[10px] text-saffron-400 font-bold mt-1">{fullName}</p>}
              </div>
              <button onClick={closeDrawer} aria-label="Close menu" className="p-1.5 text-stone-400 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="py-2">
              {NAV_LINKS.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={closeDrawer}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold ${
                      active ? "bg-saffron-500/10 text-saffron-400" : "text-stone-300"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}

              {isAdminRole && (
                <Link
                  href="/admin"
                  onClick={closeDrawer}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-stone-300 border-t border-stone-800 mt-2"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Admin Dashboard
                </Link>
              )}
            </nav>

            <div className="p-4 border-t border-stone-800 mt-2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 text-xs cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}