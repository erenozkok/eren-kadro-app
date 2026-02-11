import React, { useState, useEffect, useMemo } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  signInWithCustomToken,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  addDoc,
} from "firebase/firestore";
import {
  Check,
  X,
  Plus,
  Trophy,
  LayoutList,
  PlayCircle,
  ChevronRight,
  User,
  LogOut,
  Trash2,
  Calendar,
  Star,
  AlertCircle,
  Shield,
  Target,
  Activity,
  RefreshCw,
  Crown,
} from "lucide-react";

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyAkZU7zgEgrWlac1CaXQywAR4kQOLbMuIQ",
  authDomain: "halisaha-123.firebaseapp.com",
  projectId: "halisaha-123",
  storageBucket: "halisaha-123.firebasestorage.app",
  messagingSenderId: "247952781761",
  appId: "1:247952781761:web:ab75e61aee0885ae2a7f40",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "halisaha-app-v3";

// --- Constants ---
const PREDEFINED_PLAYERS = [
  "Berke",
  "Berçindar",
  "Ege",
  "Eren",
  "Egehan",
  "Kasıntı",
  "Oğulcan",
  "Taşo",
  "Yasin",
  "Alper",
  "Alperen",
  "Hüseyin",
  "Onur",
  "Necmettin",
];

const DAYS = [
  { id: "Pzt", label: "Pzt", full: "Pazartesi" },
  { id: "Sal", label: "Sal", full: "Salı" },
  { id: "Çar", label: "Çar", full: "Çarşamba" },
  { id: "Per", label: "Per", full: "Perşembe" },
  { id: "Cum", label: "Cum", full: "Cuma" },
  { id: "Cmt", label: "Cmt", full: "Cumartesi" },
  { id: "Paz", label: "Paz", full: "Pazar" },
];

// --- ADVANCED RATING LOGIC ---

const calculatePositionalRatings = (stats) => {
  const { def, phy, pas, dri, sho, pac } = stats;
  const defRating = def * 0.5 + phy * 0.3 + pac * 0.1 + pas * 0.1;
  const midRating = pas * 0.4 + dri * 0.3 + def * 0.15 + sho * 0.15;
  const fwdRating = sho * 0.5 + pac * 0.2 + dri * 0.2 + phy * 0.1;

  return {
    DEF: Math.round(defRating),
    ORT: Math.round(midRating),
    FOR: Math.round(fwdRating),
  };
};

const getBestPosition = (stats) => {
  const ratings = calculatePositionalRatings(stats);
  const max = Math.max(ratings.DEF, ratings.ORT, ratings.FOR);

  if (ratings.DEF === max) return { pos: "DEF", rating: ratings.DEF };
  if (ratings.FOR === max) return { pos: "FOR", rating: ratings.FOR };
  return { pos: "ORT", rating: ratings.ORT };
};

const calculateGeneralImpact = (stats) => {
  const values = Object.values(stats);
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
};

const getPositionColor = (pos) => {
  switch (pos) {
    case "DEF":
      return "text-blue-600 bg-blue-50 border-blue-100";
    case "ORT":
      return "text-emerald-600 bg-emerald-50 border-emerald-100";
    case "FOR":
      return "text-orange-600 bg-orange-50 border-orange-100";
    default:
      return "text-gray-600 bg-gray-50 border-gray-100";
  }
};

// --- Components ---

