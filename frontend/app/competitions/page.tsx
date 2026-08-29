"use client";
import { useEffect, useState } from "react";
import {
  Trophy,
  Plus,
  Trash2,
  Pencil,
  Gamepad2,
  Crown,
  UserCheck,
  Users,
  Medal,
  Camera,
  X,
} from "lucide-react";

const API_URL = "https://vinayakax-backend.onrender.com";

interface CompetitionItem {
  id: number;
  name: string;
  description: string | null;
  participant_count: number;
}

interface ParticipantItem {
  id: number;
  full_name: string;
  age: number;
  phone: string;
  competition_id: number;
}

interface WinnerItem {
  id: number;
  competition_id: number;
  competition_name: string;
  participant_id: number;
  participant_name: string;
  prize_position: number;
  photo_url: string | null;
}

const POSITION_LABEL: Record<number, string> = {
  1: "1st Place",
  2: "2nd Place",
  3: "3rd Place",
};

const POSITION_MEDAL: Record<number, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

export default function Competitions() {
  const [role, setRole] = useState<string | null>(null);
  const isManager = role === "ADMIN" || role === "VOLUNTEER";

  const [activeTab, setActiveTab] = useState<"Register" | "Winners">("Register");

  const [competitions, setCompetitions] = useState<CompetitionItem[]>([]);
  const [compName, setCompName] = useState("");
  const [compDesc, setCompDesc] = useState("");
  const [editingCompId, setEditingCompId] = useState<number | null>(null);
  const [compError, setCompError] = useState("");
  const [compLoading, setCompLoading] = useState(false);

  // Registration form
  const [regName, setRegName] = useState("");
  const [regAge, setRegAge] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regCompetitionId, setRegCompetitionId] = useState("");
  const [regSuccess, setRegSuccess] = useState(false);
  const [regError, setRegError] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  // Winners
  const [winners, setWinners] = useState<WinnerItem[]>([]);
  const [winnersLoading, setWinnersLoading] = useState(true);
  const [showWinnerForm, setShowWinnerForm] = useState(false);
  const [editingWinnerId, setEditingWinnerId] = useState<number | null>(null);
  const [winCompetitionId, setWinCompetitionId] = useState("");
  const [winParticipantId, setWinParticipantId] = useState("");
  const [winPosition, setWinPosition] = useState("1");
  const [winPhoto, setWinPhoto] = useState<File | null>(null);
  const [winParticipants, setWinParticipants] = useState<ParticipantItem[]>([]);
  const [winError, setWinError] = useState("");
  const [winLoading, setWinLoading] = useState(false);

  const getToken = () => localStorage.getItem("token");

  const fetchCompetitions = () => {
    fetch(`${API_URL}/api/competitions/`)
      .then((res) => res.json())
      .then((data) => setCompetitions(Array.isArray(data) ? data : []))
      .catch(() => setCompetitions([]));
  };

  const fetchWinners = () => {
    setWinnersLoading(true);
    fetch(`${API_URL}/api/competitions/winners/all`)
      .then((res) => res.json())
      .then((data) => setWinners(Array.isArray(data) ? data : []))
      .catch(() => setWinners([]))
      .finally(() => setWinnersLoading(false));
  };

  const fetchParticipantsForWinnerForm = (competitionId: string) => {
    if (!competitionId) {
      setWinParticipants([]);
      return;
    }
    const token = getToken();
    fetch(`${API_URL}/api/competitions/${competitionId}/participants`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setWinParticipants(Array.isArray(data) ? data : []))
      .catch(() => setWinParticipants([]));
  };

  useEffect(() => {
    setRole(localStorage.getItem("role"));
    fetchCompetitions();
    fetchWinners();
  }, []);

  // ---------- Competition management ----------

  const resetCompForm = () => {
    setCompName("");
    setCompDesc("");
    setEditingCompId(null);
    setCompError("");
  };

  const handleEditCompetition = (c: CompetitionItem) => {
    setCompName(c.name);
    setCompDesc(c.description || "");
    setEditingCompId(c.id);
    setCompError("");
  };

  const handleSaveCompetition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compName.trim()) return;
    setCompError("");
    setCompLoading(true);
    const token = getToken();

    try {
      const res = await fetch(
        editingCompId
          ? `${API_URL}/api/competitions/${editingCompId}`
          : `${API_URL}/api/competitions/`,
        {
          method: editingCompId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name: compName.trim(), description: compDesc.trim() || null }),
        }
      );

      if (res.ok) {
        resetCompForm();
        fetchCompetitions();
      } else {
        const err = await res.json().catch(() => ({}));
        setCompError(err.detail || "Failed to save competition.");
      }
    } catch {
      setCompError("Could not reach the server.");
    } finally {
      setCompLoading(false);
    }
  };

  const handleDeleteCompetition = async (id: number) => {
    if (!confirm("Delete this competition? This will also remove its participants and winners.")) return;
    const token = getToken();
    try {
      const res = await fetch(`${API_URL}/api/competitions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchCompetitions();
        fetchWinners();
      } else {
        alert("Failed to delete competition.");
      }
    } catch {
      alert("Could not reach the server.");
    }
  };

  // ---------- Participant registration ----------

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regAge || !regPhone || !regCompetitionId) return;
    setRegError("");
    setRegLoading(true);
    const token = getToken();

    try {
      const res = await fetch(`${API_URL}/api/competitions/participants`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: regName,
          age: Number(regAge),
          phone: regPhone,
          competition_id: Number(regCompetitionId),
        }),
      });

      if (res.ok) {
        setRegSuccess(true);
        setRegName("");
        setRegAge("");
        setRegPhone("");
        setRegCompetitionId("");
        fetchCompetitions();
        window.dispatchEvent(new Event("trigger-fireworks"));
        setTimeout(() => setRegSuccess(false), 4000);
      } else {
        const err = await res.json().catch(() => ({}));
        setRegError(err.detail || "Registration failed.");
      }
    } catch {
      setRegError("Could not reach the server.");
    } finally {
      setRegLoading(false);
    }
  };

  // ---------- Winner management ----------

  const resetWinnerForm = () => {
    setEditingWinnerId(null);
    setWinCompetitionId("");
    setWinParticipantId("");
    setWinPosition("1");
    setWinPhoto(null);
    setWinParticipants([]);
    setWinError("");
    setShowWinnerForm(false);
  };

  const handleEditWinner = (w: WinnerItem) => {
    setEditingWinnerId(w.id);
    setWinCompetitionId(String(w.competition_id));
    setWinPosition(String(w.prize_position));
    setWinPhoto(null);
    setWinError("");
    setShowWinnerForm(true);
    fetchParticipantsForWinnerForm(String(w.competition_id));
    setWinParticipantId(String(w.participant_id));
  };

  const handleSaveWinner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!winCompetitionId || !winParticipantId || !winPosition) return;
    setWinError("");
    setWinLoading(true);
    const token = getToken();

    const formData = new FormData();
    formData.append("competition_id", winCompetitionId);
    formData.append("participant_id", winParticipantId);
    formData.append("prize_position", winPosition);
    if (winPhoto) formData.append("photo", winPhoto);

    try {
      const res = await fetch(
        editingWinnerId
          ? `${API_URL}/api/competitions/winners/${editingWinnerId}`
          : `${API_URL}/api/competitions/winners`,
        {
          method: editingWinnerId ? "PUT" : "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      if (res.ok) {
        resetWinnerForm();
        fetchWinners();
      } else {
        const err = await res.json().catch(() => ({}));
        setWinError(err.detail || "Failed to save winner.");
      }
    } catch {
      setWinError("Could not reach the server.");
    } finally {
      setWinLoading(false);
    }
  };

  const handleDeleteWinner = async (id: number) => {
    if (!confirm("Remove this winner entry?")) return;
    const token = getToken();
    try {
      const res = await fetch(`${API_URL}/api/competitions/winners/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchWinners();
      } else {
        alert("Failed to delete winner.");
      }
    } catch {
      alert("Could not reach the server.");
    }
  };

  // Group winners by competition for display
  const winnersByCompetition = winners.reduce<Record<string, WinnerItem[]>>((acc, w) => {
    const key = w.competition_name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(w);
    return acc;
  }, {});
  Object.values(winnersByCompetition).forEach((list) =>
    list.sort((a, b) => a.prize_position - b.prize_position)
  );

  return (
    <div className="space-y-10 py-4">
      {/* Header */}
      <section className="space-y-4 max-w-2xl">
        <span className="text-[10px] text-saffron-500 uppercase font-bold tracking-wider block">
          Cultural Highlights
        </span>
        <h1 className="text-4xl font-extrabold text-stone-900 dark:text-white">
          Village Competitions
        </h1>
        <p className="text-stone-600 dark:text-stone-300 text-xs sm:text-sm">
          Explore the competitions and games at Sri Vinayaka Navarathri Mahotsavam 2026, and
          celebrate our winners.
        </p>
      </section>

      {/* Competitions Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-stone-850 dark:text-white flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-saffron-500" />
            Competition Categories
          </h3>

          {competitions.length === 0 ? (
            <div className="text-center py-10 glass-panel rounded-2xl">
              <p className="text-stone-500 text-sm">No competitions added yet.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {competitions.map((c) => (
                <div
                  key={c.id}
                  className="p-5 rounded-2xl glass-panel border border-saffron-500/10 hover:border-gold-500/30 transition-all space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-extrabold text-stone-850 dark:text-white text-base">
                      {c.name}
                    </h4>
                    {isManager && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleEditCompetition(c)}
                          className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-full"
                          title="Edit Competition"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCompetition(c.id)}
                          className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-full"
                          title="Delete Competition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  {c.description && (
                    <p className="text-stone-500 dark:text-stone-400 text-xs">{c.description}</p>
                  )}
                  <div className="flex items-center gap-1.5 text-[10px] text-stone-500 font-bold uppercase pt-1">
                    <Users className="h-3.5 w-3.5 text-saffron-500" />
                    <span>{c.participant_count} Registered</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Admin/Volunteer: Add/Edit Competition */}
        {isManager && (
          <div className="p-6 rounded-2xl glass-panel border border-gold-500/30 space-y-4 h-fit">
            <h3 className="text-lg font-bold text-stone-850 dark:text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-saffron-500" />
              {editingCompId ? "Edit Competition" : "Add Competition"}
            </h3>

            {compError && (
              <p className="text-red-500 text-xs font-semibold">{compError}</p>
            )}

            <form onSubmit={handleSaveCompetition} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-stone-500 font-semibold block">Competition Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rangoli Competition"
                  value={compName}
                  onChange={(e) => setCompName(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-500 font-semibold block">Description</label>
                <textarea
                  placeholder="Rules, timing, eligibility..."
                  value={compDesc}
                  onChange={(e) => setCompDesc(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={compLoading}
                  className="flex-1 rounded-lg bg-saffron-500 hover:bg-saffron-600 text-white font-bold py-2.5 transition-colors cursor-pointer text-center disabled:opacity-60"
                >
                  {compLoading ? "Saving..." : editingCompId ? "Update Competition" : "Add Competition"}
                </button>
                {editingCompId && (
                  <button
                    type="button"
                    onClick={resetCompForm}
                    className="px-4 rounded-lg border border-stone-250 dark:border-stone-750 text-stone-500 font-bold text-xs"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </section>

      {/* Tabs */}
      <section className="flex border-b border-stone-250 dark:border-stone-750 gap-4 text-xs font-bold">
        {(["Register", "Winners"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 px-1 transition-all relative cursor-pointer ${
              activeTab === tab ? "text-saffron-500" : "text-stone-500 hover:text-stone-850"
            }`}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-saffron-500" />
            )}
          </button>
        ))}
      </section>

      {/* Register Tab */}
      {activeTab === "Register" && (
        <section className="max-w-xl mx-auto">
          {!isManager ? (
            <div className="text-center py-10 glass-panel rounded-2xl px-6">
              <UserCheck className="h-8 w-8 text-saffron-500 mx-auto mb-3" />
              <p className="text-stone-500 text-sm">
                Participant registration is handled by our Admin and Volunteer team. Please visit
                the registration desk at the venue to sign up for a competition.
              </p>
            </div>
          ) : (
            <div className="p-6 rounded-2xl glass-panel border border-saffron-500/10 space-y-4">
              <h3 className="text-lg font-bold text-stone-850 dark:text-white flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-saffron-500" />
                Register a Participant
              </h3>

              {regSuccess && (
                <div className="p-4 rounded-xl bg-green-100 border border-green-300 text-green-700 text-xs font-semibold">
                  🎉 Participant registered successfully!
                </div>
              )}
              {regError && (
                <p className="text-red-500 text-xs font-semibold">{regError}</p>
              )}

              <form onSubmit={handleRegister} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="text-stone-500 font-semibold block">Participant Full Name</label>
                  <input
                    type="text"
                    placeholder="Enter name"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-stone-500 font-semibold block">Age</label>
                    <input
                      type="number"
                      placeholder="Enter age"
                      value={regAge}
                      onChange={(e) => setRegAge(e.target.value)}
                      className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-stone-500 font-semibold block">Competition Category</label>
                    <select
                      value={regCompetitionId}
                      onChange={(e) => setRegCompetitionId(e.target.value)}
                      className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                      required
                    >
                      <option value="">Select a Competition</option>
                      {competitions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-stone-500 font-semibold block">WhatsApp Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 7993093251"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={regLoading}
                  className="w-full rounded-lg bg-gradient-to-r from-saffron-500 to-gold-500 text-white font-bold py-2.5 transition-all cursor-pointer text-center disabled:opacity-60"
                >
                  {regLoading ? "Registering..." : "Register Participant"}
                </button>
              </form>
            </div>
          )}
        </section>
      )}

      {/* Winners Tab */}
      {activeTab === "Winners" && (
        <section className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-bold text-stone-850 dark:text-white flex items-center gap-2">
              <Trophy className="h-5 w-5 text-gold-500" />
              Competition Winners
            </h3>
            {isManager && (
              <button
                onClick={() => {
                  resetWinnerForm();
                  setShowWinnerForm(true);
                }}
                className="flex items-center gap-1.5 bg-saffron-500 hover:bg-saffron-600 text-white rounded-lg px-4 py-2 text-xs font-bold transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add Winner
              </button>
            )}
          </div>

          {/* Winner Add/Edit Form */}
          {isManager && showWinnerForm && (
            <div className="p-6 rounded-2xl glass-panel border border-gold-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-stone-850 dark:text-white text-sm">
                  {editingWinnerId ? "Edit Winner" : "Add Winner"}
                </h4>
                <button onClick={resetWinnerForm} className="text-stone-500 hover:text-stone-850">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {winError && <p className="text-red-500 text-xs font-semibold">{winError}</p>}

              <form onSubmit={handleSaveWinner} className="space-y-3.5 text-xs">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-stone-500 font-semibold block">Competition</label>
                    <select
                      value={winCompetitionId}
                      onChange={(e) => {
                        setWinCompetitionId(e.target.value);
                        setWinParticipantId("");
                        fetchParticipantsForWinnerForm(e.target.value);
                      }}
                      className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                      required
                    >
                      <option value="">Select Competition</option>
                      {competitions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-stone-500 font-semibold block">Position</label>
                    <select
                      value={winPosition}
                      onChange={(e) => setWinPosition(e.target.value)}
                      className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                    >
                      <option value="1">1st Place</option>
                      <option value="2">2nd Place</option>
                      <option value="3">3rd Place</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-stone-500 font-semibold block">Winner / Participant</label>
                  <select
                    value={winParticipantId}
                    onChange={(e) => setWinParticipantId(e.target.value)}
                    className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                    required
                    disabled={!winCompetitionId}
                  >
                    <option value="">
                      {winCompetitionId ? "Select Participant" : "Select a competition first"}
                    </option>
                    {winParticipants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} ({p.phone})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-stone-500 font-semibold flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5" />
                    Winner Photo {editingWinnerId && "(leave empty to keep existing)"}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setWinPhoto(e.target.files?.[0] || null)}
                    className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-250 dark:border-stone-750 rounded-lg p-2.5 text-stone-800 dark:text-stone-100 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={winLoading}
                  className="w-full rounded-lg bg-gradient-to-r from-saffron-500 to-gold-500 text-white font-bold py-2.5 transition-all cursor-pointer text-center disabled:opacity-60"
                >
                  {winLoading ? "Saving..." : editingWinnerId ? "Update Winner" : "Add Winner"}
                </button>
              </form>
            </div>
          )}

          {/* Winners Display */}
          {winnersLoading ? (
            <div className="text-center py-10 glass-panel rounded-2xl">
              <p className="text-stone-500 text-sm">Loading winners...</p>
            </div>
          ) : Object.keys(winnersByCompetition).length === 0 ? (
            <div className="text-center py-10 glass-panel rounded-2xl">
              <p className="text-stone-500 text-sm">Winners will be announced soon. Stay tuned!</p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(winnersByCompetition).map(([competitionName, list]) => (
                <div key={competitionName} className="space-y-4">
                  <h4 className="text-base font-extrabold text-stone-850 dark:text-white flex items-center gap-2">
                    <Crown className="h-5 w-5 text-gold-500" />
                    {competitionName}
                  </h4>
                  <div className="grid sm:grid-cols-3 gap-4">
                    {list.map((w) => (
                      <div
                        key={w.id}
                        className="p-5 rounded-2xl glass-panel border border-gold-500/30 text-center space-y-3 relative"
                      >
                        {isManager && (
                          <div className="absolute top-3 right-3 flex items-center gap-1">
                            <button
                              onClick={() => handleEditWinner(w)}
                              className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-full"
                              title="Edit Winner"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteWinner(w.id)}
                              className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-full"
                              title="Delete Winner"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}

                        <div className="text-2xl">{POSITION_MEDAL[w.prize_position] || <Medal className="h-6 w-6 mx-auto text-gold-500" />}</div>

                        <div className="h-24 w-24 mx-auto rounded-full overflow-hidden border-2 border-gold-500/50 bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                          {w.photo_url ? (
                            <img
                              src={`${API_URL}${w.photo_url}`}
                              alt={w.participant_name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Trophy className="h-8 w-8 text-stone-400" />
                          )}
                        </div>

                        <div>
                          <p className="font-extrabold text-stone-850 dark:text-white text-sm">
                            {w.participant_name}
                          </p>
                          <span className="text-[10px] font-bold uppercase text-gold-600 dark:text-gold-400">
                            {POSITION_LABEL[w.prize_position]}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}