import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import confetti from 'canvas-confetti'
import './App.css'
import { DiagramCanvas } from './components/DiagramCanvas'
import {
  buildNodeConfettiBursts,
  resolveNodeConfettiAnchor,
} from './components/playerConfetti'
import { fullViewToLiteDsl, liteToFullWorkspace } from './dsl-lite/convert'
import { parseLiteDsl } from './dsl-lite/parser'
import { exportPdf, exportPng, exportSvg } from './export/exporters'
import { nodePresetsByCategory, protocolPresets, resolveNodePreset } from './presets/catalog'
import { useEditorStore } from './store/useEditorStore'

const DEBOUNCE_SAVE_MS = 900
const DEFAULT_LEFT_SIDEBAR_WIDTH = 240
const DEFAULT_JOURNEY_HEIGHT = 220
const MIN_LEFT_SIDEBAR_WIDTH = 180
const MAX_LEFT_SIDEBAR_WIDTH = 440
const MIN_JOURNEY_HEIGHT = 160
const TOPBAR_HEIGHT = 80
const MIN_CANVAS_HEIGHT = 220

const viewKindLabel: Record<string, string> = {
  'system-context': 'System Context',
  container: 'Container',
  component: 'Component',
  hex: 'Hex',
}

type DrawerTab = 'journeys' | 'dsl'

const isTextInputTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  if (target.isContentEditable) {
    return true
  }
  const tagName = target.tagName
  return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT'
}

