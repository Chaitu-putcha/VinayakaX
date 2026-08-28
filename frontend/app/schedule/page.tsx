"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Clock, MapPin, Star, Waves } from "lucide-react";

interface ScheduleItem {
  id: number;
  day: number;
  title: string;
  description: string | null;
  date: string;
  start_time: string;
  end_time: string | null;
  location: string;
  is_important: boolean;
  created_by_name: string;
}

const DAY_TABS: { day: number; label: string; short: string }[] = [
  { day: 1, label: "Day 1", short: "Day 1" },
  { day: 2, label: "Day 2", short: "Day 2" },
  { day: 3, label: "Day 3", short: "Day 3" },
  { day: 4, label: "Day 4 – Grand Nimajjanam", short: "Day 4 · Nimajjanam" },
];

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
  } catch {
    return dateStr;
  }
}

export default function SchedulePage() {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeDay, setActiveDay] = useState(1);

  useEffect(() => {
    fetch("http://localhost:8000/api/schedule")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data) => setItems(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const dayItems = items
    .filter((i) => i.day === activeDay)
    .sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time));

  const isNimajjanamDay = activeDay === 4;

  return (
    <div className="space-y-10 py-4">
      {/* Header */}
      <section className="space-y-4 max-w-2xl">
        <span className="text-[10px] text-saffron-500 uppercase font-bold tracking-wider block">
          Program Timetable
        </span>
        <h1 className="text-4xl font-extrabold text-stone-900 dark:text-white flex items-center gap-3">
          <CalendarDays className="h-8 w-8 text-saffron-500" />
          Festival Schedule
        </h1>
        <p className="text-stone-600 dark:text-stone-300 text-xs sm:text-sm">
          The complete day-by-day program for Sri Vinayaka Mahotsavam — three days of poojas
          and celebrations, culminating in the Grand Nimajjanam procession on Day 4.
        </p>
      </section>

      {/* Day Tabs */}
      <section className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
        {DAY_TABS.map((t) => {
          const active = activeDay === t.day;
          const isDay4 = t.day === 4;
          return (
            <button
              key={t.day}
              onClick={() => setActiveDay(t.day)}
              className={`rounded-full px-5 py-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                active
                  ? isDay4
                    ? "bg-gradient-to-r from-temple-red to-saffron-500 text-white shadow-md"
                    : "bg-saffron-500 text-white shadow-md"
                  : isDay4
                  ? "bg-white dark:bg-stone-900 border border-gold-500/50 text-gold-600 dark:text-gold-400 hover:border-gold-500"
                  : "bg-white dark:bg-stone-900 border border-stone-250 dark:border-stone-750 text-stone-600 dark:text-stone-300 hover:border-saffron-500"
              }`}
            >
              {isDay4 && <Waves className="h-3.5 w-3.5" />}
              {t.short}
            </button>
          );
        })}
      </section>

      {/* Day 4 special banner */}
      {isNimajjanamDay && (
        <section className="rounded-2xl overflow-hidden border-2 border-gold-500/60 bg-gradient-to-r from-temple-red via-saffron-600 to-gold-600 p-6 text-center shadow-lg animate-fade-in">
          <Waves className="h-8 w-8 text-gold-200 mx-auto mb-2 animate-float" />
          <h2 className="text-white text-2xl font-extrabold tracking-wide">
            Grand Nimajjanam
          </h2>
          <p className="text-gold-100 text-xs sm:text-sm mt-1">
            The final procession — devotees accompany Sri Vinayaka to immersion with music,
            dance, and devotion. Ganapati Bappa Morya!
          </p>
        </section>
      )}

      {/* Schedule List */}
      <section className="max-w-3xl space-y-4">
        {loading ? (
          <div className="text-center py-16 glass-panel rounded-2xl">
            <p className="text-stone-500 text-xs animate-pulse">Loading schedule...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16 glass-panel rounded-2xl">
            <p className="text-stone-500 text-sm">
              Could not load the schedule right now. Please try again shortly.
            </p>
          </div>
        ) : dayItems.length === 0 ? (
          <div className="text-center py-16 glass-panel rounded-2xl">
            <CalendarDays className="h-8 w-8 text-stone-400 mx-auto mb-2" />
            <p className="text-stone-500 text-sm">No schedule items published for this day yet.</p>
          </div>
        ) : (
          dayItems.map((item) => (
            <div
              key={item.id}
              className={`p-5 rounded-2xl glass-panel border transition-all ${
                item.is_important
                  ? isNimajjanamDay
                    ? "border-gold-500/70 shadow-md ring-1 ring-gold-500/30"
                    : "border-gold-500/50 shadow-md"
                  : isNimajjanamDay
                  ? "border-gold-500/20 hover:border-gold-500/40"
                  : "border-saffron-500/10 hover:border-gold-500/30"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                {item.is_important && (
                  <span className="flex items-center gap-1 bg-gold-100 dark:bg-amber-950/40 text-gold-600 dark:text-gold-400 font-extrabold text-[10px] px-2 py-0.5 rounded uppercase">
                    <Star className="h-3 w-3" />
                    Important
                  </span>
                )}
              </div>

              <h3 className="font-extrabold text-stone-850 dark:text-white text-base sm:text-lg mt-1">
                {item.title}
              </h3>
              {item.description && (
                <p className="text-stone-600 dark:text-stone-300 text-xs sm:text-sm mt-2 leading-relaxed whitespace-pre-line">
                  {item.description}
                </p>
              )}

              <div className="flex flex-wrap gap-4 pt-3 mt-3 border-t border-stone-200/60 dark:border-stone-800 text-[11px] text-stone-500">
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-saffron-500 shrink-0" />
                  <span>{formatDate(item.date)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-saffron-500 shrink-0" />
                  <span>
                    {item.start_time}
                    {item.end_time ? ` – ${item.end_time}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-saffron-500 shrink-0" />
                  <span>{item.location}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}