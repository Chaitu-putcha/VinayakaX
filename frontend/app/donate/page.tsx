"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Heart,
  Plus,
  Pencil,
  Trash2,
  X,
  Users,
  Wallet,
  Sparkles,
  ImagePlus,
  Camera,
  RotateCcw,
  Phone,
  MapPin,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  UserCircle2,
  SwitchCamera,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://vinayakax-backend.onrender.com";

const PURPOSE_CHOICES = [
  "Vinayaka Pooja",
  "Annadanam",
  "Prasadam",
  "Flower Decoration",
  "Mandapam Decoration",
  "Lights & Sound",
  "Cultural Program",
  "General Festival Contribution",
  "Other",
];

interface DonationPublic {
  id: number;
  donor_name: string;
  family_name: string | null;
  contribution_purpose: string;
  optional_message: string | null;
  photo_url: string | null;
  created_at: string;
}

interface DonationManage extends DonationPublic {
  contribution_amount: number;
  phone_number: string | null;
  address: string | null;
  created_by: number | null;
}

interface DonationStats {
  total_contributors: number;
  total_contribution_amount: number;
  contributions_by_purpose: Record<string, number>;
  recent_contributions_count: number;
}

const emptyForm = {
  donor_name: "",
  family_name: "",
  contribution_amount: "",
  contribution_purpose: "General Festival Contribution",
  phone_number: "",
  address: "",
  optional_message: "",
};

type FacingMode = "user" | "environment";

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

