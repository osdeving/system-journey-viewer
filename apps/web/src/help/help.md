# System Journey Viewer Help

## Quick Start

1. Drag nodes from **Palette** to the canvas.
2. Use **Connector** mode (`C`) or hold `Ctrl` to connect ports.
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
- Multi-select: `Shift` or `Cmd/Ctrl` + click.
- Delete selection: `Delete` / `Backspace`.
- Duplicate selection: `Cmd/Ctrl + D`.

## Notes

- Notes render as sticky notes with folded corner + pin.
- Double-click note text for inline edit.
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
- **Insert**: quick panel/navigation actions.
- **Help**: this markdown guide.
