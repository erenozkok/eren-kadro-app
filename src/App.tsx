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
  Minus,
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
  Target,
  Medal,
  Crown,
  Flame,
  Shuffle,
  Award,
  TrendingUp,
  TrendingDown,
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
  wins: number;
  losses: number;
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

const calculateGeneralImpact = (
  stats: any,
  goals: number = 0,
  wins: number = 0,
  losses: number = 0
) => {
  const values = Object.values(stats || {}) as number[];
  if (values.length === 0) return 60;
  const baseAvg = values.reduce((a, b) => a + b, 0) / values.length;

  // Formül: Yetenek + (Gol * 0.1) + (Galibiyet * 0.2) - (Mağlubiyet * 0.2)
  const finalRating = baseAvg + goals * 0.1 + wins * 0.2 - losses * 0.2;
  return Math.round(Math.min(99, Math.max(40, finalRating)));
};

const calculatePositionalRatings = (
  stats: any,
  goals: number = 0,
  wins: number = 0,
  losses: number = 0
) => {
  const {
    def = 60,
    phy = 60,
    pas = 60,
    dri = 60,
    sho = 60,
    pac = 60,
  } = stats || {};
  const bonus = goals * 0.1 + wins * 0.2 - losses * 0.2;

  const defRating = def * 0.5 + phy * 0.3 + pac * 0.1 + pas * 0.1 + bonus * 0.2;
  const midRating =
    pas * 0.4 + dri * 0.3 + def * 0.15 + sho * 0.15 + bonus * 0.5;
  const fwdRating = sho * 0.5 + pac * 0.2 + dri * 0.2 + phy * 0.1 + bonus * 1.0;

  return {
    DEF: Math.round(Math.min(99, defRating)),
    ORT: Math.round(Math.min(99, midRating)),
    FOR: Math.round(Math.min(99, fwdRating)),
  };
};

