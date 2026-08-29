"use client";

import { useEffect, useState } from "react";
import { Calendar, MapPin, Clock, Plus, Trash, Pencil } from "lucide-react";

interface EventItem {
  id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  category: string;
}

export default function Events() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filter, setFilter] = useState("All");
  
  // Form State
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [loc, setLoc] = useState("PUTCHAVANI TOTALU STREET");
  const [cat, setCat] = useState("Pooja");
  const [editingId, setEditingId] = useState<number | null>(null);

  const categories = ["All", "Pooja", "Cultural", "Food", "Nimajjanam"];

  const fetchEvents = () => {
    fetch("https://vinayakax-backend.onrender.com/api/events")
      .then(res => res.json())
      .then(data => setEvents(data))
      .catch((error) => {
        console.error("Failed to fetch events:", error);
        setEvents([]);
      });
  };

  useEffect(() => {
    fetchEvents();
    
    // Check if user is Admin
    const role = localStorage.getItem("role");
    setIsAdmin(role === "ADMIN");
  }, []);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !time) return;

    const token = localStorage.getItem("token");
    try {
      const response = await fetch(
  editingId
    ? `https://vinayakax-backend.onrender.com/api/events/${editingId}`
    : "https://vinayakax-backend.onrender.com/api/events",
  {
    method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          description: desc,
          date,
          time,
          location: loc,
          category: cat
        })
      });

      if (response.ok) {
        // Reset and refresh
        setTitle("");
        setDesc("");
        setDate("");
        setTime("");
        setLoc("PUTCHAVANI TOTALU STREET");
        setCat("Pooja");
        setEditingId(null);
        fetchEvents();
      } else {
        alert("Failed to create event. Make sure you are authorized.");
      }
    } catch {
      alert("Error contacting backend server.");
    }
  };

  const handleDeleteEvent = async (id: number) => {
    const token = localStorage.getItem("token");
    if (!confirm("Are you sure you want to delete this event?")) return;
    try {
      const response = await fetch(`https://vinayakax-backend.onrender.com/api/events/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (response.ok) {
        fetchEvents();
      }
    } catch {
      alert("Error performing action.");
    }
  };
const handleEditEvent = (ev: EventItem) => {
  setTitle(ev.title);
  setDesc(ev.description);
  setDate(ev.date);
  setTime(ev.time);
  setLoc(ev.location);
  setCat(ev.category);
  setEditingId(ev.id);

  alert("Event loaded into form.");
};
  const filteredEvents = filter === "All"
    ? events
    : events.filter(e => e.category === filter);

  return (
    <div className="space-y-10 py-4">
      {/* Header */}
      <section className="space-y-4 max-w-2xl">
        <span className="text-[10px] text-saffron-500 uppercase font-bold tracking-wider block">Devotional Program</span>
        <h1 className="text-4xl font-extrabold text-stone-900 dark:text-white">
    Sri Vinayaka Mahotsavam Events
</h1>
        <p className="text-stone-600 dark:text-stone-300 text-xs sm:text-sm">
          Plan your visit and participate in Sri Vinayaka Mahotsavam celebrations. Check the daily poojas, cultural programs, competitions, and special events.
        </p>
      </section>

      {/* Filter Tabs */}
      <section className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`rounded-full px-5 py-2 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filter === c
                ? "bg-saffron-500 text-white shadow-md"
                : "bg-white dark:bg-stone-900 border border-stone-250 dark:border-stone-750 text-stone-600 dark:text-stone-300 hover:border-saffron-500"
            }`}
          >
            {c}
          </button>
        ))}
      </section>

      {/* Main Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Events List */}
        <div className="lg:col-span-2 space-y-4">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-10 glass-panel rounded-2xl">
              <p className="text-stone-500 text-sm">No events found in this category.</p>
            </div>
          ) : (
            filteredEvents.map((ev) => (
              <div
                key={ev.id}
                className="p-5 rounded-2xl glass-panel border border-saffron-500/10 hover:border-gold-500/30 transition-all flex flex-col sm:flex-row justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-saffron-100 dark:bg-amber-950/40 text-saffron-600 dark:text-gold-400 font-extrabold text-[10px] px-2 py-0.5 rounded uppercase">
                      {ev.category}
                    </span>
                    <h3 className="font-extrabold text-stone-850 dark:text-white text-base sm:text-lg">{ev.title}</h3>
                  </div>
                  <p className="text-stone-500 dark:text-stone-400 text-xs sm:text-sm">{ev.description}</p>
                  
                  <div className="flex flex-wrap gap-4 pt-1.5 text-xs text-stone-500">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-saffron-500 shrink-0" />
                      <span>{ev.time}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-saffron-500 shrink-0" />
                      <span>{ev.location}</span>
                    </div>
                  </div>
                </div>

                {isAdmin && (
  <div className="flex items-center gap-2 sm:self-center shrink-0">

    <button
      onClick={() => handleEditEvent(ev)}
      className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-full"
      title="Edit Event"
    >
      <Pencil className="h-4 w-4" />
    </button>

    <button
      onClick={() => handleDeleteEvent(ev.id)}
      className="p-2 text-red-500 hover:bg-red-500/10 rounded-full"
      title="Delete Event"
    >
      <Trash className="h-4 w-4" />
    </button>

  </div>
)}
              </div>
            ))
          )}
        </div>

        {/* Admin Form Panel */}
        {isAdmin && (
          <div className="p-6 rounded-2xl glass-panel border border-gold-500/30 space-y-4 h-fit">
            <h3 className="text-lg font-bold text-stone-850 dark:text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-saffron-500" />
              Add Utsavam Event
            </h3>
            <form onSubmit={handleAddEvent} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-stone-500 font-semibold block">Event Title</label>
                <input
                  type="text"
                  placeholder="e.g. Laddu Auction"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-500 font-semibold block">Description</label>
                <textarea
                  placeholder="Details..."
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">

  <div className="space-y-1">
    <label className="text-stone-500 font-semibold block">
      Date
    </label>
    <input
      type="date"
      value={date}
      onChange={(e) => setDate(e.target.value)}
      className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
      required
    />
  </div>

  <div className="space-y-1">
    <label className="text-stone-500 font-semibold block">
      Time
    </label>
    <input
      type="time"
      value={time}
      onChange={(e) => setTime(e.target.value)}
      className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
      required
    />
  </div>

  <div className="space-y-1">
    <label className="text-stone-500 font-semibold block">
      Category
    </label>
    <select
      value={cat}
      onChange={(e) => setCat(e.target.value)}
      className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
    >
      <option value="Pooja">Pooja</option>
      <option value="Cultural">Cultural</option>
      <option value="Food">Food</option>
      <option value="Nimajjanam">Nimajjanam</option>
    </select>
  </div>

</div>

              <div className="space-y-1">
                <label className="text-stone-500 font-semibold block">Location</label>
                <input
                  type="text"
                  value={loc}
                  onChange={e => setLoc(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-saffron-500 hover:bg-saffron-600 text-white font-bold py-2.5 transition-colors cursor-pointer text-center"
              >
                {editingId ? "Update Event" : "Add Event"}
              </button>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}