const IdentityScreen = ({ players, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = players.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col items-center justify-center p-4 md:p-6 animate-in fade-in duration-500">
      <div className="w-full max-w-md space-y-6 md:space-y-8">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-[2rem] shadow-xl shadow-blue-900/5 flex items-center justify-center mx-auto mb-6 md:mb-8 text-blue-600">
            <User size={40} className="md:w-12 md:h-12" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
            Hoş Geldin
          </h1>
          <p className="text-gray-500 text-base md:text-lg">
            Devam etmek için ismini seç.
          </p>
        </div>

        <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <input
              type="text"
              placeholder="Listede ismini ara..."
              className="w-full bg-white rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-400 border border-gray-200 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm md:text-base"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="max-h-[55vh] md:max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
            {filtered.map((player) => (
              <button
                key={player.id}
                onClick={() => onSelect(player)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-50 last:border-0 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs md:text-sm">
                    {player.name.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="font-semibold text-gray-900 text-base md:text-lg">
                    {player.name}
                  </span>
                </div>
                <ChevronRight
                  className="text-gray-300 group-hover:text-blue-500 transition-colors"
                  size={20}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const AppleSlider = ({ label, value, subLabel, onChange }) => (
  <div className="space-y-3">
    <div className="flex justify-between items-end">
      <div className="flex flex-col">
        <span className="text-sm font-bold text-gray-700">{label}</span>
        {subLabel && (
          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">
            {subLabel}
          </span>
        )}
      </div>
      <span
        className={`text-xl font-bold tabular-nums ${
          value >= 85 ? "text-emerald-600" : "text-gray-900"
        }`}
      >
        {value}
      </span>
    </div>
    <input
      type="range"
      min="40"
      max="99"
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value))}
      className="w-full h-2 bg-gray-100 rounded-full appearance-none cursor-pointer accent-blue-600 hover:accent-blue-500 focus:outline-none"
    />
  </div>
);

const PlayerCard = ({
  player,
  isSelf,
  isAdmin,
  onEdit,
  onToggleDay,
  onDelete,
}) => {
  const { pos: bestPos, rating: bestRating } = getBestPosition(player.stats);
  const availableDays = player.availableDays || [];

  const canToggleDays = isSelf || isAdmin;
  const canEditStats = !isSelf;
  const canDelete = isAdmin;
  const voteCount = player.votes ? Object.keys(player.votes).length : 0;

  return (
    <div
      className={`group relative bg-white rounded-[24px] p-0 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_-6px_rgba(0,0,0,0.1)] transition-all duration-300 border overflow-hidden ${
        isSelf
          ? "border-blue-200 ring-2 ring-blue-50"
          : player.isGuest
          ? "border-orange-200 ring-2 ring-orange-50"
          : "border-gray-100"
      }`}
    >
      <div
        className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors duration-300 ${
          availableDays.length > 0 ? "bg-emerald-500" : "bg-gray-200"
        }`}
      />
      <div className="pl-5 pr-4 pt-5 pb-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center justify-center w-14 h-14 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
              <span
                className={`text-xl font-black tracking-tight z-10 ${
                  bestRating >= 80 ? "text-emerald-600" : "text-gray-800"
                }`}
              >
                {bestRating}
              </span>
              <div
                className={`absolute bottom-0 w-full h-1 ${
                  bestRating >= 80 ? "bg-emerald-500" : "bg-gray-300"
                }`}
              ></div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[17px] font-bold text-gray-900 leading-tight">
                  {player.name}
                </h3>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${getPositionColor(
                    bestPos
                  )}`}
                >
                  {bestPos}
                </span>
              </div>
              <div className="mt-1 flex flex-col gap-1">
                {isSelf && (
                  <span className="text-[11px] font-medium text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full w-fit">
                    Sen
                  </span>
                )}
                {player.isGuest && (
                  <span className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-md flex items-center gap-1 w-fit">
                    <AlertCircle size={10} />
                    Misafir
                  </span>
                )}
                {!isSelf && (
                  <span className="text-[9px] text-gray-400 font-medium">
                    {voteCount > 0
                      ? `${voteCount} kişi oyladı`
                      : "Henüz oylanmadı"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              {canToggleDays
                ? isSelf
                  ? "Hangi Günler Müsait?"
                  : "Müsaitlik Durumu (Admin)"
                : "Müsait Günler"}
            </span>
            {!canToggleDays && availableDays.length === 0 && (
              <span className="text-[10px] text-gray-400 italic">
                Belirtilmedi
              </span>
            )}
          </div>
          <div className="flex justify-between gap-1">
            {DAYS.map((d) => {
              const isSelected = availableDays.includes(d.id);
              if (canToggleDays) {
                return (
                  <button
                    key={d.id}
                    onClick={() => onToggleDay(player, d.id)}
                    className={`flex-1 h-8 rounded-lg text-[10px] font-bold transition-all border ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-600 shadow-blue-200 shadow-md transform scale-105"
                        : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {d.label}
                  </button>
                );
              } else {
                return (
                  <div
                    key={d.id}
                    className={`flex-1 h-7 rounded-md flex items-center justify-center text-[9px] font-bold border ${
                      isSelected
                        ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                        : "bg-gray-50 text-gray-300 border-transparent"
                    }`}
                  >
                    {d.label}
                  </div>
                );
              }
            })}
          </div>
        </div>
        <div className="mt-4 flex gap-2 pt-3 border-t border-gray-50">
          {canEditStats && (
            <button
              onClick={() => onEdit(player)}
              className={`flex-1 border h-8 rounded-lg text-xs font-bold transition-all shadow-sm ${
                player.isGuest
                  ? "bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100"
                  : "bg-white border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
              }`}
            >
              {player.isGuest ? "Misafiri Puanla" : "Güç Puanla"}
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => onDelete(player.id)}
              title="Sil"
              className={`h-8 px-3 flex items-center justify-center border rounded-lg transition-colors ${
                player.isGuest
                  ? "bg-white border-gray-200 text-gray-400 hover:text-red-500 hover:bg-red-50"
                  : "bg-red-50 border-red-100 text-red-500 hover:bg-red-100"
              }`}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const TacticalPitch = ({ teamA, teamB, dayName }) => {
  const groupByPos = (team) => {
    const groups = { DEF: [], ORT: [], FOR: [] };
    team.forEach((p) => {
      const pos = p.assignedPos || getBestPosition(p.stats).pos;
      if (groups[pos]) groups[pos].push(p);
      else groups.ORT.push(p);
    });
    return groups;
  };

  const tAGroups = groupByPos(teamA);
  const tBGroups = groupByPos(teamB);

  const PlayerItem = ({ p, colorClass, isTeamB }) => {
    const pos = p.assignedPos || getBestPosition(p.stats).pos;
    const ratings = calculatePositionalRatings(p.stats);
    const rating = ratings[pos];
    const namePosition = isTeamB
      ? "-top-9 md:-top-10"
      : "-bottom-9 md:-bottom-10";

    return (
      <div
        key={p.id}
        className="flex flex-col items-center relative group z-10 w-16 md:w-20"
      >
        <div
          className={`w-11 h-11 md:w-14 md:h-14 rounded-full flex items-center justify-center text-[10px] md:text-sm font-black border-[3px] shadow-lg bg-white text-gray-800 relative overflow-hidden transition-transform transform hover:scale-110 ${colorClass.replace(
            "text",
            "border"
          )}`}
        >
          <span className="z-10">{pos}</span>
          <div
            className={`absolute bottom-0 left-0 right-0 h-1 opacity-30 ${
              rating >= 80 ? "bg-emerald-500" : "bg-gray-400"
            }`}
          ></div>
        </div>
        <span
          className={`absolute ${namePosition} w-24 md:w-28 text-center bg-gray-900/95 text-white text-[9px] md:text-xs font-bold px-1.5 py-1 md:py-1.5 rounded-lg backdrop-blur-md shadow-xl z-20 border border-white/10`}
        >
          {p.name}
          <span className="block text-[8px] md:text-[9px] opacity-80 mt-0.5 font-medium tracking-wide">
            Güç: {rating}
          </span>
        </span>
      </div>
    );
  };

  const TeamHalf = ({ groups, colorClass, isBottom }) => {
    const rows = isBottom ? ["FOR", "ORT", "DEF"] : ["DEF", "ORT", "FOR"];

    return (
      <div
        className={`flex-1 flex flex-col ${
          isBottom ? "justify-end pb-8 md:pb-12" : "justify-start pt-8 md:pt-12"
        } gap-8 md:gap-16`}
      >
        {rows.map((posKey) => (
          <div
            key={posKey}
            className={`flex justify-evenly items-center w-full px-2 min-h-[50px] md:min-h-[60px]`}
          >
            {groups[posKey].map((p) => (
              <PlayerItem
                key={p.id}
                p={p}
                colorClass={colorClass}
                isTeamB={isBottom}
              />
            ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="mt-8 relative max-w-4xl mx-auto">
      <div className="absolute -top-5 left-0 right-0 text-center z-20">
        <span className="bg-gray-900 text-white text-xs md:text-sm font-bold px-6 py-2 rounded-full shadow-xl border-2 border-white/20 uppercase tracking-widest">
          {dayName} Kadrosu
        </span>
      </div>
      <div className="rounded-[2rem] md:rounded-[3rem] overflow-hidden bg-[#2d3436] shadow-2xl shadow-emerald-900/30 relative w-full h-[850px] md:h-[1050px] border-[6px] md:border-[8px] border-white/20">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-600 via-emerald-700 to-emerald-800"></div>
        <div className="absolute inset-0 opacity-10 bg-[size:100px_100px] bg-[linear-gradient(rgba(255,255,255,0.1)_2px,transparent_2px),linear-gradient(90deg,rgba(255,255,255,0.1)_2px,transparent_2px)]"></div>
        <div className="absolute inset-6 md:inset-8 border-4 border-white/30 rounded-[2rem] pointer-events-none"></div>
        <div className="absolute top-1/2 left-6 right-6 md:left-8 md:right-8 h-1 bg-white/30 -translate-y-1/2 pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/2 w-32 h-32 md:w-48 md:h-48 border-4 border-white/30 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-1/2 h-24 md:h-32 border-b-4 border-l-4 border-r-4 border-white/30 rounded-b-2xl pointer-events-none"></div>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-1/2 h-24 md:h-32 border-t-4 border-l-4 border-r-4 border-white/30 rounded-t-2xl pointer-events-none"></div>
        <div className="absolute inset-0 flex flex-col z-10 py-6 md:py-8">
          <TeamHalf
            groups={tAGroups}
            colorClass="text-blue-500"
            isBottom={false}
          />
          <TeamHalf
            groups={tBGroups}
            colorClass="text-orange-500"
            isBottom={true}
          />
        </div>
      </div>
    </div>
  );
};

// --- Main Application ---
export default function App() {
  const [user, setUser] = useState(null);
  const [currentIdentity, setCurrentIdentity] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list");
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [editingStats, setEditingStats] = useState(null);
  const [showGuestInput, setShowGuestInput] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [teams, setTeams] = useState(null);
  const [selectedMatchDay, setSelectedMatchDay] = useState(null);
  const [resetStatus, setResetStatus] = useState(null);

  const isAdmin = currentIdentity?.name === "Eren";

  // **TASARIM DÜZELTİCİ**: Tailwind CSS'i otomatik yükle
  useEffect(() => {
    if (!document.getElementById("tailwind-cdn")) {
      const script = document.createElement("script");
      script.id = "tailwind-cdn";
      script.src = "https://cdn.tailwindcss.com";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("Auth Error:", error);
      }
    };
    initAuth();
    onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    const playersRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "players"
    );

    const unsub = onSnapshot(playersRef, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      if (data.length === 0) {
        PREDEFINED_PLAYERS.forEach((name) => {
          addDoc(playersRef, {
            name,
            availableDays: [],
            isGuest: false,
            stats: { pac: 60, sho: 60, pas: 60, dri: 60, def: 60, phy: 60 },
            votes: {},
          });
        });
      } else {
        const sanitized = data.map((p) => ({
          ...p,
          availableDays: p.availableDays || [],
          votes: p.votes || {},
        }));
        setPlayers(sanitized);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    const checkReset = async () => {
      if (!user || players.length === 0) return;
      try {
        const systemDocRef = doc(
          db,
          "artifacts",
          appId,
          "public",
          "data",
          "metadata",
          "system"
        );
        const sysSnap = await getDoc(systemDocRef);
        const lastResetTime = sysSnap.exists()
          ? sysSnap.data().lastResetTime || 0
          : 0;
        const now = new Date();
        const day = now.getDay();
        const daysSinceSat = (day + 1) % 7;
        const lastSaturday = new Date(now);
        lastSaturday.setDate(now.getDate() - daysSinceSat);
        lastSaturday.setHours(0, 0, 0, 0);
        const lastSatTime = lastSaturday.getTime();

        if (lastResetTime < lastSatTime) {
          await setDoc(systemDocRef, { lastResetTime: Date.now() });
          const updates = players.map((p) => {
            const pRef = doc(
              db,
              "artifacts",
              appId,
              "public",
              "data",
              "players",
              p.id
            );
            return updateDoc(pRef, { availableDays: [] });
          });
          await Promise.all(updates);
          setResetStatus("Haftalık sıfırlama yapıldı.");
          setTimeout(() => setResetStatus(null), 3000);
        }
      } catch (e) {
        console.error(e);
      }
    };
    checkReset();
  }, [user, players.length > 0]);

  const openEditModal = (player) => {
    setEditingPlayer(player);
    const myVote = player.votes?.[currentIdentity.id];
    setEditingStats(myVote || player.stats);
  };

  const handleUpdateStats = async () => {
    if (!editingPlayer || !editingStats || !currentIdentity) return;
    const playerRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "players",
      editingPlayer.id
    );
    try {
      const playerSnap = await getDoc(playerRef);
      if (!playerSnap.exists()) return;
      const playerData = playerSnap.data();
      const currentVotes = playerData.votes || {};
      currentVotes[currentIdentity.id] = editingStats;
      const statKeys = ["def", "phy", "pac", "pas", "dri", "sho"];
      const calculatedStats = { ...playerData.stats };
      if (Object.keys(currentVotes).length > 0) {
        statKeys.forEach((key) => {
          let sum = 0;
          let count = 0;
          Object.values(currentVotes).forEach((vote) => {
            if (vote[key] !== undefined) {
              sum += vote[key];
              count++;
            }
          });
          calculatedStats[key] = count > 0 ? Math.round(sum / count) : 60;
        });
      }
      await updateDoc(playerRef, {
        stats: calculatedStats,
        votes: currentVotes,
      });
      setEditingPlayer(null);
      setEditingStats(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleDay = async (player, dayId) => {
    const currentDays = player.availableDays || [];
    let newDays = currentDays.includes(dayId)
      ? currentDays.filter((d) => d !== dayId)
      : [...currentDays, dayId];
    const ref = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "players",
      player.id
    );
    await updateDoc(ref, { availableDays: newDays });
  };

  const handleAddGuest = async () => {
    if (!guestName.trim()) return;
    const playersRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "players"
    );
    await addDoc(playersRef, {
      name: guestName + " (M)",
      availableDays: DAYS.map((d) => d.id),
      isGuest: true,
      stats: { pac: 60, sho: 60, pas: 60, dri: 60, def: 60, phy: 60 },
      votes: {},
    });
    setGuestName("");
    setShowGuestInput(false);
  };

  const handleDeletePlayer = async (id) => {
    if (!confirm("Bu kişiyi silmek istediğine emin misin?")) return;
    try {
      const docRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "players",
        id
      );
      await deleteDoc(docRef);
    } catch (e) {
      console.error(e);
    }
  };

  const bestDayStats = useMemo(() => {
    if (players.length === 0) return null;
    let counts = {};
    DAYS.forEach((d) => (counts[d.id] = 0));
    players.forEach((p) => {
      if (p.availableDays) {
        p.availableDays.forEach((day) => {
          if (counts[day] !== undefined) counts[day]++;
        });
      }
    });
    let maxDay = null;
    let maxCount = -1;
    DAYS.forEach((d) => {
      if (counts[d.id] > maxCount) {
        maxCount = counts[d.id];
        maxDay = d;
      }
    });
    return { day: maxDay, count: maxCount };
  }, [players]);

  useEffect(() => {
    if (bestDayStats && !selectedMatchDay) {
      setSelectedMatchDay(bestDayStats.day.id);
    }
  }, [bestDayStats]);

  const handleGenerateTeams = () => {
    const targetDay =
      selectedMatchDay || (bestDayStats ? bestDayStats.day.id : "Pzt");
    const pool = players.filter(
      (p) => p.availableDays && p.availableDays.includes(targetDay)
    );
    if (pool.length < 2)
      return alert(`Bu gün (${targetDay}) için yeterli oyuncu yok.`);

    const sortedByGeneral = [...pool].sort(
      (a, b) =>
        calculateGeneralImpact(b.stats) - calculateGeneralImpact(a.stats)
    );
    const teamA = [];
    const teamB = [];
    let scoreA = 0;
    let scoreB = 0;

    sortedByGeneral.forEach((p) => {
      const impact = calculateGeneralImpact(p.stats);
      if (scoreA <= scoreB) {
        teamA.push(p);
        scoreA += impact;
      } else {
        teamB.push(p);
        scoreB += impact;
      }
    });

    const assignPositions = (team) => {
      const withRatings = team.map((p) => ({
        ...p,
        ratings: calculatePositionalRatings(p.stats),
      }));
      const size = team.length;
      let defCount, midCount, forCount;

      if (size === 5) {
        defCount = 2;
        midCount = 2;
        forCount = 1;
      } else if (size === 6) {
        defCount = 2;
        midCount = 2;
        forCount = 2;
      } else if (size === 7) {
        defCount = 3;
        midCount = 2;
        forCount = 2;
      } else if (size === 8) {
        defCount = 3;
        midCount = 3;
        forCount = 2;
      } else {
        defCount = Math.max(2, Math.floor(size * 0.4));
        forCount = Math.max(1, Math.floor(size * 0.3));
        midCount = size - defCount - forCount;
      }

      withRatings.sort((a, b) => b.ratings.DEF - a.ratings.DEF);
      const defenders = withRatings
        .slice(0, defCount)
        .map((p) => ({ ...p, assignedPos: "DEF" }));
      const remaining1 = withRatings.slice(defCount);
      remaining1.sort((a, b) => b.ratings.FOR - a.ratings.FOR);
      const forwards = remaining1
        .slice(0, forCount)
        .map((p) => ({ ...p, assignedPos: "FOR" }));
      const midfielders = remaining1
        .slice(forCount)
        .map((p) => ({ ...p, assignedPos: "ORT" }));
      return [...defenders, ...forwards, ...midfielders];
    };

    setTeams({
      tA: assignPositions(teamA),
      tB: assignPositions(teamB),
      day: DAYS.find((d) => d.id === targetDay).full,
    });
  };

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-[#F2F2F7] text-gray-400">
        Yükleniyor...
      </div>
    );

  if (!currentIdentity) {
    return <IdentityScreen players={players} onSelect={setCurrentIdentity} />;
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7] text-gray-900 pb-28 font-sans selection:bg-blue-100">
      <div className="bg-white/80 backdrop-blur-xl sticky top-0 z-40 border-b border-gray-200/60 shadow-sm">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight text-gray-900">
              Takım Kadrosu
            </h1>
            <p className="text-[11px] text-gray-500 font-medium">
              Hoşgeldin,{" "}
              <span className="text-blue-600 font-bold">
                {currentIdentity.name}
              </span>
              {isAdmin && (
                <span className="ml-2 text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full text-[9px] font-bold border border-yellow-200">
                  YÖNETİCİ
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => setShowGuestInput(!showGuestInput)}
                className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 transition-colors"
                title="Misafir Ekle"
              >
                <Plus size={18} />
              </button>
            )}
            <button
              onClick={() => setCurrentIdentity(null)}
              className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors"
              title="Çıkış Yap"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
        {resetStatus && (
          <div className="bg-emerald-500 text-white text-xs font-bold text-center py-1 animate-in slide-in-from-top">
            {resetStatus}
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto p-4 md:p-5">
        {showGuestInput && (
          <div className="mb-6 bg-white p-2 rounded-[20px] shadow-sm border border-gray-100 flex gap-2 animate-in slide-in-from-top-4">
            <input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Misafir oyuncu adı..."
              className="flex-1 bg-transparent rounded-xl px-4 text-sm outline-none placeholder-gray-400"
              autoFocus
            />
            <button
              onClick={handleAddGuest}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
            >
              EKLE
            </button>
          </div>
        )}

        {bestDayStats && bestDayStats.count > 0 && (
          <div className="mb-6 bg-gradient-to-r from-gray-900 to-gray-800 rounded-[20px] p-5 text-white shadow-xl shadow-gray-900/10 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Star className="text-yellow-400 fill-yellow-400" size={16} />
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  EN UYGUN GÜN
                </span>
              </div>
              <h2 className="text-2xl font-bold">{bestDayStats.day.full}</h2>
            </div>
            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl text-center min-w-[80px]">
              <span className="block text-2xl font-bold">
                {bestDayStats.count}
              </span>
              <span className="text-[10px] text-gray-300 font-medium">
                Kişi Var
              </span>
            </div>
          </div>
        )}

        {view === "list" ? (
          <>
            <div className="flex items-center justify-between mb-3 mt-2">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                OYUNCU LİSTESİ
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {players
                .sort((a, b) => {
                  if (a.id === currentIdentity.id) return -1;
                  if (b.id === currentIdentity.id) return 1;
                  if (a.isGuest && !b.isGuest) return -1;
                  if (!a.isGuest && b.isGuest) return 1;
                  return a.name.localeCompare(b.name);
                })
                .map((player) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    isSelf={player.id === currentIdentity.id}
                    isAdmin={isAdmin}
                    currentIdentity={currentIdentity}
                    onEdit={() => openEditModal(player)}
                    onToggleDay={handleToggleDay}
                    onDelete={handleDeletePlayer}
                  />
                ))}
            </div>
          </>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-8">
            <div className="bg-white rounded-[2rem] p-6 text-center shadow-xl shadow-blue-900/5 mb-8 border border-gray-100">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                <Trophy size={28} strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-4 tracking-tight">
                Kadro Kurulumu
              </h2>
              <div className="mb-6">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                  Hangi Gün Oynanacak?
                </label>
                <div className="flex flex-wrap justify-center gap-2">
                  {DAYS.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setSelectedMatchDay(d.id)}
                      className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                        selectedMatchDay === d.id
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleGenerateTeams}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-sm tracking-wide hover:bg-blue-700 active:scale-[0.98] transition-all shadow-xl shadow-blue-500/20"
              >
                TAKIMLARI OLUŞTUR
              </button>
            </div>
            {teams && (
              <TacticalPitch
                teamA={teams.tA}
                teamB={teams.tB}
                dayName={teams.day}
              />
            )}
          </div>
        )}
      </div>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-full shadow-2xl shadow-blue-900/10 p-1.5 flex gap-1 z-50">
        <button
          onClick={() => setView("list")}
          className={`px-6 py-3 rounded-full flex items-center gap-2 transition-all duration-300 ${
            view === "list"
              ? "bg-gray-100 text-gray-900 font-bold shadow-sm"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <LayoutList size={20} strokeWidth={view === "list" ? 2.5 : 2} />
          <span className="text-xs">Liste</span>
        </button>
        <button
          onClick={() => setView("match")}
          className={`px-6 py-3 rounded-full flex items-center gap-2 transition-all duration-300 ${
            view === "match"
              ? "bg-gray-100 text-gray-900 font-bold shadow-sm"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <PlayCircle size={20} strokeWidth={view === "match" ? 2.5 : 2} />
          <span className="text-xs">Maç</span>
        </button>
      </div>

      {editingPlayer && editingStats && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-900/20 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-10 duration-300 overflow-hidden">
            <div className="p-8 pb-4">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {editingPlayer.name}
                  </h3>
                  <p className="text-gray-400 font-medium text-sm">
                    Oyuncu Güç Kartı
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingPlayer(null);
                    setEditingStats(null);
                  }}
                  className="bg-gray-100 p-2.5 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
              <div className="space-y-7 max-h-[50vh] overflow-y-auto pr-2 pb-4">
                <AppleSlider
                  label="Defans"
                  subLabel="Müdahale & Pozisyon"
                  value={editingStats.def}
                  onChange={(v) => setEditingStats({ ...editingStats, def: v })}
                />
                <AppleSlider
                  label="Fizik"
                  subLabel="İkili Mücadele & Güç"
                  value={editingStats.phy}
                  onChange={(v) => setEditingStats({ ...editingStats, phy: v })}
                />
                <AppleSlider
                  label="Hız"
                  subLabel="Koşu & Depar"
                  value={editingStats.pac}
                  onChange={(v) => setEditingStats({ ...editingStats, pac: v })}
                />
                <AppleSlider
                  label="Pas"
                  subLabel="Oyun Kurma"
                  value={editingStats.pas}
                  onChange={(v) => setEditingStats({ ...editingStats, pas: v })}
                />
                <AppleSlider
                  label="Dripling"
                  subLabel="Top Kontrolü"
                  value={editingStats.dri}
                  onChange={(v) => setEditingStats({ ...editingStats, dri: v })}
                />
                <AppleSlider
                  label="Şut"
                  subLabel="Bitiricilik"
                  value={editingStats.sho}
                  onChange={(v) => setEditingStats({ ...editingStats, sho: v })}
                />
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={handleUpdateStats}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-sm tracking-wide shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-[0.98] transition-all"
              >
                KAYDET VE GÜNCELLE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
