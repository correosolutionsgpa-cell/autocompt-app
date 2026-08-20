import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { FiscalProvider } from './lib/FiscalContext.tsx'
import { ToastProvider } from './lib/ToastContext.tsx'
import { GlobalToastHost } from './components/GlobalToastHost.tsx'
import { PendingInvitesProvider } from './lib/PendingInvitesContext.tsx'
import { GlobalPendingInvitesHost } from './components/GlobalPendingInvitesHost.tsx'
import { WorkHoursProvider } from './lib/WorkHoursContext.tsx'
import { GlobalWorkHoursHost } from './components/GlobalWorkHoursHost.tsx'

// Fallback shown while a lazy-loaded screen's chunk is downloading — App.tsx's
// heaviest, least-frequently-visited views (SuperAdminPanel, per-profile
// Rama_* screens, etc.) are code-split via React.lazy() to keep the initial
// bundle smaller. One Suspense boundary here catches suspension from
// anywhere in App's tree, regardless of which of its 37+ vista early-returns
// is currently rendering — no need to wrap each one individually.
function AppLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6]">
      <div className="w-8 h-8 rounded-full border-[3px] border-emerald-200 border-t-emerald-600 animate-spin" />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <PendingInvitesProvider>
        <WorkHoursProvider>
          <FiscalProvider>
            <div className="flex flex-col min-h-screen">
              <main className="flex-grow">
                <Suspense fallback={<AppLoadingFallback />}>
                  <App />
                </Suspense>
              </main>
              <footer className="w-full text-center p-3 mt-auto">
                <p className="text-[10px] font-medium text-slate-500/80 drop-shadow-sm">© 2026 AutoCompt Solutions. Tous droits réservés.</p>
              </footer>
            </div>
          </FiscalProvider>
          <GlobalWorkHoursHost />
        </WorkHoursProvider>
        <GlobalPendingInvitesHost />
      </PendingInvitesProvider>
      <GlobalToastHost />
    </ToastProvider>
  </StrictMode>,
)