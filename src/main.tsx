import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { FiscalProvider } from './lib/FiscalContext.tsx'
import { ToastProvider } from './lib/ToastContext.tsx'
import { GlobalToastHost } from './components/GlobalToastHost.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <FiscalProvider>
        <div className="flex flex-col min-h-screen">
          <main className="flex-grow">
            <App />
          </main>
          <footer className="w-full text-center p-3 mt-auto">
            <p className="text-[10px] font-medium text-slate-500/80 drop-shadow-sm">© 2026 AutoCompt Solutions. Tous droits réservés.</p>
          </footer>
        </div>
      </FiscalProvider>
      <GlobalToastHost />
    </ToastProvider>
  </StrictMode>,
)