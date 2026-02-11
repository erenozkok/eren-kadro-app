import React, { useState, useEffect, useMemo } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  User as FirebaseUser,
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
  RefreshCw,
  Power,
  ShieldAlert,
  Zap,
  TrendingUp,
  Target,
  Medal,
  Crown,
  Flame,
  Shuffle,
} from "lucide-react";

// --- 1. Sabitler ve Ayarlar ---
interface Day {
  id: string;
  label: string;
  full: string;
}

const DAYS: Day[] = [
  { id: "Pzt", label: "Pzt", full: "Pazartesi" },
  { id: "Sal", label: "Sal", full: "Salı" },
  { id: "Çar", label: "Çar", full: "Çarşamba" },
  { id: "Per", label: "Per", full: "Perşembe" },
  { id: "Cum", label: "Cum", full: "Cuma" },
  { id: "Cmt", label: "Cmt", full: "Cumartesi" },
  { id: "Paz", label: "Paz", full: "Pazar" },
];

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

const firebaseConfig = {
  apiKey: "AIzaSyAkZU7zgEgrWlac1CaXQywAR4kQOLbMuIQ",
  authDomain: "halisaha-123.firebaseapp.com",
  projectId: "halisaha-123",
  storageBucket: "halisaha-123.firebasestorage.app",
  messagingSenderId: "247952781761",
  appId: "1:247952781761:web:ab75e61aee0885ae2a7f40",
};

const appId = "halisaha-app-v3";
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

// --- 2. Tipler ---
interface Stats {
  pac: number;
  sho: number;
  pas: number;
  dri: number;
  def: number;
  phy: number;
}

interface Player {
  id: string;
  name: string;
  isGuest: boolean;
  stats: Stats;
  votes: Record<string, Stats>;
  availableDays?: string[];
  assignedPos?: "DEF" | "ORT" | "FOR";
  goals: number;
}

interface MatchOption {
  id: number;
  tA: Player[];
  tB: Player[];
}

interface MatchData {
  day: string;
  options: MatchOption[];
  createdAt: number;
}

// --- 3. Yardımcı Fonksiyonlar ---

const calculateGeneralImpact = (stats: Stats, goals: number = 0) => {
  const values = Object.values(stats);
  const baseAvg = values.reduce((a, b) => a + b, 0) / values.length;
  // Her gol 0.2 puan ekler (5 gol = 1 tam puan)
  const finalRating = baseAvg + goals * 0.2;
  return Math.round(Math.min(99, finalRating));
};

const calculatePositionalRatings = (stats: Stats, goals: number = 0) => {
  const { def, phy, pas, dri, sho, pac } = stats;
  const goalBonus = goals * 0.2;

  const defRating =
    def * 0.5 + phy * 0.3 + pac * 0.1 + pas * 0.1 + goalBonus * 0.2;
  const midRating =
    pas * 0.4 + dri * 0.3 + def * 0.15 + sho * 0.15 + goalBonus * 0.5;
  const fwdRating =
    sho * 0.5 + pac * 0.2 + dri * 0.2 + phy * 0.1 + goalBonus * 1.0;

  return {
    DEF: Math.round(Math.min(99, defRating)),
    ORT: Math.round(Math.min(99, midRating)),
    FOR: Math.round(Math.min(99, fwdRating)),
  };
};

const getBestPosition = (stats: Stats, goals: number = 0) => {
  const ratings = calculatePositionalRatings(stats, goals);
  const max = Math.max(ratings.DEF, ratings.ORT, ratings.FOR);
  if (ratings.DEF === max) return { pos: "DEF" as const, rating: ratings.DEF };
  if (ratings.FOR === max) return { pos: "FOR" as const, rating: ratings.FOR };
  return { pos: "ORT" as const, rating: ratings.ORT };
};

