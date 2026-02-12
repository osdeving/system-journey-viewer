import { useEffect } from 'react'
import './App.css'
import { DiagramCanvas } from './components/DiagramCanvas'
import { useEditorStore } from './store/useEditorStore'

const DEBOUNCE_SAVE_MS = 900

function App() {
  const workspace = useEditorStore((state) => state.workspace)
  const currentViewId = useEditorStore((state) => state.currentViewId)
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId)
  const viewport = useEditorStore((state) => state.viewport)
  const hydrate = useEditorStore((state) => state.hydrate)
  const persist = useEditorStore((state) => state.persist)
  const resetWorkspace = useEditorStore((state) => state.resetWorkspace)
  const zoomByFactor = useEditorStore((state) => state.zoomByFactor)

  const selectedNode = selectedNodeId ? workspace.nodes[selectedNodeId] : undefined

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
          <button type="button" onClick={() => resetWorkspace()}>
            Reset
          </button>
        </div>
      </header>
      <aside className="left-sidebar">
        <h2>Palette</h2>
        <ul>
          <li>System</li>
          <li>Container</li>
          <li>Component</li>
          <li>Boundary</li>
        </ul>
      </aside>
      <main className="canvas-panel">
        <DiagramCanvas />
      </main>
      <aside className="right-sidebar">
        <h2>Inspector</h2>
        {!selectedNode ? (
          <p>Selecione um node no canvas.</p>
        ) : (
          <dl>
            <dt>ID</dt>
            <dd>{selectedNode.id}</dd>
            <dt>Tipo</dt>
            <dd>{selectedNode.kind}</dd>
            <dt>Nome</dt>
            <dd>{selectedNode.name}</dd>
            <dt>Tecnologia</dt>
            <dd>{selectedNode.tech?.label ?? 'N/A'}</dd>
          </dl>
        )}
      </aside>
    </div>
  )
}

export default App
