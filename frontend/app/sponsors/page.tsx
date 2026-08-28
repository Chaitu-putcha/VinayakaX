"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Heart,
  Plus,
  Pencil,
  Trash2,
  X,
  Gem,
  Award,
  Medal,
  HandHeart,
  Users,
  Wallet,
  Building2,
  ImagePlus,
  Phone,
  MapPin,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Sponsor {
  id: number;
  sponsor_name: string;
  contact_person_name: string | null;
  sponsor_category: string;
  contribution_amount: number | null;
  contribution_details: string | null;
  phone_number: string | null;
  address: string | null;
  photo_url: string | null;
  optional_message: string | null;
  created_at: string;
}

interface SponsorStats {
  total_sponsors: number;
  total_contribution: number;
}

const CATEGORIES = ["Platinum Sponsor", "Gold Sponsor", "Silver Sponsor", "Supporter"];

type CategoryMeta = {
  icon: any;
  heading: string;
  badge: string;
  cardBorder: string;
  iconColor: string;
};

const CATEGORY_META: Record<string, CategoryMeta> = {
  "Platinum Sponsor": {
    icon: Gem,
    heading: "text-slate-200",
    badge: "bg-slate-800/60 text-slate-200 border-slate-400/30",
    cardBorder: "border-slate-400/30 hover:border-slate-300/60",
    iconColor: "text-slate-300",
  },
  "Gold Sponsor": {
    icon: Award,
    heading: "text-gold-500",
    badge: "bg-amber-950/30 text-gold-400 border-gold-500/30",
    cardBorder: "border-gold-500/25 hover:border-gold-500/50",
    iconColor: "text-gold-500",
  },
  "Silver Sponsor": {
    icon: Medal,
    heading: "text-stone-300",
    badge: "bg-stone-800/50 text-stone-300 border-stone-400/25",
    cardBorder: "border-stone-400/20 hover:border-stone-300/40",
    iconColor: "text-stone-300",
  },
  Supporter: {
    icon: HandHeart,
    heading: "text-saffron-500",
    badge: "bg-saffron-500/10 text-saffron-500 border-saffron-500/25",
    cardBorder: "border-saffron-500/15 hover:border-saffron-500/40",
    iconColor: "text-saffron-500",
  },
};

const emptyForm = {
  sponsor_name: "",
  contact_person_name: "",
  sponsor_category: "Gold Sponsor",
  contribution_amount: "",
  contribution_details: "",
  phone_number: "",
  address: "",
  optional_message: "",
};