const getPositionColor = (pos: string) => {
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

// --- 4. Alt Bileşenler ---

const AppleSlider = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) => (
  <div className="space-y-3">
    <div className="flex justify-between items-end">
      <span className="text-sm font-bold text-gray-700">{label}</span>
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
      className="w-full h-2 bg-gray-100 rounded-full appearance-none cursor-pointer accent-blue-600"
    />
  </div>
);

const PlayerMarker = ({ p, color }: { p: Player; color: string }) => {
  const overall = calculateGeneralImpact(p.stats, p.goals);
  return (
    <div className="flex flex-col items-center relative group">
      <div
        className={`w-10 h-10 md:w-12 md:h-12 rounded-full bg-white flex items-center justify-center font-black text-[9px] md:text-[10px] border-4 ${color} shadow-xl transform transition-transform hover:scale-110`}
      >
        {p.assignedPos || "ORT"}
      </div>
      <div className="absolute -bottom-9 bg-gray-900/90 backdrop-blur-md text-white text-[8px] md:text-[9px] font-bold px-2 py-1 rounded-lg whitespace-nowrap shadow-xl border border-white/10 z-20">
        {p.name} <span className="text-yellow-400 ml-1">{overall}</span>
      </div>
    </div>
  );
};

const PlayerCard = ({
  player,
  isSelf,
  isAdmin,
  onEdit,
  onToggleDay,
  onDelete,
  onUpdateGoals,
}: {
  player: Player;
  isSelf: boolean;
  isAdmin: boolean;
  onEdit: (p: Player) => void;
  onToggleDay: (p: Player, d: string) => void;
  onDelete: (id: string) => void;
  onUpdateGoals: (p: Player, delta: number) => void;
}) => {
  const { pos: bestPos, rating: bestRating } = getBestPosition(
    player.stats,
    player.goals
  );
  const availableDays = player.availableDays || [];
  const isAvailableAny = availableDays.length > 0;
  const canToggleDays = isSelf || isAdmin;
  const voteCount = player.votes ? Object.keys(player.votes).length : 0;
  const goalBonus = (player.goals * 0.2).toFixed(1);

  return (
    <div
      className={`group relative bg-white rounded-[24px] p-0 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_-6px_rgba(0,0,0,0.1)] transition-all duration-300 border overflow-hidden ${
        isSelf ? "border-blue-200 ring-2 ring-blue-50" : "border-gray-100"
      }`}
    >
      <div
        className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors duration-300 ${
          isAvailableAny ? "bg-emerald-500" : "bg-gray-200"
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
              <div className="mt-1 flex items-center gap-2">
                {isSelf && (
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    Sen
                  </span>
                )}
                {player.goals > 0 && (
                  <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md flex items-center gap-1 border border-orange-100">
                    <Flame size={10} className="fill-orange-500" /> +{goalBonus}{" "}
                    Puan
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {isSelf && (
          <div className="mt-4 flex items-center justify-between bg-orange-50/50 p-2 rounded-xl border border-orange-100/50">
            <span className="text-xs font-bold text-orange-700 ml-2">
              Attığın Golleri Ekle
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onUpdateGoals(player, -1)}
                className="w-8 h-8 rounded-lg bg-white border border-orange-200 flex items-center justify-center text-orange-600 hover:bg-orange-100"
              >
                <X size={14} />
              </button>
              <span className="text-sm font-black text-orange-800 min-w-[20px] text-center">
                {player.goals || 0}
              </span>
              <button
                onClick={() => onUpdateGoals(player, 1)}
                className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white shadow-lg"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        )}

        <div className="mt-4">
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
                        ? "bg-blue-600 text-white border-blue-600 shadow-md transform scale-105"
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
          {!isSelf && (
            <button
              onClick={() => onEdit(player)}
              className="flex-1 border border-gray-200 bg-white h-8 rounded-lg text-xs font-bold text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-all shadow-sm"
            >
              Güç Kartı Oyla
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => onDelete(player.id)}
              className="h-8 px-3 flex items-center justify-center bg-red-50 border border-red-100 rounded-lg text-red-500 hover:bg-red-100 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const IdentityScreen = ({
  players,
  onSelect,
}: {
  players: Player[];
  onSelect: (p: Player) => void;
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const filtered = players.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col items-center justify-center p-4 animate-in fade-in">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-white rounded-[2rem] shadow-xl flex items-center justify-center mx-auto mb-6 text-blue-600">
            <User size={40} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            Halı Saha Pro
          </h1>
          <p className="text-gray-500 font-medium">
            Lütfen ismini seçerek başla.
          </p>
        </div>

        <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <input
              type="text"
              placeholder="İsim ara..."
              className="w-full bg-white rounded-xl px-4 py-3 text-gray-900 border border-gray-200 outline-none focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="max-h-[50vh] overflow-y-auto">
            {filtered
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((player) => (
                <button
                  key={player.id}
                  onClick={() => onSelect(player)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      {player.name.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="font-bold text-gray-900">
                      {player.name}
                    </span>
                  </div>
                  <ChevronRight className="text-gray-300" size={20} />
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const TacticalPitch = ({ matchData }: { matchData: MatchData }) => {
  const [selectedOptionId, setSelectedOptionId] = useState<number>(0);
  const currentOption =
    matchData.options[selectedOptionId] || matchData.options[0];

  if (!currentOption) return null;

  const groupByPos = (team: Player[]) => {
    const groups: Record<string, Player[]> = { DEF: [], ORT: [], FOR: [] };
    team.forEach((p) => {
      const pos = p.assignedPos || "ORT";
      if (groups[pos]) groups[pos].push(p);
      else groups.ORT.push(p);
    });
    return groups;
  };

  const tAGroups = groupByPos(currentOption.tA);
  const tBGroups = groupByPos(currentOption.tB);

  return (
    <div className="mt-8 relative max-w-4xl mx-auto pb-10">
      <div className="flex overflow-x-auto gap-2 mb-6 pb-2 px-2 snap-x scrollbar-hide">
        {matchData.options.map((opt, idx) => (
          <button
            key={opt.id}
            onClick={() => setSelectedOptionId(idx)}
            className={`snap-start flex-shrink-0 px-4 py-2 rounded-xl text-xs font-black transition-all border-2 ${
              selectedOptionId === idx
                ? "bg-blue-600 text-white border-blue-600 shadow-lg"
                : "bg-white text-gray-500 border-gray-200"
            }`}
          >
            SEÇENEK {idx + 1}
          </button>
        ))}
      </div>

      <div className="rounded-[2.5rem] overflow-hidden bg-emerald-700 shadow-2xl relative w-full h-[650px] border-[8px] border-white/10">
        <div className="absolute inset-0 opacity-10 bg-[size:80px_80px] bg-[linear-gradient(rgba(255,255,255,0.1)_2px,transparent_2px),linear-gradient(90deg,rgba(255,255,255,0.1)_2px,transparent_2px)]"></div>
        <div className="absolute inset-4 border-2 border-white/20 rounded-[2rem] pointer-events-none"></div>
        <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-white/20 -translate-y-1/2"></div>

        <div className="absolute inset-0 flex flex-col z-10 py-8 justify-between">
          <div className="flex flex-col gap-10">
            <div className="flex justify-evenly px-4">
              {tAGroups.DEF.map((p) => (
                <PlayerMarker key={p.id} p={p} color="border-blue-500" />
              ))}
            </div>
            <div className="flex justify-evenly px-4">
              {tAGroups.ORT.map((p) => (
                <PlayerMarker key={p.id} p={p} color="border-blue-500" />
              ))}
            </div>
            <div className="flex justify-evenly px-4">
              {tAGroups.FOR.map((p) => (
                <PlayerMarker key={p.id} p={p} color="border-blue-500" />
              ))}
            </div>
          </div>
          <div className="flex flex-col-reverse gap-10">
            <div className="flex justify-evenly px-4">
              {tBGroups.DEF.map((p) => (
                <PlayerMarker key={p.id} p={p} color="border-orange-500" />
              ))}
            </div>
            <div className="flex justify-evenly px-4">
              {tBGroups.ORT.map((p) => (
                <PlayerMarker key={p.id} p={p} color="border-orange-500" />
              ))}
            </div>
            <div className="flex justify-evenly px-4">
              {tBGroups.FOR.map((p) => (
                <PlayerMarker key={p.id} p={p} color="border-orange-500" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Leaderboard = ({ players }: { players: Player[] }) => {
  const [mode, setMode] = useState<"goals" | "overall">("overall");

  const sortedPlayers = useMemo(() => {
    if (mode === "goals") {
      return [...players]
        .filter((p) => p.goals > 0)
        .sort((a, b) => b.goals - a.goals);
    } else {
      return [...players].sort(
        (a, b) =>
          calculateGeneralImpact(b.stats, b.goals) -
          calculateGeneralImpact(a.stats, a.goals)
      );
    }
  }, [players, mode]);

  return (
    <div className="animate-in fade-in">
      <div className="flex bg-white p-1.5 rounded-2xl border border-gray-200 mb-6 shadow-sm">
        <button
          onClick={() => setMode("overall")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            mode === "overall"
              ? "bg-gray-900 text-white shadow-lg"
              : "text-gray-500"
          }`}
        >
          <Zap size={14} /> Overall
        </button>
        <button
          onClick={() => setMode("goals")}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
            mode === "goals"
              ? "bg-orange-600 text-white shadow-lg"
              : "text-gray-500"
          }`}
        >
          <Medal size={14} /> Gol Krallığı
        </button>
      </div>

      <div className="space-y-3">
        {sortedPlayers.length === 0 ? (
          <div className="text-center py-10 text-gray-400 italic bg-white rounded-3xl border border-dashed border-gray-200">
            Veri yok.
          </div>
        ) : (
          sortedPlayers.map((p, idx) => {
            const overall = calculateGeneralImpact(p.stats, p.goals);
            const baseAvg = Math.round(
              Object.values(p.stats).reduce((a, b) => a + b, 0) / 6
            );
            const bonus = (p.goals * 0.2).toFixed(1);

            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl p-4 flex items-center justify-between border border-gray-100 shadow-sm transition-all hover:translate-x-1"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                      idx === 0
                        ? "bg-yellow-400 text-white ring-4 ring-yellow-50"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 flex items-center gap-2">
                      {p.name}
                      {idx === 0 &&
                        (mode === "goals" ? (
                          <Crown size={14} className="text-orange-500" />
                        ) : (
                          <Flame
                            size={14}
                            className="text-yellow-500"
                            fill="currentColor"
                          />
                        ))}
                    </div>
                    <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                      {mode === "overall"
                        ? `Yetenek: ${baseAvg} | Bonus: +${bonus}`
                        : `${p.goals} Gol`}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-xl font-black ${
                      mode === "overall" ? "text-blue-600" : "text-orange-600"
                    }`}
                  >
                    {mode === "overall" ? overall : p.goals}
                    <span className="text-[10px] ml-1 opacity-50">
                      {mode === "overall" ? "OVR" : "GOL"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// --- 5. Ana Uygulama ---
export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [currentIdentity, setCurrentIdentity] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "match" | "rank">("list");
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editingStats, setEditingStats] = useState<Stats | null>(null);
  const [showGuestInput, setShowGuestInput] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [selectedMatchDay, setSelectedMatchDay] = useState<string | null>(null);
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const [showResetMenu, setShowResetMenu] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    desc: string;
    action: () => void;
  } | null>(null);

  const isAdmin = currentIdentity?.name === "Eren";

  // **Tailwind Injection**
  useEffect(() => {
    if (!document.getElementById("tailwind-cdn")) {
      const script = document.createElement("script");
      script.id = "tailwind-cdn";
      script.src = "https://cdn.tailwindcss.com";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  // Auth Init
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.error(e);
      }
    };
    initAuth();
    onAuthStateChanged(auth, setUser);
  }, []);

  // Players Sync
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
      const data = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() } as Player)
      );
      if (data.length === 0) {
        PREDEFINED_PLAYERS.forEach((name) => {
          addDoc(playersRef, {
            name,
            availableDays: [],
            isGuest: false,
            goals: 0,
            stats: { pac: 60, sho: 60, pas: 60, dri: 60, def: 60, phy: 60 },
            votes: {},
          });
        });
      } else {
        setPlayers(data.map((p) => ({ ...p, goals: p.goals || 0 })));
      }
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  // Match Sync
  useEffect(() => {
    if (!user) return;
    const matchDocRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "match",
      "current"
    );
    const unsub = onSnapshot(matchDocRef, (doc) => {
      setMatchData(doc.exists() ? (doc.data() as MatchData) : null);
    });
    return () => unsub();
  }, [user]);

  // Best Day Calculation
  const bestDayStats = useMemo(() => {
    if (players.length === 0) return null;
    let counts: Record<string, number> = {};
    DAYS.forEach((d) => (counts[d.id] = 0));
    players.forEach((p) =>
      p.availableDays?.forEach((day) => {
        if (counts[day] !== undefined) counts[day]++;
      })
    );
    let maxDay = null;
    let maxCount = -1;
    DAYS.forEach((d) => {
      if (counts[d.id] > maxCount) {
        maxCount = counts[d.id];
        maxDay = d;
      }
    });
    return { day: maxDay as Day | null, count: maxCount };
  }, [players]);

  // Match day logic
  useEffect(() => {
    if (bestDayStats?.day && !selectedMatchDay) {
      setSelectedMatchDay(bestDayStats.day.id);
    }
  }, [bestDayStats, selectedMatchDay]);

  // Handlers
  const openEditModal = (player: Player) => {
    setEditingPlayer(player);
    // @ts-ignore
    const myVote = player.votes?.[currentIdentity?.id];
    setEditingStats(
      myVote || { pac: 60, sho: 60, pas: 60, dri: 60, def: 60, phy: 60 }
    );
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
      const playerData = playerSnap.data() as Player;
      const currentVotes = playerData.votes || {};
      currentVotes[currentIdentity.id] = editingStats;
      const statKeys: (keyof Stats)[] = [
        "def",
        "phy",
        "pac",
        "pas",
        "dri",
        "sho",
      ];
      const calculatedStats = { ...playerData.stats };
      statKeys.forEach((key) => {
        let sum = 0;
        let count = 0;
        Object.values(currentVotes).forEach((v: any) => {
          if (v[key] !== undefined) {
            sum += v[key];
            count++;
          }
        });
        calculatedStats[key] = count > 0 ? Math.round(sum / count) : 60;
      });
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

  const onUpdateGoals = async (player: Player, delta: number) => {
    const newGoals = Math.max(0, (player.goals || 0) + delta);
    const playerRef = doc(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "players",
      player.id
    );
    await updateDoc(playerRef, { goals: newGoals });
  };

  const handleToggleDay = async (player: Player, dayId: string) => {
    const currentDays = player.availableDays || [];
    let newDays = currentDays.includes(dayId)
      ? currentDays.filter((d) => d !== dayId)
      : [...currentDays, dayId];
    await updateDoc(
      doc(db, "artifacts", appId, "public", "data", "players", player.id),
      { availableDays: newDays }
    );
  };

  // --- RESET HANDLERS ---
  const handleResetWeek = () => {
    setConfirmModal({
      show: true,
      title: "Haftayı Sıfırla",
      desc: "Müsait durumları ve takımlar silinecek. Emin misin?",
      action: async () => {
        await Promise.all(
          players.map((p) =>
            updateDoc(
              doc(db, "artifacts", appId, "public", "data", "players", p.id),
              { availableDays: [] }
            )
          )
        );
        await deleteDoc(
          doc(db, "artifacts", appId, "public", "data", "match", "current")
        );
        setResetStatus("Hafta sıfırlandı.");
        setTimeout(() => setResetStatus(null), 2000);
        setShowResetMenu(false);
        setConfirmModal(null);
      },
    });
  };

  const handleResetGoals = () => {
    setConfirmModal({
      show: true,
      title: "Golleri Sıfırla",
      desc: "Tüm gol krallığı verileri silinecek. Emin misin?",
      action: async () => {
        await Promise.all(
          players.map((p) =>
            updateDoc(
              doc(db, "artifacts", appId, "public", "data", "players", p.id),
              { goals: 0 }
            )
          )
        );
        setResetStatus("Goller sıfırlandı.");
        setTimeout(() => setResetStatus(null), 2000);
        setShowResetMenu(false);
        setConfirmModal(null);
      },
    });
  };

  const handleResetAllStats = () => {
    setConfirmModal({
      show: true,
      title: "Tüm Overalları Sıfırla",
      desc: "BÜTÜN OYUNCULARIN güçleri 60'a dönecek ve verilmiş TÜM OYLAR silinecek. Bu işlem geri alınamaz! Emin misin?",
      action: async () => {
        const defaultStats = {
          pac: 60,
          sho: 60,
          pas: 60,
          dri: 60,
          def: 60,
          phy: 60,
        };
        await Promise.all(
          players.map((p) =>
            updateDoc(
              doc(db, "artifacts", appId, "public", "data", "players", p.id),
              {
                stats: defaultStats,
                votes: {},
              }
            )
          )
        );
        setResetStatus("Tüm istatistikler sıfırlandı.");
        setTimeout(() => setResetStatus(null), 2000);
        setShowResetMenu(false);
        setConfirmModal(null);
      },
    });
  };

  const handleGenerateTeams = async () => {
    const targetDay = selectedMatchDay || bestDayStats?.day?.id || "Pzt";
    const pool = players.filter((p) => p.availableDays?.includes(targetDay));
    if (pool.length < 2) return setResetStatus("Yetersiz oyuncu!");

    const sortedPool = [...pool].sort(
      (a, b) =>
        calculateGeneralImpact(b.stats, b.goals) -
        calculateGeneralImpact(a.stats, a.goals)
    );

    const assignPos = (team: Player[]) => {
      const sorted = [...team].sort(
        (a, b) =>
          calculatePositionalRatings(b.stats, b.goals).DEF -
          calculatePositionalRatings(a.stats, a.goals).DEF
      );
      return sorted.map((p, idx) => {
        let pos: "DEF" | "ORT" | "FOR" = "ORT";
        if (idx < team.length / 3) pos = "DEF";
        else if (idx >= team.length - team.length / 3) pos = "FOR";
        return { ...p, assignedPos: pos };
      });
    };

    const options = [0, 1, 2, 3, 4].map((i) => {
      const shuffled = [...sortedPool].sort(() => Math.random() - 0.5);
      const vA: Player[] = [];
      const vB: Player[] = [];
      shuffled.forEach((p, idx) => {
        if (idx % 2 === 0) vA.push(p);
        else vB.push(p);
      });
      return { id: i, tA: assignPos(vA), tB: assignPos(vB) };
    });

    await setDoc(
      doc(db, "artifacts", appId, "public", "data", "match", "current"),
      {
        day: DAYS.find((d) => d.id === targetDay)?.full || "",
        options,
        createdAt: Date.now(),
      }
    );
  };

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-[#F2F2F7] text-gray-400 font-bold tracking-widest animate-pulse">
        LİG VERİLERİ YÜKLENİYOR...
      </div>
    );
  if (!currentIdentity)
    return <IdentityScreen players={players} onSelect={setCurrentIdentity} />;

  return (
    <div className="min-h-screen bg-[#F2F2F7] text-gray-900 pb-28 font-sans selection:bg-blue-100 relative">
      <div className="bg-white/80 backdrop-blur-xl sticky top-0 z-40 border-b border-gray-200/60 shadow-sm">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight text-gray-900">
              Lig Paneli
            </h1>
            <p className="text-[11px] text-gray-500 font-medium">
              Selam,{" "}
              <span className="text-blue-600 font-bold">
                {currentIdentity.name}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <div className="relative">
                <button
                  onClick={() => setShowResetMenu(!showResetMenu)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                    showResetMenu
                      ? "bg-red-100 text-red-600"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  <RefreshCw size={18} />
                </button>
                {showResetMenu && (
                  <div className="absolute top-12 right-0 bg-white shadow-2xl rounded-2xl border border-gray-200 p-2 flex flex-col gap-1 z-50 w-56 animate-in slide-in-from-top-2">
                    <button
                      onClick={handleResetWeek}
                      className="flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 rounded-xl text-left transition-all"
                    >
                      <Calendar size={16} className="text-blue-500" /> Haftayı
                      Sıfırla
                    </button>
                    <button
                      onClick={handleResetGoals}
                      className="flex items-center gap-3 px-4 py-3 text-xs font-bold text-gray-700 hover:bg-gray-50 rounded-xl text-left transition-all"
                    >
                      <Target size={16} className="text-orange-500" /> Golleri
                      Sıfırla
                    </button>
                    <button
                      onClick={handleResetAllStats}
                      className="flex items-center gap-3 px-4 py-3 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl text-left border-t border-gray-50 transition-all"
                    >
                      <ShieldAlert size={16} className="text-red-500" />{" "}
                      Overalları Sıfırla
                    </button>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => setCurrentIdentity(null)}
              className="w-9 h-9 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
        {resetStatus && (
          <div className="bg-emerald-500 text-white text-xs font-bold text-center py-2 animate-in slide-in-from-top shadow-lg">
            {resetStatus}
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto p-4 md:p-5">
        {view === "list" && (
          <div className="space-y-4 animate-in fade-in">
            {bestDayStats && bestDayStats.count > 0 && (
              <div className="mb-6 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-6 text-white shadow-xl flex items-center justify-between transition-transform hover:scale-[1.01]">
                <div>
                  <div className="flex items-center gap-2 mb-1 opacity-80">
                    <Star size={14} fill="currentColor" />{" "}
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      En Çok Katılım
                    </span>
                  </div>
                  <h2 className="text-2xl font-black">
                    {bestDayStats.day?.full || "??"}
                  </h2>
                </div>
                <div className="bg-white/20 backdrop-blur-md px-5 py-3 rounded-2xl text-center border border-white/10">
                  <span className="block text-2xl font-black">
                    {bestDayStats.count}
                  </span>
                  <span className="text-[9px] font-bold uppercase opacity-80">
                    Kişi
                  </span>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {players
                .sort((a, b) =>
                  currentIdentity && a.id === currentIdentity.id ? -1 : 1
                )
                .map((p) => (
                  <PlayerCard
                    key={p.id}
                    player={p}
                    isSelf={p.id === currentIdentity?.id}
                    isAdmin={isAdmin}
                    onEdit={openEditModal}
                    onToggleDay={handleToggleDay}
                    onDelete={() => {}}
                    onUpdateGoals={onUpdateGoals}
                  />
                ))}
            </div>
          </div>
        )}

        {view === "match" && (
          <div className="animate-in fade-in">
            <div className="bg-white rounded-[2rem] p-8 text-center shadow-xl border border-gray-100 mb-8">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Trophy size={32} />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-6">
                Maç Dizilişi
              </h2>
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {DAYS.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setSelectedMatchDay(d.id)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border-2 ${
                      selectedMatchDay === d.id
                        ? "bg-gray-900 text-white border-gray-900 shadow-md"
                        : "bg-white text-gray-400 border-gray-200"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              {isAdmin && (
                <button
                  onClick={handleGenerateTeams}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-sm shadow-xl hover:bg-blue-700 active:scale-[0.98] transition-all"
                >
                  TAKIMLARI KUR / YENİLE
                </button>
              )}
            </div>
            {matchData ? (
              <TacticalPitch matchData={matchData} />
            ) : (
              <div className="text-center py-20 text-gray-400 bg-white/50 rounded-[3rem] border-2 border-dashed border-gray-200">
                <PlayCircle size={40} className="mx-auto mb-4 opacity-10" />
                <p className="text-sm font-bold">Kadro henüz oluşturulmadı.</p>
              </div>
            )}
          </div>
        )}

        {view === "rank" && <Leaderboard players={players} />}
      </div>

      {/* Navigasyon */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-xl border border-gray-200 rounded-full shadow-2xl p-1.5 flex gap-1 z-40">
        <button
          onClick={() => setView("list")}
          className={`px-6 py-3 rounded-full flex items-center gap-2 transition-all ${
            view === "list"
              ? "bg-gray-900 text-white font-bold shadow-lg"
              : "text-gray-400"
          }`}
        >
          <LayoutList size={20} />
          <span className="text-xs">Liste</span>
        </button>
        <button
          onClick={() => setView("match")}
          className={`px-6 py-3 rounded-full flex items-center gap-2 transition-all ${
            view === "match"
              ? "bg-gray-900 text-white font-bold shadow-lg"
              : "text-gray-400"
          }`}
        >
          <PlayCircle size={20} />
          <span className="text-xs">Maç</span>
        </button>
        <button
          onClick={() => setView("rank")}
          className={`px-6 py-3 rounded-full flex items-center gap-2 transition-all ${
            view === "rank"
              ? "bg-gray-900 text-white font-bold shadow-lg"
              : "text-gray-400"
          }`}
        >
          <Medal size={20} />
          <span className="text-xs">Sıralama</span>
        </button>
      </div>

      {/* Modallar */}
      {confirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-6">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldAlert size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {confirmModal.title}
            </h3>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              {confirmModal.desc}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={confirmModal.action}
                className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold text-sm shadow-xl shadow-red-500/20 hover:bg-red-700 transition-all uppercase tracking-wide"
              >
                Evet, Onaylıyorum
              </button>
              <button
                onClick={() => setConfirmModal(null)}
                className="w-full bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold text-sm transition-all hover:bg-gray-200 uppercase tracking-wide"
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}

      {editingPlayer && editingStats && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl animate-in slide-in-from-bottom-full duration-300 overflow-hidden">
            <div className="p-8 pb-4">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-black text-gray-900">
                    {editingPlayer.name}
                  </h3>
                  <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">
                    Performans Puanla
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingPlayer(null);
                    setEditingStats(null);
                  }}
                  className="bg-gray-100 p-2.5 rounded-full"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
              <div className="space-y-7 max-h-[50vh] overflow-y-auto pr-2 pb-4 scrollbar-hide">
                <AppleSlider
                  label="Defans"
                  value={editingStats.def}
                  onChange={(v) =>
                    setEditingStats({ ...editingStats!, def: v })
                  }
                />
                <AppleSlider
                  label="Fizik"
                  value={editingStats.phy}
                  onChange={(v) =>
                    setEditingStats({ ...editingStats!, phy: v })
                  }
                />
                <AppleSlider
                  label="Hız"
                  value={editingStats.pac}
                  onChange={(v) =>
                    setEditingStats({ ...editingStats!, pac: v })
                  }
                />
                <AppleSlider
                  label="Pas"
                  value={editingStats.pas}
                  onChange={(v) =>
                    setEditingStats({ ...editingStats!, pas: v })
                  }
                />
                <AppleSlider
                  label="Dripling"
                  value={editingStats.dri}
                  onChange={(v) =>
                    setEditingStats({ ...editingStats!, dri: v })
                  }
                />
                <AppleSlider
                  label="Şut"
                  value={editingStats.sho}
                  onChange={(v) =>
                    setEditingStats({ ...editingStats!, sho: v })
                  }
                />
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={handleUpdateStats}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-sm shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-[0.98] transition-all"
              >
                KAYDET VE GÜNCELLE
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}
