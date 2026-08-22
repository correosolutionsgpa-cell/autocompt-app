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
import { registerSW } from 'virtual:pwa-register'

// Sans ceci, une session déjà ouverte (surtout sur mobile) continue de
// servir les fichiers de l'ancien déploiement indéfiniment — le nouveau
// Service Worker s'installe en arrière-plan mais l'onglet ouvert ne
// recharge jamais tout seul. reloadOnUpdate force le rechargement dès que
// le nouveau SW prend le contrôle, une seule fois (voir le flag ci-dessous).
let reloadedForNewVersion = false;
registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    // Vérifie s'il y a une nouvelle version à chaque retour au premier plan
    // — un mobile qui revient d'arrière-plan ne recharge pas la page seul.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') registration?.update();
    });
  },
});
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloadedForNewVersion) return;
    reloadedForNewVersion = true;
    window.location.reload();
  });
}

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