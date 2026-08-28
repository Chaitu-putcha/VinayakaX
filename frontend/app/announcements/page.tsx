"use client";

import { useEffect, useState } from "react";
import { Megaphone, Pin, Clock, User } from "lucide-react";

interface AnnouncementItem {
  id: number;
  title: string;
  description: string;
  event_datetime: string | null;
  is_pinned: boolean;
  is_published: boolean;
  created_by_name: string;
  created_at: string;
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("http://localhost:8000/api/announcements")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data) => setAnnouncements(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-10 py-4">
      {/* Header */}
      <section className="space-y-4 max-w-2xl">
        <span className="text-[10px] text-saffron-500 uppercase font-bold tracking-wider block">
          Committee Notices
        </span>
        <h1 className="text-4xl font-extrabold text-stone-900 dark:text-white flex items-center gap-3">
          <Megaphone className="h-8 w-8 text-saffron-500" />
          Announcements
        </h1>
        <p className="text-stone-600 dark:text-stone-300 text-xs sm:text-sm">
          Stay updated with the latest news, timing changes, and important notices from the
          Sri Vinayaka Mahotsavam committee.
        </p>
      </section>

      {/* Content */}
      <section className="max-w-3xl space-y-4">
        {loading ? (
          <div className="text-center py-16 glass-panel rounded-2xl">
            <p className="text-stone-500 text-xs animate-pulse">Loading announcements...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16 glass-panel rounded-2xl">
            <p className="text-stone-500 text-sm">
              Could not load announcements right now. Please try again shortly.
            </p>
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-16 glass-panel rounded-2xl">
            <Megaphone className="h-8 w-8 text-stone-400 mx-auto mb-2" />
            <p className="text-stone-500 text-sm">No announcements available right now.</p>
          </div>
        ) : (
          announcements.map((a) => (
            <div
              key={a.id}
              className={`p-5 rounded-2xl glass-panel border transition-all ${
                a.is_pinned
                  ? "border-gold-500/50 shadow-md"
                  : "border-saffron-500/10 hover:border-gold-500/30"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  {a.is_pinned && (
                    <span className="flex items-center gap-1 bg-gold-100 dark:bg-amber-950/40 text-gold-600 dark:text-gold-400 font-extrabold text-[10px] px-2 py-0.5 rounded uppercase">
                      <Pin className="h-3 w-3" />
                      Important
                    </span>
                  )}
                </div>
              </div>

              <h3 className="font-extrabold text-stone-850 dark:text-white text-base sm:text-lg mt-1">
                {a.title}
              </h3>
              <p className="text-stone-600 dark:text-stone-300 text-xs sm:text-sm mt-2 leading-relaxed whitespace-pre-line">
                {a.description}
              </p>

              <div className="flex flex-wrap gap-4 pt-3 mt-3 border-t border-stone-200/60 dark:border-stone-800 text-[11px] text-stone-500">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-saffron-500 shrink-0" />
                  <span>{formatDateTime(a.event_datetime || a.created_at)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-saffron-500 shrink-0" />
                  <span>By {a.created_by_name}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}