function App() {
  const layoutRef = useRef<HTMLDivElement | null>(null)
  const canvasPanelRef = useRef<HTMLElement | null>(null)
  const dslRestoreHeightRef = useRef<number | null>(null)
  const previousViewIdRef = useRef<string | null>(null)
  const leftResizeRef = useRef<{ pointerId: number; startX: number; startWidth: number } | null>(null)
  const journeyResizeRef = useRef<{
    pointerId: number
    startY: number
    startHeight: number
    maxHeight: number
  } | null>(null)
  const workspace = useEditorStore((state) => state.workspace)
  const currentViewId = useEditorStore((state) => state.currentViewId)
  const viewHistory = useEditorStore((state) => state.viewHistory)
  const selectedNodeId = useEditorStore((state) => state.selectedNodeId)
  const selectedEdgeId = useEditorStore((state) => state.selectedEdgeId)
  const activeTool = useEditorStore((state) => state.activeTool)
  const pendingConnectionFrom = useEditorStore((state) => state.pendingConnectionFrom)
  const pendingConnectionPortId = useEditorStore((state) => state.pendingConnectionPortId)
  const gridEnabled = useEditorStore((state) => state.workspace.settings.grid)
  const snapEnabled = useEditorStore((state) => state.workspace.settings.snap)
  const theme = useEditorStore((state) => state.workspace.settings.theme)
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
  const replaceWorkspace = useEditorStore((state) => state.replaceWorkspace)
  const zoomByFactor = useEditorStore((state) => state.zoomByFactor)
  const setActiveTool = useEditorStore((state) => state.setActiveTool)
  const removeNode = useEditorStore((state) => state.removeNode)
  const setNodeName = useEditorStore((state) => state.setNodeName)
  const setNodeTech = useEditorStore((state) => state.setNodeTech)
  const setNodeColor = useEditorStore((state) => state.setNodeColor)
  const setEdgeProtocol = useEditorStore((state) => state.setEdgeProtocol)
  const setEdgeLabel = useEditorStore((state) => state.setEdgeLabel)
  const setGridEnabled = useEditorStore((state) => state.setGridEnabled)
  const setSnapEnabled = useEditorStore((state) => state.setSnapEnabled)
  const setTheme = useEditorStore((state) => state.setTheme)
  const loadShowcaseWorkspace = useEditorStore((state) => state.loadShowcaseWorkspace)
  const createJourney = useEditorStore((state) => state.createJourney)
  const setActiveJourney = useEditorStore((state) => state.setActiveJourney)
  const setJourneyFilter = useEditorStore((state) => state.setJourneyFilter)
  const addEdgeToJourney = useEditorStore((state) => state.addEdgeToJourney)
  const removeEdgeFromJourney = useEditorStore((state) => state.removeEdgeFromJourney)
  const navigateBack = useEditorStore((state) => state.navigateBack)
  const setPlayerJourney = useEditorStore((state) => state.setPlayerJourney)
  const setPlayerRunning = useEditorStore((state) => state.setPlayerRunning)
  const setPlayerLoop = useEditorStore((state) => state.setPlayerLoop)
  const setPlayerSpeedMs = useEditorStore((state) => state.setPlayerSpeedMs)
  const setPlayerHighlightNodes = useEditorStore((state) => state.setPlayerHighlightNodes)
  const stepPlayer = useEditorStore((state) => state.stepPlayer)
  const resetPlayer = useEditorStore((state) => state.resetPlayer)
  const [journeyDraftName, setJourneyDraftName] = useState('')
  const [dslText, setDslText] = useState('')
  const [dslError, setDslError] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(DEFAULT_LEFT_SIDEBAR_WIDTH)
  const [journeyHeight, setJourneyHeight] = useState(DEFAULT_JOURNEY_HEIGHT)
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('journeys')
  const [dslMaximized, setDslMaximized] = useState(false)

  const selectedNode = selectedNodeId ? workspace.nodes[selectedNodeId] : undefined
  const selectedEdge = selectedEdgeId ? workspace.edges[selectedEdgeId] : undefined
  const currentView = workspace.views[currentViewId]
  const breadcrumb = [...viewHistory, currentViewId]
  const viewJourneys = useMemo(
    () =>
      currentView.journeyIds
        .map((journeyId) => workspace.journeys[journeyId])
        .filter((journey) => !!journey),
    [currentView.journeyIds, workspace.journeys],
  ) as Array<(typeof workspace.journeys)[string]>
  const activeJourney = activeJourneyId ? workspace.journeys[activeJourneyId] : undefined
  const playerJourney = playerJourneyId ? workspace.journeys[playerJourneyId] : undefined
  const currentViewModeLabel = viewKindLabel[currentView.kind] ?? currentView.kind
  const playerModeLabel = playerIsRunning ? 'Animação' : 'Render'

  const layoutStyle = useMemo(
    () => ({
      gridTemplateColumns: `${leftSidebarWidth}px 1fr 280px`,
      gridTemplateRows: `${TOPBAR_HEIGHT}px 1fr ${journeyHeight}px`,
    }),
    [journeyHeight, leftSidebarWidth],
  )

  const activateJourneyPlayback = (journeyId: string | null) => {
    setPlayerJourney(journeyId)
    setPlayerRunning(Boolean(journeyId))
  }

  const getMaxJourneyHeight = (): number => {
    const layoutHeight = layoutRef.current?.getBoundingClientRect().height ?? 0
    if (layoutHeight <= 0) {
      return journeyHeight
    }
    return Math.max(MIN_JOURNEY_HEIGHT, layoutHeight - TOPBAR_HEIGHT - MIN_CANVAS_HEIGHT)
  }

  const switchDrawerTab = (tab: DrawerTab) => {
    if (tab !== 'dsl' && dslMaximized) {
      const restoreHeight = dslRestoreHeightRef.current ?? DEFAULT_JOURNEY_HEIGHT
      setJourneyHeight(restoreHeight)
      dslRestoreHeightRef.current = null
      setDslMaximized(false)
    }
    setDrawerTab(tab)
  }

  const toggleDslMaximized = () => {
    if (!dslMaximized) {
      dslRestoreHeightRef.current = journeyHeight
      setJourneyHeight(getMaxJourneyHeight())
      setDslMaximized(true)
      return
    }
    const restoreHeight = dslRestoreHeightRef.current ?? DEFAULT_JOURNEY_HEIGHT
    setJourneyHeight(restoreHeight)
    dslRestoreHeightRef.current = null
    setDslMaximized(false)
  }

  const onLeftSplitterPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return
    }
    leftResizeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWidth: leftSidebarWidth,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onLeftSplitterPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const resize = leftResizeRef.current
    if (!resize || resize.pointerId !== event.pointerId) {
      return
    }
    const delta = event.clientX - resize.startX
    const nextWidth = Math.max(
      MIN_LEFT_SIDEBAR_WIDTH,
      Math.min(MAX_LEFT_SIDEBAR_WIDTH, resize.startWidth + delta),
    )
    setLeftSidebarWidth(nextWidth)
  }

  const stopLeftResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    const resize = leftResizeRef.current
    if (!resize || resize.pointerId !== event.pointerId) {
      return
    }
    leftResizeRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const onJourneySplitterPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return
    }
    journeyResizeRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startHeight: journeyHeight,
      maxHeight: getMaxJourneyHeight(),
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onJourneySplitterPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const resize = journeyResizeRef.current
    if (!resize || resize.pointerId !== event.pointerId) {
      return
    }
    const delta = resize.startY - event.clientY
    const nextHeight = Math.max(
      MIN_JOURNEY_HEIGHT,
      Math.min(resize.maxHeight, resize.startHeight + delta),
    )
    if (dslMaximized) {
      dslRestoreHeightRef.current = null
      setDslMaximized(false)
    }
    setJourneyHeight(nextHeight)
  }

  const stopJourneyResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    const resize = journeyResizeRef.current
    if (!resize || resize.pointerId !== event.pointerId) {
      return
    }
    journeyResizeRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

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
    const state = useEditorStore.getState()
    const targetNode = state.playerConfettiNodeId
      ? state.workspace.nodes[state.playerConfettiNodeId]
      : undefined
    const canvasRect = canvasPanelRef.current?.getBoundingClientRect()
    if (!targetNode || !canvasRect) {
      confetti({
        particleCount: 120,
        spread: 82,
        origin: { y: 0.62 },
      })
      return
    }

    const anchor = resolveNodeConfettiAnchor(
      targetNode.bounds,
      state.viewport,
      canvasRect,
    )
    const bursts = buildNodeConfettiBursts(anchor, {
      width: window.innerWidth,
      height: window.innerHeight,
    })
    for (const burst of bursts) {
      confetti({
        ...burst,
        ticks: 220,
        gravity: 1.04,
      })
    }
  }, [playerConfettiNonce])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    if (previousViewIdRef.current === null) {
      previousViewIdRef.current = currentViewId
      return
    }
    if (previousViewIdRef.current === currentViewId) {
      return
    }
    previousViewIdRef.current = currentViewId
    const fallbackJourneyId = currentView.journeyIds[0] ?? null
    const journeyInCurrentView =
      playerJourneyId && currentView.journeyIds.includes(playerJourneyId)
        ? playerJourneyId
        : fallbackJourneyId
    setPlayerJourney(journeyInCurrentView)
    setPlayerRunning(false)
  }, [currentViewId, currentView.journeyIds, playerJourneyId, setPlayerJourney, setPlayerRunning])

  useEffect(() => {
    const onDeleteKey = (event: KeyboardEvent) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') {
        return
      }
      if (isTextInputTarget(event.target)) {
        return
      }
      if (!selectedNode) {
        return
      }
      event.preventDefault()

      const connectedEdgeIds = currentView.edgeIds.filter((edgeId) => {
        const edge = workspace.edges[edgeId]
        if (!edge) {
          return false
        }
        return edge.from.nodeId === selectedNode.id || edge.to.nodeId === selectedNode.id
      })
      const connectedEdgeSet = new Set(connectedEdgeIds)
      const affectedJourneyNames: string[] = []
      for (const journeyId of currentView.journeyIds) {
        const journey = workspace.journeys[journeyId]
        if (!journey) {
          continue
        }
        if (journey.steps.some((step) => connectedEdgeSet.has(step.edgeId))) {
          affectedJourneyNames.push(journey.name)
        }
      }

      const messageParts = [`Remover "${selectedNode.name}" do stage?`]
      if (connectedEdgeIds.length > 0) {
        messageParts.push(
          `Isso também removerá ${connectedEdgeIds.length} comunicação(ões) conectada(s) ao componente.`,
        )
      }
      if (affectedJourneyNames.length > 0) {
        messageParts.push(
          `As jornadas abaixo serão desconectadas desse componente:\n- ${affectedJourneyNames.join('\n- ')}`,
        )
      }
      messageParts.push('Deseja continuar?')

      if (!window.confirm(messageParts.join('\n\n'))) {
        return
      }
      removeNode(selectedNode.id)
    }

    window.addEventListener('keydown', onDeleteKey)
    return () => window.removeEventListener('keydown', onDeleteKey)
  }, [currentView.edgeIds, currentView.journeyIds, removeNode, selectedNode, workspace.edges, workspace.journeys])

  const exportFromCanvas = async (format: 'svg' | 'png' | 'pdf') => {
    const svg = document.querySelector('.diagram-canvas')
    if (!(svg instanceof SVGSVGElement)) {
      setExportError('Canvas não encontrado para exportação.')
      return
    }
    try {
      if (format === 'svg') {
        exportSvg(svg)
      } else if (format === 'png') {
        await exportPng(svg)
      } else {
        await exportPdf(svg)
      }
      setExportError(null)
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Falha ao exportar arquivo.')
    }
  }

  return (
    <div
      ref={layoutRef}
      className={`app-layout ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}
      style={layoutStyle}
    >
      <header className="topbar">
        <div>
          <h1>{workspace.workspace.name}</h1>
          <p>{breadcrumb.map((viewId) => workspace.views[viewId]?.name ?? viewId).join(' / ')}</p>
          <div className="mode-indicators">
            <span className={activeTool === 'connector' ? 'mode-pill mode-pill-active' : 'mode-pill'}>
              {activeTool === 'connector' ? 'Modo: Connector' : 'Modo: Select'}
            </span>
            <span className="mode-pill">Camada: {currentViewModeLabel}</span>
            <span className={playerIsRunning ? 'mode-pill mode-pill-playing' : 'mode-pill'}>
              Player: {playerModeLabel}
            </span>
          </div>
        </div>
        <div className="topbar-actions">
          <button type="button" onClick={() => navigateBack()} disabled={!viewHistory.length}>
            Back
          </button>
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
          <button type="button" onClick={() => void exportFromCanvas('svg')}>
            Export SVG
          </button>
          <button type="button" onClick={() => void exportFromCanvas('png')}>
            Export PNG
          </button>
          <button type="button" onClick={() => void exportFromCanvas('pdf')}>
            Export PDF
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
          <label className="toggle-inline" htmlFor="toggle-theme-dark">
            <input
              id="toggle-theme-dark"
              type="checkbox"
              checked={theme === 'dark'}
              onChange={(event) => setTheme(event.target.checked ? 'dark' : 'light')}
            />
            Dark
          </label>
          <button type="button" onClick={() => loadShowcaseWorkspace()}>
            Showcase
          </button>
          <button type="button" onClick={() => resetWorkspace()}>
            Reset
          </button>
        </div>
        {exportError ? <p className="topbar-error">{exportError}</p> : null}
      </header>
      <div
        className="layout-splitter layout-splitter-left"
        style={{ left: leftSidebarWidth - 3, top: TOPBAR_HEIGHT, bottom: journeyHeight }}
        onPointerDown={onLeftSplitterPointerDown}
        onPointerMove={onLeftSplitterPointerMove}
        onPointerUp={stopLeftResize}
        onPointerCancel={stopLeftResize}
      />
      <div
        className="layout-splitter layout-splitter-journey"
        style={{ bottom: journeyHeight - 3 }}
        onPointerDown={onJourneySplitterPointerDown}
        onPointerMove={onJourneySplitterPointerMove}
        onPointerUp={stopJourneyResize}
        onPointerCancel={stopJourneyResize}
      />
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
      <main className="canvas-panel" ref={canvasPanelRef}>
        {activeTool === 'connector' ? (
          <p className="canvas-hint">
            {pendingConnectionFrom
              ? `Selecione destino para conectar a partir de ${pendingConnectionFrom}${pendingConnectionPortId ? `:${pendingConnectionPortId}` : ''}`
              : 'Arraste de uma alça para outra alça para criar edge'}
          </p>
        ) : null}
        {currentView.kind === 'container' ? (
          <p className="canvas-hint secondary-hint">
            Double-click em container com drilldown para abrir Component View.
          </p>
        ) : currentView.kind === 'component' ? (
          <p className="canvas-hint secondary-hint">
            Double-click em componente com drilldown para abrir Hex View.
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
            {selectedNode.kind !== 'boundary' ? (
              <>
                <label htmlFor="node-color">Cor</label>
                <input
                  id="node-color"
                  type="color"
                  value={
                    /^#[\da-fA-F]{6}$/.test(selectedNode.style?.fillColor ?? '')
                      ? selectedNode.style?.fillColor ?? '#ffffff'
                      : '#ffffff'
                  }
                  onChange={(event) => setNodeColor(selectedNode.id, event.target.value)}
                />
              </>
            ) : null}
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
      <section className={drawerTab === 'dsl' ? 'journey-drawer journey-drawer-dsl' : 'journey-drawer'}>
        <div className="drawer-tabs">
          <button
            type="button"
            className={drawerTab === 'journeys' ? 'drawer-tab drawer-tab-active' : 'drawer-tab'}
            onClick={() => switchDrawerTab('journeys')}
          >
            Journeys
          </button>
          <button
            type="button"
            className={drawerTab === 'dsl' ? 'drawer-tab drawer-tab-active' : 'drawer-tab'}
            onClick={() => switchDrawerTab('dsl')}
          >
            DSL
          </button>
          <span className="drawer-tabs-spacer" />
          {drawerTab === 'dsl' ? (
            <button type="button" className="drawer-maximize-button" onClick={() => toggleDslMaximized()}>
              {dslMaximized ? 'Restaurar DSL' : 'Maximizar DSL'}
            </button>
          ) : null}
        </div>
        {drawerTab === 'journeys' ? (
          <>
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
                onChange={(event) => activateJourneyPlayback(event.target.value || null)}
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
                  onClick={() => {
                    setActiveJourney(journey.id)
                    activateJourneyPlayback(journey.id)
                  }}
                >
                  <span className="journey-color-dot" style={{ background: journey.colorKey }} />
                  <span>{journey.name}</span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      setJourneyFilter(journeyFilterId === journey.id ? null : journey.id)
                      setActiveJourney(journey.id)
                      activateJourneyPlayback(journey.id)
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
          </>
        ) : (
          <div className={`dsl-panel ${dslMaximized ? 'dsl-panel-maximized' : ''}`}>
            <div className="dsl-toolbar">
              <strong>DSL LITE</strong>
              <button
                type="button"
                onClick={() => {
                  setDslText(fullViewToLiteDsl(workspace, currentViewId))
                  setDslError(null)
                }}
              >
                Exportar view atual
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    const ast = parseLiteDsl(dslText)
                    const imported = liteToFullWorkspace(ast)
                    const nextViewId = Object.keys(imported.views)[0]
                    replaceWorkspace(imported, nextViewId)
                    setDslError(null)
                  } catch (error) {
                    setDslError(error instanceof Error ? error.message : 'Falha ao importar DSL.')
                  }
                }}
              >
                Importar DSL
              </button>
            </div>
            <textarea
              value={dslText}
              onChange={(event) => setDslText(event.target.value)}
              placeholder='workspace "Pedidos" { ... }'
            />
            {dslError ? <p className="dsl-error">{dslError}</p> : null}
          </div>
        )}
      </section>
    </div>
  )
}

export default App
