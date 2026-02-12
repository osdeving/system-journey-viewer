import { useEffect, useMemo, useState } from 'react'
import confetti from 'canvas-confetti'
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
  const activeJourneyId = useEditorStore((state) => state.activeJourneyId)
  const journeyFilterId = useEditorStore((state) => state.journeyFilterId)
  const playerJourneyId = useEditorStore((state) => state.playerJourneyId)
  const playerIsRunning = useEditorStore((state) => state.playerIsRunning)
  const playerStepIndex = useEditorStore((state) => state.playerStepIndex)
  const playerLoop = useEditorStore((state) => state.playerLoop)
  const playerSpeedMs = useEditorStore((state) => state.playerSpeedMs)
  const playerHighlightNodes = useEditorStore((state) => state.playerHighlightNodes)
  const playerConfettiNonce = useEditorStore((state) => state.playerConfettiNonce)
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
  const createJourney = useEditorStore((state) => state.createJourney)
  const setActiveJourney = useEditorStore((state) => state.setActiveJourney)
  const setJourneyFilter = useEditorStore((state) => state.setJourneyFilter)
  const addEdgeToJourney = useEditorStore((state) => state.addEdgeToJourney)
  const removeEdgeFromJourney = useEditorStore((state) => state.removeEdgeFromJourney)
  const setPlayerJourney = useEditorStore((state) => state.setPlayerJourney)
  const setPlayerRunning = useEditorStore((state) => state.setPlayerRunning)
  const setPlayerLoop = useEditorStore((state) => state.setPlayerLoop)
  const setPlayerSpeedMs = useEditorStore((state) => state.setPlayerSpeedMs)
  const setPlayerHighlightNodes = useEditorStore((state) => state.setPlayerHighlightNodes)
  const stepPlayer = useEditorStore((state) => state.stepPlayer)
  const resetPlayer = useEditorStore((state) => state.resetPlayer)
  const [journeyDraftName, setJourneyDraftName] = useState('')

  const selectedNode = selectedNodeId ? workspace.nodes[selectedNodeId] : undefined
  const selectedEdge = selectedEdgeId ? workspace.edges[selectedEdgeId] : undefined
  const currentView = workspace.views[currentViewId]
  const viewJourneys = useMemo(
    () =>
      currentView.journeyIds
        .map((journeyId) => workspace.journeys[journeyId])
        .filter((journey) => !!journey),
    [currentView.journeyIds, workspace.journeys],
  ) as Array<(typeof workspace.journeys)[string]>
  const activeJourney = activeJourneyId ? workspace.journeys[activeJourneyId] : undefined
  const playerJourney = playerJourneyId ? workspace.journeys[playerJourneyId] : undefined

  useEffect(() => {
    const timeout = window.setTimeout(() => persist(), DEBOUNCE_SAVE_MS)
    return () => window.clearTimeout(timeout)
  }, [workspace, currentViewId, viewport, persist])

  useEffect(() => {
    if (!playerIsRunning) {
      return
    }
    const timer = window.setInterval(() => {
      stepPlayer()
    }, playerSpeedMs)
    return () => window.clearInterval(timer)
  }, [playerIsRunning, playerSpeedMs, stepPlayer])

  useEffect(() => {
    if (!playerConfettiNonce) {
      return
    }
    confetti({
      particleCount: 140,
      spread: 85,
      origin: { y: 0.62 },
    })
  }, [playerConfettiNonce])

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
            <button
              type="button"
              onClick={() => {
                if (activeJourneyId) {
                  addEdgeToJourney(activeJourneyId, selectedEdge.id)
                }
              }}
              disabled={!activeJourneyId}
            >
              Add to Active Journey
            </button>
          </div>
        ) : null}
      </aside>
      <section className="journey-drawer">
        <div className="journey-toolbar">
          <strong>Journeys</strong>
          <input
            placeholder="Nova jornada"
            value={journeyDraftName}
            onChange={(event) => setJourneyDraftName(event.target.value)}
          />
          <button
            type="button"
            onClick={() => {
              const journeyId = createJourney(journeyDraftName)
              setJourneyDraftName('')
              setActiveJourney(journeyId)
            }}
          >
            Criar jornada
          </button>
          <button type="button" onClick={() => setJourneyFilter(null)}>
            Limpar filtro
          </button>
          <select
            value={playerJourneyId ?? ''}
            onChange={(event) => setPlayerJourney(event.target.value || null)}
          >
            <option value="">Player: selecione jornada</option>
            {viewJourneys.map((journey) => (
              <option key={journey.id} value={journey.id}>
                {journey.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!playerJourney}
            onClick={() => setPlayerRunning(!playerIsRunning)}
          >
            {playerIsRunning ? 'Pausar' : 'Play'}
          </button>
          <button type="button" disabled={!playerJourney} onClick={() => stepPlayer()}>
            Step
          </button>
          <button type="button" disabled={!playerJourney} onClick={() => resetPlayer()}>
            Reset Player
          </button>
          <label className="toggle-inline">
            <input
              type="checkbox"
              checked={playerLoop}
              onChange={(event) => setPlayerLoop(event.target.checked)}
            />
            Loop
          </label>
          <label className="toggle-inline">
            <input
              type="checkbox"
              checked={playerHighlightNodes}
              onChange={(event) => setPlayerHighlightNodes(event.target.checked)}
            />
            Highlight Nodes
          </label>
          <label className="toggle-inline">
            Speed
            <input
              type="range"
              min={120}
              max={1800}
              step={60}
              value={playerSpeedMs}
              onChange={(event) => setPlayerSpeedMs(Number(event.target.value))}
            />
          </label>
          <span className="player-step-info">
            Step {playerStepIndex + 1}/{playerJourney?.steps.length ?? 0}
          </span>
        </div>
        <div className="journey-list">
          {viewJourneys.map((journey) => (
            <div
              key={journey.id}
              className={activeJourneyId === journey.id ? 'journey-item journey-active' : 'journey-item'}
              onClick={() => setActiveJourney(journey.id)}
            >
              <span className="journey-color-dot" style={{ background: journey.colorKey }} />
              <span>{journey.name}</span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  setJourneyFilter(journeyFilterId === journey.id ? null : journey.id)
                }}
              >
                {journeyFilterId === journey.id ? 'Filtrando' : 'Filtrar'}
              </button>
            </div>
          ))}
        </div>
        {activeJourney ? (
          <ol className="journey-steps">
            {activeJourney.steps
              .slice()
              .sort((a, b) => a.n - b.n)
              .map((step) => (
                <li key={`${activeJourney.id}:${step.edgeId}`}>
                  {step.n}. {workspace.edges[step.edgeId]?.label ?? step.edgeId}
                  <span className="journey-step-actions">
                    <button type="button" onClick={() => removeEdgeFromJourney(activeJourney.id, step.edgeId)}>
                      Remover
                    </button>
                  </span>
                </li>
              ))}
          </ol>
        ) : (
          <p>Crie uma jornada e associe edges pelo Inspector.</p>
        )}
      </section>
    </div>
  )
}

export default App
