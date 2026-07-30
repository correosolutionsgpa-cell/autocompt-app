import React, { createContext, useContext, useState, useEffect } from "react";

export interface DispatcherToast {
  text: string;
  channel: string;
  customMessage?: string;
  actionText?: string;
  onAction?: () => void;
  /** When true, the toast will NOT auto-dismiss after `toastDurationMs` — the
   *  user must close it manually via the × button in GlobalToastHost. Use
   *  this for important action prompts (e.g. the Sofi "Envoyer maintenant ?"
   *  after emitting an invoice) where the user needs enough time to react. */
  persistent?: boolean;
}

export const DEFAULT_TOAST_DURATION_MS = 4500;
const TOAST_DURATION_STORAGE_KEY = "autocompt_toast_duration_ms";

function getStoredToastDuration(): number {
  try {
    const raw = localStorage.getItem(TOAST_DURATION_STORAGE_KEY);
    const parsed = raw ? parseInt(raw, 10) : NaN;
    return isNaN(parsed) || parsed <= 0 ? DEFAULT_TOAST_DURATION_MS : parsed;
  } catch {
    return DEFAULT_TOAST_DURATION_MS;
  }
}

interface ToastContextValue {
  dispatcherSuccessToast: DispatcherToast | null;
  setDispatcherSuccessToast: React.Dispatch<React.SetStateAction<DispatcherToast | null>>;
  /** How long a non-persistent toast stays on screen, in milliseconds.
   *  Device-local preference (localStorage) — set from Paramètres. */
  toastDurationMs: number;
  setToastDurationMs: (ms: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Lives above <App /> so the toast is visible regardless of which `vista`
 * is active — App.tsx renders 37+ distinct early-return screens with no
 * shared wrapper, so component-local toast state can't reach all of them.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [dispatcherSuccessToast, setDispatcherSuccessToast] = useState<DispatcherToast | null>(null);
  const [toastDurationMs, setToastDurationMsState] = useState<number>(getStoredToastDuration);

  const setToastDurationMs = (ms: number) => {
    setToastDurationMsState(ms);
    try {
      localStorage.setItem(TOAST_DURATION_STORAGE_KEY, String(ms));
    } catch {
      // localStorage unavailable (private browsing, etc.) — keep the in-memory value only.
    }
  };

  useEffect(() => {
    // persistent toasts stay until the user clicks the × button manually.
    if (dispatcherSuccessToast && !dispatcherSuccessToast.persistent) {
      const timer = setTimeout(() => setDispatcherSuccessToast(null), toastDurationMs);
      return () => clearTimeout(timer);
    }
  }, [dispatcherSuccessToast, toastDurationMs]);

  return (
    <ToastContext.Provider value={{ dispatcherSuccessToast, setDispatcherSuccessToast, toastDurationMs, setToastDurationMs }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
