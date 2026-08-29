"use client";

import { useEffect, useMemo, useState } from "react";
import {
  UserCheck,
  QrCode,
  Download,
  Plus,
  Pencil,
  Trash,
  X,
  Search,
  Users,
  ClipboardList,
  CalendarCheck2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  Bell,
  Ban,
  Tag,
  ListChecks,
  RefreshCw,
  UserCog,
  BarChart3,
} from "lucide-react";

// ====================================================================
// API LAYER — unchanged from the previous rebuild. Every endpoint here
// is one already confirmed against backend/routers/volunteer_tasks.py,
// backend/routers/volunteers.py (via the working GET calls), and
// backend/schemas.py. No new endpoints, no invented routes.
// ====================================================================

const API_BASE = "https://vinayakax-backend.onrender.com";

type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number | null; message: string; kind: "network" | "http" };

function extractErrorMessage(body: any, fallback: string): string {
  const detail = body?.detail;
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e: any) => {
        const field = Array.isArray(e?.loc) ? e.loc.slice(1).join(".") : "";
        return field ? `${field}: ${e.msg}` : e.msg;
      })
      .join("; ");
  }
  if (typeof detail === "object" && detail.message) return detail.message;
  return fallback;
}

function statusMessage(status: number, body: any): string {
  const detail = extractErrorMessage(body, "");
  switch (status) {
    case 401:
      return "Your session has expired. Please log in again.";
    case 403:
      return detail || "You don't have permission to perform this action.";
    case 404:
      return detail || "That API endpoint or resource could not be found.";
    case 409:
      return detail || "This creates a scheduling conflict.";
    case 422:
      return `Validation error — ${detail || "please check the form fields."}`;
    case 500:
      return detail || "The server hit an internal error. Check the backend logs.";
    default:
      return detail || `Request failed (HTTP ${status}).`;
  }
}

async function apiRequest<T>(
  path: string,
  options: RequestInit,
  authHeaders: Record<string, string>
): Promise<ApiResult<T>> {
  const url = `${API_BASE}${path}`;
  let res: Response;
  try {
    res = await fetch(url, { ...options, headers: { ...authHeaders, ...(options.headers || {}) } });
  } catch (networkErr: any) {
    return {
      ok: false,
      kind: "network",
      status: null,
      message: `Backend unreachable at ${API_BASE}. Confirm the FastAPI server is running and not mid-restart.`,
    };
  }

  const text = await res.text();
  let body: any = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (res.ok) return { ok: true, data: body as T };
  return { ok: false, kind: "http", status: res.status, message: statusMessage(res.status, body) };
}

const api = {
  me: (h: Record<string, string>) => apiRequest<{ role: string }>("/api/auth/me", { method: "GET" }, h),
  listVolunteers: (h: Record<string, string>) =>
    apiRequest<VolunteerOption[]>("/api/volunteers", { method: "GET" }, h),
  myApplication: (h: Record<string, string>) =>
    apiRequest<{ has_applied: boolean; application: MyVolunteerProfile | null }>(
      "/api/volunteers/my-application",
      { method: "GET" },
      h
    ),
  applyToVolunteer: (h: Record<string, string>, assigned_work: string) =>
    apiRequest<MyVolunteerProfile>(
      "/api/volunteers/apply",
      { method: "POST", body: JSON.stringify({ assigned_work }) },
      h
    ),
  listServiceAreas: (h: Record<string, string>) =>
    apiRequest<ServiceArea[]>("/api/service-areas", { method: "GET" }, h),
  createServiceArea: (h: Record<string, string>, payload: { name: string; description: string | null }) =>
    apiRequest<ServiceArea>("/api/service-areas", { method: "POST", body: JSON.stringify(payload) }, h),
  updateServiceArea: (
    h: Record<string, string>,
    id: number,
    payload: { name: string; description: string | null }
  ) => apiRequest<ServiceArea>(`/api/service-areas/${id}`, { method: "PUT", body: JSON.stringify(payload) }, h),
  deleteServiceArea: (h: Record<string, string>, id: number) =>
    apiRequest<{ detail: string }>(`/api/service-areas/${id}`, { method: "DELETE" }, h),
  listNotifications: (h: Record<string, string>) =>
    apiRequest<AppNotification[]>("/api/notifications", { method: "GET" }, h),
  markNotificationRead: (h: Record<string, string>, id: number) =>
    apiRequest<AppNotification>(`/api/notifications/${id}/read`, { method: "PUT" }, h),
  markAllNotificationsRead: (h: Record<string, string>) =>
    apiRequest<{ detail: string }>("/api/notifications/read-all", { method: "PUT" }, h),
  listTasks: (h: Record<string, string>, params: URLSearchParams) =>
    apiRequest<VolunteerTask[]>(`/api/volunteer-tasks?${params.toString()}`, { method: "GET" }, h),
  myTasks: (h: Record<string, string>) =>
    apiRequest<VolunteerTask[]>("/api/volunteer-tasks/my-tasks", { method: "GET" }, h),
  taskStats: (h: Record<string, string>) =>
    apiRequest<TaskStats>("/api/volunteer-tasks/stats", { method: "GET" }, h),
  tasksForVolunteer: (h: Record<string, string>, volunteerId: number) =>
    apiRequest<VolunteerTask[]>(`/api/volunteer-tasks/volunteer/${volunteerId}`, { method: "GET" }, h),
  createTask: (h: Record<string, string>, payload: VolunteerTaskPayload, force: boolean) =>
    apiRequest<VolunteerTask>(
      `/api/volunteer-tasks?force=${force}`,
      { method: "POST", body: JSON.stringify(payload) },
      h
    ),
  updateTask: (h: Record<string, string>, id: number, payload: VolunteerTaskPayload, force: boolean) =>
    apiRequest<VolunteerTask>(
      `/api/volunteer-tasks/${id}?force=${force}`,
      { method: "PUT", body: JSON.stringify(payload) },
      h
    ),
  updateTaskStatus: (h: Record<string, string>, id: number, status: WorkStatus) =>
    apiRequest<VolunteerTask>(
      `/api/volunteer-tasks/${id}/status`,
      { method: "PATCH", body: JSON.stringify({ status }) },
      h
    ),
  cancelTask: (h: Record<string, string>, id: number, cancellation_reason: string) =>
    apiRequest<VolunteerTask>(
      `/api/volunteer-tasks/${id}/cancel`,
      { method: "PATCH", body: JSON.stringify({ cancellation_reason }) },
      h
    ),
  deleteTask: (h: Record<string, string>, id: number) =>
    apiRequest<{ detail: string }>(`/api/volunteer-tasks/${id}`, { method: "DELETE" }, h),
};

// ====================================================================
// Types — unchanged, matches backend/schemas.py exactly
// ====================================================================

type Priority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
type WorkStatus = "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

interface VolunteerOption {
  id: number;
  user_id: number;
  status: string;
  assigned_work: string | null;
  user: { full_name: string; email: string };
}

interface VolunteerTask {
  id: number;
  volunteer_id: number;
  volunteer_name: string;
  task_title: string;
  description: string | null;
  service_area: string | null;
  duty_date: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
  priority: Priority;
  status: WorkStatus;
  cancellation_reason: string | null;
  assigned_by: number;
  assigned_by_name: string;
  created_at: string;
  updated_at: string;
}

