import { useEffect, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import BoardGrid from './components/BoardGrid'
import { dockBoardToMain } from './popout'

/**
 * A detached "board" window that hosts multiple components as a draggable,
 * resizable grid. It opens seeded with one component (`/?board=<id>`) and
 * appends more as the main window sends them (Tauri event on desktop,
 * BroadcastChannel on the web). "Dock to main" hands the whole board back to
 * the main window. The window is kept always-on-top so it stays visible.
 */

const inTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

export default function BoardWindow({ initial }: { initial: string[] }) {
  const [ids, setIds] = useState<string[]>(initial)

  useEffect(() => {
    const add = (id: string) => setIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    if (inTauri) {
      let un: (() => void) | undefined
      void listen<string>('board:add', (e) => add(e.payload)).then((f) => { un = f })
      return () => un?.()
    }
    const ch = new BroadcastChannel('board')
    ch.onmessage = (e) => add(String(e.data))
    return () => ch.close()
  }, [])

  const remove = (id: string) => setIds((prev) => prev.filter((x) => x !== id))

  return (
    <div className="min-h-screen w-screen bg-page p-3 text-content">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-content">Workspace board</span>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-content-muted">{ids.length} component{ids.length === 1 ? '' : 's'}</span>
          <button
            onClick={() => dockBoardToMain(ids)}
            disabled={ids.length === 0}
            title="Bring these components back into the main window"
            className="inline-flex items-center gap-1.5 rounded-md border border-border-dark bg-surface px-2.5 py-1 text-[11px] font-medium text-content hover:bg-[rgba(255,255,255,0.06)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 10l-5 5 5 5" /><path d="M4 15h11a5 5 0 0 0 5-5V4" /></svg>
            Dock to main
          </button>
        </div>
      </div>
      {ids.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-dark p-10 text-center text-[13px] text-content-muted">
          Board is empty. Pop a component out from the main window to add it here.
        </div>
      ) : (
        <BoardGrid ids={ids} onRemove={remove} />
      )}
    </div>
  )
}
