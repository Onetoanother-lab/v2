/**
 * Application Entry Point
 *
 * Boot sequence:
 *  1. `containerReady` awaits IDB open + schema migrations + data import
 *  2. Only after that resolves does React mount
 *
 * This guarantees no component ever calls a use case against an
 * unopened database. The container's Proxy pattern means `useCases`
 * and `repositories` imports work normally everywhere else in the app.
 *
 * The loading state is handled here at the very bottom of the stack,
 * not inside any React component — keeping the UI layer clean.
 */

import { StrictMode }       from 'react'
import { createRoot }       from 'react-dom/client'
import { App }              from './App'
import { containerReady }   from '@infrastructure/adapters/container'
import './presentation/styles/globals.css'

const rootEl = document.getElementById('root')!

// Show a minimal non-React loading state while IDB opens.
// Typically resolves in < 50 ms on a warm browser.
rootEl.innerHTML = `
  <div style="
    display: flex;
    height: 100vh;
    align-items: center;
    justify-content: center;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    color: #94a3b8;
    background: #f8fafc;
  ">
    <span>Loading…</span>
  </div>
`

containerReady
  .then(() => {
    // Database is open, use cases are wired — mount React
    rootEl.innerHTML = ''
    createRoot(rootEl).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
  .catch((err) => {
    // Unrecoverable boot failure — show a user-facing error
    console.error('[Boot] Container failed to initialize:', err)
    rootEl.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        height: 100vh;
        align-items: center;
        justify-content: center;
        gap: 12px;
        font-family: 'DM Sans', sans-serif;
        color: #334155;
        background: #f8fafc;
      ">
        <p style="font-size: 18px; font-weight: 600;">Failed to open storage</p>
        <p style="font-size: 14px; color: #64748b; max-width: 320px; text-align: center;">
          The app could not open its database. Try clearing site data or
          disabling private browsing mode.
        </p>
        <button
          onclick="window.location.reload()"
          style="
            margin-top: 8px;
            padding: 8px 20px;
            background: #22c55e;
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 14px;
            cursor: pointer;
          "
        >
          Reload
        </button>
      </div>
    `
  })