const getBestPosition = (
  stats: any,
  goals: number = 0,
  wins: number = 0,
  losses: number = 0
) => {
  const ratings = calculatePositionalRatings(stats, goals, wins, losses);
  const max = Math.max(ratings.DEF, ratings.ORT, ratings.FOR);
  if (ratings.DEF === max) return { pos: "DEF", rating: ratings.DEF };
  if (ratings.FOR === max) return { pos: "FOR", rating: ratings.FOR };
  return { pos: "ORT", rating: ratings.ORT };
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

// --- 4. Alt Bileşenler (App'den önce tanımlanmalı) ---

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
  const overall = calculateGeneralImpact(p.stats, p.goals, p.wins, p.losses);
  return (
    <div className="flex flex-col items-center relative group">
      <div
        className={`w-10 h-10 md:w-12 md:h-12 rounded-full bg-white flex items-center justify-center font-black text-[9px] md:text-[10px] border-4 ${color} shadow-xl`}
      >
        {p.assignedPos || "ORT"}
      </div>
      <div className="absolute -bottom-9 bg-gray-900/90 backdrop-blur-md text-white text-[8px] md:text-[9px] font-bold px-1.5 py-1 rounded-lg whitespace-nowrap shadow-xl border border-white/10 z-20">
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
  onUpdateMatchCount,
}: {
  player: Player;
  isSelf: boolean;
  isAdmin: boolean;
  onEdit: (p: Player) => void;
  onToggleDay: (p: Player, d: string) => void;
  onDelete: (id: string) => void;
  onUpdateGoals: (p: Player, delta: number) => void;
  onUpdateMatchCount: (
    p: Player,
    type: "wins" | "losses",
    delta: number
  ) => void;
}) => {
  const { pos: bestPos, rating: bestRating } = getBestPosition(
    player.stats,
    player.goals,
    player.wins,
    player.losses
  );
  const availableDays = player.availableDays || [];
  const isAvailableAny = availableDays.length > 0;
  const canToggleDays = isSelf || isAdmin;
  const netBonus = player.goals * 0.1 + player.wins * 0.2 - player.losses * 0.2;

  return (
    <div
      className={`group relative bg-white rounded-[24px] p-0 shadow-sm border overflow-hidden transition-all ${
        isSelf ? "border-blue-200 ring-2 ring-blue-50" : "border-gray-100"
      }`}
    >
      <div
        className={`absolute left-0 top-0 bottom-0 w-1.5 ${
          isAvailableAny ? "bg-emerald-500" : "bg-gray-200"
        }`}
      />
      <div className="pl-5 pr-4 pt-5 pb-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center justify-center relative shadow-inner">
              <span className="text-xl font-black text-gray-800">
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
                <h3 className="text-lg font-bold text-gray-900 leading-tight">
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
                {netBonus !== 0 && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border ${
                      netBonus >= 0
                        ? "text-emerald-600 bg-emerald-50 border-emerald-100"
                        : "text-red-600 bg-red-50 border-red-100"
                    }`}
                  >
                    {netBonus >= 0 ? (
                      <TrendingUp size={10} />
                    ) : (
                      <TrendingDown size={10} />
                    )}{" "}
                    {netBonus.toFixed(1)} Puan
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {isSelf && (
          <div className="mt-4 flex items-center justify-between bg-orange-50/50 p-2 rounded-xl border border-orange-100">
            <span className="text-[11px] font-bold text-orange-700 ml-2">
              Attığın Goller
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onUpdateGoals(player, -1)}
                className="w-7 h-7 rounded-lg bg-white border border-orange-200 flex items-center justify-center text-orange-600 hover:bg-orange-100"
              >
                <Minus size={14} />
              </button>
              <span className="text-sm font-black text-orange-800 min-w-[20px] text-center">
                {player.goals || 0}
              </span>
              <button
                onClick={() => onUpdateGoals(player, 1)}
                className="w-7 h-7 rounded-lg bg-orange-600 text-white flex items-center justify-center shadow-sm"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="mt-2 space-y-2">
            <div className="flex items-center justify-between bg-blue-50/50 p-2 rounded-xl border border-blue-100">
              <span className="text-[11px] font-bold text-blue-700 ml-2">
                Galibiyet (W)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onUpdateMatchCount(player, "wins", -1)}
                  className="w-7 h-7 rounded-lg bg-white border border-blue-200 flex items-center justify-center text-blue-600"
                >
                  <Minus size={14} />
                </button>
                <span className="text-sm font-black text-blue-800 min-w-[20px] text-center">
                  {player.wins || 0}
                </span>
                <button
                  onClick={() => onUpdateMatchCount(player, "wins", 1)}
                  className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between bg-red-50/50 p-2 rounded-xl border border-red-100">
              <span className="text-[11px] font-bold text-red-700 ml-2">
                Mağlubiyet (L)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onUpdateMatchCount(player, "losses", -1)}
                  className="w-7 h-7 rounded-lg bg-white border border-red-200 flex items-center justify-center text-red-600"
                >
                  <Minus size={14} />
                </button>
                <span className="text-sm font-black text-red-800 min-w-[20px] text-center">
                  {player.losses || 0}
                </span>
                <button
                  onClick={() => onUpdateMatchCount(player, "losses", 1)}
                  className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center shadow-sm"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-between gap-1">
          {DAYS.map((d) => (
            <button
              key={d.id}
              onClick={() => canToggleDays && onToggleDay(player, d.id)}
              className={`flex-1 h-8 rounded-lg text-[10px] font-bold border transition-all ${
                availableDays.includes(d.id)
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <div className="mt-4 flex gap-2 pt-3 border-t border-gray-50">
          {!isSelf && (
            <button
              onClick={() => onEdit(player)}
              className="flex-1 border border-gray-200 bg-white h-8 rounded-lg text-xs font-bold text-gray-600 hover:bg-blue-50 transition-colors"
            >
              Yetenek Puanla
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
            <User size={40} strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight text-center uppercase">
            Halı Saha Pro
          </h1>
          <p className="text-gray-500 font-medium text-center">
            İsmini seç ve lige katıl.
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
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      {player.name.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
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
          calculateGeneralImpact(b.stats, b.goals, b.wins, b.losses) -
          calculateGeneralImpact(a.stats, a.goals, a.wins, a.losses)
      );
    }
  }, [players, mode]);

  return (
    <div className="animate-in fade-in pb-10">
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
            Veri girişi yapılmadı.
          </div>
        ) : (
          sortedPlayers.map((p, idx) => {
            const overall = calculateGeneralImpact(
              p.stats,
              p.goals,
              p.wins,
              p.losses
            );
            const baseAvg = Math.round(
              Object.values(p.stats || {}).reduce(
                (a: any, b: any) => a + b,
                0
              ) / 6
            );
            const bonus = (
              p.goals * 0.1 +
              p.wins * 0.2 -
              p.losses * 0.2
            ).toFixed(1);
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
                        : idx === 1
                        ? "bg-gray-400 text-white"
                        : idx === 2
                        ? "bg-orange-400 text-white"
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
                        ? `Saf: ${baseAvg} | W:${p.wins || 0} L:${
                            p.losses || 0
                          } B:${bonus}`
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
                    <span className="text-[10px] ml-1 opacity-50 uppercase">
                      {mode === "overall" ? "Ovr" : "Gol"}
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
    <div className="mt-4 relative max-w-4xl mx-auto pb-10">
      <div className="flex overflow-x-auto gap-2 mb-6 pb-2 px-2 snap-x scrollbar-hide">
        {matchData.options.map((opt, idx) => (
          <button
            key={opt.id}
            onClick={() => setSelectedOptionId(idx)}
            className={`snap-start flex-shrink-0 px-4 py-2 rounded-xl text-xs font-black border-2 transition-all ${
              selectedOptionId === idx
                ? "bg-blue-600 text-white border-blue-600 shadow-lg"
                : "bg-white text-gray-500 border-gray-200"
            }`}
          >
            VARYASYON {idx + 1}
          </button>
        ))}
      </div>
      <div className="rounded-[2.5rem] overflow-hidden bg-emerald-700 shadow-2xl relative w-full h-[650px] border-[8px] border-white/10">
        <div className="absolute inset-0 opacity-10 bg-[size:80px_80px] bg-[linear-gradient(rgba(255,255,255,0.1)_2px,transparent_2px),linear-gradient(90deg,rgba(255,255,255,0.1)_2px,transparent_2px)]"></div>
        <div className="absolute inset-4 border-2 border-white/20 rounded-[2rem] pointer-events-none"></div>
        <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-white/20 -translate-y-1/2"></div>
        <div className="absolute top-1/2 left-1/2 w-24 h-24 border-2 border-white/20 rounded-full -translate-x-1/2 -translate-y-1/2"></div>

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

// --- 5. Main Application ---

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [currentIdentity, setCurrentIdentity] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "match" | "rank">("list");
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editingStats, setEditingStats] = useState<Stats | null>(null);
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [selectedMatchDay, setSelectedMatchDay] = useState<string | null>(null);
  const [resetStatus, setResetStatus] = useState<string | null>(null);
  const [showResetMenu, setShowResetMenu] = useState(false);
  const [confirmModal, setConfirmModal] = useState<any>(null);

  const isAdmin = currentIdentity?.name === "Eren";

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdn.tailwindcss.com";
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e) {
        console.error(e);
      }
    };
    initAuth();
    onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      collection(db, "artifacts", appId, "public", "data", "players"),
      (snapshot) => {
        const data = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() } as Player)
        );
        if (data.length === 0) {
          PREDEFINED_PLAYERS.forEach((name) => {
            addDoc(
              collection(db, "artifacts", appId, "public", "data", "players"),
              {
                name,
                availableDays: [],
                isGuest: false,
                goals: 0,
                wins: 0,
                losses: 0,
                stats: { pac: 60, sho: 60, pas: 60, dri: 60, def: 60, phy: 60 },
                votes: {},
              }
            );
          });
        } else {
          setPlayers(
            data.map((p) => ({
              ...p,
              goals: p.goals || 0,
              wins: p.wins || 0,
              losses: p.losses || 0,
              votes: p.votes || {},
            }))
          );
        }
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      doc(db, "artifacts", appId, "public", "data", "match", "current"),
      (d) => {
        setMatchData(d.exists() ? (d.data() as MatchData) : null);
      }
    );
    return () => unsub();
  }, [user]);

  const bestDayStats = useMemo(() => {
    if (players.length === 0) return null;
    let counts: any = {};
    DAYS.forEach((d) => (counts[d.id] = 0));
    players.forEach((p) =>
      p.availableDays?.forEach((day: string) => {
        if (counts[day] !== undefined) counts[day]++;
      })
    );
    let maxDay: any = null;
    let maxCount = -1;
    DAYS.forEach((d) => {
      if (counts[d.id] > maxCount) {
        maxCount = counts[d.id];
        maxDay = d;
      }
    });
    return { day: maxDay as Day | null, count: maxCount };
  }, [players]);

  const onUpdateGoals = async (player: Player, delta: number) => {
    const newGoals = Math.max(0, (player.goals || 0) + delta);
    await updateDoc(
      doc(db, "artifacts", appId, "public", "data", "players", player.id),
      { goals: newGoals }
    );
  };

  const onUpdateMatchCount = async (
    player: Player,
    type: "wins" | "losses",
    delta: number
  ) => {
    const newValue = Math.max(0, (player[type] || 0) + delta);
    await updateDoc(
      doc(db, "artifacts", appId, "public", "data", "players", player.id),
      { [type]: newValue }
    );
  };

  const handleToggleDay = async (player: Player, dayId: string) => {
    const currentDays = player.availableDays || [];
    let newDays = currentDays.includes(dayId)
      ? currentDays.filter((d: string) => d !== dayId)
      : [...currentDays, dayId];
    await updateDoc(
      doc(db, "artifacts", appId, "public", "data", "players", player.id),
      { availableDays: newDays }
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
    const pSnap = await getDoc(playerRef);
    const currentVotes = pSnap.data()?.votes || {};
    currentVotes[currentIdentity.id] = editingStats;
    const statKeys: (keyof Stats)[] = [
      "def",
      "phy",
      "pac",
      "pas",
      "dri",
      "sho",
    ];
    const calculatedStats = { ...(pSnap.data()?.stats || {}) };
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
    await updateDoc(playerRef, { stats: calculatedStats, votes: currentVotes });
    setEditingPlayer(null);
    setEditingStats(null);
  };

  const handleGenerateTeams = async () => {
    const targetDay = selectedMatchDay || bestDayStats?.day?.id || "Pzt";
    const pool = players.filter((p) => p.availableDays?.includes(targetDay));
    if (pool.length < 2) return;

    const sortedPool = [...pool].sort(
      (a, b) =>
        calculateGeneralImpact(b.stats, b.goals, b.wins, b.losses) -
        calculateGeneralImpact(a.stats, a.goals, a.wins, a.losses)
    );

    const assignPos = (team: Player[]) => {
      const sorted = [...team].sort(
        (a, b) =>
          calculatePositionalRatings(b.stats, b.goals, b.wins, b.losses).DEF -
          calculatePositionalRatings(a.stats, a.goals, a.wins, a.losses).DEF
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

  const handleResetAllStats = () => {
    setConfirmModal({
      show: true,
      title: "Ligi Sıfırla",
      desc: "TÜM oyuncu verileri (güçler, goller, W/L sayıları) silinecek. Emin misin?",
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
              { stats: defaultStats, votes: {}, goals: 0, wins: 0, losses: 0 }
            )
          )
        );
        setResetStatus("Lig sıfırlandı.");
        setTimeout(() => setResetStatus(null), 2000);
        setShowResetMenu(false);
        setConfirmModal(null);
      },
    });
  };

  if (loading)
    return (
      <div className="h-screen flex flex-col items-center justify-center font-bold text-gray-400 gap-4 tracking-widest">
        <Zap size={40} className="animate-bounce" /> LİG VERİLERİ YÜKLENİYOR...
      </div>
    );
  if (!currentIdentity)
    return <IdentityScreen players={players} onSelect={setCurrentIdentity} />;

  return (
    <div className="min-h-screen bg-[#F2F2F7] text-gray-900 pb-28 font-sans relative selection:bg-blue-100">
      <div className="bg-white/80 backdrop-blur-xl sticky top-0 z-40 border-b border-gray-200/60 p-4 flex items-center justify-between shadow-sm">
        <div className="flex flex-col">
          <h1 className="text-xl font-black tracking-tight uppercase">
            Lig Paneli
          </h1>
          <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">
            {currentIdentity.name}
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <div className="relative">
              <button
                onClick={() => setShowResetMenu(!showResetMenu)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  showResetMenu
                    ? "bg-red-100 text-red-600"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                <RefreshCw size={20} />
              </button>
              {showResetMenu && (
                <div className="absolute top-12 right-0 bg-white shadow-2xl rounded-[1.5rem] p-2 z-50 w-60 border border-gray-100 flex flex-col gap-1 animate-in slide-in-from-top-2">
                  <button
                    onClick={() => {
                      setShowResetMenu(false);
                      handleResetAllStats();
                    }}
                    className="flex items-center gap-3 px-4 py-3 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <ShieldAlert size={16} /> Tüm İstatistikleri Sıfırla
                  </button>
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => setCurrentIdentity(null)}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
      {resetStatus && (
        <div className="bg-emerald-500 text-white text-xs font-bold text-center py-3 shadow-lg animate-in slide-in-from-top">
          {resetStatus}
        </div>
      )}

      <div className="max-w-2xl mx-auto p-4 md:p-6">
        {view === "list" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
            {bestDayStats && bestDayStats.count > 0 && (
              <div className="md:col-span-2 mb-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-6 text-white shadow-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1 opacity-80">
                    <Calendar size={14} />{" "}
                    <span className="text-[10px] font-bold uppercase">
                      Maç Günü Adayı
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
                    Kişi Müsait
                  </span>
                </div>
              </div>
            )}
            {players
              .sort((a, b) => (a.id === currentIdentity.id ? -1 : 1))
              .map((p) => (
                <PlayerCard
                  key={p.id}
                  player={p}
                  isSelf={p.id === currentIdentity.id}
                  isAdmin={isAdmin}
                  onEdit={(p) => {
                    setEditingPlayer(p);
                    setEditingStats(p.votes[currentIdentity.id] || p.stats);
                  }}
                  onToggleDay={handleToggleDay}
                  onDelete={() => {}}
                  onUpdateGoals={onUpdateGoals}
                  onUpdateMatchCount={onUpdateMatchCount}
                />
              ))}
          </div>
        )}

        {view === "match" && (
          <div className="animate-in fade-in">
            <div className="bg-white rounded-[2rem] p-8 text-center shadow-sm border border-gray-100 mb-8">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Trophy size={32} />
              </div>
              <h2 className="text-2xl font-black mb-4 uppercase tracking-tighter">
                Kadro Mühendisi
              </h2>
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {DAYS.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setSelectedMatchDay(d.id)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all border-2 ${
                      selectedMatchDay === d.id
                        ? "bg-gray-900 text-white border-gray-900 shadow-md scale-105"
                        : "bg-gray-50 text-gray-400 border-transparent hover:border-gray-200"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              {isAdmin && (
                <button
                  onClick={handleGenerateTeams}
                  className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-[0.98] transition-all"
                >
                  TAKIMLARI OLUŞTUR
                </button>
              )}
            </div>

            {matchData ? (
              <div className="space-y-6 pb-20">
                <TacticalPitch matchData={matchData} />
              </div>
            ) : (
              <div className="text-center py-20 opacity-20">
                <PlayCircle size={60} className="mx-auto mb-4" />
                <p className="font-bold">Henüz kadro oluşturulmadı.</p>
              </div>
            )}
          </div>
        )}

        {view === "rank" && <Leaderboard players={players} />}
      </div>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-full shadow-2xl p-1.5 flex gap-1 z-40">
        <button
          onClick={() => setView("list")}
          className={`px-6 py-3 rounded-full flex items-center gap-2 transition-all ${
            view === "list"
              ? "bg-gray-900 text-white font-bold shadow-lg"
              : "text-gray-400 hover:text-gray-600"
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
              : "text-gray-400 hover:text-gray-600"
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
          <Trophy size={20} />
          <span className="text-xs">Sıralama</span>
        </button>
      </div>

      {confirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/60 backdrop-blur-md p-6">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 text-center shadow-2xl animate-in zoom-in-95">
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
                className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold hover:bg-red-700 transition-all uppercase tracking-widest text-xs"
              >
                Evet, Onaylıyorum
              </button>
              <button
                onClick={() => setConfirmModal(null)}
                className="w-full bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-200 uppercase tracking-widest text-xs"
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}

      {editingPlayer && editingStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-gray-900">
                {editingPlayer.name}
              </h3>
              <button
                onClick={() => {
                  setEditingPlayer(null);
                  setEditingStats(null);
                }}
                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 scrollbar-hide">
              <AppleSlider
                label="Defans"
                value={editingStats.def}
                onChange={(v) => setEditingStats({ ...editingStats, def: v })}
              />
              <AppleSlider
                label="Fizik"
                value={editingStats.phy}
                onChange={(v) => setEditingStats({ ...editingStats, phy: v })}
              />
              <AppleSlider
                label="Hız"
                value={editingStats.pac}
                onChange={(v) => setEditingStats({ ...editingStats, pac: v })}
              />
              <AppleSlider
                label="Pas"
                value={editingStats.pas}
                onChange={(v) => setEditingStats({ ...editingStats, pas: v })}
              />
              <AppleSlider
                label="Dripling"
                value={editingStats.dri}
                onChange={(v) => setEditingStats({ ...editingStats, dri: v })}
              />
              <AppleSlider
                label="Şut"
                value={editingStats.sho}
                onChange={(v) => setEditingStats({ ...editingStats, sho: v })}
              />
            </div>
            <button
              onClick={handleUpdateStats}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black mt-8 shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all"
            >
              GÜNCELLE VE KAYDET
            </button>
          </div>
        </div>
      )}
      <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}
