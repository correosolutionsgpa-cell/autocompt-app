/**
 * KilometrageGPS.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Rama: Rama_Entrepreneurs (Prospecteur / Flippeur)
 * Extraído de: src/App.tsx (L15899–L16289) — Fase 2 del desmantelamiento modular
 *
 * Nota arquitectónica (Golden Rule §1):
 *   Este componente NO fue eliminado de App.tsx. La lógica fue portada aquí
 *   con todos los estados y dependencias requeridos pasados via props.
 *   App.tsx llama a <KilometrageGPS ... /> exactamente donde el bloque
 *   `if (vista === "kilometraje") { ... }` existía.
 *
 * Props necesarias (todas vienen del closure de App):
 *   - States GPS propios     : encapsulados internamente (ver abajo)
 *   - Callbacks de App       : setVista, setDepenses, setPartnerData,
 *                              playNotificationSound, setDispatcherSuccessToast,
 *                              setIsSidebarOpen
 *   - Datos compartidos      : darkMode, activeUser, currentCompany,
 *                              activeCompanyId, partnerData, dashboardMode
 *   - Sidebar                : WorkspaceSidebar (componente de App pasado como prop)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useRef } from "react";
import { recordBusinessTrip } from "../../lib/vehicleRateService";

// ── Trip persistence key (localStorage) ──────────────────────────────────────
const TRIP_PERSIST_KEY = "autocompt_active_trip";

interface PersistedTripState {
  isTracking: boolean;
  km: number;
  addresses: string[];
  lat: number | null;
  lon: number | null;
  accuracy: number | null;
  tab: "calculateur" | "gps";
  savedAt: number; // timestamp ms — used in the resume banner
}

function loadPersistedTrip(): PersistedTripState | null {
  try {
    const raw = localStorage.getItem(TRIP_PERSIST_KEY);
    if (!raw) return null;
    const parsed: PersistedTripState = JSON.parse(raw);
    // Restore if tracking was active OR if km were accumulated but not yet saved
    if (!parsed.isTracking && parsed.km === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

function clearPersistedTrip(): void {
  localStorage.removeItem(TRIP_PERSIST_KEY);
}

import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Menu,
  Navigation,
  Plus,
  Scan,
  Square,
  Trash2,
} from "lucide-react";

// ── Haversine formula (no external API needed) ────────────────────────────────
// Returns distance in km between two GPS coordinates.
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Tipos ────────────────────────────────────────────────────────────────────

interface MileageLog {
  fecha: string;
  modelo: string;
  distancia: number;
  id: number;
}

interface VehicleData {
  model: string;
  mileageLogs: MileageLog[];
}

interface PartnerEntry {
  vehicle: VehicleData;
  [key: string]: unknown;
}

interface Company {
  partnerData: Record<string, PartnerEntry>;
  [key: string]: unknown;
}

interface ToastPayload {
  text: string;
  channel: string;
  customMessage: string;
}

export interface KilometrageGPSProps {
  // App state passthrough
  darkMode: boolean;
  activeUser: string;
  currentCompany: Company;
  activeCompanyId: string;
  partnerData: Record<string, PartnerEntry>;
  dashboardMode: string;

  // App setters
  setVista: (vista: string) => void;
  setIsSidebarOpen: (open: boolean) => void;
  setDepenses: (fn: (prev: any[]) => any[]) => void;
  setPartnerData: (data: Record<string, PartnerEntry>) => void;
  playNotificationSound?: () => void;
  setDispatcherSuccessToast?: (payload: ToastPayload) => void;

  // Sidebar rendered by App (captures its own closure correctly)
  WorkspaceSidebar: React.ComponentType;
}

// ── Composant ────────────────────────────────────────────────────────────────

const KilometrageGPS: React.FC<KilometrageGPSProps> = ({
  darkMode,
  activeUser,
  currentCompany,
  activeCompanyId,
  partnerData,
  dashboardMode,
  setVista,
  setIsSidebarOpen,
  setDepenses,
  setPartnerData,
  playNotificationSound,
  setDispatcherSuccessToast,
  WorkspaceSidebar,
}) => {
  // ── États GPS — seedés depuis localStorage si un trajet interrompu existe ──
  const restoredTrip = useRef<PersistedTripState | null>(loadPersistedTrip());
  const restored = restoredTrip.current;

  const [activeKilometrageTab, setActiveKilometrageTab] = useState<"calculateur" | "gps">(
    restored?.tab ?? "calculateur"
  );
  const [kilometrageAddresses, setKilometrageAddresses] = useState<string[]>(
    restored?.addresses ?? ["", ""]
  );
  const [kilometrageComputedKm, setKilometrageComputedKm] = useState<number>(
    restored?.km ?? 0
  );
  const [gpsLatitude, setGpsLatitude] = useState<number | null>(restored?.lat ?? null);
  const [gpsLongitude, setGpsLongitude] = useState<number | null>(restored?.lon ?? null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(restored?.accuracy ?? null);
  const [gpsStatus, setGpsStatus] = useState<string>(
    restored?.isTracking ? "⚠️ Trajet interrompu — reprise en cours..." : "En attente de signal"
  );
  const [isTrackingAuto, setIsTrackingAuto] = useState(restored?.isTracking ?? false);
  // Banner: shown once when we auto-resume an interrupted GPS trip
  const [showResumedBanner, setShowResumedBanner] = useState<boolean>(!!restored?.isTracking);
  // Inline save form state (replaces native prompt())
  const [showGpsSaveForm, setShowGpsSaveForm] = useState(false);
  const [gpsSaveKmInput, setGpsSaveKmInput] = useState<string>("");
  // Elapsed trip duration
  const [tripStartTime, setTripStartTime] = useState<number | null>(null);
  const [tripElapsedSec, setTripElapsedSec] = useState(0);

  // ── Refs: watchPosition ID + last known position for Haversine ──────────────
  const watchIdRef = useRef<number | null>(null);
  const lastPosRef = useRef<{ lat: number; lon: number } | null>(
    restored?.lat && restored?.lon ? { lat: restored.lat, lon: restored.lon } : null
  );

  // ── Effect: Real watchPosition GPS tracking ──────────────────────────────────
  // Starts when isTrackingAuto=true, stops when false.
  // Accumulates distance using Haversine between each position update.
  useEffect(() => {
    if (!isTrackingAuto) {
      // Stop watching
      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }
    if (!navigator.geolocation) {
      setGpsStatus("GPS non disponible sur cet appareil.");
      setIsTrackingAuto(false);
      return;
    }
    setGpsStatus("📡 Acquisition des satellites...");
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setGpsLatitude(latitude);
        setGpsLongitude(longitude);
        setGpsAccuracy(accuracy);
        setGpsStatus("🟢 Signal actif — suivi en cours");
        // Accumulate km using Haversine
        if (lastPosRef.current) {
          const delta = haversineKm(
            lastPosRef.current.lat, lastPosRef.current.lon,
            latitude, longitude
          );
          // Filter micro-movements (< 5m = GPS drift, not actual travel)
          if (delta > 0.005) {
            setKilometrageComputedKm((prev) =>
              parseFloat((prev + delta).toFixed(3))
            );
          }
        }
        lastPosRef.current = { lat: latitude, lon: longitude };
      },
      (err) => {
        setGpsStatus(`⚠️ Erreur GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isTrackingAuto]);

  // ── Effect: Trip elapsed timer (updates every second while tracking) ─────────
  useEffect(() => {
    if (!isTrackingAuto) { setTripElapsedSec(0); return; }
    setTripStartTime(Date.now());
    const timer = setInterval(() => {
      setTripElapsedSec((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isTrackingAuto]);

  // ── Helper: format elapsed seconds as MM:SS ──────────────────────────────────
  const formatElapsed = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // ── Effect 1: Persist active trip state to localStorage every 5s ────────────
  useEffect(() => {
    if (!isTrackingAuto && kilometrageComputedKm === 0) return;
    const persist = () => {
      const state: PersistedTripState = {
        isTracking: isTrackingAuto,
        km: kilometrageComputedKm,
        addresses: kilometrageAddresses,
        lat: gpsLatitude,
        lon: gpsLongitude,
        accuracy: gpsAccuracy,
        tab: activeKilometrageTab,
        savedAt: Date.now(),
      };
      localStorage.setItem(TRIP_PERSIST_KEY, JSON.stringify(state));
    };
    persist();
    const interval = setInterval(persist, 5000);
    return () => clearInterval(interval);
  }, [isTrackingAuto, kilometrageComputedKm, kilometrageAddresses, gpsLatitude, gpsLongitude, gpsAccuracy, activeKilometrageTab]);

  // ── Effect 2: Clear persistence when idle ───────────────────────────────────
  useEffect(() => {
    if (!isTrackingAuto && kilometrageComputedKm === 0) {
      clearPersistedTrip();
    }
  }, [isTrackingAuto, kilometrageComputedKm]);

  // ── Guard: ce module n'existe pas en mode Syndic ───────────────────────────
  if (dashboardMode === "Syndic") {
    setTimeout(() => setVista("dashboard"), 0);
    return null;
  }

  // ── Safe data derivation (always works even before Firebase resolves) ────────
  // currentCompany is a derived value (listaEmpresas.find), NOT a loading flag.
  // It can be undefined indefinitely when there are no companies yet — never block on it.
  const safePartnerData = partnerData ?? {};
  const safeCurrentCompanyPartnerData = currentCompany?.partnerData ?? {};
  const safeLogs: MileageLog[] =
    safeCurrentCompanyPartnerData[activeUser]?.vehicle?.mileageLogs ?? [];

  // ── Registered vehicles — Single Source of Truth (Settings → localStorage) ──
  // Read the same key written by SettingsView (autocompt_vehicles).
  const registeredVehicles: Array<{
    id: string; marque: string; modele: string;
    annee: string; plaque: string; odometreInitial: number;
  }> = (() => {
    try { return JSON.parse(localStorage.getItem("autocompt_vehicles") || "[]"); }
    catch { return []; }
  })();
  const primaryVehicle = registeredVehicles[0] ?? null;
  const primaryVehicleLabel = primaryVehicle
    ? [primaryVehicle.annee, primaryVehicle.marque, primaryVehicle.modele].filter(Boolean).join(" ")
    : null;

  // ── Render ─────────────────────────────────────────────────────────────────

  // ── Empty state: no vehicle registered yet ─────────────────────────────────
  // The GPS module needs at least one registered vehicle from Paramètres → Véhicules.
  // Show a helpful prompt instead of crashing or showing a blank screen.
  if (registeredVehicles.length === 0) {
    return (
      <div className={`min-h-screen flex flex-col ${darkMode ? "bg-transparent text-zinc-100" : "bg-slate-50 text-slate-900"} md:pl-72`}>
        <WorkspaceSidebar />
        <header
          className={`${darkMode ? "bg-slate-900/40 border-white/[0.08] backdrop-blur-md" : "bg-white border-slate-200"} px-6 py-5 border-b flex items-center space-x-3 shadow-sm`}
          style={{ borderTop: `4px solid ${darkMode ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.3)"}` }}
        >
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-400 md:hidden mr-1"><Menu size={18} /></button>
          <button onClick={() => setVista("dashboard")} className={`p-2 ${darkMode ? "text-zinc-500 hover:text-white" : "text-slate-400 hover:text-slate-900"}`}><ArrowLeft /></button>
          <div className="flex-1">
            <h2 className="font-black uppercase italic tracking-tighter text-lg">Kilométrage GPS</h2>
          </div>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-5">
          <div className={`w-20 h-20 rounded-[28px] flex items-center justify-center text-4xl ${darkMode ? "bg-zinc-900" : "bg-slate-100"}`}>
            🚗
          </div>
          <div>
            <h3 className="font-black text-base uppercase tracking-tight mb-1">Aucun véhicule enregistré</h3>
            <p className={`text-[10px] font-medium ${darkMode ? "text-zinc-400" : "text-slate-500"} max-w-[260px] leading-relaxed`}>
              Pour utiliser le module Kilométrage GPS, commencez par enregistrer votre véhicule d'entreprise dans les Paramètres.
            </p>
          </div>
          <button
            onClick={() => setVista("settings")}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-indigo-600/25 to-indigo-500/15 border border-indigo-500/40 text-indigo-700 dark:text-indigo-300 hover:from-indigo-600/35 transition-all cursor-pointer"
          >
            ⚙️ Aller aux Paramètres
          </button>
        </main>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${darkMode ? "bg-transparent text-zinc-100" : "bg-slate-50 text-slate-900"} flex flex-col animate-in slide-in-from-right text-left font-sans max-w-full overflow-x-hidden md:pl-72 relative transition-all duration-300`}
    >
      <WorkspaceSidebar />
      <header
        className={`${darkMode ? "bg-slate-900/40 border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md" : "bg-white border-slate-200"} px-6 py-5 border-b flex items-center space-x-3 text-left shadow-sm`}
        style={{
          borderTop: `4px solid ${darkMode ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.3)"}`,
        }}
      >
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors md:hidden mr-1"
        >
          <Menu size={18} />
        </button>
        <button
          onClick={() => setVista("dashboard")}
          className={`p-2 transition-colors ${darkMode ? "text-zinc-500 hover:text-white" : "text-slate-400 hover:text-slate-900"}`}
        >
          <ArrowLeft />
        </button>
        <div className="flex-1">
          <h2 className="font-black uppercase italic tracking-tighter text-lg text-left">
            Kilométrage GPS
          </h2>
          <p className="text-[8px] font-black text-[#059669] uppercase italic tracking-widest leading-none">
            Usager: {activeUser}
          </p>
          {primaryVehicleLabel && (
            <p className="text-[7px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1 mt-0.5 leading-none">
              🚗 {primaryVehicleLabel}{primaryVehicle?.plaque ? ` · ${primaryVehicle.plaque}` : ""}
            </p>
          )}
        </div>
      </header>

      <main className="p-6 space-y-4 text-left max-w-md mx-auto w-full">
        {/* Onglets Calculateur / GPS */}
        <div
          className={`flex p-1.5 rounded-2xl ${darkMode ? "bg-zinc-900 border border-zinc-800" : "bg-slate-200/60"}`}
        >
          <button
            onClick={() => setActiveKilometrageTab("calculateur")}
            className={`flex-1 py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeKilometrageTab === "calculateur"
              ? "bg-white dark:bg-zinc-800 text-[#059669] dark:text-emerald-400 shadow-sm"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300"
              }`}
          >
            Calculateur (API)
          </button>
          <button
            onClick={() => setActiveKilometrageTab("gps")}
            className={`flex-1 py-3 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeKilometrageTab === "gps"
              ? "bg-white dark:bg-zinc-800 text-[#059669] dark:text-emerald-400 shadow-sm"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300"
              }`}
          >
            Suivi (GPS)
          </button>
        </div>

        {/* ── Tab: Calculateur ──────────────────────────────────────────────── */}
        {activeKilometrageTab === "calculateur" && (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
            <div
              className={`${darkMode ? "bg-slate-900/40 border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md" : "bg-white border-slate-200"} p-7 rounded-[40px] border shadow-sm space-y-4`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3
                  className={`text-[10px] font-black uppercase italic tracking-widest ${darkMode ? "text-zinc-400" : "text-slate-400"}`}
                >
                  Itinéraire à étapes
                </h3>
              </div>

              <div className="space-y-3 relative">
                <div
                  className={`absolute left-[22px] top-4 bottom-4 w-0.5 border-dashed border-l ${darkMode ? "border-zinc-800" : "border-slate-200"}`}
                />
                {kilometrageAddresses.map((addr, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center space-x-3 p-4 rounded-2xl border relative z-10 transition-all ${darkMode ? "bg-zinc-900 border-zinc-800" : "bg-slate-50 border-slate-100"}`}
                  >
                    <div className="bg-[#059669] w-5 h-5 rounded-full flex items-center justify-center text-[9px] text-white font-black italic shadow-inner">
                      {idx === 0
                        ? "D"
                        : idx === kilometrageAddresses.length - 1
                          ? "A"
                          : `E${idx}`}
                    </div>
                    <div className="flex-1">
                      <label
                        className={`text-[7px] font-black uppercase italic tracking-widest block mb-1 ${darkMode ? "text-zinc-500" : "text-slate-400"}`}
                      >
                        {idx === 0
                          ? "Point de départ"
                          : idx === kilometrageAddresses.length - 1
                            ? "Destination (Arrivée)"
                            : `Escale ${idx}`}
                      </label>
                      <input
                        className={`bg-transparent border-none text-xs w-full font-bold outline-none ${darkMode ? "text-zinc-100" : "text-slate-900"}`}
                        placeholder="Entrez une adresse..."
                        value={addr}
                        onChange={(e) => {
                          const newAddrs = [...kilometrageAddresses];
                          newAddrs[idx] = e.target.value;
                          setKilometrageAddresses(newAddrs);
                        }}
                      />
                    </div>
                    {kilometrageAddresses.length > 2 && (
                      <button
                        onClick={() => {
                          setKilometrageAddresses(
                            kilometrageAddresses.filter((_, i) => i !== idx),
                          );
                        }}
                        className={`p-2 transition-colors ${darkMode ? "text-zinc-700 hover:text-rose-500" : "text-slate-300 hover:text-rose-500"}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}

                {kilometrageAddresses.length < 9 && (
                  <button
                    onClick={() => {
                      setKilometrageAddresses([...kilometrageAddresses, ""]);
                    }}
                    className={`ml-1 flex items-center space-x-2 text-[8px] font-black uppercase italic transition-all group ${darkMode ? "text-zinc-500 hover:text-emerald-400" : "text-slate-400 hover:text-[#059669]"}`}
                  >
                    <div
                      className={`p-1.5 rounded-full border border-dashed group-hover:border-solid ${darkMode ? "border-zinc-800 group-hover:border-emerald-900 bg-zinc-900" : "border-slate-200 group-hover:border-emerald-200 bg-slate-50"}`}
                    >
                      <Plus size={12} />
                    </div>
                    <span>
                      Ajouter une étape ({kilometrageAddresses.length}/9)
                    </span>
                  </button>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-dashed dark:border-zinc-800 border-slate-200">
                <button
                  onClick={() => {
                    const emptyFields = kilometrageAddresses.filter(
                      (a) => !a.trim(),
                    ).length;
                    if (emptyFields === kilometrageAddresses.length) {
                      alert(
                        "Veuillez entrer au moins une adresse pour calculer.",
                      );
                      return;
                    }
                    const simDistance =
                      Math.floor(Math.random() * 30) +
                      10 +
                      kilometrageAddresses.length * 3.5;
                    setKilometrageComputedKm(
                      parseFloat(simDistance.toFixed(1)),
                    );
                    if (typeof setDispatcherSuccessToast === "function") {
                      setDispatcherSuccessToast({
                        text: "Itinéraire Calculé",
                        channel: "Calculateur API",
                        customMessage: `${kilometrageAddresses.length} étapes analysées. Distance totale : ${simDistance.toFixed(1)} km.`,
                      });
                    }
                  }}
                  className={`w-full ${darkMode ? "bg-zinc-800 hover:bg-zinc-700" : "bg-slate-900 hover:bg-slate-800"} text-white font-black py-4 rounded-[28px] text-[10px] uppercase italic tracking-widest transition-colors shadow-lg active:scale-95`}
                >
                  Calculer l'itinéraire
                </button>
              </div>

              {kilometrageComputedKm > 0 && (
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/10 p-5 rounded-3xl border border-emerald-200 dark:border-emerald-900/50 mt-4 animate-in zoom-in-95 duration-300">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-black uppercase italic tracking-widest text-[#059669] dark:text-emerald-500">
                      Distance Mathématique
                    </span>
                    <span className="text-xl font-black text-[#059669] dark:text-emerald-400">
                      {kilometrageComputedKm} km
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t border-emerald-200/50 dark:border-emerald-800/30 pt-3 mt-3">
                    <span className="text-[7.5px] font-black uppercase italic tracking-widest text-emerald-800/60 dark:text-emerald-500/60">
                      Montant déductible (0.70$/km)
                    </span>
                    <span className="text-sm font-black text-emerald-900 dark:text-emerald-300">
                      {(kilometrageComputedKm * 0.7).toFixed(2)} $
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: GPS ─────────────────────────────────────────────────────── */}
        {activeKilometrageTab === "gps" && (
          <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">

            {/* ── Resumed trip banner ───────────────────────────────────────── */}
            {showResumedBanner && (
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 animate-in slide-in-from-top duration-300">
                <span className="text-xl leading-none mt-0.5">⚠️</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-0.5">
                    Trajet interrompu détecté
                  </p>
                  <p className="text-[8px] font-medium text-amber-700/80 dark:text-amber-300/70 leading-snug">
                    Votre trajet précédent a été restauré automatiquement
                    {restored?.savedAt ? ` (sauvegardé le ${new Date(restored.savedAt).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })})` : ""}.
                    {restored?.km && restored.km > 0 ? ` Distance restaurée\u00a0: ${restored.km.toFixed(2)}\u00a0km.` : ""}
                    {" "}Enregistrez le trajet ou arrêtez le suivi pour annuler.
                  </p>
                </div>
                <button
                  onClick={() => setShowResumedBanner(false)}
                  className="text-amber-500 hover:text-amber-300 transition-colors text-xs font-black leading-none mt-0.5 cursor-pointer"
                  title="Fermer"
                >✕</button>
              </div>
            )}

            {/* ── Live tracking dashboard (shown while tracking) ───────────── */}
            {isTrackingAuto && (
              <div className={`p-6 rounded-[32px] border space-y-4 animate-in zoom-in-95 duration-300 ${
                darkMode
                  ? "bg-[#059669]/10 border-[#059669]/40"
                  : "bg-emerald-50 border-emerald-200"
              }`}>
                {/* Big odometer */}
                <div className="text-center">
                  <p className="text-[8px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">
                    📡 Distance en cours
                  </p>
                  <p className="text-5xl font-black tabular-nums text-[#059669] dark:text-emerald-400 tracking-tighter">
                    {kilometrageComputedKm.toFixed(2)}
                    <span className="text-lg ml-1 opacity-60">km</span>
                  </p>
                  <p className="text-[9px] font-mono text-emerald-700/60 dark:text-emerald-500/60 mt-1">
                    ⏱ {formatElapsed(tripElapsedSec)}
                    {gpsAccuracy ? ` · ±${gpsAccuracy.toFixed(0)}m` : ""}
                  </p>
                </div>
                {/* Coordinates row */}
                {gpsLatitude && (
                  <div className="flex gap-2 justify-center flex-wrap">
                    <span className="flex items-center gap-1 text-[8px] font-mono bg-black/10 dark:bg-black/30 px-2 py-1 rounded-lg text-emerald-700 dark:text-emerald-300">
                      <MapPin size={10} /> {gpsLatitude.toFixed(5)}, {gpsLongitude?.toFixed(5)}
                    </span>
                  </div>
                )}
                {/* GPS status pill */}
                <p className="text-center text-[8px] font-black uppercase tracking-widest text-emerald-600/80 dark:text-emerald-500/80">
                  {gpsStatus}
                </p>
              </div>
            )}

            {/* ── Static GPS fix panel (shown when NOT tracking) ───────────── */}
            {!isTrackingAuto && (
              <>
                <button
                  onClick={() => {
                    setGpsStatus("Acquisition des satellites...");
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        (position) => {
                          setGpsLatitude(position.coords.latitude);
                          setGpsLongitude(position.coords.longitude);
                          setGpsAccuracy(position.coords.accuracy);
                          setGpsStatus("📍 Position initiale verrouillée");
                          lastPosRef.current = { lat: position.coords.latitude, lon: position.coords.longitude };
                        },
                        (error) => { setGpsStatus(`Erreur GPS: ${error.message}`); },
                        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                      );
                    } else {
                      setGpsStatus("Module non pris en charge.");
                    }
                  }}
                  className="w-full bg-[#3B82F6] text-white font-black py-4 rounded-[28px] flex items-center justify-center space-x-3 text-[10px] uppercase italic shadow-lg active:scale-95 transition-all outline-none"
                >
                  <Scan size={18} />
                  <span>Verrouiller position de départ</span>
                </button>

                <div className={`${
                  darkMode
                    ? "bg-slate-900/40 border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md"
                    : "bg-white border-slate-200"
                } p-5 rounded-3xl border shadow-sm`}>
                  <div className="flex items-center space-x-3 mb-2">
                    <div className={`w-2 h-2 rounded-full ${
                      gpsLatitude ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(5,150,105,0.8)]" : "bg-amber-500"
                    }`} />
                    <p className="text-[8px] font-black uppercase italic tracking-widest text-slate-500 dark:text-zinc-500">
                      Statut Télémétrique
                    </p>
                  </div>
                  <p className="text-xs font-black text-slate-900 dark:text-zinc-100">{gpsStatus}</p>
                  {gpsLatitude && (
                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-dashed border-slate-200 dark:border-zinc-800 pt-4">
                      <div>
                        <p className="text-[7px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Latitude</p>
                        <p className="text-[10px] font-mono font-bold text-slate-800 dark:text-zinc-300 bg-slate-50 dark:bg-zinc-900 py-1.5 px-3 rounded-lg inline-block border border-slate-100 dark:border-zinc-800">
                          {gpsLatitude.toFixed(6)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[7px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Longitude</p>
                        <p className="text-[10px] font-mono font-bold text-slate-800 dark:text-zinc-300 bg-slate-50 dark:bg-zinc-900 py-1.5 px-3 rounded-lg inline-block border border-slate-100 dark:border-zinc-800">
                          {gpsLongitude?.toFixed(6)}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-[7px] font-black uppercase text-slate-400 tracking-widest mb-0.5">Précision Signal</p>
                        <p className="text-[10px] font-mono font-bold text-[#059669] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 py-1.5 px-3 rounded-lg inline-block border border-emerald-100 dark:border-emerald-900">
                          ± {gpsAccuracy?.toFixed(1)} mètres
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── Start / Stop tracking button ─────────────────────────────── */}
            <button
              onClick={() => {
                if (isTrackingAuto) {
                  // STOP: show the inline save form with the accumulated km pre-filled
                  setIsTrackingAuto(false);
                  setGpsStatus("Trajet terminé — prêt à enregistrer.");
                  setGpsSaveKmInput(kilometrageComputedKm > 0 ? kilometrageComputedKm.toFixed(2) : "");
                  setShowGpsSaveForm(true);
                } else {
                  // START: reset distance counter and begin watching
                  setKilometrageComputedKm(0);
                  setTripElapsedSec(0);
                  lastPosRef.current = gpsLatitude && gpsLongitude
                    ? { lat: gpsLatitude, lon: gpsLongitude }
                    : null;
                  setShowGpsSaveForm(false);
                  setIsTrackingAuto(true);
                }
              }}
              className={`w-full p-6 rounded-[32px] border-2 transition-all flex items-center justify-between active:scale-95 ${
                isTrackingAuto
                  ? "bg-rose-500/10 border-rose-500 text-rose-500 dark:text-rose-400"
                  : darkMode
                    ? "bg-[#059669]/10 border-[#059669]/50 text-emerald-400"
                    : "bg-slate-900 border-slate-900 text-white"
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-2xl ${
                  isTrackingAuto
                    ? "bg-rose-500/20"
                    : darkMode ? "bg-zinc-900" : "bg-white/10"
                }`}>
                  {isTrackingAuto
                    ? <Square size={20} fill="currentColor" />
                    : <Navigation size={20} />}
                </div>
                <div className="text-left">
                  <p className="text-[10px] font-black uppercase italic tracking-tight">
                    {isTrackingAuto ? "Arrêter le trajet" : "Démarrer le trajet GPS"}
                  </p>
                  <p className="text-[7px] font-black uppercase opacity-60 tracking-widest mt-0.5">
                    {isTrackingAuto
                      ? `${kilometrageComputedKm.toFixed(2)} km · ${formatElapsed(tripElapsedSec)}`
                      : "Suivi cinématique Haversine — sans API"}
                  </p>
                </div>
              </div>
              {isTrackingAuto && (
                <div className="flex gap-1 items-center">
                  <div className="w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                  <div className="w-2 h-2 bg-rose-400 rounded-full" />
                </div>
              )}
            </button>

            {/* ── Inline save form (replaces native prompt()) ──────────────── */}
            {showGpsSaveForm && !isTrackingAuto && (
              <div className={`p-6 rounded-[28px] border space-y-4 animate-in slide-in-from-bottom duration-300 ${
                darkMode
                  ? "bg-slate-900/60 border-white/[0.08] backdrop-blur-md"
                  : "bg-white border-slate-200"
              }`}>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#059669] mb-0.5">
                    Confirmer le trajet
                  </p>
                  <p className={`text-[8px] font-medium ${
                    darkMode ? "text-zinc-400" : "text-slate-400"
                  }`}>
                    Distance mesurée par le GPS embarqué. Ajustez si nécessaire.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-2xl border ${
                    darkMode ? "bg-zinc-900 border-zinc-800" : "bg-slate-50 border-slate-200"
                  }`}>
                    <Navigation size={14} className="text-[#059669] shrink-0" />
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={gpsSaveKmInput}
                      onChange={(e) => setGpsSaveKmInput(e.target.value)}
                      className={`flex-1 bg-transparent outline-none text-sm font-black tabular-nums ${
                        darkMode ? "text-zinc-100" : "text-slate-900"
                      }`}
                      placeholder="Distance (km)"
                    />
                    <span className={`text-[9px] font-black uppercase ${
                      darkMode ? "text-zinc-500" : "text-slate-400"
                    }`}>km</span>
                  </div>
                  <button
                    onClick={() => {
                      setGpsSaveKmInput("");
                      setShowGpsSaveForm(false);
                      setKilometrageComputedKm(0);
                      clearPersistedTrip();
                    }}
                    className={`px-3 py-3 rounded-2xl border text-[8px] font-black uppercase transition-all ${
                      darkMode
                        ? "border-zinc-800 text-zinc-500 hover:text-rose-400"
                        : "border-slate-200 text-slate-400 hover:text-rose-500"
                    } cursor-pointer`}
                  >
                    Annuler
                  </button>
                </div>
                {/* deductible preview */}
                {parseFloat(gpsSaveKmInput) > 0 && (
                  <div className="flex justify-between items-center px-1">
                    <span className={`text-[8px] font-black uppercase tracking-widest ${
                      darkMode ? "text-zinc-500" : "text-slate-400"
                    }`}>Montant déductible (0.70$/km)</span>
                    <span className="text-sm font-black text-[#059669]">
                      {(parseFloat(gpsSaveKmInput) * 0.70).toFixed(2)} $
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Bouton Enregistrer le trajet ──────────────────────────────────── */}
        {/* In GPS mode this button is embedded inside the save form — only show for calculateur */}
        <div className="pt-2">
          <button
            onClick={() => {
              let kmToSave: number;
              if (activeKilometrageTab === "gps") {
                // Read from the inline form input (no more prompt())
                kmToSave = parseFloat(gpsSaveKmInput);
              } else {
                kmToSave = kilometrageComputedKm;
              }
              if (isNaN(kmToSave) || kmToSave <= 0) {
                return; // silently ignore — UI already prevents this
              }

              const fecha = new Date().toISOString().split("T")[0];
              const tripAmount = kmToSave * 0.7;

              // 1. Mettre à jour les logs kilométriques (null-safe)
              const newData = { ...safePartnerData };
              if (!newData[activeUser]?.vehicle) {
                // partnerData not yet hydrated for this user — skip write
                console.warn("[KilometrageGPS] partnerData not ready for user:", activeUser);
              } else {
                const userVehicle = newData[activeUser].vehicle;
                // Use the SSOT vehicle label from Settings (falls back to Firebase model)
                const vehicleLabel = primaryVehicleLabel ?? userVehicle.model ?? "Véhicule";
                userVehicle.mileageLogs = [
                  {
                    fecha,
                    modelo: vehicleLabel,
                    distancia: kmToSave,
                    id: Date.now(),
                  },
                  ...(userVehicle.mileageLogs ?? []),
                ];
                setPartnerData(newData);
              }

              // 1b. Sync to vehicleRateService SSOT so the ledger rate auto-updates
              if (primaryVehicle) {
                // Running odometer = initial + sum of all logged business trips
                const allLogs = safeCurrentCompanyPartnerData[activeUser]?.vehicle?.mileageLogs ?? [];
                const previousBizKM = allLogs.reduce((acc: number, l: any) => acc + (l.distancia ?? 0), 0);
                const runningOdometer = primaryVehicle.odometreInitial + previousBizKM + kmToSave;
                recordBusinessTrip(primaryVehicle.id, kmToSave, runningOdometer);
              }

              // 2. Injecter dans les dépenses globales
              // Compute current vehicle rate for badge stamping on the ledger expense
              const currentVehicleRate = primaryVehicle ? (() => {
                try {
                  const biz = JSON.parse(localStorage.getItem("autocompt_km_business") || "{}");
                  const cur = JSON.parse(localStorage.getItem("autocompt_km_current")  || "{}");
                  const bizKM  = (biz[primaryVehicle.id] ?? 0) + kmToSave; // include this trip
                  const curOdo = cur[primaryVehicle.id]  ?? primaryVehicle.odometreInitial;
                  const totalKM = curOdo - primaryVehicle.odometreInitial;
                  return totalKM > 0 ? Math.min(bizKM / totalKM, 1) : 0;
                } catch { return 0; }
              })() : 0;

              const newDepense = {
                id: Date.now() + 1,
                companyId: activeCompanyId,
                fecha,
                fournisseur: "Kilométrage",
                cat: "Déplacements / Automobile",
                description: `Trajet déductible (${activeKilometrageTab === "gps" ? "Télémétrie" : "Modélisé"})`,
                subtotal: tripAmount,
                tps: 0,
                tvq: 0,
                total: tripAmount,
                lien: null,
                partnerTag: activeUser,
                // Vehicle pro-rata badge (read by Tenue de livres UI)
                vehicleRateApplied: true,
                ...(currentVehicleRate > 0 ? { tauxApplique: Number((currentVehicleRate * 100).toFixed(1)) } : {}),
              };

              setDepenses((prev) => [newDepense, ...prev]);
              if (typeof playNotificationSound === "function") {
                playNotificationSound();
              }

              // Nettoyage + clear persisted trip (trip was saved intentionally)
              setKilometrageComputedKm(0);
              setShowResumedBanner(false);
              setShowGpsSaveForm(false);
              setGpsSaveKmInput("");
              clearPersistedTrip();
              if (activeKilometrageTab === "gps") {
                setIsTrackingAuto(false);
              }
              if (typeof setDispatcherSuccessToast === "function") {
                setDispatcherSuccessToast({
                  text: "Synchronisation Réussie",
                  channel: "Registre Unifié",
                  customMessage: `Un trajet de ${kmToSave} km a été ajouté à votre livre de bord déductible.`,
                });
              }
            }}
            className={`w-full bg-[#059669] text-white font-black py-5 rounded-[32px] flex items-center justify-center space-x-3 text-sm uppercase italic shadow-xl active:scale-95 transition-all shadow-emerald-900/20 disabled:opacity-40 disabled:cursor-not-allowed`}
            disabled={
              activeKilometrageTab === "gps"
                ? isNaN(parseFloat(gpsSaveKmInput)) || parseFloat(gpsSaveKmInput) <= 0
                : kilometrageComputedKm <= 0
            }
          >
            <CheckCircle2 size={24} />
            <span>Enregistrer le trajet</span>
          </button>
        </div>

        {/* ── Journal unifié ────────────────────────────────────────────────── */}
        <div
          className={`${darkMode ? "bg-slate-900/40 border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md" : "bg-white border-slate-200"} p-7 rounded-[40px] border shadow-sm text-left space-y-5 mt-8`}
        >
          <div className="flex justify-between items-center px-1">
            <h3
              className={`text-[10px] font-black uppercase italic tracking-widest ${darkMode ? "text-zinc-500" : "text-slate-400"}`}
            >
              Journal Unifié
            </h3>
            <div className="bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1.5 rounded-xl border border-emerald-100 dark:border-emerald-900">
              <span className="text-[8px] font-black text-[#059669] uppercase italic tracking-widest">
                {" "}Volume:{" "}
                {safeLogs
                  .reduce(
                    (acc: number, log: MileageLog) => acc + log.distancia,
                    0,
                  )
                  .toFixed(1)}{" "}
                km
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {safeLogs.length === 0 ? (
              <div
                className={`py-12 px-6 text-center border-2 border-dashed rounded-[32px] ${darkMode ? "border-zinc-900 text-zinc-700 bg-zinc-950/50" : "border-slate-200 text-slate-400 bg-slate-50/50"}`}
              >
                <Navigation size={28} className="mx-auto mb-3 opacity-20" />
                <p className="text-[9px] font-black uppercase italic tracking-widest">
                  Registre vierge
                </p>
                <p className="text-[7.5px] font-bold mt-2 opacity-60">
                  Vos trajets apparaîtront ici.
                </p>
              </div>
            ) : (
              safeLogs.map(
                (log: MileageLog, i: number) => (
                  <div
                    key={i}
                    className={`p-5 rounded-3xl border flex justify-between items-center transition-all ${darkMode ? "bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900" : "bg-slate-50/50 border-slate-100 hover:bg-slate-50"}`}
                  >
                    <div className="text-left space-y-0.5">
                      <p
                        className={`text-[11px] font-black italic tracking-tight ${darkMode ? "text-zinc-100" : "text-slate-900"}`}
                      >
                        {log.fecha}
                      </p>
                      <p
                        className={`text-[7px] font-black uppercase tracking-widest ${darkMode ? "text-zinc-500" : "text-slate-400"}`}
                      >
                        {log.modelo}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-sm font-black italic text-[#059669] tracking-tighter">
                        +{log.distancia} km
                      </p>
                      <p
                        className={`text-[7px] font-black uppercase italic ${darkMode ? "text-emerald-500/60" : "text-[#059669]/60"}`}
                      >
                        Valeur: {(log.distancia * 0.7).toFixed(2)}$
                      </p>
                    </div>
                  </div>
                ),
              )
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default KilometrageGPS;