interface VolunteerTaskPayload {
  volunteer_id: number;
  task_title: string;
  description: string | null;
  service_area: string | null;
  duty_date: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
  priority: Priority;
  status: WorkStatus;
}

interface TaskStats {
  total_volunteers: number;
  total_active_works: number;
  todays_works: number;
  completed_works: number;
  pending_works: number;
}

interface ServiceArea {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface AppNotification {
  id: number;
  title: string;
  message: string;
  notif_type: string;
  related_task_id: number | null;
  is_read: boolean;
  created_at: string;
}

interface MyVolunteerProfile {
  id: number;
  status: string;
  qr_code_token: string | null;
  user: { full_name: string; email: string };
}

const EMPTY_FORM = {
  volunteer_id: "",
  task_title: "",
  description: "",
  service_area: "",
  duty_date: "",
  start_time: "",
  end_time: "",
  location: "",
  priority: "NORMAL" as Priority,
  status: "ASSIGNED" as WorkStatus,
};

const PRIORITY_STYLES: Record<Priority, string> = {
  LOW: "bg-stone-100 text-stone-600 border-stone-300 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700",
  NORMAL: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/40",
  HIGH: "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-gold-400 dark:border-amber-900/40",
  URGENT: "bg-red-50 text-red-600 border-red-300 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/40",
};

const STATUS_STYLES: Record<WorkStatus, string> = {
  ASSIGNED:
    "bg-saffron-100 text-saffron-600 border-saffron-300 dark:bg-amber-950/30 dark:text-gold-400 dark:border-amber-900/40",
  IN_PROGRESS: "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/40",
  COMPLETED:
    "bg-green-50 text-green-700 border-green-300 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900/40",
  CANCELLED:
    "bg-stone-100 text-stone-500 border-stone-300 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700 line-through",
};

const VOLUNTEER_STATUS_STYLES: Record<string, string> = {
  APPROVED: "bg-green-50 text-green-700 border-green-300 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900/40",
  PENDING: "bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-gold-400 dark:border-amber-900/40",
  REJECTED: "bg-red-50 text-red-600 border-red-300 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/40",
};

// A few rotating icons purely for the mobile Service Areas row — visual
// only, not tied to data. Falls back to Tag for anything unmatched.
function serviceAreaIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("crowd") || n.includes("security")) return "🛡️";
  if (n.includes("medical")) return "➕";
  if (n.includes("clean") || n.includes("hygiene")) return "🧹";
  if (n.includes("park")) return "🚗";
  if (n.includes("tech") || n.includes("electric")) return "⚡";
  return "🏷️";
}

