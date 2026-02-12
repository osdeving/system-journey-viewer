import { useEffect } from 'react'
import './App.css'
import { DiagramCanvas } from './components/DiagramCanvas'
import { nodePresetsByCategory, protocolPresets, resolveNodePreset } from './presets/catalog'
import { useEditorStore } from './store/useEditorStore'

const DEBOUNCE_SAVE_MS = 900

function App() {
  const workspace = useEditorStore((state) => state.workspace)
  const currentViewId = useEditorStore((state) => state.currentViewId)
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId)
  const selectedEdgeId = useEditorStore((state) => state.selectedEdgeId)
  const activeTool = useEditorStore((state) => state.activeTool)
  const pendingConnectionFrom = useEditorStore((state) => state.pendingConnectionFrom)
  const gridEnabled = useEditorStore((state) => state.workspace.settings.grid)
  const snapEnabled = useEditorStore((state) => state.workspace.settings.snap)
  const viewport = useEditorStore((state) => state.viewport)
  const hydrate = useEditorStore((state) => state.hydrate)
  const persist = useEditorStore((state) => state.persist)
  const resetWorkspace = useEditorStore((state) => state.resetWorkspace)
  const zoomByFactor = useEditorStore((state) => state.zoomByFactor)
  const setActiveTool = useEditorStore((state) => state.setActiveTool)
  const setNodeName = useEditorStore((state) => state.setNodeName)
  const setNodeTech = useEditorStore((state) => state.setNodeTech)
  const setEdgeProtocol = useEditorStore((state) => state.setEdgeProtocol)
  const setEdgeLabel = useEditorStore((state) => state.setEdgeLabel)
  const setGridEnabled = useEditorStore((state) => state.setGridEnabled)
  const setSnapEnabled = useEditorStore((state) => state.setSnapEnabled)

  const selectedNode = selectedNodeId ? workspace.nodes[selectedNodeId] : undefined
  const selectedEdge = selectedEdgeId ? workspace.edges[selectedEdgeId] : undefined

  useEffect(() => {
    const timeout = window.setTimeout(() => persist(), DEBOUNCE_SAVE_MS)
    return () => window.clearTimeout(timeout)
  }, [workspace, currentViewId, viewport, persist])

  return (
    <div className="app-layout">
      <header className="topbar">
        <div>
          <h1>{workspace.workspace.name}</h1>
          <p>{workspace.views[currentViewId]?.name ?? currentViewId}</p>
        </div>
        <div className="topbar-actions">
          <button
            type="button"
            className={activeTool === 'select' ? 'tool-button tool-active' : 'tool-button'}
            onClick={() => setActiveTool('select')}
          >
            Select
          </button>
          <button
            type="button"
            className={activeTool === 'connector' ? 'tool-button tool-active' : 'tool-button'}
            onClick={() => setActiveTool('connector')}
          >
            Connector
          </button>
          <button type="button" onClick={() => hydrate()}>
            Reload
          </button>
          <button type="button" onClick={() => persist()}>
            Save
          </button>
          <button type="button" onClick={() => zoomByFactor(1.1)}>
            Zoom +
          </button>
          <button type="button" onClick={() => zoomByFactor(0.9)}>
            Zoom -
          </button>
          <label className="toggle-inline" htmlFor="toggle-grid">
            <input
              id="toggle-grid"
              type="checkbox"
              checked={gridEnabled}
              onChange={(event) => setGridEnabled(event.target.checked)}
            />
            Grid
          </label>
          <label className="toggle-inline" htmlFor="toggle-snap">
            <input
              id="toggle-snap"
              type="checkbox"
              checked={snapEnabled}
              onChange={(event) => setSnapEnabled(event.target.checked)}
            />
            Snap
          </label>
          <button type="button" onClick={() => resetWorkspace()}>
            Reset
          </button>
        </div>
      </header>
      <aside className="left-sidebar">
        <h2>Palette</h2>
        <p>Arraste para o canvas:</p>
        {Object.entries(nodePresetsByCategory).map(([category, presets]) => (
          <div key={category} className="toolbox-group">
            <h3>{category}</h3>
            <ul className="toolbox-list">
              {presets.map((preset) => (
                <li
                  key={preset.id}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData('application/x-node-preset-id', preset.id)
                  }}
                >
                  {preset.label}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </aside>
      <main className="canvas-panel">
        {activeTool === 'connector' ? (
          <p className="canvas-hint">
            {pendingConnectionFrom
              ? `Selecione destino para conectar a partir de ${pendingConnectionFrom}`
              : 'Clique no node de origem e depois no destino para criar edge'}
          </p>
        ) : null}
        <DiagramCanvas />
      </main>
      <aside className="right-sidebar">
        <h2>Inspector</h2>
        {!selectedNode && !selectedEdge ? <p>Selecione um node ou edge no canvas.</p> : null}
        {selectedNode ? (
          <div className="inspector-form">
            <label htmlFor="node-id">ID</label>
            <input id="node-id" value={selectedNode.id} disabled />
            <label htmlFor="node-kind">Tipo</label>
            <input id="node-kind" value={selectedNode.kind} disabled />
            <label htmlFor="node-name">Nome</label>
            <input
              id="node-name"
              value={selectedNode.name}
              onChange={(event) => setNodeName(selectedNode.id, event.target.value)}
            />
            <label htmlFor="node-preset">Preset</label>
            <input
              id="node-preset"
              value={resolveNodePreset(selectedNode.presetId ?? '')?.label ?? 'Custom'}
              disabled
            />
            <label htmlFor="node-tech">Tecnologia</label>
            <input
              id="node-tech"
              value={selectedNode.tech?.label ?? ''}
              onChange={(event) => setNodeTech(selectedNode.id, event.target.value)}
            />
          </div>
        ) : null}
        {selectedEdge ? (
          <div className="inspector-form">
            <label htmlFor="edge-id">ID</label>
            <input id="edge-id" value={selectedEdge.id} disabled />
            <label htmlFor="edge-label">Label</label>
            <input
              id="edge-label"
              value={selectedEdge.label}
              onChange={(event) => setEdgeLabel(selectedEdge.id, event.target.value)}
            />
            <label htmlFor="edge-protocol">Protocolo</label>
            <select
              id="edge-protocol"
              value={selectedEdge.protocolPresetId}
              onChange={(event) => setEdgeProtocol(selectedEdge.id, event.target.value)}
            >
              {protocolPresets.map((protocol) => (
                <option key={protocol.id} value={protocol.id}>
                  {protocol.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </aside>
    </div>
  )
}

export default App