function formatRupees(amount: number | null | undefined) {
  if (amount === null || amount === undefined) return "—";
  return `₹${amount.toLocaleString("en-IN")}`;
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

function authHeader(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function SponsorsPage() {
  const [role, setRole] = useState<string | null>(null);
  const isManager = role === "ADMIN" || role === "VOLUNTEER";

  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [stats, setStats] = useState<SponsorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [busyId, setBusyId] = useState<number | null>(null);
  const [pageMessage, setPageMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  // Manager-only expandable "Sponsor Details" (phone/address) per card
  const [expandedDetailIds, setExpandedDetailIds] = useState<Set<number>>(new Set());

  const toggleDetails = (id: number) => {
    setExpandedDetailIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    setRole(localStorage.getItem("role"));
  }, []);

  const fetchSponsors = () => {
    setLoading(true);
    setLoadError("");
    fetch(`${API_URL}/api/sponsors`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load sponsors");
        return res.json();
      })
      .then((data) => setSponsors(Array.isArray(data) ? data : []))
      .catch(() => setLoadError("Could not load sponsors right now. Please try again shortly."))
      .finally(() => setLoading(false));
  };

  const fetchStats = () => {
    fetch(`${API_URL}/api/sponsors/manage/stats`, { headers: authHeader() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setStats(data))
      .catch(() => setStats(null));
  };

  useEffect(() => {
    fetchSponsors();
  }, []);

  useEffect(() => {
    if (isManager) fetchStats();
    else setStats(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  useEffect(() => {
    if (!pageMessage) return;
    const t = setTimeout(() => setPageMessage(null), 4000);
    return () => clearTimeout(t);
  }, [pageMessage]);

  // Revoke any locally-generated preview URL when it's replaced/unmounted
  useEffect(() => {
    return () => {
      if (photoPreview && photoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const resetForm = () => {
    setForm(emptyForm);
    setPhoto(null);
    setPhotoPreview(null);
    setEditingId(null);
    setFormError("");
    setShowModal(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (s: Sponsor) => {
    setForm({
      sponsor_name: s.sponsor_name,
      contact_person_name: s.contact_person_name || "",
      sponsor_category: s.sponsor_category,
      contribution_amount: s.contribution_amount !== null ? String(s.contribution_amount) : "",
      contribution_details: s.contribution_details || "",
      phone_number: s.phone_number || "",
      address: s.address || "",
      optional_message: s.optional_message || "",
    });
    setPhoto(null);
    setPhotoPreview(s.photo_url ? `${API_URL}${s.photo_url}` : null);
    setEditingId(s.id);
    setFormError("");
    setShowModal(true);
  };

  const handlePhotoChange = (file: File | null) => {
    setPhoto(file);
    if (file) {
      setPhotoPreview(URL.createObjectURL(file));
    } else if (editingId) {
      // Keep showing the existing sponsor's photo if the user clears the file input
      const existing = sponsors.find((s) => s.id === editingId);
      setPhotoPreview(existing?.photo_url ? `${API_URL}${existing.photo_url}` : null);
    } else {
      setPhotoPreview(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.sponsor_name.trim() || !form.contribution_amount) {
      setFormError("Sponsor Name and Contribution Amount are required.");
      return;
    }
    const token = getToken();
    if (!token) {
      setFormError("Your session has expired. Please sign in again.");
      return;
    }

    setFormError("");
    setSaving(true);

    const formData = new FormData();
    formData.append("sponsor_name", form.sponsor_name.trim());
    formData.append("contact_person_name", form.contact_person_name.trim());
    formData.append("sponsor_category", form.sponsor_category);
    formData.append("contribution_amount", form.contribution_amount);
    formData.append("contribution_details", form.contribution_details.trim());
    formData.append("phone_number", form.phone_number.trim());
    formData.append("address", form.address.trim());
    formData.append("optional_message", form.optional_message.trim());
    if (photo) formData.append("photo", photo);

    try {
      const res = await fetch(
        editingId ? `${API_URL}/api/sponsors/${editingId}` : `${API_URL}/api/sponsors`,
        {
          method: editingId ? "PUT" : "POST",
          headers: authHeader(),
          body: formData,
        }
      );

      if (res.ok) {
        resetForm();
        fetchSponsors();
        fetchStats();
        setPageMessage({
          type: "success",
          text: editingId ? "Sponsor updated successfully." : "Sponsor added successfully.",
        });
      } else if (res.status === 401 || res.status === 403) {
        setFormError("You are not authorized to perform this action.");
      } else {
        const err = await res.json().catch(() => ({}));
        setFormError(err.detail || "Failed to save sponsor.");
      }
    } catch {
      setFormError("Could not reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this sponsor? This action cannot be undone.")) return;
    const token = getToken();
    if (!token) {
      setPageMessage({ type: "error", text: "Your session has expired. Please sign in again." });
      return;
    }
    setBusyId(id);
    try {
      const res = await fetch(`${API_URL}/api/sponsors/${id}`, {
        method: "DELETE",
        headers: authHeader(),
      });
      if (res.ok) {
        fetchSponsors();
        fetchStats();
        setPageMessage({ type: "success", text: "Sponsor deleted successfully." });
      } else if (res.status === 401 || res.status === 403) {
        setPageMessage({ type: "error", text: "You are not authorized to delete sponsors." });
      } else {
        setPageMessage({ type: "error", text: "Failed to delete sponsor." });
      }
    } catch {
      setPageMessage({ type: "error", text: "Could not reach the server." });
    } finally {
      setBusyId(null);
    }
  };

  const sponsorsByCategory = CATEGORIES.map((cat) => ({
    category: cat,
    items: sponsors.filter((s) => s.sponsor_category === cat),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="space-y-12 py-4">
      {/* ================= HERO ================= */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-4 max-w-2xl"
      >
        <span className="text-[10px] text-saffron-500 uppercase font-bold tracking-wider block">
          Community Support
        </span>
        <h1 className="text-4xl font-extrabold text-stone-900 dark:text-white">Festival Sponsors</h1>
        <p className="text-stone-600 dark:text-stone-300 text-xs sm:text-sm">
          Heartfelt gratitude to the generous individuals, families and businesses supporting{" "}
          <strong>Sri Vinayaka Navarathri Mahotsavam 2026</strong>.
        </p>
      </motion.section>

      {/* ================= PAGE MESSAGE ================= */}
      <AnimatePresence>
        {pageMessage && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`max-w-md p-3 rounded-lg border text-xs font-semibold ${
              pageMessage.type === "success"
                ? "bg-green-100 border-green-300 text-green-700"
                : "bg-red-100 border-red-300 text-red-700"
            }`}
          >
            {pageMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= STATS (manager only) ================= */}
      {isManager && stats && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="grid grid-cols-2 gap-4 max-w-md"
        >
          <div className="p-4 rounded-xl glass-panel border border-saffron-500/10 text-center space-y-1">
            <span className="text-[10px] text-stone-500 font-bold uppercase flex items-center justify-center gap-1">
              <Users className="h-3.5 w-3.5" /> Total Sponsors
            </span>
            <span className="text-xl font-extrabold text-stone-850 dark:text-white">
              {stats.total_sponsors}
            </span>
          </div>
          <div className="p-4 rounded-xl glass-panel border border-saffron-500/10 text-center space-y-1">
            <span className="text-[10px] text-stone-500 font-bold uppercase flex items-center justify-center gap-1">
              <Wallet className="h-3.5 w-3.5" /> Total Contribution
            </span>
            <span className="text-xl font-extrabold text-stone-850 dark:text-white">
              {formatRupees(stats.total_contribution)}
            </span>
          </div>
        </motion.section>
      )}

      {/* ================= MANAGEMENT: ADD BUTTON ================= */}
      {isManager && (
        <section className="flex justify-end">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 bg-saffron-500 hover:bg-saffron-600 text-white rounded-lg px-4 py-2 text-xs font-bold transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Sponsor
          </motion.button>
        </section>
      )}

      {/* ================= SPONSOR LIST ================= */}
      <section className="space-y-10">
        {loading ? (
          <div className="text-center py-14 glass-panel rounded-2xl">
            <p className="text-stone-500 text-sm">Loading sponsors…</p>
          </div>
        ) : loadError ? (
          <div className="text-center py-14 glass-panel rounded-2xl px-6">
            <p className="text-red-500 text-sm font-semibold">{loadError}</p>
          </div>
        ) : sponsors.length === 0 ? (
          <div className="text-center py-16 glass-panel rounded-2xl px-6 space-y-2">
            <Heart className="h-8 w-8 text-saffron-500 mx-auto" />
            <p className="text-stone-800 dark:text-white font-extrabold text-base">
              No Sponsors Added Yet
            </p>
            <p className="text-stone-500 text-xs max-w-sm mx-auto">
              We look forward to thanking the generous devotees, families and businesses who will
              support <strong>Sri Vinayaka Navarathri Mahotsavam 2026</strong>.
            </p>
          </div>
        ) : (
          sponsorsByCategory.map(({ category, items }) => {
            const meta = CATEGORY_META[category] || CATEGORY_META.Supporter;
            const Icon = meta.icon;
            return (
              <div key={category} className="space-y-5">
                <div className="flex items-center gap-2 border-b border-stone-250/50 dark:border-stone-750/50 pb-3">
                  <Icon className={`h-5 w-5 ${meta.iconColor}`} />
                  <h2 className={`text-lg sm:text-xl font-extrabold uppercase tracking-wider ${meta.heading}`}>
                    {category}s
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {items.map((s, idx) => (
                    <motion.div
                      key={s.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: Math.min(idx * 0.05, 0.3) }}
                      className={`p-5 rounded-2xl glass-panel border transition-all space-y-3 relative ${meta.cardBorder}`}
                    >
                      {isManager && (
                        <div className="absolute top-3 right-3 flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(s)}
                            className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-full"
                            title="Edit Sponsor"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(s.id)}
                            disabled={busyId === s.id}
                            className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-full disabled:opacity-40"
                            title="Delete Sponsor"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-gold-500/30 bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0">
                          {s.photo_url ? (
                            <img
                              src={`${API_URL}${s.photo_url}`}
                              alt={s.sponsor_name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Building2 className="h-6 w-6 text-stone-400" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-stone-850 dark:text-white text-sm leading-tight">
                            {s.sponsor_name}
                          </h3>
                          <span
                            className={`inline-block mt-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${meta.badge}`}
                          >
                            {s.sponsor_category}
                          </span>
                        </div>
                      </div>

                      <div className="text-sm font-extrabold text-gold-600 dark:text-gold-400">
                        {formatRupees(s.contribution_amount)}
                      </div>

                      {s.contribution_details && (
                        <div className="text-xs">
                          <span className="text-stone-500 font-semibold block">Sponsored For</span>
                          <span className="text-stone-800 dark:text-stone-200">
                            {s.contribution_details}
                          </span>
                        </div>
                      )}

                      {s.optional_message && (
                        <p className="text-[10px] text-stone-500 italic border-t border-stone-250/50 dark:border-stone-750/50 pt-2">
                          "{s.optional_message}"
                        </p>
                      )}

                      {/* Manager-only: phone number + address, never shown to devotees/public */}
                      {isManager && (s.phone_number || s.address) && (
                        <div className="border-t border-stone-250/50 dark:border-stone-750/50 pt-2">
                          <button
                            type="button"
                            onClick={() => toggleDetails(s.id)}
                            className="w-full flex items-center justify-between text-[10px] font-bold uppercase text-stone-500 hover:text-saffron-500 transition-colors cursor-pointer"
                          >
                            <span className="flex items-center gap-1">
                              <ShieldCheck className="h-3 w-3" />
                              Sponsor Details
                            </span>
                            {expandedDetailIds.has(s.id) ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <AnimatePresence initial={false}>
                            {expandedDetailIds.has(s.id) && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-2 space-y-1.5 text-[11px] text-stone-700 dark:text-stone-300">
                                  {s.phone_number && (
                                    <div className="flex items-center gap-1.5">
                                      <Phone className="h-3 w-3 text-saffron-500 shrink-0" />
                                      <span>{s.phone_number}</span>
                                    </div>
                                  )}
                                  {s.address && (
                                    <div className="flex items-center gap-1.5">
                                      <MapPin className="h-3 w-3 text-saffron-500 shrink-0" />
                                      <span>{s.address}</span>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* ================= INVITATION ================= */}
      <section className="p-8 rounded-3xl glass-panel border border-saffron-500/10 text-center space-y-4 max-w-xl mx-auto">
        <h3 className="text-lg font-bold text-stone-850 dark:text-white flex items-center justify-center gap-2">
          <Heart className="h-5 w-5 text-saffron-500" />
          Become a Sponsor
        </h3>
        <p className="text-stone-500 dark:text-stone-400 text-xs leading-relaxed">
          If you or your family wish to sponsor pooja activities, food distribution, cultural
          nights, or decoration, please get in touch with our committee at the festival venue.
        </p>
      </section>

      {/* ================= ADD / EDIT MODAL ================= */}
      <AnimatePresence>
        {isManager && showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl glass-panel border border-gold-500/30 space-y-4 bg-stone-950"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-stone-850 dark:text-white flex items-center gap-2">
                  <Plus className="h-5 w-5 text-saffron-500" />
                  {editingId ? "Edit Sponsor" : "Add Sponsor"}
                </h3>
                <button onClick={resetForm} className="text-stone-500 hover:text-stone-850" type="button">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {formError && <p className="text-red-500 text-xs font-semibold">{formError}</p>}

              <form onSubmit={handleSave} className="space-y-3.5 text-xs">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-stone-500 font-semibold block">Sponsor Name *</label>
                    <input
                      type="text"
                      value={form.sponsor_name}
                      onChange={(e) => setForm({ ...form, sponsor_name: e.target.value })}
                      placeholder="e.g. Sri Lakshmi General Stores"
                      className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-stone-500 font-semibold block">Contact Person Name</label>
                    <input
                      type="text"
                      value={form.contact_person_name}
                      onChange={(e) => setForm({ ...form, contact_person_name: e.target.value })}
                      placeholder="e.g. Lakshmi Prasad"
                      className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-stone-500 font-semibold block">Sponsor Category *</label>
                    <select
                      value={form.sponsor_category}
                      onChange={(e) => setForm({ ...form, sponsor_category: e.target.value })}
                      className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                      required
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-stone-500 font-semibold block">Contribution Amount (₹) *</label>
                    <input
                      type="number"
                      min="0"
                      value={form.contribution_amount}
                      onChange={(e) => setForm({ ...form, contribution_amount: e.target.value })}
                      placeholder="e.g. 25000"
                      className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-stone-500 font-semibold block">
                    Sponsored For / Contribution Details
                  </label>
                  <input
                    type="text"
                    value={form.contribution_details}
                    onChange={(e) => setForm({ ...form, contribution_details: e.target.value })}
                    placeholder="e.g. Cultural Stage Program"
                    className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-stone-500 font-semibold block">Phone Number</label>
                    <input
                      type="tel"
                      value={form.phone_number}
                      onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                      placeholder="e.g. +91 9876543210"
                      className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-stone-500 font-semibold block">Address / Location</label>
                    <input
                      type="text"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      placeholder="e.g. Uddanam Ramakrishna Puram"
                      className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-stone-500 font-semibold flex items-center gap-1.5">
                    <ImagePlus className="h-3.5 w-3.5" />
                    Sponsor Photo / Logo {editingId && "(leave empty to keep existing)"}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handlePhotoChange(e.target.files?.[0] || null)}
                    className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                  />
                  {photoPreview && (
                    <div className="pt-2">
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="h-16 w-16 rounded-full object-cover border-2 border-gold-500/30"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-stone-500 font-semibold block">Optional Message</label>
                  <textarea
                    value={form.optional_message}
                    onChange={(e) => setForm({ ...form, optional_message: e.target.value })}
                    placeholder="A word of blessing or support..."
                    rows={2}
                    className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 rounded-lg bg-gradient-to-r from-saffron-500 to-gold-500 text-white font-bold py-2.5 transition-all cursor-pointer text-center disabled:opacity-60"
                  >
                    {saving ? "Saving…" : editingId ? "Update Sponsor" : "Add Sponsor"}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 rounded-lg border border-stone-250 dark:border-stone-750 text-stone-500 font-bold text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}