export default function Volunteers() {
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");

  const [tasks, setTasks] = useState<VolunteerTask[]>([]);
  const [myTasks, setMyTasks] = useState<VolunteerTask[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [volunteerOptions, setVolunteerOptions] = useState<VolunteerOption[]>([]);
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [tasksError, setTasksError] = useState("");
  const [tasksLoading, setTasksLoading] = useState(false);
  const [volunteersError, setVolunteersError] = useState("");
  const [volunteersLoading, setVolunteersLoading] = useState(false);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [volunteerFilter, setVolunteerFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [serviceAreaFilter, setServiceAreaFilter] = useState("");
  const [volunteerSearch, setVolunteerSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [formSaving, setFormSaving] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<{ message: string } | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<VolunteerTask | null>(null);
  const [cancelTarget, setCancelTarget] = useState<VolunteerTask | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");

  const [detailVolunteer, setDetailVolunteer] = useState<VolunteerOption | null>(null);
  const [detailTasks, setDetailTasks] = useState<VolunteerTask[]>([]);

  const [showAreaSection, setShowAreaSection] = useState(false);
  const [showAreaForm, setShowAreaForm] = useState(false);
  const [editingAreaId, setEditingAreaId] = useState<number | null>(null);
  const [areaForm, setAreaForm] = useState({ name: "", description: "" });
  const [areaFormError, setAreaFormError] = useState("");
  const [areaDeleteTarget, setAreaDeleteTarget] = useState<ServiceArea | null>(null);

  const [myProfile, setMyProfile] = useState<MyVolunteerProfile | null>(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [applyWork, setApplyWork] = useState("");
  const [applySuccess, setApplySuccess] = useState(false);
  const [applyError, setApplyError] = useState("");

  // Mobile "View all" expand toggles — purely local UI state, no new data.
  const [showAllRecentWorks, setShowAllRecentWorks] = useState(false);
  const [showAllServiceAreasMobile, setShowAllServiceAreasMobile] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const authHeaders: Record<string, string> = token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };

  const init = async () => {
    if (typeof window !== "undefined") {
      setFullName(localStorage.getItem("fullName") || "");
      setRole(localStorage.getItem("role") || "");
    }
    if (!token) {
      setLoading(false);
      return;
    }
    let iAmManager = false;
    const meRes = await api.me(authHeaders);
    if (meRes.ok) {
      iAmManager = meRes.data.role === "ADMIN" || meRes.data.role === "VOLUNTEER";
      setCanManage(iAmManager);
    } else if (meRes.status === 401) {
      setPageError(meRes.message);
    }

    const jobs: Promise<any>[] = [loadServiceAreas(), loadVolunteers(), loadMyProfile(), loadMyTasks(), loadNotifications()];
    if (iAmManager) {
      jobs.push(loadTasks());
      jobs.push(loadStats());
    }
    await Promise.all(jobs);
    setLoading(false);
  };

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading && canManage) loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, priorityFilter, volunteerFilter, dateFilter, serviceAreaFilter]);

  const loadTasks = async () => {
    setTasksLoading(true);
    setTasksError("");
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (priorityFilter) params.set("priority", priorityFilter);
    if (volunteerFilter) params.set("volunteer_id", volunteerFilter);
    if (dateFilter) params.set("date", dateFilter);
    if (serviceAreaFilter) params.set("service_area", serviceAreaFilter);

    const result = await api.listTasks(authHeaders, params);
    if (result.ok) setTasks(result.data);
    else setTasksError(result.message);
    setTasksLoading(false);
  };

  const loadMyTasks = async () => {
    const result = await api.myTasks(authHeaders);
    if (result.ok) setMyTasks(result.data);
  };

  const loadStats = async () => {
    const result = await api.taskStats(authHeaders);
    if (result.ok) setStats(result.data);
  };

  const loadServiceAreas = async () => {
    const result = await api.listServiceAreas(authHeaders);
    if (result.ok) {
      setServiceAreas(result.data);
      if (result.data.length > 0) setApplyWork((prev) => prev || result.data[0].name);
    }
  };

  const loadVolunteers = async () => {
    setVolunteersLoading(true);
    setVolunteersError("");
    const result = await api.listVolunteers(authHeaders);
    if (result.ok) setVolunteerOptions(Array.isArray(result.data) ? result.data : []);
    else {
      setVolunteersError(result.message);
      setVolunteerOptions([]);
    }
    setVolunteersLoading(false);
  };

  const loadNotifications = async () => {
    const result = await api.listNotifications(authHeaders);
    if (result.ok) setNotifications(result.data);
  };

  const loadMyProfile = async () => {
    if (!token) return;
    const result = await api.myApplication(authHeaders);
    if (result.ok && result.data.has_applied && result.data.application) {
      setMyProfile(result.data.application);
      setHasApplied(true);
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplyError("");
    if (!token) {
      setApplyError("Please register or log in first to apply as a volunteer.");
      return;
    }
    const result = await api.applyToVolunteer(authHeaders, applyWork);
    if (result.ok) {
      setApplySuccess(true);
      loadMyProfile();
    } else {
      setApplyError(result.message);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markNotificationRead = async (n: AppNotification) => {
    if (n.is_read) return;
    const result = await api.markNotificationRead(authHeaders, n.id);
    if (result.ok) loadNotifications();
  };

  const markAllRead = async () => {
    const result = await api.markAllNotificationsRead(authHeaders);
    if (result.ok) loadNotifications();
  };

  const openAddForm = (volunteerId?: number) => {
    setForm({ ...EMPTY_FORM, volunteer_id: volunteerId ? String(volunteerId) : "", service_area: serviceAreas[0]?.name || "" });
    setEditingId(null);
    setFormError("");
    setFormSuccess("");
    setConflictWarning(null);
    setShowForm(true);
  };

  const openEditForm = (task: VolunteerTask) => {
    setForm({
      volunteer_id: String(task.volunteer_id),
      task_title: task.task_title,
      description: task.description || "",
      service_area: task.service_area || "",
      duty_date: task.duty_date,
      start_time: task.start_time,
      end_time: task.end_time || "",
      location: task.location || "",
      priority: task.priority,
      status: task.status,
    });
    setEditingId(task.id);
    setFormError("");
    setFormSuccess("");
    setConflictWarning(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setFormError("");
    setFormSuccess("");
    setConflictWarning(null);
  };

  const refreshAfterWorkChange = () => {
    loadTasks();
    loadStats();
    loadMyTasks();
  };

  const submitForm = async (force = false) => {
    if (!form.volunteer_id || !form.task_title.trim() || !form.duty_date || !form.start_time) {
      setFormError("Volunteer, work name, date, and start time are required.");
      return;
    }
    setFormSaving(true);
    setFormError("");
    setConflictWarning(null);

    const payload: VolunteerTaskPayload = {
      volunteer_id: parseInt(form.volunteer_id, 10),
      task_title: form.task_title.trim(),
      description: form.description || null,
      service_area: form.service_area || null,
      duty_date: form.duty_date,
      start_time: form.start_time,
      end_time: form.end_time || null,
      location: form.location || null,
      priority: form.priority,
      status: form.status,
    };

    const result = editingId
      ? await api.updateTask(authHeaders, editingId, payload, force)
      : await api.createTask(authHeaders, payload, force);

    if (result.ok) {
      setFormSuccess(editingId ? "Work assignment updated successfully." : "Work assignment created successfully.");
      refreshAfterWorkChange();
      setTimeout(() => closeForm(), 500);
    } else if (result.status === 409) {
      setConflictWarning({ message: result.message });
    } else {
      setFormError(result.message);
    }
    setFormSaving(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const result = await api.deleteTask(authHeaders, deleteTarget.id);
    if (result.ok) refreshAfterWorkChange();
    setDeleteTarget(null);
  };

  const openCancelModal = (task: VolunteerTask) => {
    setCancelTarget(task);
    setCancelReason("");
    setCancelError("");
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    if (!cancelReason.trim()) {
      setCancelError("A cancellation reason is required.");
      return;
    }
    const result = await api.cancelTask(authHeaders, cancelTarget.id, cancelReason.trim());
    if (result.ok) {
      setCancelTarget(null);
      refreshAfterWorkChange();
    } else {
      setCancelError(result.message);
    }
  };

  const handleStatusChange = async (task: VolunteerTask, newStatus: WorkStatus) => {
    if (newStatus === "CANCELLED") {
      openCancelModal(task);
      return;
    }
    const result = await api.updateTaskStatus(authHeaders, task.id, newStatus);
    if (result.ok) refreshAfterWorkChange();
  };

  const openVolunteerDetail = async (vol: VolunteerOption) => {
    setDetailVolunteer(vol);
    const result = await api.tasksForVolunteer(authHeaders, vol.id);
    setDetailTasks(result.ok ? result.data : []);
  };

  const openAddArea = () => {
    setAreaForm({ name: "", description: "" });
    setEditingAreaId(null);
    setAreaFormError("");
    setShowAreaForm(true);
  };

  const openEditArea = (area: ServiceArea) => {
    setAreaForm({ name: area.name, description: area.description || "" });
    setEditingAreaId(area.id);
    setAreaFormError("");
    setShowAreaForm(true);
  };

  const closeAreaForm = () => {
    setShowAreaForm(false);
    setEditingAreaId(null);
    setAreaForm({ name: "", description: "" });
    setAreaFormError("");
  };

  const submitAreaForm = async () => {
    if (!areaForm.name.trim()) {
      setAreaFormError("Service area name is required.");
      return;
    }
    const payload = { name: areaForm.name.trim(), description: areaForm.description || null };
    const result = editingAreaId
      ? await api.updateServiceArea(authHeaders, editingAreaId, payload)
      : await api.createServiceArea(authHeaders, payload);

    if (result.ok) {
      closeAreaForm();
      loadServiceAreas();
    } else {
      setAreaFormError(result.message);
    }
  };

  const confirmDeleteArea = async () => {
    if (!areaDeleteTarget) return;
    const result = await api.deleteServiceArea(authHeaders, areaDeleteTarget.id);
    if (result.ok) loadServiceAreas();
    setAreaDeleteTarget(null);
  };

  const approvedVolunteers = useMemo(
    () => volunteerOptions.filter((v) => v.status === "APPROVED"),
    [volunteerOptions]
  );
  const pendingVolunteersCount = useMemo(
    () => volunteerOptions.filter((v) => v.status === "PENDING").length,
    [volunteerOptions]
  );

  const filteredVolunteers = useMemo(() => {
    if (!volunteerSearch.trim()) return volunteerOptions;
    const s = volunteerSearch.trim().toLowerCase();
    return volunteerOptions.filter(
      (v) =>
        v.user.full_name.toLowerCase().includes(s) ||
        v.user.email.toLowerCase().includes(s) ||
        (v.assigned_work || "").toLowerCase().includes(s)
    );
  }, [volunteerOptions, volunteerSearch]);

  const workCountByVolunteerId = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const t of tasks) counts[t.volunteer_id] = (counts[t.volunteer_id] || 0) + 1;
    return counts;
  }, [tasks]);

  // Real, derived (not fake) per-area volunteer counts — counts how many
  // approved volunteers listed this area as their assigned_work, exactly
  // as returned by GET /api/volunteers. No new endpoint, no invented data.
  const volunteerCountByAreaName = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const v of approvedVolunteers) {
      if (v.assigned_work) counts[v.assigned_work] = (counts[v.assigned_work] || 0) + 1;
    }
    return counts;
  }, [approvedVolunteers]);

  // Most recent work assignments, newest first, from the real `tasks`
  // list already fetched for the management table.
  const recentWorks = useMemo(() => {
    return [...tasks]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, showAllRecentWorks ? tasks.length : 4);
  }, [tasks, showAllRecentWorks]);

  const visibleServiceAreasMobile = showAllServiceAreasMobile ? serviceAreas : serviceAreas.slice(0, 8);

  const initial = fullName ? fullName.trim().charAt(0).toUpperCase() : "";

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-xs font-bold text-stone-500">
        Loading Volunteer Seva Center...
      </div>
    );
  }

  return (
    <div className="space-y-8 sm:space-y-10 py-4 pb-4">
      {/* Header — desktop unchanged; mobile gets a compact version below the welcome card */}
      <section className="hidden lg:flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-4 max-w-2xl">
          <span className="text-[10px] text-saffron-500 uppercase font-bold tracking-wider block">
            Community Service
          </span>
          <h1 className="text-4xl font-extrabold text-stone-900 dark:text-white">
            Volunteer Seva &amp; Work Management
          </h1>
          <p className="text-stone-600 dark:text-stone-300 text-xs sm:text-sm">
            {canManage
              ? "Create and manage seva/work assignments for the festival committee — who is doing which work, on which date, at what time."
              : "See your assigned seva works, and apply to volunteer for the festival."}
          </p>
        </div>

        {token && (
          <div className="relative shrink-0">
            <button
              onClick={() => setShowNotifPanel((s) => !s)}
              className="relative p-2.5 rounded-full glass-panel border border-stone-250 dark:border-stone-800 cursor-pointer"
            >
              <Bell className="h-5 w-5 text-stone-600 dark:text-stone-300" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-extrabold rounded-full h-4 w-4 flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            {showNotifPanel && (
              <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl glass-panel border border-stone-250 dark:border-stone-800 shadow-xl z-40 p-3 space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-xs font-extrabold uppercase text-stone-500">Notifications</h4>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-[10px] font-bold text-saffron-500 cursor-pointer">
                      Mark all read
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <p className="text-xs text-stone-400 px-1 py-4 text-center">No notifications yet.</p>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => markNotificationRead(n)}
                      className={`w-full text-left p-2.5 rounded-lg text-xs space-y-0.5 cursor-pointer ${
                        n.is_read
                          ? "bg-transparent"
                          : "bg-saffron-50 dark:bg-amber-950/20 border border-saffron-200 dark:border-amber-900/30"
                      }`}
                    >
                      <p className="font-bold text-stone-800 dark:text-white">{n.title}</p>
                      <p className="text-stone-500 dark:text-stone-400">{n.message}</p>
                      <p className="text-[9px] text-stone-400">{new Date(n.created_at).toLocaleString()}</p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ================================================================ */}
      {/* MOBILE-ONLY: title + Welcome Card, matching the reference screenshot */}
      {/* ================================================================ */}
      <section className="lg:hidden space-y-4">
        <div>
          <span className="text-[10px] text-saffron-500 uppercase font-bold tracking-wider block">
            Community Service
          </span>
          <h1 className="text-2xl font-extrabold text-stone-900 dark:text-white leading-tight">
            Volunteer Seva &amp; Work Management
          </h1>
        </div>

        {token && fullName && (
          <div className="relative overflow-hidden rounded-2xl border border-saffron-500/20 bg-gradient-to-br from-stone-900 to-stone-950 p-5">
            {/* Small decorative diya glow dots, purely visual, no layout risk */}
            <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-saffron-500/10 blur-2xl" />
            <p className="text-stone-400 text-xs">Welcome back,</p>
            <h2 className="text-xl font-extrabold text-saffron-400 mt-0.5">
              {fullName} {role === "ADMIN" ? "👋" : ""}
            </h2>
            <p className="text-stone-300 text-xs mt-1.5 max-w-xs">
              {canManage
                ? "Manage volunteers, works & festival activities"
                : "See your assigned seva works, and apply to volunteer"}
            </p>
          </div>
        )}
      </section>

      {pageError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-300 text-red-700 text-xs font-semibold text-center">
          {pageError}
        </div>
      )}

      {/* Apply form for devotees who haven't applied yet */}
      {!hasApplied && (
        <section className="max-w-md p-6 rounded-2xl glass-panel border border-saffron-500/10 space-y-4">
          <h3 className="text-lg font-bold text-stone-850 dark:text-white flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-saffron-500" />
            Apply to Volunteer
          </h3>
          {applySuccess && (
            <p className="p-3 bg-green-100 border border-green-300 text-green-700 text-xs font-semibold rounded-lg">
              Application submitted! Committee leads will review your profile.
            </p>
          )}
          {applyError && (
            <p className="p-3 bg-red-50 border border-red-300 text-red-700 text-xs font-semibold rounded-lg">
              {applyError}
            </p>
          )}
          <form onSubmit={handleApply} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="text-stone-500 font-semibold block">Preferred Area of Service</label>
              <select
                value={applyWork}
                onChange={(e) => setApplyWork(e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
              >
                {serviceAreas.length === 0 && <option value="">No service areas configured yet</option>}
                {serviceAreas.map((sa) => (
                  <option key={sa.id} value={sa.name}>
                    {sa.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-saffron-500 hover:bg-saffron-600 text-white font-bold py-2.5 transition-colors cursor-pointer text-center"
            >
              Submit Application
            </button>
          </form>
        </section>
      )}

      {myProfile?.status === "PENDING" && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-xs font-semibold text-center">
          Your volunteer application is currently PENDING review by the committee.
        </div>
      )}

      {/* ================================================================ */}
      {/* MANAGER-ONLY dashboard content                                    */}
      {/* ================================================================ */}
      {canManage && (
        <>
          {/* ---------------------------------------------------------- */}
          {/* OVERVIEW — mobile: 3-col first row, wraps naturally, matches */}
          {/* the screenshot's 3-then-2 layout without a rigid 5th column */}
          {/* ---------------------------------------------------------- */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 lg:hidden">
              <BarChart3 className="h-4 w-4 text-saffron-500" />
              <h3 className="text-sm font-bold text-stone-850 dark:text-white">Overview</h3>
            </div>
            <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
              <StatCard icon={<Users className="h-4 w-4" />} label="Total Volunteers" value={volunteerOptions.length} />
              <StatCard icon={<ClipboardList className="h-4 w-4" />} label="Active Works" value={stats?.total_active_works ?? 0} />
              <StatCard icon={<CalendarCheck2 className="h-4 w-4" />} label="Today's Works" value={stats?.todays_works ?? 0} />
              <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Completed" value={stats?.completed_works ?? 0} />
              <StatCard icon={<Clock className="h-4 w-4" />} label="Pending" value={stats?.pending_works ?? 0} />
            </div>
          </section>

          {/* ---------------------------------------------------------- */}
          {/* SERVICE AREAS — mobile: horizontal-scroll row, matching the */}
          {/* reference. Desktop keeps the existing collapsible admin CRUD */}
          {/* panel unchanged (it's a different, management-focused view). */}
          {/* ---------------------------------------------------------- */}
          <section className="lg:hidden space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-saffron-500" />
                <h3 className="text-sm font-bold text-stone-850 dark:text-white">Service Areas</h3>
              </div>
              {serviceAreas.length > 8 && (
                <button
                  onClick={() => setShowAllServiceAreasMobile((s) => !s)}
                  className="text-[11px] font-bold text-saffron-500"
                >
                  {showAllServiceAreasMobile ? "Show less" : "View all"}
                </button>
              )}
            </div>

            {serviceAreas.length === 0 ? (
              <p className="text-stone-400 text-xs py-4 text-center glass-panel rounded-xl">
                No service areas configured yet.
              </p>
            ) : (
              <div
                className={
                  showAllServiceAreasMobile
                    ? "grid grid-cols-2 gap-3"
                    : "flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 snap-x snap-mandatory"
                }
              >
                {visibleServiceAreasMobile.map((area) => (
                  <div
                    key={area.id}
                    className={`shrink-0 snap-start rounded-2xl glass-panel border border-stone-200 dark:border-stone-800 p-4 text-center space-y-1.5 ${
                      showAllServiceAreasMobile ? "" : "w-32"
                    }`}
                  >
                    <span className="text-2xl block">{serviceAreaIcon(area.name)}</span>
                    <p className="font-bold text-stone-800 dark:text-white text-xs leading-tight">{area.name}</p>
                    <p className="text-stone-400 text-[10px]">
                      {volunteerCountByAreaName[area.name] || 0} volunteer
                      {(volunteerCountByAreaName[area.name] || 0) === 1 ? "" : "s"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ---------------------------------------------------------- */}
          {/* RECENT WORKS — mobile card list, from the real `tasks` data */}
          {/* ---------------------------------------------------------- */}
          <section className="lg:hidden space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-saffron-500" />
                <h3 className="text-sm font-bold text-stone-850 dark:text-white">Recent Works</h3>
              </div>
              {tasks.length > 4 && (
                <button
                  onClick={() => setShowAllRecentWorks((s) => !s)}
                  className="text-[11px] font-bold text-saffron-500"
                >
                  {showAllRecentWorks ? "Show less" : "View all"}
                </button>
              )}
            </div>

            {tasksLoading ? (
              <div className="text-center py-8 glass-panel rounded-2xl text-stone-500 text-xs">Loading...</div>
            ) : recentWorks.length === 0 ? (
              <div className="text-center py-8 glass-panel rounded-2xl text-stone-500 text-xs">
                No work assignments yet.
              </div>
            ) : (
              <div className="space-y-3">
                {recentWorks.map((t) => (
                  <div key={t.id} className="p-4 rounded-2xl glass-panel border border-stone-200 dark:border-stone-800 space-y-2">
                    <div className="flex items-start gap-3">
                      <span className="shrink-0 h-9 w-9 rounded-full bg-gradient-to-br from-saffron-500 to-gold-500 flex items-center justify-center text-white text-xs font-extrabold">
                        {t.volunteer_name ? t.volunteer_name.charAt(0).toUpperCase() : "?"}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-stone-800 dark:text-white text-sm truncate">{t.task_title}</p>
                        <p className="text-saffron-500 text-xs font-semibold truncate">{t.volunteer_name}</p>
                        {t.service_area && (
                          <span className="inline-block mt-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded border border-saffron-300 text-saffron-600 dark:border-amber-900/40 dark:text-gold-400">
                            {t.service_area}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-stone-400 pt-1 border-t border-stone-200 dark:border-stone-800">
                      <span>
                        {t.duty_date} · {t.start_time}
                        {t.end_time ? ` – ${t.end_time}` : ""}
                      </span>
                      <span className={`font-extrabold px-2 py-0.5 rounded uppercase border ${STATUS_STYLES[t.status]}`}>
                        {t.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ---------------------------------------------------------- */}
          {/* Service Area Management (admin CRUD) — desktop unchanged,   */}
          {/* still reachable on mobile too since it's real functionality */}
          {/* ---------------------------------------------------------- */}
          <section className="space-y-3">
            <button
              onClick={() => setShowAreaSection((s) => !s)}
              className="flex items-center gap-2 text-sm font-bold text-stone-850 dark:text-white cursor-pointer"
            >
              <Tag className="h-4 w-4 text-saffron-500" />
              Service Area Management ({serviceAreas.length})
              <ChevronRight className={`h-4 w-4 transition-transform ${showAreaSection ? "rotate-90" : ""}`} />
            </button>

            {showAreaSection && (
              <div className="p-4 rounded-2xl glass-panel border border-stone-250 dark:border-stone-800 space-y-3">
                <div className="flex justify-end">
                  <button
                    onClick={openAddArea}
                    className="flex items-center gap-1.5 rounded-lg bg-saffron-500 hover:bg-saffron-600 text-white font-bold px-3 py-2 text-[11px] cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Service Area
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {serviceAreas.map((area) => (
                    <div key={area.id} className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 space-y-1 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-stone-800 dark:text-white">{area.name}</p>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={() => openEditArea(area)} className="p-1 text-blue-500 hover:bg-blue-500/10 rounded">
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button onClick={() => setAreaDeleteTarget(area)} className="p-1 text-red-500 hover:bg-red-500/10 rounded">
                            <Trash className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      {area.description && <p className="text-stone-400">{area.description}</p>}
                    </div>
                  ))}
                  {serviceAreas.length === 0 && (
                    <p className="text-stone-400 text-xs col-span-full text-center py-4">No service areas yet — add one above.</p>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* ---------------------------------------------------------- */}
          {/* Volunteer Management — searchable table (desktop) / cards   */}
          {/* ---------------------------------------------------------- */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCog className="h-4 w-4 text-saffron-500" />
                <h3 className="text-sm font-bold text-stone-850 dark:text-white">Volunteer Management</h3>
              </div>
              <button
                onClick={loadVolunteers}
                className="flex items-center gap-1.5 text-[11px] font-bold text-stone-500 hover:text-saffron-500 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </button>
            </div>

            <div className="relative max-w-sm">
              <Search className="h-3.5 w-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={volunteerSearch}
                onChange={(e) => setVolunteerSearch(e.target.value)}
                placeholder="Search by name, email, or area..."
                className="w-full pl-8 pr-3 py-2 text-xs rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 text-stone-800 dark:text-stone-100 focus:outline-none"
              />
            </div>

            {volunteersError && (
              <div className="text-[11px] font-semibold text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-lg px-3 py-2">
                {volunteersError}
              </div>
            )}

            <div className="hidden md:block rounded-2xl glass-panel border border-stone-250 dark:border-stone-800 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-stone-50 dark:bg-stone-900 text-stone-500 uppercase text-[10px] font-extrabold">
                    <th className="text-left px-4 py-3">Name</th>
                    <th className="text-left px-4 py-3">Email</th>
                    <th className="text-left px-4 py-3">Preferred Area</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Assigned Works</th>
                    <th className="text-right px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {volunteersLoading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-stone-500">
                        Loading volunteers...
                      </td>
                    </tr>
                  ) : filteredVolunteers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-stone-500">
                        {volunteerOptions.length === 0 ? "No volunteers found." : "No volunteers match your search."}
                      </td>
                    </tr>
                  ) : (
                    filteredVolunteers.map((v) => (
                      <tr key={v.id} className="border-t border-stone-200 dark:border-stone-800">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => openVolunteerDetail(v)}
                            className="font-bold text-stone-800 dark:text-white hover:text-saffron-500 cursor-pointer text-left"
                          >
                            {v.user.full_name}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-stone-500">{v.user.email}</td>
                        <td className="px-4 py-3 text-stone-500">{v.assigned_work || "—"}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`font-extrabold text-[9px] px-2 py-0.5 rounded uppercase border ${
                              VOLUNTEER_STATUS_STYLES[v.status] || VOLUNTEER_STATUS_STYLES.PENDING
                            }`}
                          >
                            {v.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-stone-500">{workCountByVolunteerId[v.id] || 0}</td>
                        <td className="px-4 py-3 text-right">
                          {v.status === "APPROVED" && (
                            <button
                              onClick={() => openAddForm(v.id)}
                              className="text-[10px] font-bold text-saffron-500 hover:text-saffron-600 cursor-pointer"
                            >
                              + Assign Work
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-3">
              {volunteersLoading ? (
                <div className="text-center py-10 glass-panel rounded-2xl text-stone-500 text-xs">Loading volunteers...</div>
              ) : filteredVolunteers.length === 0 ? (
                <div className="text-center py-10 glass-panel rounded-2xl text-stone-500 text-xs">
                  {volunteerOptions.length === 0 ? "No volunteers found." : "No volunteers match your search."}
                </div>
              ) : (
                filteredVolunteers.map((v) => (
                  <div key={v.id} className="p-4 rounded-xl glass-panel border border-stone-200 dark:border-stone-800 space-y-1.5 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <button onClick={() => openVolunteerDetail(v)} className="font-bold text-stone-850 dark:text-white cursor-pointer text-left">
                        {v.user.full_name}
                      </button>
                      <span
                        className={`font-extrabold text-[9px] px-2 py-0.5 rounded uppercase border shrink-0 ${
                          VOLUNTEER_STATUS_STYLES[v.status] || VOLUNTEER_STATUS_STYLES.PENDING
                        }`}
                      >
                        {v.status}
                      </span>
                    </div>
                    <p className="text-stone-400">{v.user.email}</p>
                    <p className="text-stone-400">
                      {v.assigned_work || "No preferred area"} · {workCountByVolunteerId[v.id] || 0} work(s)
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* ---------------------------------------------------------- */}
          {/* Complete Work / Seva Management table (desktop) — unchanged */}
          {/* ---------------------------------------------------------- */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-saffron-500" />
                <h3 className="text-sm font-bold text-stone-850 dark:text-white">Complete Work / Seva Management</h3>
              </div>
              <button
                onClick={loadTasks}
                className="flex items-center gap-1.5 text-[11px] font-bold text-stone-500 hover:text-saffron-500 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Refresh
              </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2 flex-1">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="h-3.5 w-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search volunteer or work name..."
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 text-stone-800 dark:text-stone-100 focus:outline-none"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 text-stone-800 dark:text-stone-100 px-2.5 py-2 focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="text-xs rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 text-stone-800 dark:text-stone-100 px-2.5 py-2 focus:outline-none"
                >
                  <option value="">All Priorities</option>
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
                <select
                  value={volunteerFilter}
                  onChange={(e) => setVolunteerFilter(e.target.value)}
                  className="text-xs rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 text-stone-800 dark:text-stone-100 px-2.5 py-2 focus:outline-none"
                >
                  <option value="">All Volunteers</option>
                  {approvedVolunteers.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.user.full_name}
                    </option>
                  ))}
                </select>
                <select
                  value={serviceAreaFilter}
                  onChange={(e) => setServiceAreaFilter(e.target.value)}
                  className="text-xs rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 text-stone-800 dark:text-stone-100 px-2.5 py-2 focus:outline-none"
                >
                  <option value="">All Service Areas</option>
                  {serviceAreas.map((sa) => (
                    <option key={sa.id} value={sa.name}>
                      {sa.name}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="text-xs rounded-lg bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 text-stone-800 dark:text-stone-100 px-2.5 py-2 focus:outline-none"
                />
              </div>

              <button
                onClick={() => openAddForm()}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-saffron-500 hover:bg-saffron-600 text-white font-bold px-4 py-2.5 text-xs cursor-pointer shrink-0"
              >
                <Plus className="h-4 w-4" /> Add New Work
              </button>
            </div>

            {tasksError && (
              <div className="text-[11px] font-semibold text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-lg px-3 py-2">
                {tasksError}
              </div>
            )}

            <div className="hidden md:block rounded-2xl glass-panel border border-stone-250 dark:border-stone-800 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-stone-50 dark:bg-stone-900 text-stone-500 uppercase text-[10px] font-extrabold">
                    <th className="text-left px-4 py-3">Volunteer</th>
                    <th className="text-left px-4 py-3">Work / Seva</th>
                    <th className="text-left px-4 py-3">Service Area</th>
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">Time</th>
                    <th className="text-left px-4 py-3">Location</th>
                    <th className="text-left px-4 py-3">Priority</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-right px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tasksLoading ? (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-stone-500">
                        Loading work assignments...
                      </td>
                    </tr>
                  ) : tasks.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-stone-500">
                        No work assignments found.
                      </td>
                    </tr>
                  ) : (
                    tasks.map((t) => (
                      <tr key={t.id} className="border-t border-stone-200 dark:border-stone-800">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => {
                              const vol = volunteerOptions.find((v) => v.id === t.volunteer_id);
                              if (vol) openVolunteerDetail(vol);
                            }}
                            className="font-bold text-stone-800 dark:text-white hover:text-saffron-500 cursor-pointer text-left"
                          >
                            {t.volunteer_name}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-stone-800 dark:text-stone-100">{t.task_title}</p>
                        </td>
                        <td className="px-4 py-3 text-stone-500">{t.service_area || "—"}</td>
                        <td className="px-4 py-3 text-stone-500">{t.duty_date}</td>
                        <td className="px-4 py-3 text-stone-500">
                          {t.start_time}
                          {t.end_time ? ` – ${t.end_time}` : ""}
                        </td>
                        <td className="px-4 py-3 text-stone-500">{t.location || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`font-extrabold text-[9px] px-2 py-0.5 rounded uppercase border ${PRIORITY_STYLES[t.priority]}`}>
                            {t.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={t.status}
                            onChange={(e) => handleStatusChange(t, e.target.value as WorkStatus)}
                            disabled={t.status === "CANCELLED"}
                            className={`font-extrabold text-[9px] px-1.5 py-1 rounded uppercase border cursor-pointer disabled:cursor-not-allowed ${STATUS_STYLES[t.status]}`}
                          >
                            <option value="ASSIGNED">Assigned</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="COMPLETED">Completed</option>
                            <option value="CANCELLED">Cancelled</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => openEditForm(t)} className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-full" title="Edit">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            {t.status !== "CANCELLED" && (
                              <button onClick={() => openCancelModal(t)} className="p-1.5 text-amber-600 hover:bg-amber-500/10 rounded-full" title="Cancel">
                                <Ban className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button onClick={() => setDeleteTarget(t)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-full" title="Delete">
                              <Trash className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile: reuse the same "Recent Works" style cards, but this
                view is the FULL filterable list (search/status/priority
                filters above already apply to `tasks`). Kept separate from
                the "Recent Works" home-style section above so filters don't
                fight with the "latest 4" behavior of that section. */}
            <div className="md:hidden space-y-3">
              {tasksLoading ? (
                <div className="text-center py-10 glass-panel rounded-2xl text-stone-500 text-xs">Loading work assignments...</div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-10 glass-panel rounded-2xl text-stone-500 text-xs">No work assignments found.</div>
              ) : (
                tasks.map((t) => (
                  <div key={t.id} className="p-4 rounded-xl glass-panel border border-stone-200 dark:border-stone-800 space-y-2 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <button
                          onClick={() => {
                            const vol = volunteerOptions.find((v) => v.id === t.volunteer_id);
                            if (vol) openVolunteerDetail(vol);
                          }}
                          className="font-bold text-stone-850 dark:text-white text-sm cursor-pointer"
                        >
                          {t.volunteer_name}
                        </button>
                        <p className="font-semibold text-stone-600 dark:text-stone-300 mt-0.5">{t.task_title}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => openEditForm(t)} className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-full">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {t.status !== "CANCELLED" && (
                          <button onClick={() => openCancelModal(t)} className="p-1.5 text-amber-600 hover:bg-amber-500/10 rounded-full">
                            <Ban className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button onClick={() => setDeleteTarget(t)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-full">
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <span className={`font-extrabold text-[9px] px-2 py-0.5 rounded uppercase border ${PRIORITY_STYLES[t.priority]}`}>{t.priority}</span>
                      <span className={`font-extrabold text-[9px] px-2 py-0.5 rounded uppercase border ${STATUS_STYLES[t.status]}`}>
                        {t.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-stone-400 text-[10px]">
                      {t.duty_date} · {t.start_time}
                      {t.end_time ? ` – ${t.end_time}` : ""}
                      {t.location ? ` · ${t.location}` : ""}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}

      {/* ================================================================ */}
      {/* MY ASSIGNED WORKS                                                 */}
      {/* ================================================================ */}
      {hasApplied && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-850 dark:text-white flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-saffron-500" />
              My Assigned Works ({myTasks.length})
            </h3>
          </div>
          {myTasks.length === 0 ? (
            <div className="text-center py-8 glass-panel rounded-2xl text-stone-500 text-xs flex flex-col items-center gap-2">
              <ClipboardList className="h-6 w-6 text-stone-400" />
              <p className="font-semibold">No works assigned yet</p>
              <p className="text-[11px] text-stone-400">You will see your assigned works here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myTasks.map((t, idx) => (
                <div key={t.id} className="p-4 rounded-xl glass-panel border border-stone-200 dark:border-stone-800 space-y-1.5 text-xs">
                  <p className="font-bold text-stone-800 dark:text-white">
                    [{idx + 1}] {t.task_title}
                  </p>
                  {t.description && <p className="text-stone-500">{t.description}</p>}
                  <p className="text-stone-400">
                    {t.duty_date} · {t.start_time}
                    {t.end_time ? ` – ${t.end_time}` : ""}
                  </p>
                  {t.location && <p className="text-stone-400">{t.location}</p>}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className={`font-extrabold text-[9px] px-2 py-0.5 rounded uppercase border ${PRIORITY_STYLES[t.priority]}`}>{t.priority}</span>
                    <span className={`font-extrabold text-[9px] px-2 py-0.5 rounded uppercase border ${STATUS_STYLES[t.status]}`}>
                      {t.status.replace("_", " ")}
                    </span>
                  </div>
                  {t.status === "CANCELLED" && t.cancellation_reason && (
                    <p className="text-red-500 text-[10px]">Reason: {t.cancellation_reason}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* My Volunteer ID Card */}
      {myProfile?.status === "APPROVED" && (
        <section className="max-w-sm space-y-3">
          <h3 className="text-sm font-bold text-stone-850 dark:text-white flex items-center gap-2">
            <QrCode className="h-4 w-4 text-saffron-500" />
            My Printable Volunteer ID Card
          </h3>
          <div className="p-5 rounded-2xl bg-gradient-to-b from-stone-900 to-stone-950 border-4 border-saffron-500 text-center text-white relative shadow-xl">
            <span className="text-[8px] tracking-widest text-gold-400 font-bold uppercase block">UDDANAM RAMAKRISHNA PURAM</span>
            <h4 className="font-extrabold text-sm uppercase text-white mt-2">{myProfile.user.full_name}</h4>
            <p className="text-[9px] text-stone-400 font-mono mt-2">ID: {myProfile.qr_code_token}</p>
          </div>
          <button
            onClick={() => window.print()}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-stone-850 hover:bg-stone-900 text-white font-bold py-2.5 text-xs cursor-pointer"
          >
            <Download className="h-4 w-4" /> Print ID Card
          </button>
        </section>
      )}

      {/* ------------------------------------------------------------ */}
      {/* Add / Edit Work Modal — fits inside mobile viewport via       */}
      {/* max-h + overflow-y-auto, unchanged from prior rebuild         */}
      {/* ------------------------------------------------------------ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 space-y-4 shadow-xl my-8">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-stone-850 dark:text-white text-base">{editingId ? "Edit Seva / Work" : "Add New Seva / Work"}</h4>
              <button onClick={closeForm} className="p-1 text-stone-400 hover:text-stone-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formSuccess && (
              <div className="text-[11px] font-semibold text-green-700 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/40 rounded-lg px-3 py-2">
                {formSuccess}
              </div>
            )}
            {formError && (
              <div className="text-[11px] font-semibold text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-lg px-3 py-2">
                {formError}
              </div>
            )}
            {conflictWarning && (
              <div className="text-[11px] font-semibold text-amber-800 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-900/40 rounded-lg px-3 py-3 space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{conflictWarning.message}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => submitForm(true)} className="rounded bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 text-[10px] cursor-pointer">
                    Assign Anyway
                  </button>
                  <button onClick={() => setConflictWarning(null)} className="rounded border border-amber-300 text-amber-700 font-bold px-3 py-1.5 text-[10px] cursor-pointer">
                    Let Me Change It
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-stone-500 font-semibold block">Select Volunteer</label>
                <select
                  value={form.volunteer_id}
                  onChange={(e) => setForm({ ...form, volunteer_id: e.target.value })}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                >
                  <option value="">-- Choose a volunteer --</option>
                  {approvedVolunteers.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.user.full_name}
                      {v.assigned_work ? ` (${v.assigned_work})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-stone-500 font-semibold block">Work / Seva Name</label>
                <input
                  type="text"
                  placeholder="e.g. Prasadam Distribution, Stage Decoration, Nimajjanam Duty..."
                  value={form.task_title}
                  onChange={(e) => setForm({ ...form, task_title: e.target.value })}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-stone-500 font-semibold block">Description / Instructions</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-500 font-semibold block">Service Area</label>
                <select
                  value={form.service_area}
                  onChange={(e) => setForm({ ...form, service_area: e.target.value })}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                >
                  <option value="">-- None --</option>
                  {serviceAreas.map((sa) => (
                    <option key={sa.id} value={sa.name}>
                      {sa.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-stone-500 font-semibold block">Location</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-500 font-semibold block">Date</label>
                <input
                  type="date"
                  value={form.duty_date}
                  onChange={(e) => setForm({ ...form, duty_date: e.target.value })}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-stone-500 font-semibold block">Start Time</label>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-stone-500 font-semibold block">End Time</label>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-stone-500 font-semibold block">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                >
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-stone-500 font-semibold block">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as WorkStatus })}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                >
                  <option value="ASSIGNED">Assigned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => submitForm(false)}
                disabled={formSaving}
                className="flex-1 rounded-lg bg-saffron-500 hover:bg-saffron-600 text-white font-bold py-2.5 text-xs cursor-pointer disabled:opacity-60"
              >
                {formSaving ? "Saving..." : editingId ? "Update Work" : "Create Work"}
              </button>
              <button onClick={closeForm} className="rounded-lg border border-stone-250 dark:border-stone-750 text-stone-600 dark:text-stone-300 font-bold py-2.5 px-4 text-xs cursor-pointer">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 space-y-4 shadow-xl">
            <h4 className="font-bold text-stone-850 dark:text-white text-sm">Are you sure you want to delete this seva/work assignment?</h4>
            <p className="text-xs text-stone-500">
              "{deleteTarget.task_title}" for {deleteTarget.volunteer_name} will be permanently removed.
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setDeleteTarget(null)} className="rounded-lg border border-stone-250 dark:border-stone-750 text-stone-600 dark:text-stone-300 font-bold py-2 px-4 text-xs cursor-pointer">
                Cancel
              </button>
              <button onClick={confirmDelete} className="rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 text-xs cursor-pointer">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 space-y-4 shadow-xl">
            <h4 className="font-bold text-stone-850 dark:text-white text-sm">Cancel this seva/work assignment?</h4>
            <p className="text-xs text-stone-500">
              "{cancelTarget.task_title}" for {cancelTarget.volunteer_name}. The volunteer will be notified with your reason.
            </p>
            {cancelError && <p className="text-[11px] font-semibold text-red-600">{cancelError}</p>}
            <textarea
              rows={2}
              placeholder="Cancellation reason (required)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full text-xs bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
            />
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setCancelTarget(null)} className="rounded-lg border border-stone-250 dark:border-stone-750 text-stone-600 dark:text-stone-300 font-bold py-2 px-4 text-xs cursor-pointer">
                Back
              </button>
              <button onClick={confirmCancel} className="rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold py-2 px-4 text-xs cursor-pointer">
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {detailVolunteer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-stone-850 dark:text-white text-base">{detailVolunteer.user.full_name}</h4>
                <p className="text-[10px] text-stone-400">{detailVolunteer.user.email}</p>
              </div>
              <button onClick={() => setDetailVolunteer(null)} className="p-1 text-stone-400 hover:text-stone-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center gap-2 text-[10px]">
              <span
                className={`font-extrabold px-2 py-0.5 rounded uppercase border ${
                  VOLUNTEER_STATUS_STYLES[detailVolunteer.status] || VOLUNTEER_STATUS_STYLES.PENDING
                }`}
              >
                {detailVolunteer.status}
              </span>
              {detailVolunteer.assigned_work && <span className="text-stone-500">Preferred: {detailVolunteer.assigned_work}</span>}
            </div>

            <div className="space-y-2">
              <h5 className="text-xs font-extrabold uppercase text-stone-500 flex items-center gap-1">
                <ChevronRight className="h-3.5 w-3.5" /> Assigned Seva / Works
              </h5>
              {detailTasks.length === 0 ? (
                <p className="text-xs text-stone-400">No works assigned yet.</p>
              ) : (
                detailTasks.map((t, idx) => (
                  <div key={t.id} className="p-3 rounded-lg border border-stone-200 dark:border-stone-800 text-xs space-y-1">
                    <p className="font-bold text-stone-800 dark:text-white">
                      [{idx + 1}] {t.task_title}
                    </p>
                    <p className="text-stone-500">
                      {t.duty_date} · {t.start_time}
                      {t.end_time ? ` – ${t.end_time}` : ""}
                    </p>
                    {t.location && <p className="text-stone-400">{t.location}</p>}
                    <span className={`inline-block font-extrabold text-[9px] px-2 py-0.5 rounded uppercase border ${STATUS_STYLES[t.status]}`}>
                      {t.status.replace("_", " ")}
                    </span>
                  </div>
                ))
              )}
            </div>

            {detailVolunteer.status === "APPROVED" && (
              <button
                onClick={() => {
                  setDetailVolunteer(null);
                  openAddForm(detailVolunteer.id);
                }}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-saffron-500 hover:bg-saffron-600 text-white font-bold py-2.5 text-xs cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Add Another Work For {detailVolunteer.user.full_name.split(" ")[0]}
              </button>
            )}
          </div>
        </div>
      )}

      {showAreaForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-stone-850 dark:text-white text-sm">{editingAreaId ? "Edit Service Area" : "Add Service Area"}</h4>
              <button onClick={closeAreaForm} className="p-1 text-stone-400 hover:text-stone-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            {areaFormError && <p className="text-[11px] font-semibold text-red-600">{areaFormError}</p>}
            <div className="space-y-1">
              <label className="text-stone-500 font-semibold block text-xs">Name</label>
              <input
                type="text"
                value={areaForm.name}
                onChange={(e) => setAreaForm({ ...areaForm, name: e.target.value })}
                className="w-full text-xs bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-stone-500 font-semibold block text-xs">Description (optional)</label>
              <textarea
                rows={2}
                value={areaForm.description}
                onChange={(e) => setAreaForm({ ...areaForm, description: e.target.value })}
                className="w-full text-xs bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={submitAreaForm} className="flex-1 rounded-lg bg-saffron-500 hover:bg-saffron-600 text-white font-bold py-2.5 text-xs cursor-pointer">
                {editingAreaId ? "Update" : "Create"}
              </button>
              <button onClick={closeAreaForm} className="rounded-lg border border-stone-250 dark:border-stone-750 text-stone-600 dark:text-stone-300 font-bold py-2.5 px-4 text-xs cursor-pointer">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {areaDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 space-y-4 shadow-xl">
            <h4 className="font-bold text-stone-850 dark:text-white text-sm">Delete service area "{areaDeleteTarget.name}"?</h4>
            <p className="text-xs text-stone-500">
              Existing work assignments that used this area keep their label — this only removes it from the dropdown going forward.
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button onClick={() => setAreaDeleteTarget(null)} className="rounded-lg border border-stone-250 dark:border-stone-750 text-stone-600 dark:text-stone-300 font-bold py-2 px-4 text-xs cursor-pointer">
                Cancel
              </button>
              <button onClick={confirmDeleteArea} className="rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 text-xs cursor-pointer">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="p-3 sm:p-4 rounded-xl glass-panel border border-saffron-500/10 text-center space-y-1">
      <span className="flex items-center justify-center gap-1 text-[8px] sm:text-[9px] text-stone-500 font-bold uppercase leading-tight">
        {icon} <span className="truncate">{label}</span>
      </span>
      <span className="text-lg sm:text-xl font-extrabold text-stone-850 dark:text-white block">{value}</span>
    </div>
  );
}