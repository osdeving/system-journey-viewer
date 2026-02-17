import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  ChangeEvent,
  PointerEvent as ReactPointerEvent,
} from 'react'
import confetti from 'canvas-confetti'
import type { Monaco } from '@monaco-editor/react'
import {
  Dock,
  Eye,
  EyeOff,
  GripVertical,
  PanelBottomClose,
  PanelBottomOpen,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Pause,
  Play,
  Presentation,
  RotateCcw,
  SkipBack,
  SkipForward,
} from 'lucide-react'
import './App.css'
import { DiagramCanvas } from './components/DiagramCanvas'
import {
  buildNodeConfettiBursts,
  resolveNodeConfettiAnchor,
} from './components/playerConfetti'
import {
  extractDslFromCodexResponse,
  requestCodexDslAssist,
} from './dsl-lite/codexAssist'
import { fullWorkspaceToLiteDsl, liteToFullWorkspace } from './dsl-lite/convert'
import {
  JOURNEY_SCRIPT_LANGUAGE_ID,
  JOURNEY_SCRIPT_NAME,
  registerJourneyScriptLanguage,
  resolveJourneyScriptTheme,
} from './dsl-lite/monacoJourneyScript'
import { parseLiteDsl } from './dsl-lite/parser'
import {
  exportAnimatedJourneyGif,
  exportAnimatedJourneySvg,
  exportAnimatedJourneyVideo,
  resolveExportPlaybackSpeedMs,
  resolveJourneyAnimationDurationMs,
} from './export/animatedExport'
import { exportPdf, exportPng, exportSvg } from './export/exporters'
import {
  buildWorkspaceFilename,
  parseWorkspaceSnapshotFile,
  serializeWorkspaceSnapshotFile,
} from './file/workspaceFile'
import { BLANK_WORKSPACE_VIEW_ID, createBlankWorkspace } from './model/blankWorkspace'
import type { EditorSnapshot, WorkspaceModel } from './model/types'
import { nodePresetsByCategory, protocolPresets, resolveNodePreset } from './presets/catalog'
import { useEditorStore } from './store/useEditorStore'

const DEBOUNCE_SAVE_MS = 900
const DEFAULT_LEFT_SIDEBAR_WIDTH = 240
const RIGHT_SIDEBAR_WIDTH = 340
const DEFAULT_JOURNEY_HEIGHT = 220
const MIN_LEFT_SIDEBAR_WIDTH = 180
const MAX_LEFT_SIDEBAR_WIDTH = 440
const MIN_JOURNEY_HEIGHT = 160
const TOPBAR_HEIGHT = 80
const MIN_CANVAS_HEIGHT = 220
const MIN_DOCK_HEIGHT = 260
const DEFAULT_FILE_VIEWPORT = { x: 100, y: 80, zoom: 1 }
const DEFAULT_NODE_COLOR_PRESETS = [
  '#ffffff',
  '#dbeafe',
  '#dcfce7',
  '#fde68a',
  '#fecaca',
  '#fae8ff',
  '#cffafe',
  '#fee2e2',
  '#e0e7ff',
  '#fef3c7',
]

const MonacoEditor = lazy(() => import('@monaco-editor/react'))

const viewKindLabel: Record<string, string> = {
  'system-context': 'System Context',
  container: 'Container',
  component: 'Component',
  hex: 'Hex',
}

type DrawerTab = 'journeys' | 'dsl' | 'dock'
type DockTab = 'inspector' | 'journeys'
type DockPosition = 'right' | 'bottom'
type DesktopMenuId = 'file' | 'edit' | 'view' | 'insert'
type PlayerAnimationPreset = 'cinematic' | 'orb' | 'minimal'
type FileWriteMode = 'prompt' | 'reuse'
type StepDragState = { journeyId: string; edgeId: string }

type WorkspaceWritable = {
  write: (data: Blob | BufferSource | string) => Promise<void>
  close: () => Promise<void>
}

type WorkspaceFileHandle = {
  name?: string
  getFile: () => Promise<File>
  createWritable: () => Promise<WorkspaceWritable>
}

type WorkspaceWindow = Window & {
  showOpenFilePicker?: (options?: unknown) => Promise<WorkspaceFileHandle[]>
  showSaveFilePicker?: (options?: unknown) => Promise<WorkspaceFileHandle>
}

const DESKTOP_MENU_ORDER: DesktopMenuId[] = ['file', 'edit', 'view', 'insert']
const DEFAULT_DOCK_TAB_ORDER: DockTab[] = ['inspector', 'journeys']

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

const isHexColor = (value?: string): boolean =>
  /^#[\da-fA-F]{6}$/.test(value ?? '')

const resolvePlayerAnimationPreset = (
  trailEnabled: boolean,
  highlightEnabled: boolean,
): PlayerAnimationPreset => {
  if (trailEnabled && highlightEnabled) {
    return 'cinematic'
  }
  if (!trailEnabled && highlightEnabled) {
    return 'orb'
  }
  return 'minimal'
}

