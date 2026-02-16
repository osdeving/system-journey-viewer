# UI Journeys and Capabilities (Current State)

Quick operational reference for what the UI currently supports.

## 1) Screen Map

- Topbar:
  - primary controls (`Back`, tools, zoom, grid/snap/theme, presentation)
  - export controls (`SVG`, `PNG`, `PDF`, animated `GIF`, `MP4`, animated `SVG`)
- Left sidebar (`Palette`):
  - node presets by category (drag and drop to canvas)
- Center (`Canvas`):
  - visual editing, edge manipulation, playback rendering
- Right dock (`Inspector` / `Journeys` tabs):
  - editable properties and journey management
- Bottom workbench drawer:
  - `Journey Timeline` and `JourneyScript` tabs

## 2) Primary User Flow

1. Build structure
- Drag presets from `Palette` into the canvas.
- Use `Select` to move and resize nodes.
- Edit name, technology, and color in `Inspector`.

2. Create communications (edges)
- Switch to `Connector`.
- Connect handles from source to target.
- Edit label and protocol in `Inspector`.

3. Create and assemble journeys
- Open `Journeys` and create a journey.
- With a journey active, select edges and use `Add to Active Journey`.
- Filter to render a specific journey.

4. Play journey animation
- Select a journey in player controls.
- Use `Previous`, `Play/Pause`, `Next`, and `Reset`.
- Tune `Loop`, `Speed`, and visual options.

5. Drill down across levels
- Double-click a node with drill-down reference.
- Use `Back` to return.

6. Export
- Export static formats (`SVG`, `PNG`, `PDF`) or animated formats (`GIF`, `MP4`, animated `SVG`).

## 3) Supported Capabilities

- Visual editing:
  - drag/drop node creation
  - move, resize, multi-select, group drag
  - pan/zoom
  - optional grid and snap
- Connections:
  - handle-to-handle connection (connector mode)
  - edge re-targeting from endpoints
  - edge label/protocol editing
- Journeys:
  - create journeys
  - add/remove edges from journeys
  - reorder journeys in side panel
  - journey filter and autoplay on selection
- Player:
  - previous/play-pause/next/reset
  - loop and speed controls
  - node highlight and flow effects
  - optional trail toggle (orb-only mode)
- Drill-down:
  - Container -> Component -> Hex navigation
- DSL:
  - full workspace export to DSL LITE
  - import DSL LITE into full workspace
  - optional Codex assistance via gateway
  - Monaco syntax highlighting for `JourneyScript`
- Persistence:
  - save/reload and debounced local autosave
- Presentation mode:
  - clean render mode for demos (no edit handles/grid)
  - focused controls for player and animation export

## 4) Current Limits

- No dedicated edge-delete command from the UI.
  - Edge removal currently happens through node deletion or journey-step removal.
- No complete journey administration yet (rename/delete in all flows).
- No undo/redo stack exposed in UI.
- No copy/paste workflow for selected nodes.
- Connector mode is handle-based; body-click connecting is not supported.

## 5) Important Behaviors and Shortcuts

- `Delete` / `Backspace`:
  - removes selected nodes (with confirmation)
  - also removes connected edges and affected journey steps
- View transitions (drill-down/back):
  - stop active playback
  - re-align player context for current view
- `Import DSL`:
  - replaces current workspace with imported model
- `P`:
  - toggles presentation mode

## 6) Quick Checklist

- Draw architecture:
  - `Select` + `Palette` + `Inspector`
- Connect components:
  - `Connector` + handle-to-handle drag
- Show business flow:
  - `Journeys` + `Add to Active Journey` + player controls
- Explore levels:
  - double-click drill-down + `Back`
- Work text-first:
  - `JourneyScript` tab
- Share output:
  - static or animated export actions
