import { useRef, useState } from 'react'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { emitTo } from '@tauri-apps/api/event'

const inTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

// ── Shared "board" window ────────────────────────────────────────────────────
// One window that collects components as removable cards. The first pop-out
// creates it (seeded via `?board=<id>`); later pop-outs add to it via a Tauri
// event (or a BroadcastChannel on the web), so the user can gather components
// onto another monitor.
const BOARD = 'panel-board'
let browserBoard: Window | null = null

export async function sendToBoard(id: string) {
  if (inTauri) {
    const existing = await WebviewWindow.getByLabel(BOARD)
    if (existing) {
      await emitTo(BOARD, 'board:add', id)
      await existing.setFocus()
    } else {
      // alwaysOnTop keeps the board visible above the main program so it does
      // not disappear behind it while the user works.
      new WebviewWindow(BOARD, { url: `/?board=${encodeURIComponent(id)}`, title: 'Workspace board', width: 760, height: 920, resizable: true, alwaysOnTop: true })
    }
    return
  }
  // Web: a popup that accumulates via BroadcastChannel.
  const ch = new BroadcastChannel('board')
  ch.postMessage(id)
  ch.close()
  if (!browserBoard || browserBoard.closed) browserBoard = window.open(`/?board=${encodeURIComponent(id)}`, BOARD, 'popup,width=760,height=920')
  else browserBoard.focus()
}

export async function closeBoard() {
  if (inTauri) { const w = await WebviewWindow.getByLabel(BOARD); await w?.close() }
  else { browserBoard?.close(); browserBoard = null }
}

/** Open a single component in its OWN dedicated window (focus it if already
 *  open). Used by the F5 Broker Flow shortcut. */
export async function openDetachedPanel(id: string, title: string) {
  const label = `panel-${id}`
  if (inTauri) {
    const existing = await WebviewWindow.getByLabel(label)
    if (existing) { await existing.setFocus(); return }
    new WebviewWindow(label, { url: `/?detach=${id}`, title, width: 780, height: 880, resizable: true })
    return
  }
  window.open(`/?detach=${id}`, label, 'popup,width=780,height=880')
}

// ── Dock the board back into the main window ─────────────────────────────────
// The board window hands its component list to the main window (which shows it
// as an embedded grid) and then closes itself.
export async function dockBoardToMain(ids: string[]) {
  if (inTauri) {
    await emitTo('main', 'board:dock', ids)
    const w = await WebviewWindow.getByLabel(BOARD)
    await w?.close()
    return
  }
  const ch = new BroadcastChannel('board-dock')
  ch.postMessage(ids)
  ch.close()
  window.close() // this code runs inside the board popup; close it
}

/**
 * Open a detached window rendering a single panel (loaded at `/?detach=<id>`).
 * Native Tauri window in the desktop app, browser popup on the web. `onClosed`
 * fires once the window is gone (used to re-dock). Returns a closer function.
 */
export function openPanelWindow(
  id: string,
  title: string,
  onClosed: () => void,
  screenX?: number,
  screenY?: number,
): () => void {
  const label = `panel-${id}`
  if (inTauri) {
    const w = new WebviewWindow(label, {
      url: `/?detach=${id}`,
      title,
      width: 560,
      height: 640,
      x: screenX,
      y: screenY,
      resizable: true,
    })
    w.once('tauri://error', (err) => { console.error('pop-out failed', err); onClosed() })
    // Poll until the window is gone (only after confirming it opened).
    let seen = false
    const poll = setInterval(async () => {
      const exists = !!(await WebviewWindow.getByLabel(label))
      if (exists) seen = true
      else if (seen) { clearInterval(poll); onClosed() }
    }, 800)
    return () => { void WebviewWindow.getByLabel(label).then((win) => win?.close()) }
  }
  const feat = `popup,width=560,height=640${screenX != null ? `,left=${Math.round(screenX)}` : ''}${screenY != null ? `,top=${Math.round(screenY)}` : ''}`
  const popup = window.open(`/?detach=${id}`, label, feat)
  if (!popup) { onClosed(); return () => {} }
  const poll = setInterval(() => { if (popup.closed) { clearInterval(poll); onClosed() } }, 800)
  return () => popup.close()
}

/** React state for a set of detached panels + open/close helpers. */
export function useDetached() {
  const [detached, setDetached] = useState<Set<string>>(() => new Set())
  const closers = useRef<Record<string, () => void>>({})

  const popOut = (id: string, title: string, screenX?: number, screenY?: number) => {
    if (closers.current[id]) return // already open
    setDetached((prev) => new Set(prev).add(id))
    closers.current[id] = openPanelWindow(
      id,
      title,
      () => {
        delete closers.current[id]
        setDetached((prev) => { const n = new Set(prev); n.delete(id); return n })
      },
      screenX,
      screenY,
    )
  }

  const dock = (id: string) => closers.current[id]?.()

  return { detached, popOut, dock }
}
