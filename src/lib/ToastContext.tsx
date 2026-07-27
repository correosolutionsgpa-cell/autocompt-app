import React, { createContext, useContext, useState, useEffect } from "react";

export interface DispatcherToast {
  text: string;
  channel: string;
  customMessage?: string;
  actionText?: string;
  onAction?: () => void;
  /** When true, the toast will NOT auto-dismiss after 4.5 s — the user must
   *  close it manually via the × button in GlobalToastHost. Use this for
   *  important action prompts (e.g. the Sofi "Envoyer maintenant ?" after
   *  emitting an invoice) where the user needs enough time to react. */
  persistent?: boolean;
}

interface ToastContextValue {
  dispatcherSuccessToast: DispatcherToast | null;
  setDispatcherSuccessToast: React.Dispatch<React.SetStateAction<DispatcherToast | null>>;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Lives above <App /> so the toast is visible regardless of which `vista`
 * is active — App.tsx renders 37+ distinct early-return screens with no
 * shared wrapper, so component-local toast state can't reach all of them.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [dispatcherSuccessToast, setDispatcherSuccessToast] = useState<DispatcherToast | null>(null);

  useEffect(() => {
    // persistent toasts stay until the user clicks the × button manually.
    if (dispatcherSuccessToast && !dispatcherSuccessToast.persistent) {
      const timer = setTimeout(() => setDispatcherSuccessToast(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [dispatcherSuccessToast]);

  return (
    <ToastContext.Provider value={{ dispatcherSuccessToast, setDispatcherSuccessToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
