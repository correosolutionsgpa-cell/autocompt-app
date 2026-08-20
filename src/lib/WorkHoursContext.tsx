import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { auth } from "./firebase";
import { dataService } from "./dataService";

/** How long without mouse/keyboard/touch activity before the counter pauses.
 *  Deliberately short — this tracks real work time, not "tab left open". */
const IDLE_THRESHOLD_MS = 4 * 60 * 1000;
/** How often, while active, a tick is written to Firestore. */
const TICK_INTERVAL_MS = 60 * 1000;

interface WorkHoursContextValue {
  /** Whether this account is flagged for tracking (users/{uid}.trackWorkHours,
   *  set by App.tsx after reading the user doc — see onAuthStateChanged). */
  trackWorkHours: boolean;
  setTrackWorkHours: (v: boolean) => void;
  /** Seconds accumulated today, kept in sync with Firestore ticks. */
  secondsToday: number;
  /** False while the account has been idle past IDLE_THRESHOLD_MS — the
   *  counter stops incrementing (but doesn't reset) until activity resumes. */
  isActive: boolean;
}

const WorkHoursContext = createContext<WorkHoursContextValue | null>(null);

/**
 * Lives above <App /> for the same reason as ToastProvider/PendingInvites-
 * Provider (App.tsx's 37+ early-return vistas share no wrapper) — the
 * floating counter (GlobalWorkHoursHost) needs to render regardless of
 * which screen is active, since work happens across all of them.
 *
 * Never tied to a specific person in code — any account can be flagged via
 * SuperAdminPanel's toggle. Counts only genuine activity (mouse/keyboard/
 * touch), not just "tab open and connected" — see IDLE_THRESHOLD_MS above.
 */
export function WorkHoursProvider({ children }: { children: React.ReactNode }) {
  const [trackWorkHours, setTrackWorkHours] = useState(false);
  const [secondsToday, setSecondsToday] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const lastActivityRef = useRef(Date.now());

  // Seed today's counter once tracking turns on, so it doesn't start back at 0
  // on every page refresh.
  useEffect(() => {
    if (!trackWorkHours) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    dataService.fetchWorkHoursToday(uid).then(setSecondsToday).catch(() => {});
  }, [trackWorkHours]);

  useEffect(() => {
    if (!trackWorkHours) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const markActivity = () => { lastActivityRef.current = Date.now(); };
    const events: (keyof WindowEventMap)[] = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, markActivity, { passive: true }));

    const interval = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current > IDLE_THRESHOLD_MS;
      setIsActive(!idle);
      if (idle) return;
      const seconds = TICK_INTERVAL_MS / 1000;
      dataService.tickWorkHours(uid, seconds);
      setSecondsToday((prev) => prev + seconds);
    }, TICK_INTERVAL_MS);

    return () => {
      events.forEach((e) => window.removeEventListener(e, markActivity));
      clearInterval(interval);
    };
  }, [trackWorkHours]);

  return (
    <WorkHoursContext.Provider value={{ trackWorkHours, setTrackWorkHours, secondsToday, isActive }}>
      {children}
    </WorkHoursContext.Provider>
  );
}

export function useWorkHours(): WorkHoursContextValue {
  const ctx = useContext(WorkHoursContext);
  if (!ctx) throw new Error("useWorkHours must be used within a WorkHoursProvider");
  return ctx;
}
