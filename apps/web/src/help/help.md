<!-- Purpose: Provide in-app help and tutorial content sources. -->

# System Journey Viewer Help

## Quick Start

1. Drag nodes from **Palette** to the canvas.
2. Use **Connector** mode (`C`), hold `Ctrl`, or drag directly from a port when its blue pulse cue appears in **Select** mode.
3. Create/select a journey in **Journeys**.
4. Start player and follow `Step X/Y` timeline.

Default playback/focus state:

- Loop: enabled
- Trail: disabled
- Animation preset: `Orb only`
- Off-scope journey render: `Hide`

## Canvas

- Pan: drag empty canvas.
- Zoom: mouse wheel.
- Select: click node/edge.
- Use the bottom-right minimap to understand large diagrams and jump the viewport by clicking the overview; hide it from its close button, the status bar, the command palette, or **View**.
- The bottom status bar shows current view, zoom, entity counts, selection, active journey, active tool, playback mode, provider state, and quick actions for palette/tool/fit/grid/snap/minimap/performance/search.
- Drag from an exact port hover in **Select** mode when the blue pulse cue appears to start a connection without leaving selection mode.
- Multi-select: `Shift` or `Cmd/Ctrl` + click.
- Delete selection: `Delete` / `Backspace`.
- Duplicate selection: `Cmd/Ctrl + D`.
- Press and hold editable node text, note text, or edge labels to open in-place editing; release before the hold delay to keep it as a normal click.

## Command Palette

- Open with `Ctrl/Cmd + K`, `/`, the topbar **Search** control, or the mobile **Search** button.
- Search commands, views, journeys, nodes, and edges from one place.
- Selecting a node or edge opens its view, selects it, and centers the canvas around it.
- Common actions include tool switching, auto arrange, fit view, theme/grid/snap toggles, panel opening, file commands, minimap toggle, status bar toggle, and performance mode toggle.

## Palette

- The palette uses a searchable component browser with category chips and drag-ready cards.
- Filter by component name, preset id, or icon key, then drag a card into the canvas.

## Notes

- Notes render as sticky notes with folded corner + pin.
- Press and hold note text for inline edit.
- Note text supports multiple lines.
- In inline multiline edit:
  - `Enter` adds a new line.
  - `Ctrl/Cmd + Enter` commits changes.

## Drilldown

- Double-click a boundary-enabled node to open drilldown.
- `Ctrl/Cmd + Alt + double-click` creates a new drilldown view.
- Use **Back** or the view selector to navigate hierarchy.

## Edge Labels

- Double-click edge label for inline edit.
- Click-hold label + scroll: change label font size.
- Click-hold label + `Alt` + scroll: rotate label angle.
- Rotation step is intentionally faster for quicker horizontal/vertical orientation changes.
- Drag label to move along edge and switch side.
- Edge endpoint drag handles were enlarged and made more visible for easier reconnect by port.

## Journey Timeline

- Drag steps to reorder.
- Remove step using **Remove** action.
- The same step reorder/remove controls are available in the dock timeline tab.
- Filter modes:
  - Show outside journey
  - Dim outside journey
  - Hide outside journey

## Player

- Loop, highlight, trail and speed are configurable.
- Animation presets:
  - Cinematic
  - Orb only
  - Minimal

## Export

- Static: `SVG`, `PNG`, `PDF`.
- Animated: `GIF`, `MP4`, animated `SVG`.
- SJV Script panel:
  - `Export full workspace` snapshots current workspace into SJV Script.
  - `Sync with editor` applies valid SJV Script edits to the canvas view in real time while you type.
  - Use escaped line breaks (`\n`) inside quoted text when editing multiline node/note labels in script form.

## Inspector Colors

- Node fill presets now adapt to light/dark theme with Tailwind-inspired palettes.
- Node text color can be customized from Inspector using color picker + quick presets.

## Persistence

- **Save File** writes to disk (`.sjv.json`).
- Snapshot persists in browser storage.
- **Recents** keeps up to 3 recently saved files in local storage memory.

## Dock and View Layout

- Open panels from **View** menu:
  - `Inspector`, `Journeys`, `Timeline`, `SJV Script`, `Help`
- Dock positions:
  - `Left`, `Right`, `Bottom`, `Floating`
- Side docks are resizable in the dock direction:
  - Left dock: drag splitter to the right to increase width.
  - Right dock: drag splitter to the left to increase width.
- Floating dock can be dragged by its header.
- Floating dock can be resized from all sides/corners.
- Visibility controls are available in **View**:
  - `Show/Hide Palette`
  - `Show/Hide Dock`
  - `Show/Hide Workbench`

## Menus

- **File**: open/save/export/recent files.
- **Edit**: undo/redo/selection tools.
- **View**: focus/presentation/layout/panel visibility.
- **Journey**: filters, player, animation controls.
- **Insert**: showcase/tutorial loaders and quick panel/navigation actions.
- **Settings**: preferences window, startup splash toggle, tooltip toggle, toolbar section visibility.
- **Help**: guide, export gallery, and about information.

## Showcase and Tutorial

- `Load Showcase (EN/PT)` loads the complete feature workspace in the selected language.
- `Load Tutorial (EN/PT)` loads the guided variant with walkthrough notes.
- The preferred showcase language can be changed in `Settings > Preferences`.

## Export Gallery

- Open from **Help > Open Export Gallery**.
- The gallery includes a bundled sample library with SJV Scripts and animated SVG exports for product demos.
- When signed in, use `Seed Sample Library` to save those bundled scripts and animations into the active provider.
- Your private cloud-provider gallery (`PNG`, `GIF`, `MP4`, and seeded samples) appears below the sample library.
- Standard local `PNG`, `GIF`, and `MP4` exports now auto-upload to the active provider after the browser download finishes (when you are signed in).
- Gallery actions include sample seeding, local upload, and refresh for the private `gallery` bucket.
- The top-right cloud badge gives quick access to sign-in, save/load, gallery refresh, and automatic-upload status.

## Preferences Window

- Open from **Settings > Open Preferences**.
- Controls:
  - Tooltip enable/disable.
  - Startup splash enable/disable.
  - Canvas minimap enable/disable.
  - Status bar show/hide.
  - Performance mode enable/disable.
  - Node depth effects enable/disable.
  - Showcase language (`EN` / `PT`).
  - UI font size (`Small`, `Normal`, `Large`).
  - Chrome color theme presets and custom chrome color tokens.
  - Icon set selection for the app chrome.
  - Main menu show/hide.
  - Optional compact toolbar placement beside the app icon.
  - Toolbar section visibility (`Navigation`, `Editing`, `Panels`, `Modes`).
  - Active cloud provider status, provider URL, and advanced cloud controls as a fallback to the topbar badge.

## Startup Splash and About

- Startup splash appears once on load (if enabled in preferences).
- Splash/About include:
  - App name: `System Journey Viewer`
  - Version label: `MVP Beta`
  - Copyright: `Willams Sousa`
