"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, Play, Heart, CloudSun, Megaphone, ArrowRight, Pin } from "lucide-react";
import GaneshaHero from "@/components/GaneshaHero";

interface Announcement {
  id: number;
  title: string;
  description: string;
  is_pinned: boolean;
  event_datetime: string | null;
}

interface EventItem {
  id: number;
  title: string;
  time: string;
  location: string;
}

export default function Home() {
    const router = useRouter();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [weather, setWeather] = useState({ temp: 29, desc: "Clear Sky", humidity: 76 });
  const [daysLeft, setDaysLeft] = useState(0);

useEffect(() => {
    console.log("Home useEffect started");

  const token = localStorage.getItem("token");
  console.log("Token =", token);

  if (!token) {
    router.replace("/login");
    return;
  }

  const expiry = localStorage.getItem("token_expiry");
  console.log("Expiry =", expiry);
console.log("Now =", Date.now());
console.log("Condition =", Date.now() > Number(expiry));
  if (expiry && Date.now() > Number(expiry)) {
  console.log("Session Expired");

  localStorage.clear();

  window.location.href = "/login";

  return;
}
    
    // 1. Fetch latest announcements (public endpoint, published-only, pinned first)
    fetch("https://vinayakax-backend.onrender.com/api/announcements")
      .then(res => res.json())
      .then(data => setAnnouncements(data.slice(0, 5)))
      .catch(() => {
        setAnnouncements([
          {
            id: 1,
            title: "Pratishtha Pooja Starts Soon!",
            description: "Opening pooja scheduled at Putchavani Totalu Street, 8:00 AM.",
            is_pinned: true,
            event_datetime: null
          }
        ]);
      });

    // 2. Fetch events
    fetch("https://vinayakax-backend.onrender.com/api/events")
      .then(res => res.json())
      .then(data => setEvents(data.slice(0, 3)))
      .catch(() => {
        setEvents([
          { id: 1, title: "Vinayaka Chavithi Pooja & Kalasa Sthapana", time: "Sept 10, 08:00 AM", location: "Main Mandapam" },
          { id: 2, title: "Lalitha Sahasranama Kumkumarchana", time: "Sept 13, 05:00 PM", location: "Temple Stage" },
          { id: 3, title: "Cultural Night - Dance & Singing Competitions", time: "Sept 16, 07:00 PM", location: "Stage Area" }
        ]);
      });

    // 3. Count days to festival (starting Sept 10, 2026)
    const festDate = new Date("2026-09-10T00:00:00").getTime();
    const diff = festDate - new Date().getTime();
    setDaysLeft(Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24))));
  }, []);

  return (
    <div className="space-y-16 py-4">
      {/* Hero Section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[75vh]">
        <div className="space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-saffron-100 dark:bg-amber-950/40 text-saffron-600 dark:text-gold-400 text-xs font-bold border border-saffron-300/20">
            <Megaphone className="h-3.5 w-3.5" />
            Navarathri Festival 2026
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight text-stone-900 dark:text-white">
            UDDANAM RAMAKRISHNA PURAM
            <span className="block mt-2 bg-gradient-to-r from-saffron-500 via-gold-500 to-saffron-600 bg-clip-text text-transparent text-glow-gold">
              Sri Vinayaka Chavithi
            </span>
          </h1>
          <p className="text-stone-600 dark:text-stone-300 max-w-xl text-sm sm:text-base leading-relaxed">
            Welcome to the digital portal of the grand **Sri Vinayaka Navarathri Mahotsavam 2026** at **Putchavani Totalu Street**, Vajrapukotturu, Srikakulam. Blessed by the village deity **Sri Ramachandeshuari Thalli**, we invite you to experience unity, culture, and absolute devotion.
          </p>

          {/* Quick Stats Panel */}
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="glass-panel rounded-xl p-3 text-center border-l-4 border-l-saffron-500">
              <span className="text-stone-400 dark:text-stone-500 text-[10px] uppercase font-bold tracking-wider block">Countdown</span>
              <span className="text-xl sm:text-2xl font-extrabold text-stone-850 dark:text-stone-100">{daysLeft} Days</span>
            </div>
            
            {/* Weather Widget */}
            <div className="glass-panel rounded-xl p-3 text-center border-l-4 border-l-gold-500 relative group">
              <span className="text-stone-400 dark:text-stone-500 text-[10px] uppercase font-bold tracking-wider block flex items-center justify-center gap-1">
                <CloudSun className="h-3 w-3 text-gold-500" /> Weather
              </span>
              <span className="text-xl sm:text-2xl font-extrabold text-stone-850 dark:text-stone-100">{weather.temp}°C</span>
              <div className="absolute top-full left-0 right-0 mt-1 hidden group-hover:block bg-stone-950 text-white rounded p-1.5 text-[9px] z-20">
                Humidity: {weather.humidity}% - {weather.desc}
              </div>
            </div>

            <div className="glass-panel rounded-xl p-3 text-center border-l-4 border-l-saffron-600">
              <span className="text-stone-400 dark:text-stone-500 text-[10px] uppercase font-bold tracking-wider block">Devotion</span>
              <span className="text-xl sm:text-2xl font-extrabold text-stone-850 dark:text-stone-100">Live 24/7</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-4 pt-4">
            <Link
              href="/live"
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-saffron-500 to-gold-500 text-white px-6 py-3 font-bold hover:scale-105 transition-all shadow-lg"
            >
              <Play className="h-4 w-4 fill-white" />
              Watch Live Darshan
            </Link>
            <Link
              href="/donate"
              className="flex items-center gap-2 rounded-full border border-saffron-500/30 dark:border-gold-500/30 text-stone-700 dark:text-stone-200 px-6 py-3 font-semibold hover:bg-saffron-500/10 transition-all"
            >
              <Heart className="h-4 w-4 text-saffron-500" />
              Sponsor/Donate
            </Link>
          </div>
        </div>

        {/* Lord Ganesha Art illustration */}
        <div className="flex justify-center">
          <GaneshaHero />
        </div>
      </section>

      {/* Latest Announcements */}
      {announcements.length > 0 && (
        <section className="space-y-6">
          <div className="flex justify-between items-end border-b border-stone-200 dark:border-stone-800 pb-3">
            <div>
              <span className="text-[10px] text-saffron-500 uppercase font-bold tracking-wider block">Committee Notices</span>
              <h2 className="text-2xl font-bold text-stone-850 dark:text-white flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-saffron-500" />
                Latest Announcements
              </h2>
            </div>
            <Link
              href="/announcements"
              className="text-xs font-bold text-saffron-600 hover:text-saffron-700 flex items-center gap-1 group shrink-0"
            >
              View All Announcements <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {announcements.map((a) => (
              <div
                key={a.id}
                className={`p-4 rounded-xl glass-panel border transition-all ${
                  a.is_pinned ? "border-gold-500/50" : "border-saffron-500/10 hover:border-gold-500/30"
                }`}
              >
                {a.is_pinned && (
                  <span className="flex items-center gap-1 w-fit bg-gold-100 dark:bg-amber-950/40 text-gold-600 dark:text-gold-400 font-extrabold text-[9px] px-2 py-0.5 rounded uppercase mb-2">
                    <Pin className="h-3 w-3" />
                    Important
                  </span>
                )}
                <h4 className="font-bold text-sm text-stone-850 dark:text-white">{a.title}</h4>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1.5 line-clamp-2">{a.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Events, Darshan & Sponsors Split */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Upcoming Events Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-end border-b border-stone-200 dark:border-stone-800 pb-3">
            <div>
              <span className="text-[10px] text-saffron-500 uppercase font-bold tracking-wider block">Festival Calendar</span>
              <h2 className="text-2xl font-bold text-stone-850 dark:text-white">Upcoming Events</h2>
            </div>
            <Link href="/events" className="text-xs font-bold text-saffron-600 hover:text-saffron-700 flex items-center gap-1 group">
              View Schedule <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          <div className="space-y-4">
            {events.map((ev) => (
              <div key={ev.id} className="flex gap-4 p-4 rounded-xl glass-panel hover:border-gold-500/30 transition-all">
                <div className="h-10 w-10 rounded-lg bg-saffron-100 dark:bg-amber-950/40 text-saffron-600 dark:text-gold-400 flex items-center justify-center shrink-0 border border-saffron-300/10">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-stone-850 dark:text-white">{ev.title}</h4>
                  <p className="text-xs text-stone-500 mt-1">{ev.time} @ {ev.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Stream Teaser Card */}
        <div className="space-y-6">
          <div>
            <span className="text-[10px] text-saffron-500 uppercase font-bold tracking-wider block">Utsavam Streaming</span>
            <h2 className="text-2xl font-bold text-stone-850 dark:text-white">Live Darshan</h2>
          </div>
          <div className="rounded-2xl overflow-hidden relative group aspect-video lg:aspect-square flex items-center justify-center border border-gold-500/20 shadow-lg">
            {/* Visual backdrop placeholder */}
            <div className="absolute inset-0 bg-stone-900 flex flex-col items-center justify-center text-center p-4">
              <span className="text-xs bg-red-600 text-white font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-2 animate-pulse">Live</span>
              <p className="text-stone-300 text-sm font-semibold mb-3">Live Darshan Stream starts September 10</p>
              <Link
                href="/live"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-saffron-500 text-white shadow-lg group-hover:scale-110 transition-transform cursor-pointer"
              >
                <Play className="h-5 w-5 fill-white ml-0.5" />
              </Link>
            </div>
          </div>
        </div>

      </section>

      {/* Quick Motto Display */}
      <section className="text-center py-10 px-6 rounded-3xl bg-gradient-to-r from-saffron-600 via-amber-600 to-gold-600 text-white shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.1),transparent)]" />
        <h3 className="text-lg uppercase tracking-widest text-gold-300 font-extrabold mb-2">Unity, Devotion, Culture & Service</h3>
        <p className="text-stone-100 max-w-2xl mx-auto text-xs sm:text-sm leading-relaxed">
          The Sri Vinayaka Committee of Putchavani Totalu Street, Uddanam Ramakrishna Puram, welcomes all devotees to participate in the 9-day annual spiritual celebration, carrying legacy, values, and community service.
        </p>
      </section>
    </div>
  );
}