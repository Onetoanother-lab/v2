/**
 * Application Entry Point — Phase 2 (PWA + Gamification)
 *
 * Boot sequence:
 *  1. containerReady → IDB open + schema migrations + data import
 *  2. registerServiceWorker → SW installed, caches app shell
 *  3. React mounts with StrictMode
 *
 * The SW is registered AFTER the container is ready so that any
 * initial data migration completes before the SW takes over fetch.
 */

import { StrictMode }             from 'react'
import { createRoot }             from 'react-dom/client'
import { App }                    from './App'
import { containerReady }         from '@infrastructure/adapters/container'
import { registerServiceWorker }  from '@infrastructure/ServiceWorkerRegistration'
import './presentation/styles/globals.css'

const rootEl = document.getElementById('root')!

// Minimal loading state
rootEl.innerHTML = `
  <div style="
    display:flex;height:100vh;align-items:center;justify-content:center;
    font-family:'DM Sans',sans-serif;font-size:14px;color:#94a3b8;background:#f8fafc;
  "><span>Loading…</span></div>
`

containerReady
  .then(async () => {
    // Register SW after container init — parallel to React mount
    registerServiceWorker().catch((e) =>
      console.warn('[Boot] SW registration failed (non-fatal):', e),
    )

    rootEl.innerHTML = ''
    createRoot(rootEl).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
  .catch((err) => {
    console.error('[Boot] Container failed to initialize:', err)
    rootEl.innerHTML = `
      <div style="display:flex;flex-direction:column;height:100vh;align-items:center;justify-content:center;
        gap:12px;font-family:'DM Sans',sans-serif;color:#334155;background:#f8fafc;">
        <p style="font-size:18px;font-weight:600;">Failed to open storage</p>
        <p style="font-size:14px;color:#64748b;max-width:320px;text-align:center;">
          The app could not open its database. Try clearing site data or disabling private browsing mode.
        </p>
        <button onclick="window.location.reload()"
          style="margin-top:8px;padding:8px 20px;background:#22c55e;color:white;border:none;
          border-radius:10px;font-size:14px;cursor:pointer;">Reload</button>
      </div>
    `
  })
