# Changelog

## v2.5.0

### Graph view (Securities Terminal)
- **News prioritised** into the top row next to the chart (no longer buried at the bottom).
- **Contextual news** — selecting a symbol surfaces a "Related to <symbol>" section; searching a company (e.g. Emaar, Talabat) shows its stories first.
- **Clickable news** — opens a right-side detail overlay with source, time, sentiment, summary, full story and related symbols.
- **News All / Related toggle**, plus a cleaner news layout (sentiment dots, source + category tags, symbol chips).
- **Interactive, responsive chart** — the price chart fills the panel width, reflows on resize, and has a hover crosshair with an O/H/L/C tooltip (no more stretched candles/numbers).
- **Gap-free default layout** and panels can now be resized down to 2/12 columns.

### Markets & tabs
- **Market selector** next to the live pill: **DFM** (real-time) or **ADX** (simulated); the terminal's data and badges follow it.
- **Market-bound tabs** — DFM and ADX open by default; the **+** button opens a market picker for a new tab.

### Workspace board
- Panels sent to the board arrive **full-size** instead of tiny.
- **Single-frame** panels (no more "box inside a box") with hover drag/close controls.
- **Resizable docked board** — drag its inner edge to shrink/grow.
- Docking a second board **asks** to replace or add alongside (de-duplicated).
- **"Open in window"** now opens a real native window; **Order Placement** can dock back to main.

### Order Placement (formerly "Broker Flow")
- Renamed to **Order Placement**; opens **blank** (no client pre-loaded).
- **CIF autocomplete** over an expanded book of 12 demo clients — type a number/name to select; "Add all" when several match.
- **Browser-style client tabs** — drag to reorder, middle-click to close, smart close-focus, and **pinning** to keep key clients anchored.
- **VIP toggle** per client (manual flag) — the Quick row lists VIP clients only.
- **Market Watch show/hide** toggle; when docked it stacks on top with the CIF area below.
- Clearer wording (removed redundant "customer CIF").

### App
- **Clean custom scrollbars** app-wide (slim, rounded, theme-matched).
- **"Check for updates…"** in the user menu — checks GitHub, prompts to download, and restarts.
