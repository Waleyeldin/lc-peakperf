import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import TradingPlatform from './trading/TradingPlatform.tsx'
import DetachedView from './trading/DetachedView.tsx'
import BoardWindow from './trading/BoardWindow.tsx'

// When packaged as the Tauri desktop program, boot straight into the
// LC…PeakPerf terminal instead of the eAccess homepage. We load the root
// (index.html always resolves in the static bundle) and redirect on the
// client, so there's no router 404. In a normal browser this is a no-op.
const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

function Home() {
  // A torn-off panel window is opened at `/?detach=<panelId>` — render just
  // that panel, full-window, instead of the homepage or terminal.
  const params = new URLSearchParams(window.location.search)
  const board = params.get('board')
  if (board) return <BoardWindow initial={board.split(',').filter(Boolean)} />
  const detach = params.get('detach')
  if (detach) return <DetachedView id={detach} />
  return isTauri ? <Navigate to="/trading?tab=lc" replace /> : <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/trading/*" element={<TradingPlatform />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
