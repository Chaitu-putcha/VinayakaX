"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend } from "chart.js";
import { Line, Bar, Pie } from "react-chartjs-2";
import { Users, Image, Heart, ShieldAlert, Plus, Trash, Check, X, ShieldX, TrendingUp, Landmark, Megaphone, Pin, Eye, EyeOff, Pencil, Star, CalendarDays } from "lucide-react";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

interface AnalyticsData {
  total_donation_amount: number;
  total_donations_count: number;
  total_volunteers: number;
  pending_volunteers: number;
  total_competitions: number;
  gallery: {
    total: number;
    approved: number;
    pending: number;
  };
  devices: Record<string, number>;
  locations: Record<string, number>;
  visitor_trend: { day: string; visitors: number }[];
}

interface PendingItem {
  id: number;
  uploader_name: string;
  url: string;
  caption: string;
  album: string;
}

interface VolunteerItem {
  id: number;
  status: string;
  assigned_work: string | null;
  performance_score: number;
  attendance_json: string;
  shifts_json: string;
  user: {
    full_name: string;
    email: string;
  };
}

interface ExpenseItem {
  id: number;
  title: string;
  category: string;
  amount: number;
  date: string;
}
interface LiveCamera {
  id: number;
  name: string;
  stream_url: string;
  is_active: boolean;
}

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
export default function AdminDashboard() {
  const router = useRouter();
  // isAuthorized: ADMIN or VOLUNTEER — both can reach this page now, since
  // Announcement/Schedule management requires equal permissions for both roles.
  const [isAuthorized, setIsAuthorized] = useState(false);
  // isAdminRole: only ADMIN — gates the pre-existing admin-only tabs
  // (analytics, moderation, volunteers, expenses, live) so VOLUNTEER users
  // only ever see the Announcements + Schedule tabs here.
  const [isAdminRole, setIsAdminRole] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data States
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [pendingPhotos, setPendingPhotos] = useState<PendingItem[]>([]);
  const [volunteers, setVolunteers] = useState<VolunteerItem[]>([]);
  
  // Expense Form State
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [expTitle, setExpTitle] = useState("");
  const [expCat, setExpCat] = useState("Decoration");
  const [expAmt, setExpAmt] = useState("");
  const [expDate, setExpDate] = useState(new Date().toISOString().split("T")[0]);
  const [liveCameras, setLiveCameras] = useState<LiveCamera[]>([]);

  const [cameraName, setCameraName] = useState("");

  const [cameraUrl, setCameraUrl] = useState("");

  // Announcements State
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [annTitle, setAnnTitle] = useState("");
  const [annDescription, setAnnDescription] = useState("");
  const [annDateTime, setAnnDateTime] = useState("");
  const [annPinned, setAnnPinned] = useState(false);
  const [annPublished, setAnnPublished] = useState(true);
  const [editingAnnId, setEditingAnnId] = useState<number | null>(null);
  const [annError, setAnnError] = useState("");
  const [annSuccess, setAnnSuccess] = useState("");
  const [annDeleteTarget, setAnnDeleteTarget] = useState<AnnouncementItem | null>(null);
  const [annLoading, setAnnLoading] = useState(false);
  // Schedule State
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [schDay, setSchDay] = useState(1);
  const [schTitle, setSchTitle] = useState("");
  const [schDescription, setSchDescription] = useState("");
  const [schDate, setSchDate] = useState("");
  const [schStartTime, setSchStartTime] = useState("");
  const [schEndTime, setSchEndTime] = useState("");
  const [schLocation, setSchLocation] = useState("PUTCHAVANI TOTALU STREET");
  const [schImportant, setSchImportant] = useState(false);
  const [editingSchId, setEditingSchId] = useState<number | null>(null);
  const [schError, setSchError] = useState("");
  const [schSuccess, setSchSuccess] = useState("");
  const [schDeleteTarget, setSchDeleteTarget] = useState<ScheduleItem | null>(null);
  const [schLoading, setSchLoading] = useState(false);

  // Selected Section State
  const [section, setSection] =
useState<
  "analytics" |
  "moderation" |
  "volunteers" |
  "expenses" |
  "live" |
  "announcements" |
  "schedule"
>("analytics");

  const checkAdminAuth = () => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) {
    window.location.href = "/login";
    return;
  }

  if (role !== "ADMIN" && role !== "VOLUNTEER") {
    alert("Access Denied! Admins and Volunteers only.");
    window.location.href = "/home";
    return;
  }

  setIsAuthorized(true);
  setIsAdminRole(role === "ADMIN");

  // Volunteers only have the Announcements tab here.
  if (role === "VOLUNTEER") {
    setSection("announcements");
  }

  fetchAdminData(token, role === "ADMIN");
};

  const fetchAdminData = async (token: string, isAdmin: boolean) => {
    const headers = { "Authorization": `Bearer ${token}` };

    // Announcements management data is fetched for BOTH roles.
    try {
      const resAnn = await fetch("https://vinayakax-backend.onrender.com/api/announcements/manage/all", { headers });
      if (resAnn.ok) setAnnouncements(await resAnn.json());
    } catch {
      // Leave announcements empty; the section shows its own empty/error state.
    }

    // Schedule data is fetched for BOTH roles — the public GET already
    // returns every item (Schedule has no publish/hide flag).
    try {
      const resSch = await fetch("https://vinayakax-backend.onrender.com/api/schedule");
      if (resSch.ok) setScheduleItems(await resSch.json());
    } catch {
      // Leave scheduleItems empty; the section shows its own empty/error state.
    }

    if (!isAdmin) {
      setLoading(false);
      return;
    }
    
    try {
      // 1. Fetch Analytics
      const resAnalytics = await fetch("https://vinayakax-backend.onrender.com/api/admin/analytics", { headers });
      if (resAnalytics.ok) setAnalytics(await resAnalytics.json());

      // 2. Fetch Pending Photos
      const resPhotos = await fetch("https://vinayakax-backend.onrender.com/api/gallery/pending", { headers });
      if (resPhotos.ok) setPendingPhotos(await resPhotos.json());

      // 3. Fetch Volunteers
      const resVolunteers = await fetch("https://vinayakax-backend.onrender.com/api/volunteers/all", { headers });
      if (resVolunteers.ok) setVolunteers(await resVolunteers.json());

      // 4. Fetch Expenses
      const resExpenses = await fetch("https://vinayakax-backend.onrender.com/api/admin/expenses", { headers });
      if (resExpenses.ok) setExpenses(await resExpenses.json());
      const resLive = await fetch(
  "https://vinayakax-backend.onrender.com/api/live/"
);

if (resLive.ok) {
  setLiveCameras(await resLive.json());
}
      
    } catch {
      // Mock Fallbacks if server down
      setAnalytics({
        total_donation_amount: 148200,
        total_donations_count: 320,
        total_volunteers: 45,
        pending_volunteers: 3,
        total_competitions: 54,
        gallery: { total: 42, approved: 38, pending: 4 },
        devices: { Desktop: 55, Mobile: 40, Tablet: 5 },
        locations: { Srikakulam: 450, Vajrapukotturu: 300, Palasa: 150, Vizag: 80 },
        visitor_trend: [
          { day: "Day 1", visitors: 1000 },
          { day: "Day 2", visitors: 1300 },
          { day: "Day 3", visitors: 1500 },
          { day: "Day 4", visitors: 1900 },
          { day: "Day 5", visitors: 2400 }
        ]
      });
      setPendingPhotos([
        { id: 10, uploader_name: "T. Harinath", url: "https://images.unsplash.com/photo-1567591905632-9a59eed2c4c4?auto=format&fit=crop&q=80&w=300", caption: "Harathi pooja closeup", album: "Harathi" }
      ]);
      setVolunteers([
        {
          id: 1,
          status: "PENDING",
          assigned_work: "Prasadam Distribution",
          performance_score: 5.0,
          attendance_json: "[]",
          shifts_json: "[]",
          user: { full_name: "B. Satish", email: "satish@gmail.com" }
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const handleApprovePhoto = async (id: number) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`https://vinayakax-backend.onrender.com/api/gallery/${id}/approve`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) fetchAdminData(token!, isAdminRole);
    } catch {
      // Mock update
      setPendingPhotos(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleRejectPhoto = async (id: number) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`https://vinayakax-backend.onrender.com/api/gallery/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) fetchAdminData(token!, isAdminRole);
    } catch {
      // Mock update
      setPendingPhotos(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleApproveVolunteer = async (id: number, approved: boolean) => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`https://vinayakax-backend.onrender.com/api/volunteers/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          status: approved ? "APPROVED" : "REJECTED"
        })
      });
      if (response.ok) fetchAdminData(token!, isAdminRole);
    } catch {
      // Mock update
      setVolunteers(prev =>
        prev.map(v => (v.id === id ? { ...v, status: approved ? "APPROVED" : "REJECTED" } : v))
      );
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle || !expAmt) return;

    const token = localStorage.getItem("token");
    try {
      const res = await fetch("https://vinayakax-backend.onrender.com/api/admin/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: expTitle,
          category: expCat,
          amount: parseFloat(expAmt),
          date: expDate
        })
      });
      if (res.ok) {
        setExpTitle("");
        setExpAmt("");
        fetchAdminData(token!, isAdminRole);
      }
    } catch {
      // Mock add
      const newExp: ExpenseItem = {
        id: Date.now(),
        title: expTitle,
        category: expCat,
        amount: parseFloat(expAmt),
        date: expDate
      };
      setExpenses(prev => [newExp, ...prev]);
      setExpTitle("");
      setExpAmt("");
    }
  };

  const handleDeleteExpense = async (id: number) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`https://vinayakax-backend.onrender.com/api/admin/expenses/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) fetchAdminData(token!, isAdminRole);
    } catch {
      setExpenses(prev => prev.filter(e => e.id !== id));
    }
  };
  const handleAddCamera = async (e: React.FormEvent) => {
  e.preventDefault();

  const token = localStorage.getItem("token");

  if (!cameraName || !cameraUrl) return;

  const response = await fetch("https://vinayakax-backend.onrender.com/api/live/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: cameraName,
      stream_url: cameraUrl,
      is_active: true,
    }),
  });

  if (response.ok) {
    setCameraName("");
    setCameraUrl("");
    fetchAdminData(token!, isAdminRole);
  }
};

  // ==========================================
  // Announcement handlers — ADMIN and VOLUNTEER share these identically.
  // ==========================================

  const resetAnnouncementForm = () => {
    setAnnTitle("");
    setAnnDescription("");
    setAnnDateTime("");
    setAnnPinned(false);
    setAnnPublished(true);
    setEditingAnnId(null);
  };

  const handleAnnouncementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnnError("");
    setAnnSuccess("");

    if (!annTitle.trim() || !annDescription.trim()) {
      setAnnError("Title and description are required.");
      return;
    }

    const token = localStorage.getItem("token");
    setAnnLoading(true);
    try {
      const response = await fetch(
        editingAnnId
          ? `https://vinayakax-backend.onrender.com/api/announcements/${editingAnnId}`
          : "https://vinayakax-backend.onrender.com/api/announcements",
        {
          method: editingAnnId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            title: annTitle,
            description: annDescription,
            event_datetime: annDateTime ? new Date(annDateTime).toISOString() : null,
            is_pinned: annPinned,
            is_published: annPublished
          })
        }
      );

      if (response.ok) {
        setAnnSuccess(editingAnnId ? "Announcement updated." : "Announcement created.");
        resetAnnouncementForm();
        fetchAdminData(token!, isAdminRole);
      } else {
        setAnnError("Failed to save announcement. Please check your session and try again.");
      }
    } catch {
      setAnnError("Error contacting backend server.");
    } finally {
      setAnnLoading(false);
    }
  };

  const handleEditAnnouncement = (a: AnnouncementItem) => {
    setAnnTitle(a.title);
    setAnnDescription(a.description);
    setAnnDateTime(a.event_datetime ? a.event_datetime.slice(0, 16) : "");
    setAnnPinned(a.is_pinned);
    setAnnPublished(a.is_published);
    setEditingAnnId(a.id);
    setAnnError("");
    setAnnSuccess("");
  };

  const handleConfirmDeleteAnnouncement = async () => {
    if (!annDeleteTarget) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`https://vinayakax-backend.onrender.com/api/announcements/${annDeleteTarget.id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        fetchAdminData(token!, isAdminRole);
      } else {
        setAnnError("Failed to delete announcement.");
      }
    } catch {
      setAnnError("Error contacting backend server.");
    } finally {
      setAnnDeleteTarget(null);
    }
  };

  const handleTogglePin = async (a: AnnouncementItem) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`https://vinayakax-backend.onrender.com/api/announcements/${a.id}/pin`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) fetchAdminData(token!, isAdminRole);
    } catch {
      setAnnError("Error contacting backend server.");
    }
  };

  const handleTogglePublish = async (a: AnnouncementItem) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`https://vinayakax-backend.onrender.com/api/announcements/${a.id}/publish`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) fetchAdminData(token!, isAdminRole);
    } catch {
      setAnnError("Error contacting backend server.");
    }
  };
  // ==========================================
  // Schedule handlers — ADMIN and VOLUNTEER share these identically.
  // ==========================================

  const resetScheduleForm = () => {
    setSchDay(1);
    setSchTitle("");
    setSchDescription("");
    setSchDate("");
    setSchStartTime("");
    setSchEndTime("");
    setSchLocation("PUTCHAVANI TOTALU STREET");
    setSchImportant(false);
    setEditingSchId(null);
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSchError("");
    setSchSuccess("");

    if (!schTitle.trim() || !schDate || !schStartTime) {
      setSchError("Title, date, and start time are required.");
      return;
    }

    const token = localStorage.getItem("token");
    setSchLoading(true);
    try {
      const response = await fetch(
        editingSchId
          ? `https://vinayakax-backend.onrender.com/api/schedule/${editingSchId}`
          : "https://vinayakax-backend.onrender.com/api/schedule",
        {
          method: editingSchId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            day: schDay,
            title: schTitle,
            description: schDescription || null,
            date: schDate,
            start_time: schStartTime,
            end_time: schEndTime || null,
            location: schLocation,
            is_important: schImportant
          })
        }
      );

      if (response.ok) {
        setSchSuccess(editingSchId ? "Schedule item updated." : "Schedule item created.");
        resetScheduleForm();
        fetchAdminData(token!, isAdminRole);
      } else {
        setSchError("Failed to save schedule item. Please check your session and try again.");
      }
    } catch {
      setSchError("Error contacting backend server.");
    } finally {
      setSchLoading(false);
    }
  };

  const handleEditSchedule = (s: ScheduleItem) => {
    setSchDay(s.day);
    setSchTitle(s.title);
    setSchDescription(s.description || "");
    setSchDate(s.date);
    setSchStartTime(s.start_time);
    setSchEndTime(s.end_time || "");
    setSchLocation(s.location);
    setSchImportant(s.is_important);
    setEditingSchId(s.id);
    setSchError("");
    setSchSuccess("");
  };

  const handleConfirmDeleteSchedule = async () => {
    if (!schDeleteTarget) return;
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`https://vinayakax-backend.onrender.com/api/schedule/${schDeleteTarget.id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        fetchAdminData(token!, isAdminRole);
      } else {
        setSchError("Failed to delete schedule item.");
      }
    } catch {
      setSchError("Error contacting backend server.");
    } finally {
      setSchDeleteTarget(null);
    }
  };

  const handleToggleImportant = async (s: ScheduleItem) => {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`https://vinayakax-backend.onrender.com/api/schedule/${s.id}/important`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) fetchAdminData(token!, isAdminRole);
    } catch {
      setSchError("Error contacting backend server.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-xs font-bold text-stone-500">
        Loading Admin Workspace...
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[55vh] text-center space-y-4 max-w-sm mx-auto">
        <ShieldX className="h-14 w-14 text-red-500 animate-bounce" />
        <h2 className="text-xl font-bold text-stone-850 dark:text-white">Administrative Access Restricted</h2>
        <p className="text-stone-500 text-xs">You do not have permissions to access the VinayakaX admin dashboard panels.</p>
        <button
          onClick={() => router.push("/login")}
          className="rounded-full bg-saffron-500 hover:bg-saffron-600 text-white font-bold px-6 py-2.5 text-xs shadow-md"
        >
          Login as Admin
        </button>
      </div>
    );
  }

  // Setup Chart Data
  const visitorChartData = {
    labels: analytics?.visitor_trend.map(v => v.day) || [],
    datasets: [
      {
        label: "Visitors Count",
        data: analytics?.visitor_trend.map(v => v.visitors) || [],
        borderColor: "#ff6f00",
        backgroundColor: "rgba(255, 111, 0, 0.15)",
        fill: true,
        tension: 0.3
      }
    ]
  };

  const deviceChartData = {
    labels: Object.keys(analytics?.devices || {}),
    datasets: [
      {
        data: Object.values(analytics?.devices || {}),
        backgroundColor: ["#ff6f00", "#ffd700", "#7f8c8d"]
      }
    ]
  };

  const locationChartData = {
    labels: Object.keys(analytics?.locations || {}),
    datasets: [
      {
        label: "Devotees Location",
        data: Object.values(analytics?.locations || {}),
        backgroundColor: "#d4af37"
      }
    ]
  };

  const totalExpenseSum = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Admin-only tabs vs the equal-permission Announcements/Schedule tabs
  const adminOnlyTabs = ["analytics", "moderation", "volunteers", "expenses", "live"];
  const equalPermissionTabs = ["announcements", "schedule"];
  const visibleTabs = isAdminRole ? [...adminOnlyTabs, ...equalPermissionTabs] : equalPermissionTabs;

  return (
    <div className="space-y-8 py-4">
      {/* Header */}
      <section className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-250 dark:border-stone-800 pb-4">
        <div>
          <span className="text-[10px] text-saffron-500 uppercase font-bold tracking-wider block">
            {isAdminRole ? "Admin Control" : "Volunteer Control"}
          </span>
          <h1 className="text-4xl font-extrabold text-stone-900 dark:text-white">
            {isAdminRole ? "Admin Dashboard" : "Volunteer Dashboard"}
          </h1>
        </div>

        {/* Section selectors */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar max-w-full pb-1">
          {visibleTabs.map((sect) => (
            <button
              key={sect}
              onClick={() => setSection(sect as any)}
              className={`rounded-full px-4 py-2 text-[10px] font-extrabold uppercase transition-all whitespace-nowrap cursor-pointer ${
                section === sect
                  ? "bg-stone-850 dark:bg-stone-100 text-white dark:text-stone-900 shadow-sm"
                  : "bg-white dark:bg-stone-900 border border-stone-250 dark:border-stone-800 text-stone-600 dark:text-stone-300"
              }`}
            >
              {sect}
            </button>
          ))}
        </div>
      </section>

      {/* Analytics Dashboard Grid */}
      {section === "analytics" && analytics && (
        <div className="space-y-8 animate-fade-in">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl glass-panel border-l-4 border-l-saffron-500 space-y-1">
              <span className="text-[9px] text-stone-500 font-bold uppercase block">Total Donations</span>
              <span className="text-xl sm:text-2xl font-extrabold text-stone-850 dark:text-white">₹{analytics.total_donation_amount}</span>
            </div>
            <div className="p-4 rounded-xl glass-panel border-l-4 border-l-gold-500 space-y-1">
              <span className="text-[9px] text-stone-500 font-bold uppercase block">Devotees Team</span>
              <span className="text-xl sm:text-2xl font-extrabold text-stone-850 dark:text-white">{analytics.total_volunteers} Approved</span>
            </div>
            <div className="p-4 rounded-xl glass-panel border-l-4 border-l-cyan-500 space-y-1">
              <span className="text-[9px] text-stone-500 font-bold uppercase block">Gallery Submissions</span>
              <span className="text-xl sm:text-2xl font-extrabold text-stone-850 dark:text-white">{analytics.gallery.total} uploaded</span>
            </div>
            <div className="p-4 rounded-xl glass-panel border-l-4 border-l-red-500 space-y-1">
              <span className="text-[9px] text-stone-500 font-bold uppercase block">Competition Regs</span>
              <span className="text-xl sm:text-2xl font-extrabold text-stone-850 dark:text-white">{analytics.total_competitions} entrants</span>
            </div>
          </div>

          {/* Graphics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Visitor Trend */}
            <div className="p-4 rounded-xl glass-panel border border-stone-250 dark:border-stone-850 md:col-span-2 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-saffron-500" />
                9-Day Visitor Turnout
              </h3>
              <div className="h-56 flex items-center justify-center">
                <Line data={visitorChartData} options={{ responsive: true, maintainAspectRatio: false }} />
              </div>
            </div>

            {/* Device segmentation */}
            <div className="p-4 rounded-xl glass-panel border border-stone-250 dark:border-stone-850 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                Device Segments
              </h3>
              <div className="h-56 flex items-center justify-center">
                <Pie data={deviceChartData} options={{ responsive: true, maintainAspectRatio: false }} />
              </div>
            </div>

            {/* Geographical split */}
            <div className="p-4 rounded-xl glass-panel border border-stone-250 dark:border-stone-850 md:col-span-3 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
                Devotee Geographic Turnout
              </h3>
              <div className="h-56 flex items-center justify-center">
                <Bar data={locationChartData} options={{ responsive: true, maintainAspectRatio: false }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photo Moderation Drawer */}
      {section === "moderation" && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-stone-850 dark:text-white flex items-center gap-2">
            <Image className="h-5 w-5 text-saffron-500" />
            Devotee Photo Moderation Queue ({pendingPhotos.length})
          </h3>
          
          {pendingPhotos.length === 0 ? (
            <div className="text-center py-10 glass-panel rounded-2xl">
              <p className="text-stone-500 text-xs">No pending uploads awaiting approval.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingPhotos.map((item) => (
                <div key={item.id} className="rounded-xl overflow-hidden glass-panel border border-saffron-500/10 flex flex-col justify-between">
                  <div className="aspect-video bg-stone-900 relative">
                    <img src={item.url} alt={item.caption} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <span className="text-[8px] bg-stone-100 dark:bg-stone-800 text-stone-500 font-extrabold px-1.5 py-0.5 rounded uppercase block w-fit">
                        {item.album}
                      </span>
                      <p className="font-bold text-stone-850 dark:text-white text-xs mt-1">{item.caption}</p>
                      <p className="text-[10px] text-stone-400">By {item.uploader_name}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprovePhoto(item.id)}
                        className="flex-1 flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700 text-white rounded px-2.5 py-1.5 text-[10px] font-bold cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => handleRejectPhoto(item.id)}
                        className="flex-1 flex items-center justify-center gap-1 bg-red-600 hover:bg-red-700 text-white rounded px-2.5 py-1.5 text-[10px] font-bold cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Volunteer Applications Moderation */}
      {section === "volunteers" && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-stone-850 dark:text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-saffron-500" />
            Volunteer Deployment List ({volunteers.length})
          </h3>
          
          <div className="space-y-4">
            {volunteers.map((vol) => (
              <div key={vol.id} className="p-4 rounded-xl glass-panel border border-stone-250 dark:border-stone-800 flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-xs">
                <div className="space-y-1">
                  <h4 className="font-bold text-stone-850 dark:text-white text-sm sm:text-base">{vol.user.full_name}</h4>
                  <p className="text-[10px] text-stone-500">{vol.user.email}</p>
                  <p className="text-[10px] text-saffron-600 font-semibold mt-1">Requested Service: {vol.assigned_work || "None"}</p>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  {vol.status === "PENDING" ? (
                    <>
                      <button
                        onClick={() => handleApproveVolunteer(vol.id, true)}
                        className="bg-green-600 hover:bg-green-700 text-white rounded px-3 py-1.5 font-bold cursor-pointer text-[10px]"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleApproveVolunteer(vol.id, false)}
                        className="bg-red-600 hover:bg-red-700 text-white rounded px-3 py-1.5 font-bold cursor-pointer text-[10px]"
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <span className={`font-bold px-2 py-0.5 rounded uppercase text-[9px] ${
                      vol.status === "APPROVED" ? "bg-green-100 text-green-700 border border-green-300" : "bg-red-100 text-red-700 border border-red-300"
                    }`}>
                      {vol.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expense Tracker Section */}
      {section === "expenses" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Expense Form */}
          <div className="p-6 rounded-2xl glass-panel border border-saffron-500/10 space-y-4 h-fit">
            <h3 className="text-lg font-bold text-stone-850 dark:text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-saffron-500" />
              Add Expense Record
            </h3>
            <form onSubmit={handleAddExpense} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-stone-500 font-semibold block">Expense Item</label>
                <input
                  type="text"
                  placeholder="e.g. Tent Hire Charges"
                  value={expTitle}
                  onChange={e => setExpTitle(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-stone-500 font-semibold block">Amount (INR ₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 12500"
                    value={expAmt}
                    onChange={e => setExpAmt(e.target.value)}
                    className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none font-bold"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-stone-500 font-semibold block">Category</label>
                  <select
                    value={expCat}
                    onChange={e => setExpCat(e.target.value)}
                    className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                  >
                    <option value="Decoration">Decoration</option>
                    <option value="Food & Annaprasadam">Food & Annaprasadam</option>
                    <option value="Sound & Lightings">Sound & Lightings</option>
                    <option value="Security & Permits">Security & Permits</option>
                    <option value="Prizes & Competitions">Prizes & Competitions</option>
                    <option value="Misc">Misc</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-stone-500 font-semibold block">Expense Date</label>
                <input
                  type="date"
                  value={expDate}
                  onChange={e => setExpDate(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-saffron-500 hover:bg-saffron-600 text-white font-bold py-2.5 transition-colors cursor-pointer text-center"
              >
                Log Expense
              </button>
            </form>
          </div>

          {/* Expenses list */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-250 dark:border-stone-800 pb-3">
              <h3 className="text-lg font-bold text-stone-850 dark:text-white flex items-center gap-2">
                <Landmark className="h-5 w-5 text-saffron-500" />
                Ledger Expenditure History
              </h3>
              <span className="text-xs font-extrabold text-red-500">Total Spent: ₹{totalExpenseSum}</span>
            </div>

            <div className="space-y-3">
              {expenses.length === 0 ? (
                <div className="text-center py-10 glass-panel rounded-2xl">
                  <p className="text-stone-500 text-xs">No logged expenses.</p>
                </div>
              ) : (
                expenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="p-3.5 rounded-xl glass-panel border border-stone-200 dark:border-stone-850 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-bold text-stone-850 dark:text-white">{exp.title}</p>
                      <p className="text-[10px] text-stone-400 mt-0.5">{exp.date} - Category: {exp.category}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-bold text-red-500">- ₹{exp.amount}</span>
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-1.5 text-stone-400 hover:text-red-500 transition-colors focus:outline-none"
                        title="Delete record"
                      >
                        
                        <Trash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {section === "live" && (
  <div className="space-y-6">

    <div className="rounded-2xl glass-panel p-6 border border-stone-200 dark:border-stone-800">
      <h2 className="text-xl font-bold mb-4">
        📹 Live Camera Management
      </h2>

      <form onSubmit={handleAddCamera} className="space-y-3">

        <input
          type="text"
          placeholder="Camera Name"
          value={cameraName}
          onChange={(e) => setCameraName(e.target.value)}
          className="w-full rounded-lg border p-3"
        />

        <input
          type="text"
          placeholder="Stream URL"
          value={cameraUrl}
          onChange={(e) => setCameraUrl(e.target.value)}
          className="w-full rounded-lg border p-3"
        />

        <button
          type="submit"
          className="rounded-lg bg-green-600 px-5 py-3 text-white font-bold"
        >
          ➕ Add Camera
        </button>

      </form>
    </div>

  </div>
)}

      {/* Announcement Management — ADMIN and VOLUNTEER, equal permissions */}
      {section === "announcements" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add / Edit Announcement Form */}
          <div className="p-6 rounded-2xl glass-panel border border-saffron-500/10 space-y-4 h-fit">
            <h3 className="text-lg font-bold text-stone-850 dark:text-white flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-saffron-500" />
              {editingAnnId ? "Edit Announcement" : "Add Announcement"}
            </h3>

            {annError && (
              <div className="text-[11px] font-semibold text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-lg px-3 py-2">
                {annError}
              </div>
            )}
            {annSuccess && (
              <div className="text-[11px] font-semibold text-green-600 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/40 rounded-lg px-3 py-2">
                {annSuccess}
              </div>
            )}

            <form onSubmit={handleAnnouncementSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-stone-500 font-semibold block">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Timing Change for Evening Harathi"
                  value={annTitle}
                  onChange={e => setAnnTitle(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-500 font-semibold block">Description / Message</label>
                <textarea
                  placeholder="Full announcement details..."
                  value={annDescription}
                  onChange={e => setAnnDescription(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-500 font-semibold block">Date & Time (optional)</label>
                <input
                  type="datetime-local"
                  value={annDateTime}
                  onChange={e => setAnnDateTime(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between gap-4 pt-1">
                <label className="flex items-center gap-2 text-stone-600 dark:text-stone-300 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={annPinned}
                    onChange={e => setAnnPinned(e.target.checked)}
                    className="h-3.5 w-3.5 accent-saffron-500"
                  />
                  Important / Pinned
                </label>
                <label className="flex items-center gap-2 text-stone-600 dark:text-stone-300 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={annPublished}
                    onChange={e => setAnnPublished(e.target.checked)}
                    className="h-3.5 w-3.5 accent-saffron-500"
                  />
                  Published
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={annLoading}
                  className="flex-1 rounded-lg bg-saffron-500 hover:bg-saffron-600 text-white font-bold py-2.5 transition-colors cursor-pointer text-center disabled:opacity-60"
                >
                  {annLoading ? "Saving..." : editingAnnId ? "Update Announcement" : "Create Announcement"}
                </button>
                {editingAnnId && (
                  <button
                    type="button"
                    onClick={resetAnnouncementForm}
                    className="rounded-lg border border-stone-250 dark:border-stone-750 text-stone-600 dark:text-stone-300 font-bold py-2.5 px-4 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Announcements list */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-lg font-bold text-stone-850 dark:text-white flex items-center gap-2 border-b border-stone-250 dark:border-stone-800 pb-3">
              <Megaphone className="h-5 w-5 text-saffron-500" />
              All Announcements ({announcements.length})
            </h3>

            {announcements.length === 0 ? (
              <div className="text-center py-10 glass-panel rounded-2xl">
                <p className="text-stone-500 text-xs">No announcements available right now.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.map((a) => (
                  <div
                    key={a.id}
                    className="p-4 rounded-xl glass-panel border border-stone-200 dark:border-stone-850 flex flex-col sm:flex-row justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {a.is_pinned && (
                          <span className="flex items-center gap-1 bg-gold-100 dark:bg-amber-950/40 text-gold-600 dark:text-gold-400 font-extrabold text-[9px] px-2 py-0.5 rounded uppercase">
                            <Pin className="h-3 w-3" /> Pinned
                          </span>
                        )}
                        <span
                          className={`font-extrabold text-[9px] px-2 py-0.5 rounded uppercase ${
                            a.is_published
                              ? "bg-green-100 text-green-700 border border-green-300"
                              : "bg-stone-200 text-stone-600 border border-stone-300"
                          }`}
                        >
                          {a.is_published ? "Published" : "Hidden"}
                        </span>
                      </div>
                      <h4 className="font-bold text-stone-850 dark:text-white text-sm">{a.title}</h4>
                      <p className="text-stone-500 dark:text-stone-400">{a.description}</p>
                      <p className="text-[10px] text-stone-400">By {a.created_by_name}</p>
                    </div>

                    <div className="flex items-center gap-1.5 sm:self-center shrink-0">
                      <button
                        onClick={() => handleTogglePin(a)}
                        className="p-2 text-gold-500 hover:bg-gold-500/10 rounded-full"
                        title={a.is_pinned ? "Unpin" : "Pin"}
                      >
                        <Pin className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleTogglePublish(a)}
                        className="p-2 text-stone-500 hover:bg-stone-500/10 rounded-full"
                        title={a.is_published ? "Hide" : "Publish"}
                      >
                        {a.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => handleEditAnnouncement(a)}
                        className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-full"
                        title="Edit Announcement"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setAnnDeleteTarget(a)}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-full"
                        title="Delete Announcement"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Schedule Management — ADMIN and VOLUNTEER, equal permissions */}
      {section === "schedule" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add / Edit Schedule Item Form */}
          <div className="p-6 rounded-2xl glass-panel border border-saffron-500/10 space-y-4 h-fit">
            <h3 className="text-lg font-bold text-stone-850 dark:text-white flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-saffron-500" />
              {editingSchId ? "Edit Schedule Item" : "Add Schedule Item"}
            </h3>

            {schError && (
              <div className="text-[11px] font-semibold text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-lg px-3 py-2">
                {schError}
              </div>
            )}
            {schSuccess && (
              <div className="text-[11px] font-semibold text-green-600 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/40 rounded-lg px-3 py-2">
                {schSuccess}
              </div>
            )}

            <form onSubmit={handleScheduleSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-stone-500 font-semibold block">Festival Day</label>
                <select
                  value={schDay}
                  onChange={e => setSchDay(parseInt(e.target.value))}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                >
                  <option value={1}>Day 1</option>
                  <option value={2}>Day 2</option>
                  <option value={3}>Day 3</option>
                  <option value={4}>Day 4 – Grand Nimajjanam</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-stone-500 font-semibold block">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Morning Abhishekam"
                  value={schTitle}
                  onChange={e => setSchTitle(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-500 font-semibold block">Description (optional)</label>
                <textarea
                  placeholder="Details..."
                  value={schDescription}
                  onChange={e => setSchDescription(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                  rows={3}
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-500 font-semibold block">Date</label>
                <input
                  type="date"
                  value={schDate}
                  onChange={e => setSchDate(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-stone-500 font-semibold block">Start Time</label>
                  <input
                    type="time"
                    value={schStartTime}
                    onChange={e => setSchStartTime(e.target.value)}
                    className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-stone-500 font-semibold block">End Time (optional)</label>
                  <input
                    type="time"
                    value={schEndTime}
                    onChange={e => setSchEndTime(e.target.value)}
                    className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-stone-500 font-semibold block">Location</label>
                <input
                  type="text"
                  value={schLocation}
                  onChange={e => setSchLocation(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-2 text-stone-600 dark:text-stone-300 font-semibold cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={schImportant}
                  onChange={e => setSchImportant(e.target.checked)}
                  className="h-3.5 w-3.5 accent-saffron-500"
                />
                Important / Highlight
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={schLoading}
                  className="flex-1 rounded-lg bg-saffron-500 hover:bg-saffron-600 text-white font-bold py-2.5 transition-colors cursor-pointer text-center disabled:opacity-60"
                >
                  {schLoading ? "Saving..." : editingSchId ? "Update Item" : "Add to Schedule"}
                </button>
                {editingSchId && (
                  <button
                    type="button"
                    onClick={resetScheduleForm}
                    className="rounded-lg border border-stone-250 dark:border-stone-750 text-stone-600 dark:text-stone-300 font-bold py-2.5 px-4 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Schedule list, grouped by day */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-lg font-bold text-stone-850 dark:text-white flex items-center gap-2 border-b border-stone-250 dark:border-stone-800 pb-3">
              <CalendarDays className="h-5 w-5 text-saffron-500" />
              Full Schedule ({scheduleItems.length})
            </h3>

            {scheduleItems.length === 0 ? (
              <div className="text-center py-10 glass-panel rounded-2xl">
                <p className="text-stone-500 text-xs">No schedule items added yet.</p>
              </div>
            ) : (
              [1, 2, 3, 4].map((d) => {
                const dayItems = scheduleItems
                  .filter((s) => s.day === d)
                  .sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time));
                if (dayItems.length === 0) return null;
                const isDay4 = d === 4;
                return (
                  <div key={d} className="space-y-3">
                    <h4 className={`text-xs font-extrabold uppercase tracking-wider ${isDay4 ? "text-gold-600 dark:text-gold-400" : "text-stone-500"}`}>
                      {d === 4 ? "Day 4 – Grand Nimajjanam" : `Day ${d}`}
                    </h4>
                    {dayItems.map((s) => (
                      <div
                        key={s.id}
                        className={`p-4 rounded-xl glass-panel border flex flex-col sm:flex-row justify-between gap-4 text-xs ${
                          isDay4 ? "border-gold-500/40" : "border-stone-200 dark:border-stone-850"
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {s.is_important && (
                              <span className="flex items-center gap-1 bg-gold-100 dark:bg-amber-950/40 text-gold-600 dark:text-gold-400 font-extrabold text-[9px] px-2 py-0.5 rounded uppercase">
                                <Star className="h-3 w-3" /> Important
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-stone-850 dark:text-white text-sm">{s.title}</h4>
                          {s.description && <p className="text-stone-500 dark:text-stone-400">{s.description}</p>}
                          <p className="text-[10px] text-stone-400">
                            {s.date} · {s.start_time}{s.end_time ? ` – ${s.end_time}` : ""} · {s.location}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 sm:self-center shrink-0">
                          <button
                            onClick={() => handleToggleImportant(s)}
                            className="p-2 text-gold-500 hover:bg-gold-500/10 rounded-full"
                            title={s.is_important ? "Unmark important" : "Mark important"}
                          >
                            <Star className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditSchedule(s)}
                            className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-full"
                            title="Edit Item"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setSchDeleteTarget(s)}
                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-full"
                            title="Delete Item"
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation dialog — Announcements */}
      {annDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 space-y-4 shadow-xl">
            <h4 className="font-bold text-stone-850 dark:text-white text-sm">
              Are you sure you want to delete this announcement?
            </h4>
            <p className="text-xs text-stone-500">
              "{annDeleteTarget.title}" will be permanently removed. This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setAnnDeleteTarget(null)}
                className="rounded-lg border border-stone-250 dark:border-stone-750 text-stone-600 dark:text-stone-300 font-bold py-2 px-4 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteAnnouncement}
                className="rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 text-xs cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog — Schedule */}
      {schDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 space-y-4 shadow-xl">
            <h4 className="font-bold text-stone-850 dark:text-white text-sm">
              Are you sure you want to delete this schedule item?
            </h4>
            <p className="text-xs text-stone-500">
              "{schDeleteTarget.title}" will be permanently removed. This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setSchDeleteTarget(null)}
                className="rounded-lg border border-stone-250 dark:border-stone-750 text-stone-600 dark:text-stone-300 font-bold py-2 px-4 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteSchedule}
                className="rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 text-xs cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}