export default function DonatePage() {
  const [role, setRole] = useState<string | null>(null);
  const isManager = role === "ADMIN" || role === "VOLUNTEER";

  const [donations, setDonations] = useState<DonationPublic[]>([]);
  const [manageDonations, setManageDonations] = useState<DonationManage[]>([]);
  const [stats, setStats] = useState<DonationStats | null>(null);
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

  const [expandedDetailIds, setExpandedDetailIds] = useState<Set<number>>(new Set());

  // ---- Live camera capture state ----
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraLoading, setCameraLoading] = useState(false);
  const [facingMode, setFacingMode] = useState<FacingMode>("user");
  const [canSwitchCamera, setCanSwitchCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

  const fetchPublicDonations = () => {
    setLoading(true);
    setLoadError("");
    fetch(`${API_URL}/api/donations`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load contributions");
        return res.json();
      })
      .then((data) => setDonations(Array.isArray(data) ? data : []))
      .catch(() => setLoadError("Could not load devotee contributions right now. Please try again shortly."))
      .finally(() => setLoading(false));
  };

  const fetchManageDonations = () => {
    fetch(`${API_URL}/api/donations/manage/all`, { headers: authHeader() })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setManageDonations(Array.isArray(data) ? data : []))
      .catch(() => setManageDonations([]));
  };

  const fetchStats = () => {
    fetch(`${API_URL}/api/donations/manage/stats`, { headers: authHeader() })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setStats(data))
      .catch(() => setStats(null));
  };

  useEffect(() => {
    fetchPublicDonations();
  }, []);

  useEffect(() => {
    if (isManager) {
      fetchManageDonations();
      fetchStats();
    } else {
      setManageDonations([]);
      setStats(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  useEffect(() => {
    if (!pageMessage) return;
    const t = setTimeout(() => setPageMessage(null), 4000);
    return () => clearTimeout(t);
  }, [pageMessage]);

  // Revoke locally-generated preview URLs
  useEffect(() => {
    return () => {
      if (photoPreview && photoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  // ---- Core camera lifecycle ----
  // This effect is the single source of truth for opening/closing the camera stream.
  // It only runs after React has committed the DOM, so `videoRef.current` is guaranteed
  // to exist whenever `showCamera` is true (the <video> element is always mounted in
  // that case). This replaces the old setTimeout(0) hack, which could race the render.
  useEffect(() => {
    if (!showCamera) {
      return;
    }

    let cancelled = false;
    setCameraError("");
    setCameraLoading(true);

    const constraints: MediaStreamConstraints = {
      video: { facingMode: { ideal: facingMode } },
      audio: false,
    };

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream) => {
        if (cancelled) {
          // Component/effect was torn down before the promise resolved (e.g. user
          // cancelled or switched cameras again quickly). Stop it immediately.
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;

        video.srcObject = stream;
        // Set these imperatively (not just via JSX) — React's `muted` prop is not
        // always reliably reflected as a live DOM property before playback starts,
        // and browsers silently block autoplay of unmuted video. Setting it directly
        // here guarantees autoplay is allowed.
        video.muted = true;
        video.playsInline = true;

        video
          .play()
          .then(() => setCameraLoading(false))
          .catch((err) => {
            setCameraLoading(false);
            setCameraError(
              "Could not start the camera preview. Please refresh and try again. (" +
                (err?.message || "playback error") +
                ")"
            );
          });
      })
      .catch((err: any) => {
        if (cancelled) return;
        setCameraLoading(false);
        const name = err?.name || "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setCameraError("Camera permission was denied. Please allow camera access in your browser settings.");
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setCameraError("No camera was found on this device.");
        } else if (name === "NotReadableError" || name === "TrackStartError") {
          setCameraError("The camera is already in use by another application.");
        } else {
          setCameraError("Could not access the camera. Please check browser permissions.");
        }
      });

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCamera, facingMode]);

  // Stop the camera whenever the modal closes.
  useEffect(() => {
    if (!showModal) {
      setShowCamera(false);
    }
  }, [showModal]);

  // Detect whether this device actually has more than one camera before showing
  // Front/Back switch buttons (covers the "mobile" requirement without UA-sniffing).
  useEffect(() => {
    if (!showCamera) return;
    if (!navigator.mediaDevices?.enumerateDevices) return;
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        const videoInputs = devices.filter((d) => d.kind === "videoinput");
        setCanSwitchCamera(videoInputs.length > 1);
      })
      .catch(() => {
        // If enumeration fails/unsupported, default to showing the switch controls
        // anyway so mobile users aren't blocked from reaching the back camera.
        setCanSwitchCamera(true);
      });
  }, [showCamera]);

  const resetForm = () => {
    setForm(emptyForm);
    setPhoto(null);
    setPhotoPreview(null);
    setEditingId(null);
    setFormError("");
    setShowCamera(false);
    setCameraError("");
    setFacingMode("user");
    setShowModal(false);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (d: DonationManage) => {
    setForm({
      donor_name: d.donor_name,
      family_name: d.family_name || "",
      contribution_amount: String(d.contribution_amount),
      contribution_purpose: d.contribution_purpose || "General Festival Contribution",
      phone_number: d.phone_number || "",
      address: d.address || "",
      optional_message: d.optional_message || "",
    });
    setPhoto(null);
    setPhotoPreview(d.photo_url ? `${API_URL}${d.photo_url}` : null);
    setEditingId(d.id);
    setFormError("");
    setShowCamera(false);
    setShowModal(true);
  };

  const handlePhotoChange = (file: File | null) => {
    setPhoto(file);
    if (file) {
      setPhotoPreview(URL.createObjectURL(file));
    } else if (editingId) {
      const existing = manageDonations.find((d) => d.id === editingId);
      setPhotoPreview(existing?.photo_url ? `${API_URL}${existing.photo_url}` : null);
    } else {
      setPhotoPreview(null);
    }
  };

  // ---- Live camera handlers ----
  const openCamera = () => {
    setFacingMode("user");
    setCameraError("");
    setShowCamera(true);
  };

  const stopCamera = () => {
    // Tearing down via state change lets the lifecycle effect's cleanup
    // stop every track consistently, instead of duplicating that logic here.
    setShowCamera(false);
  };

  const switchCamera = (mode: FacingMode) => {
    if (mode === facingMode) return;
    setCameraError("");
    // Changing facingMode re-triggers the lifecycle effect, which stops the
    // previous stream's tracks before requesting the new-facing stream.
    setFacingMode(mode);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `live-capture-${Date.now()}.jpg`, { type: "image/jpeg" });
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(blob));
      stopCamera();
    }, "image/jpeg", 0.92);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.donor_name.trim() || !form.contribution_amount) {
      setFormError("Donor Full Name and Contribution Amount are required.");
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
    formData.append("donor_name", form.donor_name.trim());
    formData.append("family_name", form.family_name.trim());
    formData.append("contribution_amount", form.contribution_amount);
    formData.append("contribution_purpose", form.contribution_purpose);
    formData.append("phone_number", form.phone_number.trim());
    formData.append("address", form.address.trim());
    formData.append("optional_message", form.optional_message.trim());
    if (photo) formData.append("photo", photo);

    const requestUrl = editingId ? `${API_URL}/api/donations/${editingId}` : `${API_URL}/api/donations`;
    const method = editingId ? "PUT" : "POST";
    const headers = authHeader();

    // TEMP DEBUG LOGGING — remove once the backend connection issue is confirmed fixed.
    // eslint-disable-next-line no-console
    console.log("[Donate][AddContribution] API_URL:", API_URL);
    // eslint-disable-next-line no-console
    console.log("[Donate][AddContribution] request URL:", requestUrl, "method:", method);
    // eslint-disable-next-line no-console
    console.log("[Donate][AddContribution] token present:", Boolean(getToken()), "Authorization header:", (headers as any).Authorization || "(none)");
    // eslint-disable-next-line no-console
    console.log("[Donate][AddContribution] FormData keys:", Array.from(formData.keys()));

    let res: Response;
    try {
      res = await fetch(requestUrl, { method, headers, body: formData });
    } catch (err: any) {
      // This branch means fetch() itself rejected — the request never got a response at all.
      // Causes: backend not running/crashed, wrong host/port, DNS/connection refused, or a CORS
      // preflight rejection (browsers report CORS failures to JS as this same generic error, but
      // the browser DevTools Network tab and Console will show a separate "CORS policy" message —
      // check there, this log alone can't distinguish CORS from "server is down").
      // eslint-disable-next-line no-console
      console.error("[Donate][AddContribution] fetch() THREW — request never reached the server (or was blocked before a response came back).");
      // eslint-disable-next-line no-console
      console.error("[Donate][AddContribution] error name:", err?.name, "message:", err?.message);
      // eslint-disable-next-line no-console
      console.error("[Donate][AddContribution] full error object:", err);
      setFormError(
        `Could not reach the server at ${requestUrl}. Open the browser console for the exact error (look for a CORS message or a connection-refused error).`
      );
      setSaving(false);
      return;
    }

    // TEMP DEBUG LOGGING — remove once the backend connection issue is confirmed fixed.
    // eslint-disable-next-line no-console
    console.log("[Donate][AddContribution] response received. status:", res.status, res.statusText);

    const rawBody = await res.text();
    // eslint-disable-next-line no-console
    console.log("[Donate][AddContribution] raw response body:", rawBody);

    if (res.ok) {
      resetForm();
      fetchPublicDonations();
      fetchManageDonations();
      fetchStats();
      setPageMessage({
        type: "success",
        text: editingId ? "Contribution updated successfully." : "Contribution added successfully.",
      });
    } else if (res.status === 401 || res.status === 403) {
      // eslint-disable-next-line no-console
      console.error("[Donate][AddContribution] auth rejected — status:", res.status, "body:", rawBody);
      setFormError("You are not authorized to perform this action.");
    } else {
      let detail = "";
      try {
        detail = JSON.parse(rawBody)?.detail;
      } catch {
        // Body wasn't JSON — this itself is informative (e.g. an HTML 500 page,
        // or a plain-text "Internal Server Error"), and is now logged above in full.
      }
      setFormError(detail ? String(detail) : `Failed to save contribution (status ${res.status}). See console for the raw response.`);
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this devotee contribution record? This action cannot be undone.")) return;
    const token = getToken();
    if (!token) {
      setPageMessage({ type: "error", text: "Your session has expired. Please sign in again." });
      return;
    }
    setBusyId(id);
    try {
      const res = await fetch(`${API_URL}/api/donations/${id}`, {
        method: "DELETE",
        headers: authHeader(),
      });
      if (res.ok) {
        fetchPublicDonations();
        fetchManageDonations();
        fetchStats();
        setPageMessage({ type: "success", text: "Contribution deleted successfully." });
      } else if (res.status === 401 || res.status === 403) {
        setPageMessage({ type: "error", text: "You are not authorized to delete this record." });
      } else {
        setPageMessage({ type: "error", text: "Failed to delete contribution." });
      }
    } catch {
      setPageMessage({ type: "error", text: "Could not reach the server." });
    } finally {
      setBusyId(null);
    }
  };

  // Managers see the fuller management list (with private fields);
  // everyone else sees the public recognition list.
  const displayList: (DonationPublic | DonationManage)[] = isManager ? manageDonations : donations;

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
          Devotional Contribution
        </span>
        <h1 className="text-4xl font-extrabold text-stone-900 dark:text-white">
          Devotee Contributions &amp; Recognition
        </h1>
        <p className="text-stone-600 dark:text-stone-300 text-xs sm:text-sm">
          We gratefully honor the devotees and families whose generous seva supports{" "}
          <strong>Sri Vinayaka Navarathri Mahotsavam</strong>.
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
          className="space-y-4"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-3xl">
            <div className="p-4 rounded-xl glass-panel border border-saffron-500/10 text-center space-y-1">
              <span className="text-[10px] text-stone-500 font-bold uppercase flex items-center justify-center gap-1">
                <Users className="h-3.5 w-3.5" /> Total Contributors
              </span>
              <span className="text-xl font-extrabold text-stone-850 dark:text-white">
                {stats.total_contributors}
              </span>
            </div>
            <div className="p-4 rounded-xl glass-panel border border-saffron-500/10 text-center space-y-1">
              <span className="text-[10px] text-stone-500 font-bold uppercase flex items-center justify-center gap-1">
                <Wallet className="h-3.5 w-3.5" /> Total Contribution
              </span>
              <span className="text-xl font-extrabold text-stone-850 dark:text-white">
                {formatRupees(stats.total_contribution_amount)}
              </span>
            </div>
            <div className="p-4 rounded-xl glass-panel border border-saffron-500/10 text-center space-y-1">
              <span className="text-[10px] text-stone-500 font-bold uppercase flex items-center justify-center gap-1">
                <Sparkles className="h-3.5 w-3.5" /> Last 7 Days
              </span>
              <span className="text-xl font-extrabold text-stone-850 dark:text-white">
                {stats.recent_contributions_count}
              </span>
            </div>
            <div className="p-4 rounded-xl glass-panel border border-saffron-500/10 text-center space-y-1">
              <span className="text-[10px] text-stone-500 font-bold uppercase flex items-center justify-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Purposes Tracked
              </span>
              <span className="text-xl font-extrabold text-stone-850 dark:text-white">
                {Object.keys(stats.contributions_by_purpose).length}
              </span>
            </div>
          </div>

          {Object.keys(stats.contributions_by_purpose).length > 0 && (
            <div className="max-w-3xl p-4 rounded-xl glass-panel border border-saffron-500/10">
              <span className="text-[10px] text-stone-500 font-bold uppercase block mb-2">
                Contribution by Purpose / Seva
              </span>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.contributions_by_purpose).map(([purpose, amt]) => (
                  <span
                    key={purpose}
                    className="text-[10px] bg-stone-100 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-full px-2.5 py-1 text-stone-600 dark:text-stone-300"
                  >
                    {purpose}: <strong className="text-saffron-600 dark:text-gold-400">{formatRupees(amt)}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
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
            Add Devotee
          </motion.button>
        </section>
      )}

      {/* ================= CONTRIBUTIONS LIST ================= */}
      <section className="space-y-5">
        <div className="flex items-center gap-2 border-b border-stone-250/50 dark:border-stone-750/50 pb-3">
          <Heart className="h-5 w-5 text-saffron-500" />
          <h2 className="text-lg sm:text-xl font-extrabold uppercase tracking-wider text-saffron-500">
            🙏 Our Generous Devotees
          </h2>
        </div>

        {loading ? (
          <div className="text-center py-14 glass-panel rounded-2xl">
            <p className="text-stone-500 text-sm">Loading contributions…</p>
          </div>
        ) : loadError ? (
          <div className="text-center py-14 glass-panel rounded-2xl px-6">
            <p className="text-red-500 text-sm font-semibold">{loadError}</p>
          </div>
        ) : displayList.length === 0 ? (
          <div className="text-center py-16 glass-panel rounded-2xl px-6 space-y-2">
            <Heart className="h-8 w-8 text-saffron-500 mx-auto" />
            <p className="text-stone-800 dark:text-white font-extrabold text-base">
              No Contributions Recorded Yet
            </p>
            <p className="text-stone-500 text-xs max-w-sm mx-auto">
              We look forward to honoring the generous devotees and families who will support{" "}
              <strong>Sri Vinayaka Navarathri Mahotsavam</strong>.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayList.map((d, idx) => {
              const manageRecord = isManager ? (d as DonationManage) : null;
              return (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: Math.min(idx * 0.04, 0.3) }}
                  className="p-5 rounded-2xl glass-panel border border-saffron-500/15 hover:border-saffron-500/40 transition-all space-y-3 relative"
                >
                  {isManager && manageRecord && (
                    <div className="absolute top-3 right-3 flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(manageRecord)}
                        className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-full"
                        title="Edit Contribution"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(d.id)}
                        disabled={busyId === d.id}
                        className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-full disabled:opacity-40"
                        title="Delete Contribution"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-gold-500/30 bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0">
                      {d.photo_url ? (
                        <img
                          src={`${API_URL}${d.photo_url}`}
                          alt={d.donor_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UserCircle2 className="h-7 w-7 text-stone-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-stone-850 dark:text-white text-sm leading-tight">
                        {d.donor_name}
                      </h3>
                      {d.family_name && (
                        <p className="text-[10px] text-stone-500">{d.family_name} Family</p>
                      )}
                      <span className="inline-block mt-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded border bg-saffron-500/10 text-saffron-500 border-saffron-500/25">
                        {d.contribution_purpose}
                      </span>
                    </div>
                  </div>

                  {isManager && manageRecord && (
                    <div className="text-sm font-extrabold text-gold-600 dark:text-gold-400">
                      {formatRupees(manageRecord.contribution_amount)}
                    </div>
                  )}

                  {d.optional_message && (
                    <p className="text-[10px] text-stone-500 italic border-t border-stone-250/50 dark:border-stone-750/50 pt-2">
                      "{d.optional_message}"
                    </p>
                  )}

                  {/* Manager-only: phone number + address, never shown to devotees/public */}
                  {isManager && manageRecord && (manageRecord.phone_number || manageRecord.address) && (
                    <div className="border-t border-stone-250/50 dark:border-stone-750/50 pt-2">
                      <button
                        type="button"
                        onClick={() => toggleDetails(d.id)}
                        className="w-full flex items-center justify-between text-[10px] font-bold uppercase text-stone-500 hover:text-saffron-500 transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" />
                          Contributor Details
                        </span>
                        {expandedDetailIds.has(d.id) ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <AnimatePresence initial={false}>
                        {expandedDetailIds.has(d.id) && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-2 space-y-1.5 text-[11px] text-stone-700 dark:text-stone-300">
                              {manageRecord.phone_number && (
                                <div className="flex items-center gap-1.5">
                                  <Phone className="h-3 w-3 text-saffron-500 shrink-0" />
                                  <span>{manageRecord.phone_number}</span>
                                </div>
                              )}
                              {manageRecord.address && (
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="h-3 w-3 text-saffron-500 shrink-0" />
                                  <span>{manageRecord.address}</span>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* ================= INVITATION ================= */}
      <section className="p-8 rounded-3xl glass-panel border border-saffron-500/10 text-center space-y-4 max-w-xl mx-auto">
        <h3 className="text-lg font-bold text-stone-850 dark:text-white flex items-center justify-center gap-2">
          <Heart className="h-5 w-5 text-saffron-500" />
          Wish To Contribute?
        </h3>
        <p className="text-stone-500 dark:text-stone-400 text-xs leading-relaxed">
          If you or your family wish to support pooja activities, Annadanam, decoration, or cultural
          programs, please get in touch with our committee at the festival venue.
        </p>
      </section>

      {/* ================= ADD / EDIT MODAL (manager only) ================= */}
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
                  {editingId ? "Edit Devotee Contribution" : "Add Devotee Contribution"}
                </h3>
                <button onClick={resetForm} className="text-stone-500 hover:text-stone-850" type="button">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {formError && <p className="text-red-500 text-xs font-semibold">{formError}</p>}

              <form onSubmit={handleSave} className="space-y-3.5 text-xs">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-stone-500 font-semibold block">Donor Full Name *</label>
                    <input
                      type="text"
                      value={form.donor_name}
                      onChange={(e) => setForm({ ...form, donor_name: e.target.value })}
                      placeholder="e.g. Ramesh Kumar"
                      className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-stone-500 font-semibold block">Family Name</label>
                    <input
                      type="text"
                      value={form.family_name}
                      onChange={(e) => setForm({ ...form, family_name: e.target.value })}
                      placeholder="e.g. Kumar"
                      className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-stone-500 font-semibold block">Contribution Amount (₹) *</label>
                    <input
                      type="number"
                      min="0"
                      value={form.contribution_amount}
                      onChange={(e) => setForm({ ...form, contribution_amount: e.target.value })}
                      placeholder="e.g. 5001"
                      className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                      required
                    />
                    <p className="text-[9px] text-stone-500">Private — never shown to public/devotee users.</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-stone-500 font-semibold block">Contribution Purpose / Seva</label>
                    <select
                      value={form.contribution_purpose}
                      onChange={(e) => setForm({ ...form, contribution_purpose: e.target.value })}
                      className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                    >
                      {PURPOSE_CHOICES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
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
                    <p className="text-[9px] text-stone-500">Private — management view only.</p>
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
                    <p className="text-[9px] text-stone-500">Private — management view only.</p>
                  </div>
                </div>

                {/* ---- Photo: Upload OR Live Camera ---- */}
                <div className="space-y-2">
                  <label className="text-stone-500 font-semibold flex items-center gap-1.5">
                    <ImagePlus className="h-3.5 w-3.5" />
                    Donor Photo {editingId && "(leave empty to keep existing)"}
                  </label>

                  {!showCamera ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePhotoChange(e.target.files?.[0] || null)}
                        className="flex-1 min-w-[180px] bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={openCamera}
                        className="flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 hover:border-saffron-500/50 text-stone-700 dark:text-stone-200 rounded-lg px-3 py-2.5 font-semibold transition-colors cursor-pointer"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        Take Live Photo
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 p-3 rounded-lg border border-saffron-500/20 bg-stone-900">
                      <div className="relative">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full max-h-64 rounded-lg bg-black object-cover"
                        />
                        {cameraLoading && !cameraError && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[10px] text-stone-300 font-semibold">Starting camera…</span>
                          </div>
                        )}
                      </div>
                      <canvas ref={canvasRef} className="hidden" />

                      {canSwitchCamera && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => switchCamera("user")}
                            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-bold border cursor-pointer ${
                              facingMode === "user"
                                ? "bg-saffron-500 text-white border-saffron-500"
                                : "bg-stone-800 text-stone-300 border-stone-700"
                            }`}
                          >
                            <SwitchCamera className="h-3 w-3" />
                            Front Camera
                          </button>
                          <button
                            type="button"
                            onClick={() => switchCamera("environment")}
                            className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-bold border cursor-pointer ${
                              facingMode === "environment"
                                ? "bg-saffron-500 text-white border-saffron-500"
                                : "bg-stone-800 text-stone-300 border-stone-700"
                            }`}
                          >
                            <SwitchCamera className="h-3 w-3" />
                            Back Camera
                          </button>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={capturePhoto}
                          disabled={cameraLoading || !!cameraError}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-saffron-500 to-gold-500 text-white font-bold py-2 cursor-pointer disabled:opacity-50"
                        >
                          <Camera className="h-3.5 w-3.5" />
                          Capture
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="px-4 rounded-lg border border-stone-250 dark:border-stone-750 text-stone-400 font-bold"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {cameraError && <p className="text-red-500 text-[10px] font-semibold">{cameraError}</p>}

                  {photoPreview && (
                    <div className="pt-1 flex items-center gap-2">
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="h-16 w-16 rounded-full object-cover border-2 border-gold-500/30"
                      />
                      {photo && (
                        <button
                          type="button"
                          onClick={openCamera}
                          className="flex items-center gap-1 text-[10px] text-stone-500 hover:text-saffron-500 font-semibold"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Retake
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-stone-500 font-semibold block">Optional Devotional Message</label>
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
                    {saving ? "Saving…" : editingId ? "Update Contribution" : "Add Contribution"}
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