function App() {
  const layoutRef = useRef<HTMLDivElement | null>(null)
  const desktopMenuBarRef = useRef<HTMLDivElement | null>(null)
  const snapshotFileInputRef = useRef<HTMLInputElement | null>(null)
  const canvasPanelRef = useRef<HTMLElement | null>(null)
  const dslRestoreHeightRef = useRef<number | null>(null)
  const previousViewIdRef = useRef<string | null>(null)
  const dockTabDragRef = useRef<DockTab | null>(null)
  const journeyDragRef = useRef<string | null>(null)
  const journeyStepDragRef = useRef<StepDragState | null>(null)
  const workspaceFileHandleRef = useRef<WorkspaceFileHandle | null>(null)
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
  const selectedNodeIds = useEditorStore((state) => state.selectedNodeIds)
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
  const playerTrailEnabled = useEditorStore((state) => state.playerTrailEnabled)
  const playerConfettiNonce = useEditorStore((state) => state.playerConfettiNonce)
  const hydrate = useEditorStore((state) => state.hydrate)
  const persist = useEditorStore((state) => state.persist)
  const resetWorkspace = useEditorStore((state) => state.resetWorkspace)
  const replaceWorkspace = useEditorStore((state) => state.replaceWorkspace)
  const zoomByFactor = useEditorStore((state) => state.zoomByFactor)
  const setViewport = useEditorStore((state) => state.setViewport)
  const setActiveTool = useEditorStore((state) => state.setActiveTool)
  const removeNode = useEditorStore((state) => state.removeNode)
  const removeEdge = useEditorStore((state) => state.removeEdge)
  const duplicateSelection = useEditorStore((state) => state.duplicateSelection)
  const setNodeName = useEditorStore((state) => state.setNodeName)
  const setNodeTech = useEditorStore((state) => state.setNodeTech)
  const setNodeColor = useEditorStore((state) => state.setNodeColor)
  const setEdgeProtocol = useEditorStore((state) => state.setEdgeProtocol)
  const setEdgeLabel = useEditorStore((state) => state.setEdgeLabel)
  const setEdgeLabelPosition = useEditorStore((state) => state.setEdgeLabelPosition)
  const autoArrangeCurrentView = useEditorStore((state) => state.autoArrangeCurrentView)
  const setGridEnabled = useEditorStore((state) => state.setGridEnabled)
  const setSnapEnabled = useEditorStore((state) => state.setSnapEnabled)
  const setTheme = useEditorStore((state) => state.setTheme)
  const loadShowcaseWorkspace = useEditorStore((state) => state.loadShowcaseWorkspace)
  const createJourney = useEditorStore((state) => state.createJourney)
  const setActiveJourney = useEditorStore((state) => state.setActiveJourney)
  const setJourneyFilter = useEditorStore((state) => state.setJourneyFilter)
  const reorderJourneyInCurrentView = useEditorStore((state) => state.reorderJourneyInCurrentView)
  const addEdgeToJourney = useEditorStore((state) => state.addEdgeToJourney)
  const removeEdgeFromJourney = useEditorStore((state) => state.removeEdgeFromJourney)
  const reorderJourneyStep = useEditorStore((state) => state.reorderJourneyStep)
  const navigateBack = useEditorStore((state) => state.navigateBack)
  const setPlayerJourney = useEditorStore((state) => state.setPlayerJourney)
  const setPlayerRunning = useEditorStore((state) => state.setPlayerRunning)
  const setPlayerLoop = useEditorStore((state) => state.setPlayerLoop)
  const setPlayerSpeedMs = useEditorStore((state) => state.setPlayerSpeedMs)
  const setPlayerHighlightNodes = useEditorStore((state) => state.setPlayerHighlightNodes)
  const setPlayerTrailEnabled = useEditorStore((state) => state.setPlayerTrailEnabled)
  const prevPlayerStep = useEditorStore((state) => state.prevPlayerStep)
  const stepPlayer = useEditorStore((state) => state.stepPlayer)
  const resetPlayer = useEditorStore((state) => state.resetPlayer)
  const [journeyDraftName, setJourneyDraftName] = useState('')
  const [dslText, setDslText] = useState('')
  const [dslError, setDslError] = useState<string | null>(null)
  const [dslCodexInstruction, setDslCodexInstruction] = useState(
    'Refine o DSL preservando comportamento e melhorando legibilidade.',
  )
  const [dslCodexThreadId, setDslCodexThreadId] = useState<string | null>(null)
  const [dslCodexStatus, setDslCodexStatus] = useState<string | null>(null)
  const [dslCodexRunning, setDslCodexRunning] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportStatus, setExportStatus] = useState<string | null>(null)
  const [draggedEdgeId, setDraggedEdgeId] = useState<string | null>(null)
  const [animatedExportRunning, setAnimatedExportRunning] = useState(false)
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(DEFAULT_LEFT_SIDEBAR_WIDTH)
  const [journeyHeight, setJourneyHeight] = useState(DEFAULT_JOURNEY_HEIGHT)
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('journeys')
  const [dslMaximized, setDslMaximized] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [presentationMode, setPresentationMode] = useState(false)
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false)
  const [dockCollapsed, setDockCollapsed] = useState(false)
  const [drawerCollapsed, setDrawerCollapsed] = useState(false)
  const [dockPosition, setDockPosition] = useState<DockPosition>('right')
  const [dockTabOrder, setDockTabOrder] = useState<DockTab[]>(DEFAULT_DOCK_TAB_ORDER)
  const [activeDockTab, setActiveDockTab] = useState<DockTab>('inspector')
  const [openDesktopMenu, setOpenDesktopMenu] = useState<DesktopMenuId | null>(null)

  const selectedNode = selectedNodeId ? workspace.nodes[selectedNodeId] : undefined
  const selectedEdge = selectedEdgeId ? workspace.edges[selectedEdgeId] : undefined
  const selectedNodes = useMemo(
    () =>
      selectedNodeIds
        .map((nodeId) => workspace.nodes[nodeId])
        .filter((node): node is NonNullable<typeof selectedNode> => !!node),
    [selectedNodeIds, workspace.nodes],
  )
  const nodeColorPresets = useMemo(() => {
    const usedColors = Object.values(workspace.nodes)
      .map((node) => node.style?.fillColor?.trim())
      .filter((value): value is string => isHexColor(value))
      .reverse()
    const recentUnique = Array.from(new Set(usedColors))
    return [
      ...recentUnique,
      ...DEFAULT_NODE_COLOR_PRESETS.filter((color) => !recentUnique.includes(color)),
    ].slice(0, 10)
  }, [workspace.nodes])
  const resolveEntryViewId = useCallback((workspaceModel: WorkspaceModel): string => {
    const viewIds = Object.keys(workspaceModel.views)
    if (!viewIds.length) {
      return BLANK_WORKSPACE_VIEW_ID
    }
    const inboundDrilldowns = new Set(
      Object.values(workspaceModel.nodes)
        .map((node) => node.drilldownRef)
        .filter((viewId): viewId is string => Boolean(viewId && workspaceModel.views[viewId])),
    )
    const rootCandidates = viewIds.filter((viewId) => !inboundDrilldowns.has(viewId))
    const preferredRoot =
      rootCandidates.find((viewId) => {
        const kind = workspaceModel.views[viewId]?.kind
        return kind === 'container' || kind === 'system-context'
      }) ??
      rootCandidates[0] ??
      viewIds[0]
    return preferredRoot
  }, [])
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
  const activeJourneySteps = useMemo(
    () =>
      activeJourney
        ? activeJourney.steps.slice().sort((left, right) => left.n - right.n)
        : [],
    [activeJourney],
  )
  const playerJourney = playerJourneyId ? workspace.journeys[playerJourneyId] : undefined
  const currentViewModeLabel = viewKindLabel[currentView.kind] ?? currentView.kind
  const playerModeLabel = playerIsRunning ? 'Animação' : 'Render'
  const immersiveMode = focusMode || presentationMode
  const leftPanelVisible = !immersiveMode && !leftSidebarCollapsed
  const rightDockVisible = !immersiveMode && dockPosition === 'right' && !dockCollapsed
  const drawerVisible = !immersiveMode && !drawerCollapsed

  const layoutStyle = useMemo(
    () =>
      immersiveMode
        ? {
            gridTemplateColumns: '1fr',
            gridTemplateRows: `${TOPBAR_HEIGHT}px 1fr`,
            gridTemplateAreas: `'topbar' 'main'`,
          }
        : {
            gridTemplateColumns: `${leftPanelVisible ? leftSidebarWidth : 0}px 1fr ${
              rightDockVisible ? RIGHT_SIDEBAR_WIDTH : 0
            }px`,
            gridTemplateRows: `${TOPBAR_HEIGHT}px 1fr ${drawerVisible ? journeyHeight : 0}px`,
          },
    [drawerVisible, immersiveMode, journeyHeight, leftPanelVisible, leftSidebarWidth, rightDockVisible],
  )

  const playerAnimationPreset = useMemo(
    () => resolvePlayerAnimationPreset(playerTrailEnabled, playerHighlightNodes),
    [playerHighlightNodes, playerTrailEnabled],
  )

  const activateJourneyPlayback = (journeyId: string | null) => {
    setPlayerJourney(journeyId)
    setPlayerRunning(Boolean(journeyId))
  }

  const applyPlayerAnimationPreset = (preset: PlayerAnimationPreset): void => {
    if (preset === 'cinematic') {
      setPlayerTrailEnabled(true)
      setPlayerHighlightNodes(true)
      return
    }
    if (preset === 'orb') {
      setPlayerTrailEnabled(false)
      setPlayerHighlightNodes(true)
      return
    }
    setPlayerTrailEnabled(false)
    setPlayerHighlightNodes(false)
  }

  const fitCurrentViewToCanvas = useCallback(() => {
    const canvasPanel = canvasPanelRef.current
    if (!canvasPanel) {
      return
    }
    const rect = canvasPanel.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) {
      return
    }

    const visibleNodes = currentView.nodeIds
      .map((nodeId) => workspace.nodes[nodeId])
      .filter((node): node is NonNullable<(typeof workspace.nodes)[string]> => !!node)
    const contentNodes = visibleNodes.filter((node) => node.kind !== 'boundary')
    const nodesForBounds = contentNodes.length ? contentNodes : visibleNodes

    if (!nodesForBounds.length) {
      setViewport({
        x: rect.width * 0.5 - 120,
        y: rect.height * 0.5 - 60,
        zoom: 1,
      })
      return
    }

    const minX = Math.min(...nodesForBounds.map((node) => node.bounds.x))
    const minY = Math.min(...nodesForBounds.map((node) => node.bounds.y))
    const maxX = Math.max(...nodesForBounds.map((node) => node.bounds.x + node.bounds.w))
    const maxY = Math.max(...nodesForBounds.map((node) => node.bounds.y + node.bounds.h))
    const boundsWidth = Math.max(1, maxX - minX)
    const boundsHeight = Math.max(1, maxY - minY)
    const padding = Math.max(56, Math.min(rect.width, rect.height) * 0.08)
    const availableWidth = Math.max(1, rect.width - padding * 2)
    const availableHeight = Math.max(1, rect.height - padding * 2)
    const zoom = Math.min(availableWidth / boundsWidth, availableHeight / boundsHeight)
    const clampedZoom = Math.max(0.35, Math.min(2.2, zoom))
    const centerX = minX + boundsWidth / 2
    const centerY = minY + boundsHeight / 2

    setViewport({
      x: rect.width / 2 - centerX * clampedZoom,
      y: rect.height / 2 - centerY * clampedZoom,
      zoom: clampedZoom,
    })
  }, [currentView.nodeIds, setViewport, workspace])

  const scheduleFitCurrentView = useCallback(() => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        fitCurrentViewToCanvas()
      })
    })
  }, [fitCurrentViewToCanvas])

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

  const toggleFocusMode = () => {
    setPresentationMode(false)
    setFocusMode((current) => !current)
  }

  const togglePresentationMode = () => {
    setFocusMode(false)
    setPresentationMode((current) => {
      const next = !current
      if (next) {
        setLeftSidebarCollapsed(true)
        setDockCollapsed(true)
        setDrawerCollapsed(true)
        setOpenDesktopMenu(null)
        scheduleFitCurrentView()
      } else {
        setLeftSidebarCollapsed(false)
        setDockCollapsed(false)
        setDrawerCollapsed(false)
      }
      return next
    })
  }

  const toggleLeftSidebar = () => {
    setLeftSidebarCollapsed((current) => !current)
  }

  const toggleDockPanel = () => {
    setDockCollapsed((current) => !current)
  }

  const toggleWorkbench = () => {
    setDrawerCollapsed((current) => !current)
  }

  const toggleDesktopMenu = (menuId: DesktopMenuId) => {
    setOpenDesktopMenu((current) => (current === menuId ? null : menuId))
  }

  const runDesktopMenuAction = (action: () => void) => {
    action()
    setOpenDesktopMenu(null)
  }

  const setTransientStatus = useCallback((message: string, timeoutMs = 2800) => {
    setExportStatus(message)
    window.setTimeout(() => setExportStatus(null), timeoutMs)
  }, [])

  const buildEditorSnapshot = useCallback(
    (): EditorSnapshot => ({
      workspace,
      currentViewId,
      viewport,
    }),
    [currentViewId, viewport, workspace],
  )

  const saveWorkspaceFile = useCallback(
    async (mode: FileWriteMode = 'reuse') => {
      try {
        const snapshot = buildEditorSnapshot()
        const payload = serializeWorkspaceSnapshotFile(snapshot)
        const filename = buildWorkspaceFilename(snapshot.workspace.workspace.name)
        const browserWithFs = window as WorkspaceWindow
        const canUseFsApi = typeof browserWithFs.showSaveFilePicker === 'function'

        if (canUseFsApi) {
          let fileHandle = mode === 'reuse' ? workspaceFileHandleRef.current : null
          if (!fileHandle && browserWithFs.showSaveFilePicker) {
            fileHandle = await browserWithFs.showSaveFilePicker({
              suggestedName: filename,
              types: [
                {
                  description: 'System Journey Viewer Workspace',
                  accept: {
                    'application/json': ['.sjv.json', '.json'],
                  },
                },
              ],
            })
          }
          if (fileHandle) {
            const writable = await fileHandle.createWritable()
            await writable.write(payload)
            await writable.close()
            workspaceFileHandleRef.current = fileHandle
            setExportError(null)
            setTransientStatus(`Workspace file saved: ${fileHandle.name ?? filename}`)
            return
          }
        }

        const blob = new Blob([payload], { type: 'application/json;charset=utf-8' })
        const objectUrl = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = objectUrl
        link.download = filename
        document.body.append(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(objectUrl)
        setExportError(null)
        setTransientStatus(`Workspace file saved: ${filename}`)
      } catch (error) {
        setExportError(error instanceof Error ? error.message : 'Failed to save workspace file.')
      }
    },
    [buildEditorSnapshot, setTransientStatus],
  )

  const createNewWorkspaceFile = useCallback(() => {
    const shouldCreate = window.confirm(
      'Create a new workspace? The current canvas state will be replaced in the editor.',
    )
    if (!shouldCreate) {
      return
    }
    const nextWorkspace = createBlankWorkspace()
    replaceWorkspace(nextWorkspace, BLANK_WORKSPACE_VIEW_ID)
    setViewport(DEFAULT_FILE_VIEWPORT)
    workspaceFileHandleRef.current = null
    setExportError(null)
    setTransientStatus('New workspace created.')
  }, [replaceWorkspace, setViewport, setTransientStatus])

  const loadWorkspacePayload = useCallback(
    (payload: string, options?: { fileName?: string; fileHandle?: WorkspaceFileHandle | null }) => {
      try {
        const snapshot = parseWorkspaceSnapshotFile(payload)
        replaceWorkspace(snapshot.workspace, snapshot.currentViewId)
        setViewport(snapshot.viewport)
        workspaceFileHandleRef.current = options?.fileHandle ?? null
        setExportError(null)
        setTransientStatus(`Workspace file loaded: ${options?.fileName ?? 'workspace file'}`)
        return
      } catch (snapshotError) {
        try {
          const ast = parseLiteDsl(payload)
          const importedWorkspace = liteToFullWorkspace(ast)
          const entryViewId = resolveEntryViewId(importedWorkspace)
          replaceWorkspace(importedWorkspace, entryViewId)
          setViewport(DEFAULT_FILE_VIEWPORT)
          workspaceFileHandleRef.current = options?.fileHandle ?? null
          setDslText(payload)
          setDslError(null)
          setExportError(null)
          setTransientStatus(`DSL loaded: ${options?.fileName ?? 'workspace.dsl'}`)
          return
        } catch (dslError) {
          const snapshotMessage =
            snapshotError instanceof Error ? snapshotError.message : 'Invalid workspace snapshot payload.'
          const dslMessage = dslError instanceof Error ? dslError.message : 'Invalid DSL payload.'
          throw new Error(`${snapshotMessage}\n${dslMessage}`)
        }
      }
    },
    [replaceWorkspace, resolveEntryViewId, setViewport, setTransientStatus],
  )

  const openWorkspaceFilePicker = useCallback(async () => {
    const browserWithFs = window as WorkspaceWindow
    if (typeof browserWithFs.showOpenFilePicker === 'function') {
      try {
        const [fileHandle] = await browserWithFs.showOpenFilePicker({
          multiple: false,
          types: [
            {
              description: 'System Journey Viewer Workspace',
              accept: {
                'application/json': ['.sjv.json', '.json', '.sjv'],
                'text/plain': ['.dsl', '.txt'],
              },
            },
          ],
        })
        if (!fileHandle) {
          return
        }
        const file = await fileHandle.getFile()
        const payload = await file.text()
        loadWorkspacePayload(payload, { fileName: file.name, fileHandle })
        return
      } catch (error) {
        // User canceled picker is expected; ignore unless it is a real error.
        const message = error instanceof Error ? error.message : ''
        if (message && !message.toLowerCase().includes('abort')) {
          setExportError(error instanceof Error ? error.message : 'Failed to load workspace file.')
        }
        return
      }
    }
    snapshotFileInputRef.current?.click()
  }, [loadWorkspacePayload])

  const onWorkspaceFileInputChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const input = event.currentTarget
      const selectedFile = input.files?.[0]
      if (!selectedFile) {
        return
      }
      try {
        const payload = await selectedFile.text()
        loadWorkspacePayload(payload, { fileName: selectedFile.name, fileHandle: null })
      } catch (error) {
        setExportError(
          error instanceof Error ? error.message : 'Failed to load workspace file.',
        )
      } finally {
        input.value = ''
      }
    },
    [loadWorkspacePayload],
  )

  const moveDockToRight = () => {
    setDockPosition('right')
    setDockCollapsed(false)
    if (drawerTab === 'dock') {
      setDrawerTab('journeys')
    }
  }

  const moveDockToBottom = () => {
    setDockPosition('bottom')
    setDrawerTab('dock')
    setDrawerCollapsed(false)
    setDockCollapsed(false)
    setJourneyHeight((current) => Math.max(current, MIN_DOCK_HEIGHT))
  }

  const openDockTab = (tab: DockTab) => {
    setActiveDockTab(tab)
    setDockCollapsed(false)
    if (dockPosition === 'bottom') {
      setDrawerCollapsed(false)
      setDrawerTab('dock')
      setJourneyHeight((current) => Math.max(current, MIN_DOCK_HEIGHT))
    }
  }

  const handleDockTabDragStart = (tab: DockTab) => {
    dockTabDragRef.current = tab
  }

  const handleDockTabDrop = (targetTab: DockTab) => {
    const sourceTab = dockTabDragRef.current
    dockTabDragRef.current = null
    if (!sourceTab || sourceTab === targetTab) {
      return
    }
    setDockTabOrder((current) => {
      const sourceIndex = current.indexOf(sourceTab)
      const targetIndex = current.indexOf(targetTab)
      if (sourceIndex < 0 || targetIndex < 0) {
        return current
      }
      const next = current.slice()
      next.splice(sourceIndex, 1)
      next.splice(targetIndex, 0, sourceTab)
      return next
    })
  }

  const onJourneyDragStart = (journeyId: string) => {
    journeyDragRef.current = journeyId
  }

  const onJourneyDrop = (targetJourneyId: string) => {
    const draggedJourneyId = journeyDragRef.current
    journeyDragRef.current = null
    if (!draggedJourneyId || draggedJourneyId === targetJourneyId) {
      return
    }
    reorderJourneyInCurrentView(draggedJourneyId, targetJourneyId)
  }

  const onJourneyPointerUp = (journeyId: string) => {
    if (!draggedEdgeId || !workspace.edges[draggedEdgeId]) {
      return
    }
    addEdgeToJourney(journeyId, draggedEdgeId)
    setActiveJourney(journeyId)
    activateJourneyPlayback(journeyId)
    setDraggedEdgeId(null)
    setExportError(null)
    setTransientStatus('Edge added to journey.')
  }

  const onJourneyStepDragStart = (journeyId: string, edgeId: string) => {
    journeyStepDragRef.current = { journeyId, edgeId }
  }

  const onJourneyStepDrop = (journeyId: string, targetEdgeId: string) => {
    const draggedStep = journeyStepDragRef.current
    journeyStepDragRef.current = null
    if (!draggedStep || draggedStep.journeyId !== journeyId || draggedStep.edgeId === targetEdgeId) {
      return
    }
    reorderJourneyStep(journeyId, draggedStep.edgeId, targetEdgeId)
  }

  const removeSelectedNodesWithConfirmation = useCallback(() => {
    if (!selectedNodes.length) {
      return false
    }

    const selectedNodeIdSet = new Set(selectedNodes.map((node) => node.id))
    const connectedEdgeIds = currentView.edgeIds.filter((edgeId) => {
      const edge = workspace.edges[edgeId]
      if (!edge) {
        return false
      }
      return selectedNodeIdSet.has(edge.from.nodeId) || selectedNodeIdSet.has(edge.to.nodeId)
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

    const firstSelected = selectedNodes[0]
    const messageParts = [
      selectedNodes.length === 1
        ? `Remove "${firstSelected.name}" from canvas?`
        : `Remove ${selectedNodes.length} selected nodes from canvas?`,
    ]
    if (connectedEdgeIds.length > 0) {
      messageParts.push(`This will also remove ${connectedEdgeIds.length} connected edge(s).`)
    }
    if (affectedJourneyNames.length > 0) {
      messageParts.push(
        `The journeys below will be affected:\n- ${affectedJourneyNames.join('\n- ')}`,
      )
    }
    messageParts.push('Continue?')

    if (!window.confirm(messageParts.join('\n\n'))) {
      return false
    }

    selectedNodes.forEach((node) => removeNode(node.id))
    setTransientStatus(
      selectedNodes.length === 1 ? 'Node removed.' : `${selectedNodes.length} nodes removed.`,
    )
    return true
  }, [currentView.edgeIds, currentView.journeyIds, removeNode, selectedNodes, setTransientStatus, workspace.edges, workspace.journeys])

  const removeSelectedEdgeWithConfirmation = useCallback(() => {
    if (!selectedEdge) {
      return false
    }
    const affectedJourneyNames: string[] = []
    for (const journeyId of currentView.journeyIds) {
      const journey = workspace.journeys[journeyId]
      if (!journey) {
        continue
      }
      if (journey.steps.some((step) => step.edgeId === selectedEdge.id)) {
        affectedJourneyNames.push(journey.name)
      }
    }
    const messageParts = [`Remove edge "${selectedEdge.label || selectedEdge.id}"?`]
    if (affectedJourneyNames.length > 0) {
      messageParts.push(
        `The journeys below will have this step removed:\n- ${affectedJourneyNames.join('\n- ')}`,
      )
    }
    messageParts.push('Continue?')

    if (!window.confirm(messageParts.join('\n\n'))) {
      return false
    }

    removeEdge(selectedEdge.id)
    setTransientStatus('Edge removed.')
    return true
  }, [currentView.journeyIds, removeEdge, selectedEdge, setTransientStatus, workspace.journeys])

  const deleteCurrentSelection = useCallback(() => {
    if (selectedNodes.length > 0) {
      return removeSelectedNodesWithConfirmation()
    }
    if (selectedEdge) {
      return removeSelectedEdgeWithConfirmation()
    }
    return false
  }, [removeSelectedEdgeWithConfirmation, removeSelectedNodesWithConfirmation, selectedEdge, selectedNodes.length])

  const duplicateCurrentSelection = useCallback(() => {
    const duplicated = duplicateSelection()
    if (duplicated.nodeIds.length > 0) {
      setTransientStatus(
        duplicated.nodeIds.length === 1
          ? 'Node duplicated.'
          : `${duplicated.nodeIds.length} nodes duplicated.`,
      )
      return true
    }
    if (duplicated.edgeId) {
      setTransientStatus('Edge duplicated.')
      return true
    }
    return false
  }, [duplicateSelection, setTransientStatus])

  const runAutoArrange = useCallback(() => {
    autoArrangeCurrentView()
    setTransientStatus('Auto arrange applied to current view.')
    setExportError(null)
  }, [autoArrangeCurrentView, setTransientStatus])

  const handleDslEditorBeforeMount = (monaco: Monaco): void => {
    registerJourneyScriptLanguage(monaco)
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
        particleCount: 36,
        spread: 44,
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
        ticks: 132,
        gravity: 1.08,
      })
    }
  }, [playerConfettiNonce])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    const onWindowPointerDown = (event: MouseEvent) => {
      if (!desktopMenuBarRef.current) {
        return
      }
      const target = event.target
      if (target instanceof Node && desktopMenuBarRef.current.contains(target)) {
        return
      }
      setOpenDesktopMenu(null)
    }

    const onWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenDesktopMenu(null)
        return
      }
      if (!openDesktopMenu) {
        return
      }
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
        return
      }
      event.preventDefault()
      const currentIndex = DESKTOP_MENU_ORDER.indexOf(openDesktopMenu)
      if (currentIndex < 0) {
        return
      }
      const direction = event.key === 'ArrowRight' ? 1 : -1
      const nextIndex =
        (currentIndex + direction + DESKTOP_MENU_ORDER.length) % DESKTOP_MENU_ORDER.length
      setOpenDesktopMenu(DESKTOP_MENU_ORDER[nextIndex])
    }

    window.addEventListener('pointerdown', onWindowPointerDown)
    window.addEventListener('keydown', onWindowKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onWindowPointerDown)
      window.removeEventListener('keydown', onWindowKeyDown)
    }
  }, [openDesktopMenu])

  useEffect(() => {
    const onFileShortcut = (event: KeyboardEvent) => {
      if (isTextInputTarget(event.target)) {
        return
      }
      if (event.altKey) {
        return
      }
      const hasCommand = event.ctrlKey || event.metaKey
      if (!hasCommand) {
        return
      }

      const key = event.key.toLowerCase()

      if (key === 'n') {
        event.preventDefault()
        createNewWorkspaceFile()
        return
      }
      if (key === 'o') {
        event.preventDefault()
        void openWorkspaceFilePicker()
        return
      }
      if (key === 's' && event.shiftKey) {
        event.preventDefault()
        void saveWorkspaceFile('prompt')
        return
      }
      if (key === 's') {
        event.preventDefault()
        persist()
        void saveWorkspaceFile('reuse')
        return
      }
      if (key === 'r') {
        event.preventDefault()
        hydrate()
        setExportError(null)
        setTransientStatus('Workspace reloaded from browser storage.')
      }
    }

    window.addEventListener('keydown', onFileShortcut)
    return () => window.removeEventListener('keydown', onFileShortcut)
  }, [
    createNewWorkspaceFile,
    hydrate,
    openWorkspaceFilePicker,
    persist,
    saveWorkspaceFile,
    setTransientStatus,
  ])

  useEffect(() => {
    if (immersiveMode) {
      setOpenDesktopMenu(null)
    }
  }, [immersiveMode])

  useEffect(() => {
    const clearDraggedEdge = () => {
      setDraggedEdgeId(null)
    }
    window.addEventListener('pointerup', clearDraggedEdge)
    window.addEventListener('pointercancel', clearDraggedEdge)
    window.addEventListener('blur', clearDraggedEdge)
    return () => {
      window.removeEventListener('pointerup', clearDraggedEdge)
      window.removeEventListener('pointercancel', clearDraggedEdge)
      window.removeEventListener('blur', clearDraggedEdge)
    }
  }, [])

  useEffect(() => {
    if (activeTool === 'connector' || pendingConnectionFrom) {
      setDraggedEdgeId(null)
    }
  }, [activeTool, pendingConnectionFrom])

  useEffect(() => {
    if (!draggedEdgeId) {
      return
    }
    const previousCursor = document.body.style.cursor
    document.body.style.cursor = 'copy'
    return () => {
      document.body.style.cursor = previousCursor
    }
  }, [draggedEdgeId])

  useEffect(() => {
    if (!presentationMode) {
      return
    }
    scheduleFitCurrentView()
  }, [currentViewId, presentationMode, scheduleFitCurrentView])

  useEffect(() => {
    const onModeShortcut = (event: KeyboardEvent) => {
      if (isTextInputTarget(event.target)) {
        return
      }
      if (event.key === 'f' || event.key === 'F') {
        event.preventDefault()
        setPresentationMode(false)
        setFocusMode((current) => !current)
        return
      }
      if (event.key === 'p' || event.key === 'P') {
        event.preventDefault()
        setFocusMode(false)
        setPresentationMode((current) => {
          const next = !current
          if (next) {
            setLeftSidebarCollapsed(true)
            setDockCollapsed(true)
            setDrawerCollapsed(true)
            setOpenDesktopMenu(null)
            window.requestAnimationFrame(() => {
              window.requestAnimationFrame(() => {
                fitCurrentViewToCanvas()
              })
            })
          } else {
            setLeftSidebarCollapsed(false)
            setDockCollapsed(false)
            setDrawerCollapsed(false)
          }
          return next
        })
        return
      }
      if (event.key === 'Escape' && (focusMode || presentationMode)) {
        event.preventDefault()
        setFocusMode(false)
        if (presentationMode) {
          setLeftSidebarCollapsed(false)
          setDockCollapsed(false)
          setDrawerCollapsed(false)
        }
        setPresentationMode(false)
      }
    }

    window.addEventListener('keydown', onModeShortcut)
    return () => window.removeEventListener('keydown', onModeShortcut)
  }, [fitCurrentViewToCanvas, focusMode, presentationMode])

  useEffect(() => {
    if (dockPosition !== 'bottom' && drawerTab === 'dock') {
      setDrawerTab('journeys')
    }
  }, [dockPosition, drawerTab])

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
    const onEntityShortcut = (event: KeyboardEvent) => {
      if (isTextInputTarget(event.target)) {
        return
      }
      const key = event.key.toLowerCase()
      const hasCommand = event.ctrlKey || event.metaKey

      if ((event.key === 'Delete' || event.key === 'Backspace') && !hasCommand) {
        event.preventDefault()
        deleteCurrentSelection()
        return
      }

      if (hasCommand && !event.altKey && key === 'd') {
        event.preventDefault()
        duplicateCurrentSelection()
        return
      }

      if (hasCommand && event.shiftKey && !event.altKey && key === 'l') {
        event.preventDefault()
        runAutoArrange()
      }
    }

    window.addEventListener('keydown', onEntityShortcut)
    return () => window.removeEventListener('keydown', onEntityShortcut)
  }, [deleteCurrentSelection, duplicateCurrentSelection, runAutoArrange])

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

  type PlayerExportSnapshot = {
    playerJourneyId: string | null
    playerStepIndex: number
    playerIsRunning: boolean
    playerLoop: boolean
    playerSpeedMs: number
    journeyFilterId: string | null
  }

  const resolveCurrentExportJourneyId = (): string | null => {
    const candidates = [journeyFilterId, playerJourneyId, activeJourneyId]
    for (const candidate of candidates) {
      if (candidate && workspace.journeys[candidate]) {
        return candidate
      }
    }
    for (const journeyId of currentView.journeyIds) {
      if (workspace.journeys[journeyId]) {
        return journeyId
      }
    }
    return null
  }

  const restorePlayerAfterAnimatedExport = (snapshot: PlayerExportSnapshot): void => {
    setPlayerRunning(false)
    setPlayerLoop(snapshot.playerLoop)
    setPlayerSpeedMs(snapshot.playerSpeedMs)
    setJourneyFilter(snapshot.journeyFilterId)
    if (!snapshot.playerJourneyId || !workspace.journeys[snapshot.playerJourneyId]) {
      setPlayerJourney(null)
      return
    }

    setPlayerJourney(snapshot.playerJourneyId)
    resetPlayer()
    for (let index = 0; index < snapshot.playerStepIndex; index += 1) {
      stepPlayer()
    }
    setPlayerRunning(snapshot.playerIsRunning)
  }

  const waitForCanvasFrames = async (frames = 2): Promise<void> => {
    for (let index = 0; index < Math.max(1, frames); index += 1) {
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve())
      })
    }
  }

  const exportAnimatedFromCanvas = async (format: 'gif' | 'mp4' | 'svg') => {
    if (animatedExportRunning) {
      return
    }
    const svg = document.querySelector('.diagram-canvas')
    const trailCanvas = document.querySelector('.trail-canvas')
    if (!(svg instanceof SVGSVGElement) || !(trailCanvas instanceof HTMLCanvasElement)) {
      setExportError('Canvas não encontrado para export animado.')
      return
    }

    const journeyId = resolveCurrentExportJourneyId()
    if (!journeyId) {
      setExportError('Selecione uma jornada para exportar.')
      return
    }
    const journey = workspace.journeys[journeyId]
    if (!journey || !journey.steps.length) {
      setExportError('A jornada selecionada não possui passos para exportação animada.')
      return
    }

    const filenameBase = `${workspace.workspace.name}-${journey.name}`
    const exportSpeedMs = resolveExportPlaybackSpeedMs(playerSpeedMs)
    const durationMs = resolveJourneyAnimationDurationMs(journey.steps.length, exportSpeedMs)

    setExportError(null)
    setAnimatedExportRunning(true)

    if (format === 'svg') {
      try {
        setExportStatus('Gerando SVG animado...')
        exportAnimatedJourneySvg({
          svg,
          workspace,
          journey,
          playerSpeedMs: exportSpeedMs,
          filenameBase,
        })
        setExportStatus('SVG animado exportado.')
        window.setTimeout(() => setExportStatus(null), 2800)
      } catch (error) {
        setExportError(error instanceof Error ? error.message : 'Falha ao exportar SVG animado.')
      } finally {
        setAnimatedExportRunning(false)
      }
      return
    }

    const snapshot: PlayerExportSnapshot = {
      playerJourneyId,
      playerStepIndex,
      playerIsRunning,
      playerLoop,
      playerSpeedMs,
      journeyFilterId,
    }

    try {
      setExportStatus('Preparando captura animada...')
      setPlayerLoop(false)
      setPlayerSpeedMs(exportSpeedMs)
      setPlayerJourney(journeyId)
      resetPlayer()
      setPlayerRunning(true)
      await waitForCanvasFrames(4)

      const resolveBaseKey = () => {
        const state = useEditorStore.getState()
        return [
          state.playerJourneyId ?? 'none',
          state.playerStepIndex,
          state.playerIsRunning ? 1 : 0,
          state.playerConfettiNonce,
        ].join(':')
      }

      if (format === 'gif') {
        setExportStatus('Renderizando GIF animado...')
        await exportAnimatedJourneyGif({
          svg,
          trailCanvas,
          canvasPanel: canvasPanelRef.current,
          durationMs,
          resolveBaseKey,
          filenameBase,
        })
        setExportStatus('GIF animado exportado.')
      } else {
        setExportStatus('Gravando vídeo da jornada...')
        const video = await exportAnimatedJourneyVideo({
          svg,
          trailCanvas,
          canvasPanel: canvasPanelRef.current,
          durationMs,
          resolveBaseKey,
          filenameBase,
          preferredExtension: 'mp4',
          allowFallback: false,
        })
        setExportStatus(
          video.extension === 'mp4'
            ? 'Vídeo MP4 (compatível com mobile) exportado.'
            : 'Vídeo exportado.',
        )
      }
      window.setTimeout(() => setExportStatus(null), 3200)
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Falha ao exportar jornada animada.')
    } finally {
      restorePlayerAfterAnimatedExport(snapshot)
      setAnimatedExportRunning(false)
    }
  }

  const runCodexAssistForDsl = async () => {
    const trimmedDsl = dslText.trim()
    if (!trimmedDsl) {
      setDslError('Preencha a DSL antes de executar o Codex.')
      return
    }
    const instruction = dslCodexInstruction.trim()
    if (!instruction) {
      setDslError('Informe uma instrução para o Codex.')
      return
    }

    setDslCodexRunning(true)
    setDslError(null)
    setDslCodexStatus(null)
    try {
      const result = await requestCodexDslAssist({
        dslText: trimmedDsl,
        instruction,
        threadId: dslCodexThreadId,
      })
      setDslCodexThreadId(result.threadId)
      const extractedDsl = extractDslFromCodexResponse(result.finalResponse)
      if (!extractedDsl) {
        setDslCodexStatus(
          'Codex respondeu sem bloco DSL. Ajuste a instrução para retornar o resultado em ```dsl ... ```.',
        )
        return
      }
      setDslText(extractedDsl)
      setDslCodexStatus('DSL atualizada com sucesso via Codex.')
    } catch (error) {
      setDslError(error instanceof Error ? error.message : 'Falha ao executar Codex.')
    } finally {
      setDslCodexRunning(false)
    }
  }

  const dockLabelByTab: Record<DockTab, string> = {
    inspector: 'Inspector',
    journeys: 'Journeys',
  }
  const resolvedActiveDockTab = dockTabOrder.includes(activeDockTab)
    ? activeDockTab
    : dockTabOrder[0]

  const inspectorDockContent = (
    <div className="dock-content-section">
      <h2>Inspector</h2>
      {!selectedNode && !selectedEdge ? <p>Selecione um node ou edge no canvas.</p> : null}
      {selectedNodes.length > 1 ? (
        <p>{selectedNodes.length} componentes selecionados (foco atual: {selectedNode?.name ?? 'n/a'}).</p>
      ) : null}
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
                  isHexColor(selectedNode.style?.fillColor)
                    ? selectedNode.style?.fillColor ?? '#ffffff'
                    : '#ffffff'
                }
                onChange={(event) => setNodeColor(selectedNode.id, event.target.value)}
              />
              <label>Últimas 10 cores</label>
              <div className="node-color-presets">
                {nodeColorPresets.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={
                      selectedNode.style?.fillColor === color
                        ? 'node-color-chip node-color-chip-active'
                        : 'node-color-chip'
                    }
                    style={{ background: color }}
                    title={color}
                    onClick={() => setNodeColor(selectedNode.id, color)}
                  />
                ))}
              </div>
            </>
          ) : null}
          <div className="inspector-actions">
            <button type="button" onClick={() => duplicateCurrentSelection()}>
              Duplicate
            </button>
            <button type="button" onClick={() => deleteCurrentSelection()}>
              Delete
            </button>
          </div>
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
          <label htmlFor="edge-label-position">Label Position</label>
          <input
            id="edge-label-position"
            type="range"
            min={0.08}
            max={0.92}
            step={0.01}
            value={selectedEdge.style.labelPosition ?? 0.5}
            onChange={(event) => setEdgeLabelPosition(selectedEdge.id, Number(event.target.value))}
          />
          <span className="edge-label-position-value">
            {Math.round((selectedEdge.style.labelPosition ?? 0.5) * 100)}%
          </span>
          <div className="inspector-actions">
            <button type="button" onClick={() => duplicateCurrentSelection()}>
              Duplicate
            </button>
            <button type="button" onClick={() => deleteCurrentSelection()}>
              Delete
            </button>
          </div>
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
    </div>
  )

  const journeysDockContent = (
    <div className="dock-content-section">
      <h2>Journeys</h2>
      <div className="journey-side-create">
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
            activateJourneyPlayback(journeyId)
          }}
        >
          Criar jornada
        </button>
      </div>
      <div className="journey-side-filter">
        <select
          value={journeyFilterId ?? ''}
          onChange={(event) => {
            const nextJourneyId = event.target.value || null
            setJourneyFilter(nextJourneyId)
            if (nextJourneyId) {
              setActiveJourney(nextJourneyId)
              activateJourneyPlayback(nextJourneyId)
            }
          }}
        >
          <option value="">Filtro: todas jornadas</option>
          {viewJourneys.map((journey) => (
            <option key={journey.id} value={journey.id}>
              {journey.name}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => setJourneyFilter(null)}>
          Limpar filtro
        </button>
      </div>
      <div className="journey-side-player">
        <select value={playerJourneyId ?? ''} onChange={(event) => activateJourneyPlayback(event.target.value || null)}>
          <option value="">Player: selecione jornada</option>
          {viewJourneys.map((journey) => (
            <option key={journey.id} value={journey.id}>
              {journey.name}
            </option>
          ))}
        </select>
        <select
          value={playerAnimationPreset}
          onChange={(event) => applyPlayerAnimationPreset(event.target.value as PlayerAnimationPreset)}
        >
          <option value="cinematic">Animação: Cinematic</option>
          <option value="orb">Animação: Orb only</option>
          <option value="minimal">Animação: Minimal</option>
        </select>
        <div className="journey-player-actions journey-player-actions-iconic" role="group" aria-label="Controles do player">
          <button type="button" disabled={!playerJourney} onClick={() => prevPlayerStep()} aria-label="Passo anterior">
            <SkipBack size={15} />
          </button>
          <button
            type="button"
            disabled={!playerJourney}
            onClick={() => setPlayerRunning(!playerIsRunning)}
            aria-label={playerIsRunning ? 'Pausar player' : 'Iniciar player'}
          >
            {playerIsRunning ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button type="button" disabled={!playerJourney} onClick={() => stepPlayer()} aria-label="Próximo passo">
            <SkipForward size={15} />
          </button>
          <button type="button" disabled={!playerJourney} onClick={() => resetPlayer()} aria-label="Resetar player">
            <RotateCcw size={15} />
          </button>
        </div>
        <div className="journey-player-toggles">
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
            Highlight
          </label>
          <label className="toggle-inline">
            <input
              type="checkbox"
              checked={playerTrailEnabled}
              onChange={(event) => setPlayerTrailEnabled(event.target.checked)}
            />
            Trail
          </label>
        </div>
        <label className="journey-speed-control">
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
      <div className="journey-list journey-list-sidebar">
        {viewJourneys.map((journey) => (
          <div
            key={journey.id}
            className={[
              'journey-item',
              activeJourneyId === journey.id ? 'journey-active' : '',
              draggedEdgeId ? 'journey-item-edge-drop-target' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            draggable
            onDragStart={() => onJourneyDragStart(journey.id)}
            onDragEnd={() => {
              journeyDragRef.current = null
            }}
            onDragOver={(event) => {
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
            }}
            onDrop={() => onJourneyDrop(journey.id)}
            onPointerUp={() => onJourneyPointerUp(journey.id)}
            onClick={() => {
              setActiveJourney(journey.id)
              activateJourneyPlayback(journey.id)
            }}
          >
            <span className="journey-drag-handle" aria-hidden="true">
              <GripVertical size={13} />
            </span>
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
    </div>
  )

  const dockHeaderBar = (
    <div className="topbar-dock-strip dock-tab-strip">
      {dockTabOrder.map((tab) => (
        <button
          key={tab}
          type="button"
          draggable
          className={resolvedActiveDockTab === tab ? 'dock-tab dock-tab-active' : 'dock-tab'}
          onClick={() => openDockTab(tab)}
          onDragStart={() => handleDockTabDragStart(tab)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => handleDockTabDrop(tab)}
          onDragEnd={() => {
            dockTabDragRef.current = null
          }}
        >
          <GripVertical size={12} />
          <span>{dockLabelByTab[tab]}</span>
        </button>
      ))}
      <span className="dock-tab-spacer" />
      <div className="dock-placement-actions">
        <button
          type="button"
          className={dockPosition === 'right' ? 'dock-placement dock-placement-active' : 'dock-placement'}
          onClick={() => moveDockToRight()}
          title="Dock à direita"
          aria-label="Dock à direita"
        >
          <PanelRightOpen size={14} />
        </button>
        <button
          type="button"
          className={dockPosition === 'bottom' ? 'dock-placement dock-placement-active' : 'dock-placement'}
          onClick={() => moveDockToBottom()}
          title="Dock embaixo"
          aria-label="Dock embaixo"
        >
          <PanelBottomOpen size={14} />
        </button>
      </div>
    </div>
  )

  const dockPanel = (
    <div className={dockPosition === 'right' ? 'dock-panel dock-panel-right' : 'dock-panel dock-panel-bottom'}>
      <div className="dock-tab-body">
        {resolvedActiveDockTab === 'inspector' ? inspectorDockContent : journeysDockContent}
      </div>
    </div>
  )

  return (
    <div
      ref={layoutRef}
      className={`app-layout ${focusMode ? 'app-layout-focus' : ''} ${
        presentationMode ? 'app-layout-presentation' : ''
      } ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}
      style={layoutStyle}
    >
      <input
        ref={snapshotFileInputRef}
        type="file"
        accept=".json,.sjv,.sjv.json,.dsl,.txt,application/json,text/plain"
        hidden
        onChange={(event) => {
          void onWorkspaceFileInputChange(event)
        }}
      />
      <header className="topbar">
        <div className="topbar-meta">
          <div className="topbar-brand-row">
            <div className="app-logo-badge" aria-hidden="true">
              <svg viewBox="0 0 64 64">
                <defs>
                  <linearGradient id="sjvLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#22c55e" />
                  </linearGradient>
                </defs>
                <rect x="6" y="6" width="52" height="52" rx="14" fill="url(#sjvLogoGradient)" opacity="0.18" />
                <path
                  d="M17 20 H29 M35 20 H47 M17 44 H29 M35 44 H47 M23 20 V44 M41 20 V44"
                  stroke="url(#sjvLogoGradient)"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
                <circle cx="23" cy="20" r="4.2" fill="#38bdf8" />
                <circle cx="41" cy="20" r="4.2" fill="#22c55e" />
                <circle cx="23" cy="44" r="4.2" fill="#22c55e" />
                <circle cx="41" cy="44" r="4.2" fill="#38bdf8" />
              </svg>
            </div>
            <div className="app-brand-copy">
              <h1>{workspace.workspace.name}</h1>
              <p>{breadcrumb.map((viewId) => workspace.views[viewId]?.name ?? viewId).join(' / ')}</p>
            </div>
          </div>
          {!presentationMode ? (
            <nav className="desktop-menu-bar" aria-label="Menu principal" ref={desktopMenuBarRef}>
            <div
              className={openDesktopMenu === 'file' ? 'desktop-menu desktop-menu-open' : 'desktop-menu'}
              onMouseEnter={() => {
                if (openDesktopMenu) {
                  setOpenDesktopMenu('file')
                }
              }}
            >
              <button
                type="button"
                className="desktop-menu-trigger"
                aria-haspopup="menu"
                aria-expanded={openDesktopMenu === 'file'}
                aria-controls="desktop-menu-file"
                onClick={() => toggleDesktopMenu('file')}
              >
                File
              </button>
              {openDesktopMenu === 'file' ? (
                <div id="desktop-menu-file" className="desktop-menu-list" role="menu" aria-label="File menu">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => createNewWorkspaceFile())}
                  >
                    <span>New File</span>
                    <kbd>Ctrl+N</kbd>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runDesktopMenuAction(() => {
                        void openWorkspaceFilePicker()
                      })
                    }
                  >
                    <span>Open File...</span>
                    <kbd>Ctrl+O</kbd>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runDesktopMenuAction(() => {
                        void saveWorkspaceFile('reuse')
                      })
                    }
                  >
                    <span>Save File</span>
                    <kbd>Ctrl+S</kbd>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runDesktopMenuAction(() => {
                        void saveWorkspaceFile('prompt')
                      })
                    }
                  >
                    <span>Save File As...</span>
                    <kbd>Ctrl+Shift+S</kbd>
                  </button>
                  <button type="button" role="menuitem" onClick={() => runDesktopMenuAction(() => persist())}>
                    <span>Save Snapshot</span>
                  </button>
                  <button type="button" role="menuitem" onClick={() => runDesktopMenuAction(() => hydrate())}>
                    <span>Reload Snapshot</span>
                    <kbd>Ctrl+R</kbd>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runDesktopMenuAction(() => {
                        void exportFromCanvas('svg')
                      })
                    }
                  >
                    <span>Export SVG</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runDesktopMenuAction(() => {
                        void exportFromCanvas('png')
                      })
                    }
                  >
                    <span>Export PNG</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runDesktopMenuAction(() => {
                        void exportFromCanvas('pdf')
                      })
                    }
                  >
                    <span>Export PDF</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={animatedExportRunning}
                    onClick={() =>
                      runDesktopMenuAction(() => {
                        void exportAnimatedFromCanvas('gif')
                      })
                    }
                  >
                    <span>{animatedExportRunning ? 'Exporting...' : 'Export GIF'}</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={animatedExportRunning}
                    onClick={() =>
                      runDesktopMenuAction(() => {
                        void exportAnimatedFromCanvas('mp4')
                      })
                    }
                  >
                    <span>{animatedExportRunning ? 'Exporting...' : 'Export MP4'}</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={animatedExportRunning}
                    onClick={() =>
                      runDesktopMenuAction(() => {
                        void exportAnimatedFromCanvas('svg')
                      })
                    }
                  >
                    <span>{animatedExportRunning ? 'Exporting...' : 'Export Animated SVG'}</span>
                  </button>
                  <button type="button" role="menuitem" onClick={() => runDesktopMenuAction(() => resetWorkspace())}>
                    <span>Reset Workspace</span>
                  </button>
                </div>
              ) : null}
            </div>
            <div
              className={openDesktopMenu === 'edit' ? 'desktop-menu desktop-menu-open' : 'desktop-menu'}
              onMouseEnter={() => {
                if (openDesktopMenu) {
                  setOpenDesktopMenu('edit')
                }
              }}
            >
              <button
                type="button"
                className="desktop-menu-trigger"
                aria-haspopup="menu"
                aria-expanded={openDesktopMenu === 'edit'}
                aria-controls="desktop-menu-edit"
                onClick={() => toggleDesktopMenu('edit')}
              >
                Edit
              </button>
              {openDesktopMenu === 'edit' ? (
                <div id="desktop-menu-edit" className="desktop-menu-list" role="menu" aria-label="Edit menu">
                  <button type="button" role="menuitem" onClick={() => runDesktopMenuAction(() => navigateBack())}>
                    <span>Back</span>
                    <kbd>Alt+←</kbd>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => setActiveTool('select'))}
                  >
                    <span>Select Tool</span>
                    <kbd>V</kbd>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => setActiveTool('connector'))}
                  >
                    <span>Connector Tool</span>
                    <kbd>C</kbd>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!selectedNodes.length && !selectedEdge}
                    onClick={() => runDesktopMenuAction(() => duplicateCurrentSelection())}
                  >
                    <span>Duplicate Selection</span>
                    <kbd>Ctrl+D</kbd>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!selectedNodes.length && !selectedEdge}
                    onClick={() => runDesktopMenuAction(() => deleteCurrentSelection())}
                  >
                    <span>Delete Selection</span>
                    <kbd>Del</kbd>
                  </button>
                </div>
              ) : null}
            </div>
            <div
              className={openDesktopMenu === 'view' ? 'desktop-menu desktop-menu-open' : 'desktop-menu'}
              onMouseEnter={() => {
                if (openDesktopMenu) {
                  setOpenDesktopMenu('view')
                }
              }}
            >
              <button
                type="button"
                className="desktop-menu-trigger"
                aria-haspopup="menu"
                aria-expanded={openDesktopMenu === 'view'}
                aria-controls="desktop-menu-view"
                onClick={() => toggleDesktopMenu('view')}
              >
                View
              </button>
              {openDesktopMenu === 'view' ? (
                <div id="desktop-menu-view" className="desktop-menu-list" role="menu" aria-label="View menu">
                  <button type="button" role="menuitem" onClick={() => runDesktopMenuAction(() => zoomByFactor(1.1))}>
                    <span>Zoom In</span>
                    <kbd>Ctrl+</kbd>
                  </button>
                  <button type="button" role="menuitem" onClick={() => runDesktopMenuAction(() => zoomByFactor(0.9))}>
                    <span>Zoom Out</span>
                    <kbd>Ctrl-</kbd>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => runAutoArrange())}
                  >
                    <span>Auto Arrange</span>
                    <kbd>Ctrl+Shift+L</kbd>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => setGridEnabled(!gridEnabled))}
                  >
                    <span>{gridEnabled ? 'Hide Grid' : 'Show Grid'}</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => setSnapEnabled(!snapEnabled))}
                  >
                    <span>{snapEnabled ? 'Disable Snap' : 'Enable Snap'}</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => setTheme(theme === 'dark' ? 'light' : 'dark'))}
                  >
                    <span>{theme === 'dark' ? 'Use Light Theme' : 'Use Dark Theme'}</span>
                  </button>
                  <button type="button" role="menuitem" onClick={() => runDesktopMenuAction(() => toggleFocusMode())}>
                    <span>{focusMode ? 'Exit Focus Mode' : 'Focus Mode'}</span>
                    <kbd>F</kbd>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => togglePresentationMode())}
                  >
                    <span>{presentationMode ? 'Exit Presentation' : 'Presentation Mode'}</span>
                    <kbd>P</kbd>
                  </button>
                </div>
              ) : null}
            </div>
            <div
              className={openDesktopMenu === 'insert' ? 'desktop-menu desktop-menu-open' : 'desktop-menu'}
              onMouseEnter={() => {
                if (openDesktopMenu) {
                  setOpenDesktopMenu('insert')
                }
              }}
            >
              <button
                type="button"
                className="desktop-menu-trigger"
                aria-haspopup="menu"
                aria-expanded={openDesktopMenu === 'insert'}
                aria-controls="desktop-menu-insert"
                onClick={() => toggleDesktopMenu('insert')}
              >
                Insert
              </button>
              {openDesktopMenu === 'insert' ? (
                <div
                  id="desktop-menu-insert"
                  className="desktop-menu-list"
                  role="menu"
                  aria-label="Insert menu"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => loadShowcaseWorkspace())}
                  >
                    <span>Load Showcase</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runDesktopMenuAction(() => {
                        setFocusMode(false)
                        setPresentationMode(false)
                        setDrawerCollapsed(false)
                        switchDrawerTab('journeys')
                      })
                    }
                  >
                    <span>Open Journey Timeline</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runDesktopMenuAction(() => {
                        setFocusMode(false)
                        setPresentationMode(false)
                        setDrawerCollapsed(false)
                        switchDrawerTab('dsl')
                      })
                    }
                  >
                    <span>Open DSL Editor</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runDesktopMenuAction(() => {
                        setFocusMode(false)
                        setPresentationMode(false)
                        openDockTab(resolvedActiveDockTab)
                      })
                    }
                  >
                    <span>Open Dock Panel</span>
                  </button>
                </div>
              ) : null}
            </div>
            </nav>
          ) : null}
          {!immersiveMode ? dockHeaderBar : null}
          {!presentationMode ? (
            <div className="mode-indicators">
              <span className={activeTool === 'connector' ? 'mode-pill mode-pill-active' : 'mode-pill'}>
                {activeTool === 'connector' ? 'Modo: Connector' : 'Modo: Select'}
              </span>
              <span className="mode-pill">Camada: {currentViewModeLabel}</span>
              <span className={immersiveMode ? 'mode-pill mode-pill-active' : 'mode-pill'}>
                View: {presentationMode ? 'Presentation' : focusMode ? 'Focus' : 'Studio'}
              </span>
              <span className={playerIsRunning ? 'mode-pill mode-pill-playing' : 'mode-pill'}>
                Player: {playerModeLabel}
              </span>
            </div>
          ) : (
            <div className="mode-indicators mode-indicators-presentation">
              <span className="mode-pill mode-pill-active">View: Presentation</span>
              <span className={playerIsRunning ? 'mode-pill mode-pill-playing' : 'mode-pill'}>
                Step {playerStepIndex + 1}/{playerJourney?.steps.length ?? 0}
              </span>
            </div>
          )}
        </div>
        <div className="topbar-actions">
          {presentationMode ? (
            <div className="presentation-toolbar">
              <select
                className="presentation-select"
                value={playerJourneyId ?? ''}
                onChange={(event) => {
                  const nextJourneyId = event.target.value || null
                  activateJourneyPlayback(nextJourneyId)
                  if (nextJourneyId) {
                    setActiveJourney(nextJourneyId)
                  }
                }}
              >
                <option value="">Player: selecione jornada</option>
                {viewJourneys.map((journey) => (
                  <option key={journey.id} value={journey.id}>
                    {journey.name}
                  </option>
                ))}
              </select>
              <select
                className="presentation-select"
                value={playerAnimationPreset}
                onChange={(event) => applyPlayerAnimationPreset(event.target.value as PlayerAnimationPreset)}
              >
                <option value="cinematic">Animação: Cinematic</option>
                <option value="orb">Animação: Orb only</option>
                <option value="minimal">Animação: Minimal</option>
              </select>
              <div className="journey-player-actions journey-player-actions-iconic" role="group" aria-label="Controles do player">
                <button type="button" disabled={!playerJourney} onClick={() => prevPlayerStep()} aria-label="Passo anterior">
                  <SkipBack size={15} />
                </button>
                <button
                  type="button"
                  disabled={!playerJourney}
                  onClick={() => setPlayerRunning(!playerIsRunning)}
                  aria-label={playerIsRunning ? 'Pausar player' : 'Iniciar player'}
                >
                  {playerIsRunning ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button type="button" disabled={!playerJourney} onClick={() => stepPlayer()} aria-label="Próximo passo">
                  <SkipForward size={15} />
                </button>
                <button type="button" disabled={!playerJourney} onClick={() => resetPlayer()} aria-label="Resetar player">
                  <RotateCcw size={15} />
                </button>
              </div>
              <label className="journey-speed-control presentation-speed-control">
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
              <button
                type="button"
                className="presentation-export-button"
                disabled={!playerJourney || animatedExportRunning}
                onClick={() => {
                  void exportAnimatedFromCanvas('gif')
                }}
              >
                {animatedExportRunning ? 'Exportando...' : 'Exportar GIF'}
              </button>
              <button
                type="button"
                className="presentation-export-button"
                disabled={!playerJourney || animatedExportRunning}
                onClick={() => {
                  void exportAnimatedFromCanvas('mp4')
                }}
              >
                {animatedExportRunning ? 'Exportando...' : 'Exportar MP4'}
              </button>
              <button
                type="button"
                className="presentation-export-button"
                disabled={!playerJourney || animatedExportRunning}
                onClick={() => {
                  void exportAnimatedFromCanvas('svg')
                }}
              >
                {animatedExportRunning ? 'Exportando...' : 'Exportar SVG animado'}
              </button>
              <button type="button" className="focus-toggle-button" onClick={() => togglePresentationMode()}>
                Sair apresentação
              </button>
            </div>
          ) : (
            <>
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
              <button type="button" onClick={() => zoomByFactor(1.1)}>
                Zoom +
              </button>
              <button type="button" onClick={() => zoomByFactor(0.9)}>
                Zoom -
              </button>
              <button type="button" onClick={() => runAutoArrange()}>
                Auto layout
              </button>
              <button
                type="button"
                className="icon-toggle-button"
                onClick={() => setGridEnabled(!gridEnabled)}
                title={gridEnabled ? 'Ocultar grid' : 'Mostrar grid'}
              >
                <Dock size={14} />
                <span>{gridEnabled ? 'Grid on' : 'Grid off'}</span>
              </button>
              <button
                type="button"
                className="icon-toggle-button"
                onClick={() => setSnapEnabled(!snapEnabled)}
                title={snapEnabled ? 'Desabilitar snap' : 'Habilitar snap'}
              >
                {snapEnabled ? <Eye size={14} /> : <EyeOff size={14} />}
                <span>{snapEnabled ? 'Snap on' : 'Snap off'}</span>
              </button>
              <button
                type="button"
                className="icon-toggle-button"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
              >
                <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>
              </button>
              <button
                type="button"
                className="icon-toggle-button"
                onClick={() => toggleLeftSidebar()}
                title={leftSidebarCollapsed ? 'Mostrar paleta' : 'Ocultar paleta'}
              >
                {leftSidebarCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
              </button>
              <button
                type="button"
                className="icon-toggle-button"
                onClick={() => toggleDockPanel()}
                title={dockCollapsed ? 'Mostrar dock' : 'Ocultar dock'}
              >
                {dockPosition === 'bottom' ? (
                  dockCollapsed ? (
                    <PanelBottomOpen size={15} />
                  ) : (
                    <PanelBottomClose size={15} />
                  )
                ) : dockCollapsed ? (
                  <PanelRightOpen size={15} />
                ) : (
                  <PanelRightClose size={15} />
                )}
              </button>
              <button
                type="button"
                className="icon-toggle-button"
                onClick={() => toggleWorkbench()}
                title={drawerCollapsed ? 'Mostrar workbench' : 'Ocultar workbench'}
              >
                {drawerCollapsed ? <PanelBottomOpen size={15} /> : <PanelBottomClose size={15} />}
              </button>
              <button type="button" className="focus-toggle-button" onClick={() => toggleFocusMode()}>
                {focusMode ? 'Sair foco' : 'Foco'}
              </button>
              <button type="button" className="focus-toggle-button" onClick={() => togglePresentationMode()}>
                <Presentation size={14} />
                <span>{presentationMode ? 'Sair apresentação' : 'Presentation mode'}</span>
              </button>
            </>
          )}
        </div>
        {exportError ? <p className="topbar-error">{exportError}</p> : null}
        {!exportError && exportStatus ? <p className="topbar-status">{exportStatus}</p> : null}
      </header>
      {!immersiveMode && leftPanelVisible ? (
        <div
          className="layout-splitter layout-splitter-left"
          style={{ left: leftSidebarWidth - 3, top: TOPBAR_HEIGHT, bottom: drawerVisible ? journeyHeight : 0 }}
          onPointerDown={onLeftSplitterPointerDown}
          onPointerMove={onLeftSplitterPointerMove}
          onPointerUp={stopLeftResize}
          onPointerCancel={stopLeftResize}
        />
      ) : null}
      {!immersiveMode && drawerVisible ? (
        <div
          className="layout-splitter layout-splitter-journey"
          style={{ bottom: journeyHeight - 3 }}
          onPointerDown={onJourneySplitterPointerDown}
          onPointerMove={onJourneySplitterPointerMove}
          onPointerUp={stopJourneyResize}
          onPointerCancel={stopJourneyResize}
        />
      ) : null}
      {!immersiveMode && leftPanelVisible ? (
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
      ) : null}
      <main
        className={`canvas-panel ${gridEnabled && !presentationMode ? 'canvas-panel-grid-visible' : 'canvas-panel-grid-hidden'} ${
          presentationMode ? 'canvas-panel-presentation' : ''
        }`}
        ref={canvasPanelRef}
      >
        {!presentationMode && activeTool === 'connector' ? (
          <p className="canvas-hint">
            {pendingConnectionFrom
              ? `Selecione destino para conectar a partir de ${pendingConnectionFrom}${pendingConnectionPortId ? `:${pendingConnectionPortId}` : ''}`
              : 'Arraste de uma alça para outra alça para criar edge'}
          </p>
        ) : null}
        {!presentationMode && currentView.kind === 'container' ? (
          <p className="canvas-hint secondary-hint">
            Double-click abre drilldown existente. Ctrl+Alt+double-click cria drilldown novo.
          </p>
        ) : !presentationMode && currentView.kind === 'component' ? (
          <p className="canvas-hint secondary-hint">
            Double-click abre drilldown existente. Ctrl+Alt+double-click cria drilldown novo.
          </p>
        ) : null}
        <DiagramCanvas
          presentationMode={presentationMode}
          forceGridHidden={presentationMode}
          onEdgePointerStart={(edgeId, event) => {
            if (
              event.ctrlKey ||
              event.metaKey ||
              event.altKey ||
              activeTool === 'connector' ||
              Boolean(pendingConnectionFrom)
            ) {
              setDraggedEdgeId(null)
              return
            }
            setDraggedEdgeId(edgeId)
          }}
        />
      </main>
      {rightDockVisible ? <aside className="right-sidebar right-sidebar-dock">{dockPanel}</aside> : null}
      {drawerVisible ? (
        <section className={drawerTab === 'dsl' ? 'journey-drawer journey-drawer-dsl' : 'journey-drawer'}>
          <div className="drawer-tabs">
            <button
              type="button"
              className={drawerTab === 'journeys' ? 'drawer-tab drawer-tab-active' : 'drawer-tab'}
              onClick={() => switchDrawerTab('journeys')}
            >
              Journey Timeline
            </button>
            <button
              type="button"
              className={drawerTab === 'dsl' ? 'drawer-tab drawer-tab-active' : 'drawer-tab'}
              onClick={() => switchDrawerTab('dsl')}
            >
              DSL
            </button>
            {dockPosition === 'bottom' ? (
              <button
                type="button"
                className={drawerTab === 'dock' ? 'drawer-tab drawer-tab-active' : 'drawer-tab'}
                onClick={() => switchDrawerTab('dock')}
              >
                Dock
              </button>
            ) : null}
            <span className="drawer-tabs-spacer" />
            {drawerTab === 'dsl' ? (
              <button type="button" className="drawer-maximize-button" onClick={() => toggleDslMaximized()}>
                {dslMaximized ? 'Restaurar DSL' : 'Maximizar DSL'}
              </button>
            ) : null}
          </div>
          {drawerTab === 'journeys' ? (
            <>
              <div className="journey-timeline-toolbar">
                <strong>Timeline da jornada ativa</strong>
                <span className="player-step-info">
                  Step {playerStepIndex + 1}/{playerJourney?.steps.length ?? 0}
                </span>
              </div>
              {activeJourney ? (
                <ol className="journey-steps">
                  {activeJourneySteps.map((step) => (
                      <li
                        key={`${activeJourney.id}:${step.edgeId}`}
                        draggable
                        onDragStart={() => onJourneyStepDragStart(activeJourney.id, step.edgeId)}
                        onDragOver={(event) => {
                          event.preventDefault()
                          event.dataTransfer.dropEffect = 'move'
                        }}
                        onDrop={() => onJourneyStepDrop(activeJourney.id, step.edgeId)}
                        onDragEnd={() => {
                          journeyStepDragRef.current = null
                        }}
                      >
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
                <p>Selecione uma jornada na lateral para visualizar a timeline.</p>
              )}
            </>
          ) : drawerTab === 'dsl' ? (
            <div className={`dsl-panel ${dslMaximized ? 'dsl-panel-maximized' : ''}`}>
            <div className="dsl-toolbar">
              <strong>{JOURNEY_SCRIPT_NAME} DSL</strong>
              <button
                type="button"
                onClick={() => {
                  setDslText(fullWorkspaceToLiteDsl(workspace))
                  setDslError(null)
                }}
              >
                Exportar workspace completo
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    const ast = parseLiteDsl(dslText)
                    const imported = liteToFullWorkspace(ast)
                    const nextViewId = resolveEntryViewId(imported)
                    replaceWorkspace(imported, nextViewId)
                    setDslError(null)
                  } catch (error) {
                    setDslError(error instanceof Error ? error.message : 'Falha ao importar DSL.')
                  }
                }}
              >
                Importar DSL
              </button>
              <input
                className="dsl-codex-instruction"
                value={dslCodexInstruction}
                onChange={(event) => setDslCodexInstruction(event.target.value)}
                placeholder="Instrução para o Codex (ex.: separar fluxos async por boundary)"
              />
              <button type="button" onClick={() => void runCodexAssistForDsl()} disabled={dslCodexRunning}>
                {dslCodexRunning ? 'Codex executando...' : 'Refinar com Codex'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDslCodexThreadId(null)
                  setDslCodexStatus('Contexto do thread Codex limpo.')
                }}
                disabled={!dslCodexThreadId || dslCodexRunning}
              >
                Limpar contexto Codex
              </button>
            </div>
            <div className="dsl-monaco-editor">
              <Suspense fallback={<p className="dsl-codex-status">Loading JourneyScript editor...</p>}>
                <MonacoEditor
                  beforeMount={handleDslEditorBeforeMount}
                  language={JOURNEY_SCRIPT_LANGUAGE_ID}
                  value={dslText}
                  onChange={(value) => setDslText(value ?? '')}
                  theme={resolveJourneyScriptTheme(theme)}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineHeight: 21,
                    fontLigatures: true,
                    padding: { top: 10 },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    smoothScrolling: true,
                    cursorBlinking: 'phase',
                  }}
                />
              </Suspense>
            </div>
            {dslCodexThreadId ? <p className="dsl-codex-thread">Thread Codex: {dslCodexThreadId}</p> : null}
            {dslCodexStatus ? <p className="dsl-codex-status">{dslCodexStatus}</p> : null}
            {dslError ? <p className="dsl-error">{dslError}</p> : null}
            </div>
          ) : dockPosition === 'bottom' ? (
            dockCollapsed ? <p>Dock oculto. Use o atalho na topbar para reabrir.</p> : dockPanel
          ) : (
            <p>Dock está no modo lateral.</p>
          )}
        </section>
      ) : null}
    </div>
  )
}

export default App
