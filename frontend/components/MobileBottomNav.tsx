"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Home, Users, Plus, ClipboardList, UserCircle } from "lucide-react";

/**
 * Fixed mobile bottom navigation bar (Home / Volunteers / + / Works /
 * Profile), matching the dark + saffron/gold VinayakaX theme.
 *
 * NEW, SELF-CONTAINED FILE — does not touch any existing routing, auth,
 * or page logic. Only reads from next/navigation for the active-tab
 * highlight.
 *
 * INTEGRATION (I don't have your layout.tsx, so this needs a one-line
 * addition on your end): render <MobileBottomNav /> once, near the end
 * of the body in frontend/app/layout.tsx, e.g.:
 *
 *   <body>
 *     <Navbar />                 {/* your existing desktop navbar — hide it on mobile with a "hidden md:flex" class if it isn't already responsive *\/}
 *     <main className="pb-20 md:pb-0">{children}</main>
 *     <Footer />
 *     <MobileBottomNav />        {/* new — renders itself only below md *\/}
 *   </body>
 *
 * The "Works" tab and the center "+" button both currently point at
 * /volunteers (where "Complete Work / Seva Management" already lives) —
 * change `worksHref` / `onCenterAction` via props if you have (or add) a
 * dedicated route/page for it.
 */

interface MobileBottomNavProps {
  homeHref?: string;
  volunteersHref?: string;
  worksHref?: string;
  profileHref?: string;
  /** Called instead of navigating, if you want the "+" button to open a
   * quick-action sheet rather than navigate. Defaults to routing to
   * volunteersHref. */
  onCenterAction?: () => void;
}

export default function MobileBottomNav({
  homeHref = "/home",
  volunteersHref = "/volunteers",
  worksHref = "/volunteers",
  profileHref = "/profile",
  onCenterAction,
}: MobileBottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => pathname === href;

  const handleCenterPress = () => {
    if (onCenterAction) {
      onCenterAction();
    } else {
      router.push(volunteersHref);
    }
  };

  const tabs = [
    { href: homeHref, label: "Home", icon: Home },
    { href: volunteersHref, label: "Volunteers", icon: Users },
    null, // center FAB slot
    { href: worksHref, label: "Works", icon: ClipboardList },
    { href: profileHref, label: "Profile", icon: UserCircle },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-stone-950/95 backdrop-blur border-t border-stone-800"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="relative grid grid-cols-5 items-center h-16 max-w-md mx-auto px-2">
        {tabs.map((tab, idx) => {
          if (tab === null) {
            return (
              <div key="center" className="flex items-center justify-center">
                <button
                  onClick={handleCenterPress}
                  aria-label="Add new work"
                  className="h-14 w-14 -mt-7 rounded-full bg-gradient-to-b from-saffron-400 to-saffron-600 shadow-lg shadow-saffron-500/30 border-4 border-stone-950 flex items-center justify-center text-white active:scale-95 transition-transform cursor-pointer"
                >
                  <Plus className="h-6 w-6" strokeWidth={2.5} />
                </button>
              </div>
            );
          }
          const Icon = tab.icon;
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className="flex flex-col items-center justify-center gap-0.5 h-full"
            >
              <Icon
                className={`h-5 w-5 ${active ? "text-saffron-400" : "text-stone-500"}`}
                strokeWidth={active ? 2.5 : 2}
              />
              <span className={`text-[9px] font-bold ${active ? "text-saffron-400" : "text-stone-500"}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}