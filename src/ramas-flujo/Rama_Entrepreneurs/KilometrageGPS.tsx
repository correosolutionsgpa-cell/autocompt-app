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

import React, { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Menu,
  Navigation,
  Plus,
  Scan,
  Trash2,
} from "lucide-react";

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
  // ── États GPS (encapsulés ici — ne polluent plus App.tsx) ──────────────────
  const [activeKilometrageTab, setActiveKilometrageTab] = useState<
    "calculateur" | "gps"
  >("calculateur");
  const [kilometrageAddresses, setKilometrageAddresses] = useState<string[]>([
    "",
    "",
  ]);
  const [kilometrageComputedKm, setKilometrageComputedKm] =
    useState<number>(0);
  const [gpsLatitude, setGpsLatitude] = useState<number | null>(null);
  const [gpsLongitude, setGpsLongitude] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<string>("En attente de signal");
  const [isTrackingAuto, setIsTrackingAuto] = useState(false);

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
            <button
              onClick={() => {
                setGpsStatus("Acquisition des satellites...");
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      setGpsLatitude(position.coords.latitude);
                      setGpsLongitude(position.coords.longitude);
                      setGpsAccuracy(position.coords.accuracy);
                      setGpsStatus("Connexion Établie (Haute Précision)");
                    },
                    (error) => {
                      setGpsStatus(`Erreur GPS: ${error.message}`);
                    },
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
                  );
                } else {
                  setGpsStatus("Module non pris en charge.");
                }
              }}
              className="w-full bg-[#3B82F6] text-white font-black py-4 rounded-[28px] flex items-center justify-center space-x-3 text-[10px] uppercase italic shadow-lg active:scale-95 transition-all outline-none"
            >
              <Scan size={18} />
              <span>Me localiser (Haute Précision)</span>
            </button>

            <div
              className={`${darkMode ? "bg-slate-900/40 border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md" : "bg-white border-slate-200"} p-5 rounded-3xl border shadow-sm`}
            >
              <div className="flex items-center space-x-3 mb-2">
                <div
                  className={`w-2 h-2 rounded-full ${gpsLatitude ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(5,150,105,0.8)]" : "bg-amber-500"}`}
                />
                <p className="text-[8px] font-black uppercase italic tracking-widest text-slate-500 dark:text-zinc-500">
                  Statut Télémétrique
                </p>
              </div>
              <p className="text-xs font-black text-slate-900 dark:text-zinc-100">
                {gpsStatus}
              </p>
              {gpsLatitude && (
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-dashed border-slate-200 dark:border-zinc-800 pt-4">
                  <div>
                    <p className="text-[7px] font-black uppercase text-slate-400 tracking-widest mb-0.5">
                      Latitude
                    </p>
                    <p className="text-[10px] font-mono font-bold text-slate-800 dark:text-zinc-300 bg-slate-50 dark:bg-zinc-900 py-1.5 px-3 rounded-lg inline-block border border-slate-100 dark:border-zinc-800">
                      {gpsLatitude.toFixed(6)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[7px] font-black uppercase text-slate-400 tracking-widest mb-0.5">
                      Longitude
                    </p>
                    <p className="text-[10px] font-mono font-bold text-slate-800 dark:text-zinc-300 bg-slate-50 dark:bg-zinc-900 py-1.5 px-3 rounded-lg inline-block border border-slate-100 dark:border-zinc-800">
                      {gpsLongitude?.toFixed(6)}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[7px] font-black uppercase text-slate-400 tracking-widest mb-0.5">
                      Précision Signal
                    </p>
                    <p className="text-[10px] font-mono font-bold text-[#059669] dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 py-1.5 px-3 rounded-lg inline-block border border-emerald-100 dark:border-emerald-900">
                      ± {gpsAccuracy?.toFixed(1)} mètres
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Dual-State Auto Tracking Button */}
            <button
              onClick={() => setIsTrackingAuto(!isTrackingAuto)}
              className={`w-full p-6 rounded-[32px] border transition-all flex items-center justify-between group active:scale-95 ${isTrackingAuto
                ? darkMode
                  ? "bg-[#059669]/20 border-[#059669] text-emerald-400"
                  : "bg-emerald-50 border-emerald-200 text-[#059669]"
                : darkMode
                  ? "bg-slate-900/40 border-white/[0.08] shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md text-zinc-500"
                  : "bg-slate-900 border-slate-800 text-white"
                }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`p-3 rounded-2xl transition-colors ${isTrackingAuto
                    ? "bg-[#059669]/20 animate-pulse text-[#059669] dark:text-emerald-400"
                    : darkMode
                      ? "bg-zinc-900 text-zinc-600"
                      : "bg-white/10 text-slate-300"
                    }`}
                >
                  <Navigation size={20} />
                </div>
                <div className="text-left">
                  <p
                    className={`text-[10px] font-black uppercase italic tracking-tight ${isTrackingAuto ? "text-[#059669] dark:text-emerald-400" : ""}`}
                  >
                    {isTrackingAuto
                      ? "Routage Actif (Arrière-plan)"
                      : "Démarrer le trajet"}
                  </p>
                  <p
                    className={`text-[7px] font-black uppercase opacity-60 tracking-widest mt-0.5 ${isTrackingAuto ? "text-[#059669] dark:text-emerald-500" : ""}`}
                  >
                    {isTrackingAuto
                      ? "Synchronisation satellite courante"
                      : "Suivi cinématique automatique"}
                  </p>
                </div>
              </div>
              {isTrackingAuto && (
                <div className="w-2.5 h-2.5 bg-[#059669] rounded-full animate-ping" />
              )}
            </button>
          </div>
        )}

        {/* ── Bouton Enregistrer le trajet ──────────────────────────────────── */}
        <div className="pt-2">
          <button
            onClick={() => {
              let kmToSave = kilometrageComputedKm;
              if (activeKilometrageTab === "gps") {
                const kmStr = prompt(
                  "Distance enregistrée par le GPS pour ce trajet (km)?",
                  "10",
                );
                if (!kmStr) return;
                kmToSave = parseFloat(kmStr);
              }
              if (isNaN(kmToSave) || kmToSave <= 0) {
                alert(
                  "Distance invalide. Veuillez calculer une route ou commencer un suivi GPS valide.",
                );
                return;
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

              // 2. Injecter dans les dépenses globales
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
              };

              setDepenses((prev) => [newDepense, ...prev]);
              if (typeof playNotificationSound === "function") {
                playNotificationSound();
              }

              // Nettoyage
              setKilometrageComputedKm(0);
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
            className="w-full bg-[#059669] text-white font-black py-5 rounded-[32px] flex items-center justify-center space-x-3 text-sm uppercase italic shadow-xl active:scale-95 transition-all shadow-emerald-900/20"
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
