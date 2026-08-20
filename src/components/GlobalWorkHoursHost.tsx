import { Clock, Pause } from "lucide-react";
import { useWorkHours } from "../lib/WorkHoursContext";

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h === 0) return `${m} min`;
  return `${h} h ${String(m).padStart(2, "0")} min`;
}

/**
 * Small floating counter, visible only to accounts flagged trackWorkHours
 * (SuperAdminPanel toggle) — mounted at the document root (main.tsx) so it
 * shows regardless of which vista is active. Pauses (visually + stops
 * ticking Firestore) after a few minutes without real activity — see
 * IDLE_THRESHOLD_MS in WorkHoursContext.tsx.
 */
export function GlobalWorkHoursHost() {
  const { trackWorkHours, secondsToday, isActive } = useWorkHours();

  if (!trackWorkHours) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-[150] flex items-center gap-2 px-3.5 py-2 rounded-2xl border shadow-lg backdrop-blur-md text-[11px] font-bold transition-colors ${
        isActive
          ? "bg-emerald-600/95 border-emerald-500 text-white"
          : "bg-zinc-800/95 border-zinc-700 text-zinc-300"
      }`}
      title={isActive ? "Comptage des heures actif" : "Comptage en pause — inactivité détectée"}
    >
      {isActive ? <Clock size={13} /> : <Pause size={13} />}
      <span>{formatDuration(secondsToday)}</span>
      {!isActive && <span className="text-[9px] opacity-80">· en pause</span>}
    </div>
  );
}

export default GlobalWorkHoursHost;
