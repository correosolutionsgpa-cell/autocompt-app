import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="relative min-h-screen">
      <App />
      <div className="pointer-events-none fixed bottom-0 w-full text-center p-3 z-[99999]">
        <p className="text-[10px] font-medium text-slate-500/80 drop-shadow-sm">© 2026 AutoCompt Solutions. Tous droits réservés.</p>
      </div>
    </div>
  </StrictMode>,
)