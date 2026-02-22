/**
 * Purpose: Orchestrate the desktop-style SJV web app shell, window layout, and editor interactions.
 */

import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  ChangeEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react'
import confetti from 'canvas-confetti'
import type { Monaco } from '@monaco-editor/react'
import ReactMarkdown from 'react-markdown'
import {
  CircleHelp,
  Code2,
  Dock,
  GripVertical,
  Link2,
  ListOrdered,
  MousePointer,
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
  SlidersHorizontal,
  Target,
  Workflow,
  X,
} from 'lucide-react'
import './App.css'
import { GuidedTutorialOverlay } from './components/tutorial/GuidedTutorialOverlay'
import { DockHost } from './components/windowing/DockHost'
import { DiagramCanvas } from './components/canvas/DiagramCanvas'
import { FloatingWindow } from './components/windowing/FloatingWindow'
import {
  buildNodeConfettiBursts,
  resolveNodeConfettiAnchor,
} from './diagram/player/playerConfetti'
import { fullWorkspaceToLiteDsl } from './dsl-lite/convert'
import { parseDslToWorkspaceWithTheme } from './dsl-lite/sync'
import {
  JOURNEY_SCRIPT_LANGUAGE_ID,
  JOURNEY_SCRIPT_NAME,
  registerJourneyScriptLanguage,
  resolveJourneyScriptTheme,
} from './dsl-lite/monacoJourneyScript'
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
import {
  loadRecentWorkspaces,
  rememberRecentWorkspace,
  type RecentWorkspaceEntry,
} from './file/recentWorkspaces'
import helpGuideMarkdown from './help/help.md?raw'
import { resolveJourneyFocusScope } from './journeys/focus'
import { resolvePlayerStepLabel } from './journeys/playerStepLabel'
import { resolveModeShortcutAction } from './keyboard/modeShortcuts'
import {
  resolveDockSideWidth,
  resolveFloatingDockResizeRect,
  type DockSide,
  type FloatingDockResizeHandle,
} from './layout/dockSizing'
import { resolveLayoutGridTemplateRows } from './layout/layoutGrid'
import { clampFloatingDockRect, type FloatingDockRect } from './layout/floatingDock'
import { resolveTopbarHeight } from './layout/topbarSizing'
import { BLANK_WORKSPACE_VIEW_ID, createBlankWorkspace } from './model/blankWorkspace'
import type { EditorSnapshot, ViewportState, WorkspaceModel } from './model/types'
import { nodePresetsByCategory, protocolPresets, resolveNodePreset } from './presets/catalog'
import { applyWorkspaceLayout, loadWorkspaceLayout, saveWorkspaceLayout } from './store/layoutPersistence'
import { useEditorStore } from './store/useEditorStore'
import {
  buildViewHierarchyOptions,
  resolvePreferredEntryViewId,
} from './viewHierarchy'
import type { ShowcaseLocale, ShowcaseMode } from './model/showcaseWorkspace'
import {
  clampGuidedTutorialStepIndex,
  GUIDED_UI_TUTORIAL_STEPS,
  type GuidedTutorialStepSetupAction,
} from './tutorial/guidedTutorial'
import {
  closeManagedWindow,
  createManagedWindowsState,
  dockManagedWindow as dockManagedWindowState,
  floatManagedWindow,
  MANAGED_WINDOW_IDS,
  setManagedHostActiveTab,
  setManagedWindowFloatingRect,
  restoreManagedWindowsState,
  type ManagedWindowId,
  type ManagedWindowDockHostId,
  type ManagedWindowPlacement,
  type ManagedWindowsState,
} from './windowing/windowManager'
import {
  createDefaultManagedWindowRects,
  MANAGED_WINDOW_DEFAULT_HOST_BY_ID,
  MANAGED_WINDOW_FLOATING_UI_CONFIG,
} from './windowing/windowUiConfig'

const DEBOUNCE_SAVE_MS = 900
const DEFAULT_LEFT_SIDEBAR_WIDTH = 240
const DEFAULT_DOCK_SIDE_WIDTH = 340
const DEFAULT_MANAGED_HOST_SIDE_WIDTH = 320
const DEFAULT_JOURNEY_HEIGHT = 220
const DEFAULT_MANAGED_HOST_BOTTOM_HEIGHT = 240
const MIN_DOCK_SIDE_WIDTH = 260
const MIN_JOURNEY_HEIGHT = 160
const DEFAULT_TOPBAR_HEIGHT = 108
const MIN_CANVAS_WIDTH = 320
const MIN_CANVAS_HEIGHT = 220
const MIN_DOCK_HEIGHT = 260
const DEFAULT_FILE_VIEWPORT = { x: 100, y: 80, zoom: 1 }
const DEFAULT_FLOATING_DOCK_RECT = { x: 28, y: 108, width: 480, height: 420 }
const UI_PREFERENCES_STORAGE_KEY = 'sjv-ui-preferences-v1'
const MANAGED_WINDOWS_LAYOUT_STORAGE_KEY = 'sjv-managed-windows-layout-v1'
const APP_VERSION_LABEL = 'MVP Beta'
const APP_COPYRIGHT_LABEL = 'Willams Sousa'
const LIGHT_NODE_COLOR_PRESETS = [
  '#2563eb',
  '#0891b2',
  '#059669',
  '#65a30d',
  '#d97706',
  '#ea580c',
  '#e11d48',
  '#7c3aed',
  '#4f46e5',
  '#475569',
]
const DARK_NODE_COLOR_PRESETS = [
  '#1d4ed8',
  '#0e7490',
  '#047857',
  '#0f766e',
  '#b45309',
  '#c2410c',
  '#be123c',
  '#6d28d9',
  '#4338ca',
  '#334155',
]
const LIGHT_TEXT_COLOR_PRESETS = ['#0f172a', '#1e293b', '#334155', '#475569', '#64748b', '#ffffff']
const DARK_TEXT_COLOR_PRESETS = ['#ffffff', '#f8fafc', '#e2e8f0', '#cbd5e1', '#94a3b8', '#0f172a']

const MonacoEditor = lazy(() => import('@monaco-editor/react'))

const viewKindLabel: Record<string, string> = {
  'system-context': 'System Context',
  container: 'Container',
  component: 'Component',
  hex: 'Hex',
}

type DrawerTab = 'journeys' | 'dsl' | 'dock' | 'help'
type DockTab = 'palette' | 'inspector' | 'journeys' | 'timeline' | 'dsl' | 'help' | 'preferences'
type DockPosition = 'left' | 'right' | 'bottom' | 'floating'
type DesktopMenuId = 'file' | 'edit' | 'view' | 'window' | 'journey' | 'insert' | 'settings' | 'help'
type PlayerAnimationPreset = 'cinematic' | 'orb' | 'minimal'
type FileWriteMode = 'prompt' | 'reuse'
type StepDragState = { journeyId: string; edgeId: string }
type HelpSection = 'guide' | 'gallery' | 'about'
type ToolbarSectionId = 'navigation' | 'editing' | 'viewport' | 'panels' | 'modes'

type UiPreferences = {
  tooltipsEnabled: boolean
  splashEnabled: boolean
  showcaseLocale: ShowcaseLocale
  toolbarVisibility: Record<ToolbarSectionId, boolean>
}

type HistoryStoreSnapshot = {
  workspace: WorkspaceModel
  currentViewId: string
  viewHistory: string[]
  viewport: ViewportState
  selectedNodeId: string | null
  selectedNodeIds: string[]
  selectedEdgeId: string | null
  activeTool: 'select' | 'connector'
  pendingConnectionFrom: string | null
  pendingConnectionPortId: string | null
  activeJourneyId: string | null
  journeyFilterId: string | null
  playerJourneyId: string | null
  playerIsRunning: boolean
  playerStepIndex: number
  playerLoop: boolean
  playerSpeedMs: number
  playerHighlightNodes: boolean
  playerTrailEnabled: boolean
  playerConfettiNonce: number
  playerConfettiNodeId: string | null
}

type HistoryUiSnapshot = {
  leftSidebarWidth: number
  leftDockWidth: number
  rightDockWidth: number
  journeyHeight: number
  drawerTab: DrawerTab
  dslMaximized: boolean
  focusMode: boolean
  presentationMode: boolean
  leftSidebarCollapsed: boolean
  dockCollapsed: boolean
  drawerCollapsed: boolean
  dockPosition: DockPosition
  floatingDockRect: FloatingDockRect
  dockTabOrder: DockTab[]
  activeDockTab: DockTab
  journeyDraftName: string
}

type HistorySnapshot = {
  store: HistoryStoreSnapshot
  ui: HistoryUiSnapshot
}

type HistoryStacks = {
  past: HistorySnapshot[]
  future: HistorySnapshot[]
}

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

const DESKTOP_MENU_ORDER: DesktopMenuId[] = ['file', 'edit', 'view', 'window', 'journey', 'insert', 'settings', 'help']
const DEFAULT_DOCK_TAB_ORDER: DockTab[] = ['palette', 'inspector', 'journeys', 'timeline', 'dsl', 'help', 'preferences']
const isManagedDockTab = (tab: DockTab): tab is ManagedWindowId =>
  (['palette', 'inspector', 'journeys', 'timeline', 'dsl', 'help', 'preferences'] as ManagedWindowId[]).includes(
    tab as ManagedWindowId,
  )
const HISTORY_LIMIT = 120
const DEFAULT_UI_PREFERENCES: UiPreferences = {
  tooltipsEnabled: true,
  splashEnabled: true,
  showcaseLocale: 'en',
  toolbarVisibility: {
    navigation: true,
    editing: true,
    viewport: true,
    panels: true,
    modes: true,
  },
}

const resolveInitialUiPreferences = (): UiPreferences => {
  if (typeof window === 'undefined') {
    return DEFAULT_UI_PREFERENCES
  }
  try {
    const raw = window.localStorage.getItem(UI_PREFERENCES_STORAGE_KEY)
    if (!raw) {
      return DEFAULT_UI_PREFERENCES
    }
    const parsed = JSON.parse(raw) as Partial<UiPreferences>
    return {
      tooltipsEnabled: parsed.tooltipsEnabled ?? DEFAULT_UI_PREFERENCES.tooltipsEnabled,
      splashEnabled: parsed.splashEnabled ?? DEFAULT_UI_PREFERENCES.splashEnabled,
      showcaseLocale:
        parsed.showcaseLocale === 'pt' || parsed.showcaseLocale === 'en'
          ? parsed.showcaseLocale
          : DEFAULT_UI_PREFERENCES.showcaseLocale,
      toolbarVisibility: {
        navigation:
          parsed.toolbarVisibility?.navigation ?? DEFAULT_UI_PREFERENCES.toolbarVisibility.navigation,
        editing:
          parsed.toolbarVisibility?.editing ?? DEFAULT_UI_PREFERENCES.toolbarVisibility.editing,
        viewport:
          parsed.toolbarVisibility?.viewport ?? DEFAULT_UI_PREFERENCES.toolbarVisibility.viewport,
        panels:
          parsed.toolbarVisibility?.panels ?? DEFAULT_UI_PREFERENCES.toolbarVisibility.panels,
        modes:
          parsed.toolbarVisibility?.modes ?? DEFAULT_UI_PREFERENCES.toolbarVisibility.modes,
      },
    }
  } catch {
    return DEFAULT_UI_PREFERENCES
  }
}

const createBaselineManagedWindowsState = (topbarHeight: number): ManagedWindowsState =>
  dockManagedWindowState(createManagedWindowsState(createDefaultManagedWindowRects(topbarHeight)), 'palette', 'left')

const normalizeDockTabOrder = (tabOrder: DockTab[]): DockTab[] => {
  const unique = new Set<DockTab>()
  const next: DockTab[] = []
  for (const tab of tabOrder) {
    if (!DEFAULT_DOCK_TAB_ORDER.includes(tab) || unique.has(tab)) {
      continue
    }
    unique.add(tab)
    next.push(tab)
  }
  for (const tab of DEFAULT_DOCK_TAB_ORDER) {
    if (!unique.has(tab)) {
      next.push(tab)
    }
  }
  return next
}

type WindowLayoutBootstrap = {
  managedWindows: ManagedWindowsState
  dockPosition: DockPosition
  dockCollapsed: boolean
  drawerCollapsed: boolean
  floatingDockRect: FloatingDockRect
  leftDockWidth: number
  rightDockWidth: number
  journeyHeight: number
  dockTabOrder: DockTab[]
  activeDockTab: DockTab
}

const isRecordLike = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isDockPositionValue = (value: unknown): value is DockPosition =>
  value === 'left' || value === 'right' || value === 'bottom' || value === 'floating'

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isFloatingDockRectValue = (value: unknown): value is FloatingDockRect =>
  isRecordLike(value) &&
  isFiniteNumber(value.x) &&
  isFiniteNumber(value.y) &&
  isFiniteNumber(value.width) &&
  isFiniteNumber(value.height)

const createDefaultWindowLayoutBootstrap = (topbarHeight: number): WindowLayoutBootstrap => ({
  managedWindows: createBaselineManagedWindowsState(topbarHeight),
  dockPosition: 'right',
  dockCollapsed: true,
  drawerCollapsed: true,
  floatingDockRect: { ...DEFAULT_FLOATING_DOCK_RECT },
  leftDockWidth: DEFAULT_DOCK_SIDE_WIDTH,
  rightDockWidth: DEFAULT_DOCK_SIDE_WIDTH,
  journeyHeight: DEFAULT_JOURNEY_HEIGHT,
  dockTabOrder: normalizeDockTabOrder(DEFAULT_DOCK_TAB_ORDER),
  activeDockTab: 'palette',
})

const resolveWindowLayoutBootstrapFromCandidate = (
  topbarHeight: number,
  candidate: unknown,
): WindowLayoutBootstrap => {
  const fallback = createDefaultWindowLayoutBootstrap(topbarHeight)
  if (!isRecordLike(candidate)) {
    return fallback
  }

  const managedWindowsCandidate = isRecordLike(candidate) && 'managedWindows' in candidate ? candidate.managedWindows : candidate
  const managedWindows = restoreManagedWindowsState(fallback.managedWindows, managedWindowsCandidate)

  const dockTabOrder = Array.isArray(candidate.dockTabOrder)
    ? normalizeDockTabOrder(
        candidate.dockTabOrder.filter((tab): tab is DockTab =>
          typeof tab === 'string' && DEFAULT_DOCK_TAB_ORDER.includes(tab as DockTab),
        ),
      )
    : fallback.dockTabOrder

  const activeDockTab =
    typeof candidate.activeDockTab === 'string' && dockTabOrder.includes(candidate.activeDockTab as DockTab)
      ? (candidate.activeDockTab as DockTab)
      : fallback.activeDockTab

  return {
    managedWindows,
    dockPosition: isDockPositionValue(candidate.dockPosition) ? candidate.dockPosition : fallback.dockPosition,
    dockCollapsed: typeof candidate.dockCollapsed === 'boolean' ? candidate.dockCollapsed : fallback.dockCollapsed,
    drawerCollapsed: typeof candidate.drawerCollapsed === 'boolean' ? candidate.drawerCollapsed : fallback.drawerCollapsed,
    floatingDockRect: isFloatingDockRectValue(candidate.floatingDockRect)
      ? candidate.floatingDockRect
      : fallback.floatingDockRect,
    leftDockWidth: isFiniteNumber(candidate.leftDockWidth)
      ? Math.max(MIN_DOCK_SIDE_WIDTH, candidate.leftDockWidth)
      : fallback.leftDockWidth,
    rightDockWidth: isFiniteNumber(candidate.rightDockWidth)
      ? Math.max(MIN_DOCK_SIDE_WIDTH, candidate.rightDockWidth)
      : fallback.rightDockWidth,
    journeyHeight: isFiniteNumber(candidate.journeyHeight)
      ? Math.max(MIN_JOURNEY_HEIGHT, candidate.journeyHeight)
      : fallback.journeyHeight,
    dockTabOrder,
    activeDockTab,
  }
}

const resolveInitialWindowLayoutBootstrap = (topbarHeight: number): WindowLayoutBootstrap => {
  if (typeof window === 'undefined') {
    return createDefaultWindowLayoutBootstrap(topbarHeight)
  }
  try {
    const raw = window.localStorage.getItem(MANAGED_WINDOWS_LAYOUT_STORAGE_KEY)
    if (!raw) {
      return createDefaultWindowLayoutBootstrap(topbarHeight)
    }
    return resolveWindowLayoutBootstrapFromCandidate(topbarHeight, JSON.parse(raw))
  } catch {
    return createDefaultWindowLayoutBootstrap(topbarHeight)
  }
}

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

const cloneSerializable = <T,>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }
  return JSON.parse(JSON.stringify(value)) as T
}

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
  const topbarRef = useRef<HTMLElement | null>(null)
  const desktopMenuBarRef = useRef<HTMLDivElement | null>(null)
  const snapshotFileInputRef = useRef<HTMLInputElement | null>(null)
  const canvasPanelRef = useRef<HTMLElement | null>(null)
  const dslRestoreHeightRef = useRef<number | null>(null)
  const previousViewIdRef = useRef<string | null>(null)
  const dockTabDragRef = useRef<DockTab | null>(null)
  const journeyDragRef = useRef<string | null>(null)
  const journeyStepDragRef = useRef<StepDragState | null>(null)
  const workspaceFileHandleRef = useRef<WorkspaceFileHandle | null>(null)
  const dslSyncLastAppliedTextRef = useRef<string | null>(null)
  const historyRef = useRef<HistoryStacks>({ past: [], future: [] })
  const historyApplyingRef = useRef(false)
  const historyLastCommitAtRef = useRef(0)
  const historyReleaseTimerRef = useRef<number | null>(null)
  const dockSideResizeRef = useRef<{
    pointerId: number
    side: DockSide
    startClientX: number
    startWidth: number
    maxWidth: number
  } | null>(null)
  const journeyResizeRef = useRef<{
    pointerId: number
    startY: number
    startHeight: number
    maxHeight: number
  } | null>(null)
  const floatingDockDragRef = useRef<{
    pointerId: number
    startClientX: number
    startClientY: number
    startX: number
    startY: number
  } | null>(null)
  const floatingDockResizeRef = useRef<{
    pointerId: number
    handle: FloatingDockResizeHandle
    startClientX: number
    startClientY: number
    startRect: FloatingDockRect
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
  const goToView = useEditorStore((state) => state.goToView)
  const removeNode = useEditorStore((state) => state.removeNode)
  const removeEdge = useEditorStore((state) => state.removeEdge)
  const duplicateSelection = useEditorStore((state) => state.duplicateSelection)
  const setNodeName = useEditorStore((state) => state.setNodeName)
  const setNodeTech = useEditorStore((state) => state.setNodeTech)
  const setNodeColor = useEditorStore((state) => state.setNodeColor)
  const setNodeTextColor = useEditorStore((state) => state.setNodeTextColor)
  const setEdgeProtocol = useEditorStore((state) => state.setEdgeProtocol)
  const setEdgeLabel = useEditorStore((state) => state.setEdgeLabel)
  const setEdgeLabelPosition = useEditorStore((state) => state.setEdgeLabelPosition)
  const setEdgeLabelSide = useEditorStore((state) => state.setEdgeLabelSide)
  const setEdgeLabelAngle = useEditorStore((state) => state.setEdgeLabelAngle)
  const autoArrangeCurrentView = useEditorStore((state) => state.autoArrangeCurrentView)
  const setGridEnabled = useEditorStore((state) => state.setGridEnabled)
  const setSnapEnabled = useEditorStore((state) => state.setSnapEnabled)
  const setTheme = useEditorStore((state) => state.setTheme)
  const setJourneyFocusSettings = useEditorStore((state) => state.setJourneyFocusSettings)
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
  const [windowLayoutBootstrap] = useState<WindowLayoutBootstrap>(() =>
    resolveInitialWindowLayoutBootstrap(DEFAULT_TOPBAR_HEIGHT),
  )
  const [journeyDraftName, setJourneyDraftName] = useState('')
  const [dslText, setDslText] = useState('')
  const [dslSyncEnabled, setDslSyncEnabled] = useState(false)
  const [dslError, setDslError] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportStatus, setExportStatus] = useState<string | null>(null)
  const [draggedEdgeId, setDraggedEdgeId] = useState<string | null>(null)
  const [animatedExportRunning, setAnimatedExportRunning] = useState(false)
  const [exportFocusJourneyId, setExportFocusJourneyId] = useState<string | null>(null)
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(DEFAULT_LEFT_SIDEBAR_WIDTH)
  const [leftDockWidth, setLeftDockWidth] = useState(windowLayoutBootstrap.leftDockWidth)
  const [rightDockWidth, setRightDockWidth] = useState(windowLayoutBootstrap.rightDockWidth)
  const [journeyHeight, setJourneyHeight] = useState(windowLayoutBootstrap.journeyHeight)
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('journeys')
  const [dslMaximized, setDslMaximized] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [presentationMode, setPresentationMode] = useState(false)
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false)
  const [dockCollapsed, setDockCollapsed] = useState(windowLayoutBootstrap.dockCollapsed)
  const [drawerCollapsed, setDrawerCollapsed] = useState(windowLayoutBootstrap.drawerCollapsed)
  const [dockPosition, setDockPosition] = useState<DockPosition>(windowLayoutBootstrap.dockPosition)
  const [dockTabOrder, setDockTabOrder] = useState<DockTab[]>(windowLayoutBootstrap.dockTabOrder)
  const [activeDockTab, setActiveDockTab] = useState<DockTab>(windowLayoutBootstrap.activeDockTab)
  const [floatingDockRect, setFloatingDockRect] = useState<FloatingDockRect>(windowLayoutBootstrap.floatingDockRect)
  const [recentWorkspaces, setRecentWorkspaces] = useState<RecentWorkspaceEntry[]>(() => loadRecentWorkspaces())
  const [openDesktopMenu, setOpenDesktopMenu] = useState<DesktopMenuId | null>(null)
  const [guidedTutorialStepIndex, setGuidedTutorialStepIndex] = useState<number | null>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const initialUiPreferences = useMemo(() => resolveInitialUiPreferences(), [])
  const [topbarHeight, setTopbarHeight] = useState(DEFAULT_TOPBAR_HEIGHT)
  const [helpSection, setHelpSection] = useState<HelpSection>('guide')
  const [managedWindows, setManagedWindows] = useState<ManagedWindowsState>(windowLayoutBootstrap.managedWindows)
  const [uiPreferences, setUiPreferences] = useState<UiPreferences>(initialUiPreferences)
  const [splashVisible, setSplashVisible] = useState(initialUiPreferences.splashEnabled)
  const lastJourneyAutoLayoutKeyRef = useRef<string | null>(null)

  const selectedNode = selectedNodeId ? workspace.nodes[selectedNodeId] : undefined
  const selectedEdge = selectedEdgeId ? workspace.edges[selectedEdgeId] : undefined
  const selectedNodes = useMemo(
    () =>
      selectedNodeIds
        .map((nodeId) => workspace.nodes[nodeId])
        .filter((node): node is NonNullable<typeof selectedNode> => !!node),
    [selectedNodeIds, workspace.nodes],
  )
  const defaultNodeColorPresets = theme === 'dark' ? DARK_NODE_COLOR_PRESETS : LIGHT_NODE_COLOR_PRESETS
  const nodeColorPresets = useMemo(() => {
    const usedColors = Object.values(workspace.nodes)
      .map((node) => node.style?.fillColor?.trim())
      .filter((value): value is string => isHexColor(value))
      .reverse()
    const recentUnique = Array.from(new Set(usedColors))
    return [
      ...recentUnique,
      ...defaultNodeColorPresets.filter((color) => !recentUnique.includes(color)),
    ].slice(0, 10)
  }, [defaultNodeColorPresets, workspace.nodes])
  const defaultTextColorPresets = theme === 'dark' ? DARK_TEXT_COLOR_PRESETS : LIGHT_TEXT_COLOR_PRESETS
  const nodeTextColorPresets = useMemo(() => {
    const usedTextColors = Object.values(workspace.nodes)
      .map((node) => node.style?.textColor?.trim())
      .filter((value): value is string => isHexColor(value))
      .reverse()
    const recentUnique = Array.from(new Set(usedTextColors))
    return [
      ...recentUnique,
      ...defaultTextColorPresets.filter((color) => !recentUnique.includes(color)),
    ].slice(0, 10)
  }, [defaultTextColorPresets, workspace.nodes])
  const resolveEntryViewId = useCallback(
    (workspaceModel: WorkspaceModel): string =>
      resolvePreferredEntryViewId(workspaceModel) || BLANK_WORKSPACE_VIEW_ID,
    [],
  )
  const resolveWorkspaceFromDslText = useCallback(
    (dslTextInput: string): { workspace: WorkspaceModel; entryViewId: string } => {
      const importedWorkspace = parseDslToWorkspaceWithTheme(dslTextInput, theme)
      const restoredLayout = loadWorkspaceLayout(importedWorkspace.workspace.id)
      const workspaceWithLayout = applyWorkspaceLayout(importedWorkspace, restoredLayout)
      return {
        workspace: workspaceWithLayout,
        entryViewId: resolveEntryViewId(workspaceWithLayout),
      }
    },
    [resolveEntryViewId, theme],
  )
  const currentView = workspace.views[currentViewId]
  const viewHierarchyOptions = useMemo(
    () => buildViewHierarchyOptions(workspace),
    [workspace],
  )
  const breadcrumb = [...viewHistory, currentViewId]
  const viewJourneys = useMemo(
    () =>
      currentView.journeyIds
        .map((journeyId) => workspace.journeys[journeyId])
        .filter((journey) => !!journey),
    [currentView.journeyIds, workspace.journeys],
  ) as Array<(typeof workspace.journeys)[string]>
  const journeyFocusSettings = workspace.settings.journeyFocus
  const journeyFocusScope = useMemo(
    () => resolveJourneyFocusScope(workspace, currentViewId, journeyFilterId),
    [currentViewId, journeyFilterId, workspace],
  )
  const journeyFocusNodeIds = useMemo(
    () => Array.from(journeyFocusScope?.nodeIds ?? []),
    [journeyFocusScope],
  )
  const journeyFocusEdgeIds = useMemo(
    () => Array.from(journeyFocusScope?.edgeIds ?? []),
    [journeyFocusScope],
  )
  const activeJourney = activeJourneyId ? workspace.journeys[activeJourneyId] : undefined
  const activeJourneySteps = useMemo(
    () =>
      activeJourney
        ? activeJourney.steps.slice().sort((left, right) => left.n - right.n)
        : [],
    [activeJourney],
  )
  const playerJourney = playerJourneyId ? workspace.journeys[playerJourneyId] : undefined
  const currentPlayerStepLabel = useMemo(
    () => resolvePlayerStepLabel(playerJourney, workspace.edges, playerStepIndex),
    [playerJourney, playerStepIndex, workspace.edges],
  )
  const currentViewModeLabel = viewKindLabel[currentView.kind] ?? currentView.kind
  const playerModeLabel = playerIsRunning ? 'Animation' : 'Render'
  const immersiveMode = focusMode || presentationMode
  const leftDockVisible = !immersiveMode && dockPosition === 'left' && !dockCollapsed
  const rightDockVisible = !immersiveMode && dockPosition === 'right' && !dockCollapsed
  const floatingDockVisible = !immersiveMode && dockPosition === 'floating' && !dockCollapsed
  const drawerVisible = !immersiveMode && !drawerCollapsed
  const paletteWindowOpen = managedWindows.windows.palette.open
  const managedLeftHostVisible = !immersiveMode && managedWindows.hosts.left.tabs.length > 0
  const managedRightHostVisible = !immersiveMode && managedWindows.hosts.right.tabs.length > 0
  const managedBottomHostVisible = !immersiveMode && managedWindows.hosts.bottom.tabs.length > 0
  const bottomPanelsInset =
    (managedBottomHostVisible ? DEFAULT_MANAGED_HOST_BOTTOM_HEIGHT : 0) + (drawerVisible ? journeyHeight : 0)
  const clampFloatingDockRectInLayout = useCallback((candidate: FloatingDockRect): FloatingDockRect => {
    const layoutRect = layoutRef.current?.getBoundingClientRect()
    return clampFloatingDockRect({
      rect: candidate,
      viewportWidth: layoutRect?.width ?? window.innerWidth,
      viewportHeight: layoutRect?.height ?? window.innerHeight,
      topbarHeight,
    })
  }, [topbarHeight])

  const layoutStyle = useMemo(
    () =>
      immersiveMode
        ? {
            gridTemplateColumns: '1fr',
            gridTemplateRows: resolveLayoutGridTemplateRows({
              immersiveMode: true,
              drawerVisible,
              journeyHeight,
            }),
            gridTemplateAreas: `'topbar' 'main'`,
          }
        : {
            gridTemplateColumns: `${leftDockVisible ? leftDockWidth : 0}px ${
              managedLeftHostVisible ? DEFAULT_MANAGED_HOST_SIDE_WIDTH : 0
            }px 1fr ${
              managedRightHostVisible ? DEFAULT_MANAGED_HOST_SIDE_WIDTH : 0
            }px ${rightDockVisible ? rightDockWidth : 0}px`,
            gridTemplateRows: resolveLayoutGridTemplateRows({
              immersiveMode: false,
              drawerVisible,
              journeyHeight,
              managedBottomHostVisible,
              managedBottomHostHeight: DEFAULT_MANAGED_HOST_BOTTOM_HEIGHT,
            }),
            gridTemplateAreas: `'topbar topbar topbar topbar topbar'
              'left managedLeft main managedRight right'
              'managedBottom managedBottom managedBottom managedBottom managedBottom'
              'journey journey journey journey journey'`,
          },
    [
      drawerVisible,
      immersiveMode,
      journeyHeight,
      leftDockVisible,
      leftDockWidth,
      managedBottomHostVisible,
      managedLeftHostVisible,
      managedRightHostVisible,
      rightDockVisible,
      rightDockWidth,
    ],
  )

  const playerAnimationPreset = useMemo(
    () => resolvePlayerAnimationPreset(playerTrailEnabled, playerHighlightNodes),
    [playerHighlightNodes, playerTrailEnabled],
  )
  const withTooltip = useCallback(
    (label: string): string | undefined =>
      uiPreferences.tooltipsEnabled ? label : undefined,
    [uiPreferences.tooltipsEnabled],
  )
  const toolbarVisibility = uiPreferences.toolbarVisibility
  const hasVisibleToolbarSection = useMemo(
    () =>
      Boolean(
        toolbarVisibility.navigation ||
          toolbarVisibility.editing ||
          toolbarVisibility.panels ||
          toolbarVisibility.modes,
      ),
    [toolbarVisibility],
  )

  const activateJourneyPlayback = useCallback((journeyId: string | null) => {
    setPlayerJourney(journeyId)
    setPlayerRunning(Boolean(journeyId))
  }, [setPlayerJourney, setPlayerRunning])

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

  const applyJourneyFilter = useCallback(
    (nextJourneyId: string | null, options?: { activateJourney?: boolean }) => {
      setJourneyFilter(nextJourneyId)
      if (nextJourneyId) {
        if (options?.activateJourney ?? true) {
          setActiveJourney(nextJourneyId)
          activateJourneyPlayback(nextJourneyId)
        }
      } else {
        lastJourneyAutoLayoutKeyRef.current = null
      }

      if (!nextJourneyId) {
        return
      }

      if (
        journeyFocusSettings.autoLayoutMode !== 'always' ||
        journeyFocusSettings.layoutMode !== 'reflow'
      ) {
        return
      }

      const scopedFocus = resolveJourneyFocusScope(workspace, currentViewId, nextJourneyId)
      const scopedNodeIds = Array.from(scopedFocus?.nodeIds ?? [])
      const scopedEdgeIds = Array.from(scopedFocus?.edgeIds ?? [])
      if (!scopedNodeIds.length || !scopedEdgeIds.length) {
        return
      }

      autoArrangeCurrentView({
        nodeIds: scopedNodeIds,
        edgeIds: scopedEdgeIds,
      })
      lastJourneyAutoLayoutKeyRef.current = [
        currentViewId,
        nextJourneyId,
        scopedNodeIds.join(','),
        scopedEdgeIds.join(','),
      ].join('::')
    },
    [
      autoArrangeCurrentView,
      activateJourneyPlayback,
      currentViewId,
      journeyFocusSettings.autoLayoutMode,
      journeyFocusSettings.layoutMode,
      setJourneyFilter,
      setActiveJourney,
      workspace,
    ],
  )

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
    return Math.max(MIN_JOURNEY_HEIGHT, layoutHeight - topbarHeight - MIN_CANVAS_HEIGHT)
  }

  const getMaxDockSideWidth = useCallback(
    (side: DockSide): number => {
      const layoutWidth = layoutRef.current?.getBoundingClientRect().width ?? window.innerWidth
      const oppositeWidth =
        side === 'left'
          ? rightDockVisible
            ? rightDockWidth
            : 0
          : leftDockVisible
            ? leftDockWidth
            : 0
      return Math.max(MIN_DOCK_SIDE_WIDTH, layoutWidth - oppositeWidth - MIN_CANVAS_WIDTH)
    },
    [leftDockVisible, leftDockWidth, rightDockVisible, rightDockWidth],
  )

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
        setManagedWindows((state) => closeManagedWindow(state, 'palette'))
        setLeftSidebarCollapsed(true)
        setDockCollapsed(true)
        setDrawerCollapsed(true)
        setOpenDesktopMenu(null)
        scheduleFitCurrentView()
      } else {
        setManagedWindows((state) => dockManagedWindowState(state, 'palette', 'left'))
        setLeftSidebarCollapsed(false)
        setDockCollapsed(false)
        setDrawerCollapsed(false)
      }
      return next
    })
  }

  const toggleLeftSidebar = () => {
    setManagedWindows((current) => {
      const paletteIsOpen = current.windows.palette.open
      const next = paletteIsOpen ? closeManagedWindow(current, 'palette') : dockManagedWindowState(current, 'palette', 'left')
      setLeftSidebarCollapsed(paletteIsOpen)
      if (!paletteIsOpen) {
        setActiveDockTab('palette')
      }
      return next
    })
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

  const openManagedFloatingWindow = (windowId: ManagedWindowId) => {
    setManagedWindows((current) => floatManagedWindow(current, windowId))
  }

  const closeManagedWindowById = (windowId: ManagedWindowId) => {
    setManagedWindows((current) => closeManagedWindow(current, windowId))
  }

  const setManagedWindowRect = (windowId: ManagedWindowId, rect: FloatingDockRect) => {
    setManagedWindows((current) => setManagedWindowFloatingRect(current, windowId, rect))
  }

  const selectManagedDockHostTab = (
    hostId: ManagedWindowDockHostId,
    windowId: ManagedWindowId,
  ) => {
    setActiveDockTab(windowId)
    setManagedWindows((current) => setManagedHostActiveTab(current, hostId, windowId))
  }

  const resolveFallbackDockTab = (): DockTab =>
    dockTabOrder.find((tab) => !isManagedDockTab(tab)) ?? 'inspector'

  const closeManagedDockHostWindow = (
    hostId: ManagedWindowDockHostId,
    windowId: ManagedWindowId,
  ) => {
    const nextState = closeManagedWindow(managedWindows, windowId)
    setManagedWindows(nextState)
    if (activeDockTab !== windowId) {
      return
    }
    setActiveDockTab(nextState.hosts[hostId].activeTab ?? resolveFallbackDockTab())
  }

  const floatManagedDockHostWindow = (
    hostId: ManagedWindowDockHostId,
    windowId: ManagedWindowId,
  ) => {
    const nextState = floatManagedWindow(managedWindows, windowId)
    setManagedWindows(nextState)
    if (activeDockTab !== windowId) {
      return
    }
    setActiveDockTab(nextState.hosts[hostId].activeTab ?? resolveFallbackDockTab())
  }

  const dockManagedWindowToHost = (
    windowId: ManagedWindowId,
    placement: Exclude<ManagedWindowPlacement, 'floating'>,
  ) => {
    setFocusMode(false)
    setPresentationMode(false)
    setManagedWindows((current) => dockManagedWindowState(current, windowId, placement))
    setActiveDockTab(windowId)
  }

  const openManagedDockedWindow = (windowId: ManagedWindowId) => {
    setFocusMode(false)
    setPresentationMode(false)
    setManagedWindows((current) =>
      dockManagedWindowState(current, windowId, MANAGED_WINDOW_DEFAULT_HOST_BY_ID[windowId]),
    )
    setActiveDockTab(windowId)
  }

  const openManagedDockedWindowFromDockTab = (tab: DockTab) => {
    if (isManagedDockTab(tab)) {
      openManagedDockedWindow(tab)
      return
    }
    openDockTab(tab)
  }

  const openHelpWindow = (section: HelpSection) => {
    setHelpSection(section)
    setFocusMode(false)
    setPresentationMode(false)
    openManagedFloatingWindow('help')
  }

  const toggleToolbarSection = useCallback((sectionId: ToolbarSectionId) => {
    setUiPreferences((current) => ({
      ...current,
      toolbarVisibility: {
        ...current.toolbarVisibility,
        [sectionId]: !current.toolbarVisibility[sectionId],
      },
    }))
  }, [])

  const openPreferencesWindow = () => {
    openManagedFloatingWindow('preferences')
  }

  const runGuidedTutorialStepSetup = (setupAction: GuidedTutorialStepSetupAction | undefined) => {
    switch (setupAction) {
      case 'openPaletteLeft':
        openManagedDockedWindow('palette')
        break
      case 'openInspectorRight':
        openManagedDockedWindow('inspector')
        break
      case 'openDslBottom':
        openManagedDockedWindow('dsl')
        break
      case 'openHelpFloating':
        openHelpWindow('guide')
        break
      case 'none':
      case undefined:
        break
      default:
        break
    }
  }

  const closeGuidedTutorial = () => {
    setGuidedTutorialStepIndex(null)
    setOpenDesktopMenu(null)
  }

  const goToGuidedTutorialStep = (candidateIndex: number) => {
    const nextIndex = clampGuidedTutorialStepIndex(candidateIndex, GUIDED_UI_TUTORIAL_STEPS.length)
    const nextStep = GUIDED_UI_TUTORIAL_STEPS[nextIndex]
    setSplashVisible(false)
    setOpenDesktopMenu(null)
    setFocusMode(false)
    setPresentationMode(false)
    runGuidedTutorialStepSetup(nextStep?.setupAction)
    setGuidedTutorialStepIndex(nextIndex)
  }

  const startGuidedTutorial = () => {
    setHelpSection('guide')
    goToGuidedTutorialStep(0)
    setTransientStatus('Guided tutorial started.')
  }

  const nextGuidedTutorialStep = () => {
    if (guidedTutorialStepIndex === null) {
      startGuidedTutorial()
      return
    }
    if (guidedTutorialStepIndex >= GUIDED_UI_TUTORIAL_STEPS.length - 1) {
      closeGuidedTutorial()
      setTransientStatus('Guided tutorial completed.')
      return
    }
    goToGuidedTutorialStep(guidedTutorialStepIndex + 1)
  }

  const previousGuidedTutorialStep = () => {
    if (guidedTutorialStepIndex === null) {
      return
    }
    goToGuidedTutorialStep(guidedTutorialStepIndex - 1)
  }

  const setTransientStatus = useCallback((message: string, timeoutMs = 2800) => {
    setExportStatus(message)
    window.setTimeout(() => setExportStatus(null), timeoutMs)
  }, [])

  const restoreWindowLayout = useCallback(() => {
    const fallback = createDefaultWindowLayoutBootstrap(topbarHeight)
    if (typeof window === 'undefined') {
      setManagedWindows(fallback.managedWindows)
      setDockPosition(fallback.dockPosition)
      setDockCollapsed(fallback.dockCollapsed)
      setDrawerCollapsed(fallback.drawerCollapsed)
      setFloatingDockRect(clampFloatingDockRectInLayout(fallback.floatingDockRect))
      setLeftDockWidth(fallback.leftDockWidth)
      setRightDockWidth(fallback.rightDockWidth)
      setJourneyHeight(fallback.journeyHeight)
      setDockTabOrder(fallback.dockTabOrder)
      setActiveDockTab(fallback.activeDockTab)
      return
    }
    const raw = window.localStorage.getItem(MANAGED_WINDOWS_LAYOUT_STORAGE_KEY)
    if (!raw) {
      setTransientStatus('No saved window layout found.')
      return
    }
    try {
      const restored = resolveWindowLayoutBootstrapFromCandidate(topbarHeight, JSON.parse(raw))
      setFocusMode(false)
      setPresentationMode(false)
      setManagedWindows(restored.managedWindows)
      setDockPosition(restored.dockPosition)
      setDockCollapsed(restored.dockCollapsed)
      setDrawerCollapsed(restored.drawerCollapsed)
      setFloatingDockRect(clampFloatingDockRectInLayout(restored.floatingDockRect))
      setLeftDockWidth(restored.leftDockWidth)
      setRightDockWidth(restored.rightDockWidth)
      setJourneyHeight(restored.journeyHeight)
      setDockTabOrder(restored.dockTabOrder)
      setActiveDockTab(restored.activeDockTab)
      setTransientStatus('Window layout restored.')
    } catch {
      setTransientStatus('Failed to restore window layout.')
    }
  }, [clampFloatingDockRectInLayout, setTransientStatus, topbarHeight])

  const resetWindowLayout = useCallback(() => {
    const baseline = createDefaultWindowLayoutBootstrap(topbarHeight)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(MANAGED_WINDOWS_LAYOUT_STORAGE_KEY)
    }
    setFocusMode(false)
    setPresentationMode(false)
    setManagedWindows(baseline.managedWindows)
    setDockPosition(baseline.dockPosition)
    setDockCollapsed(baseline.dockCollapsed)
    setDrawerCollapsed(baseline.drawerCollapsed)
    setFloatingDockRect(clampFloatingDockRectInLayout(baseline.floatingDockRect))
    setLeftDockWidth(baseline.leftDockWidth)
    setRightDockWidth(baseline.rightDockWidth)
    setJourneyHeight(baseline.journeyHeight)
    setDockTabOrder(baseline.dockTabOrder)
    setActiveDockTab(baseline.activeDockTab)
    setTransientStatus('Window layout reset to defaults.')
  }, [clampFloatingDockRectInLayout, setTransientStatus, topbarHeight])

  const loadShowcasePreset = useCallback((mode: ShowcaseMode, locale: ShowcaseLocale) => {
    loadShowcaseWorkspace({ mode, locale })
    setTransientStatus(
      `${mode === 'tutorial' ? 'Tutorial' : 'Showcase'} loaded (${locale.toUpperCase()}).`,
    )
    setExportError(null)
  }, [loadShowcaseWorkspace, setTransientStatus])

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
            setRecentWorkspaces(
              rememberRecentWorkspace(
                snapshot,
                payload,
                fileHandle.name ?? filename,
              ),
            )
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
        setRecentWorkspaces(
          rememberRecentWorkspace(snapshot, payload, filename),
        )
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
          const imported = resolveWorkspaceFromDslText(payload)
          replaceWorkspace(imported.workspace, imported.entryViewId)
          setViewport(DEFAULT_FILE_VIEWPORT)
          workspaceFileHandleRef.current = options?.fileHandle ?? null
          setDslText(payload)
          setDslError(null)
          setExportError(null)
          setTransientStatus(`SJV Script loaded: ${options?.fileName ?? 'workspace.sjv'}`)
          return
        } catch (dslError) {
          const snapshotMessage =
            snapshotError instanceof Error ? snapshotError.message : 'Invalid workspace snapshot payload.'
          const dslMessage = dslError instanceof Error ? dslError.message : 'Invalid SJV Script payload.'
          throw new Error(`${snapshotMessage}\n${dslMessage}`)
        }
      }
    },
    [replaceWorkspace, resolveWorkspaceFromDslText, setViewport, setTransientStatus],
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

  const openRecentWorkspace = useCallback(
    (entry: RecentWorkspaceEntry) => {
      try {
        loadWorkspacePayload(entry.payload, { fileName: `${entry.name} (recent)`, fileHandle: null })
        const snapshot = parseWorkspaceSnapshotFile(entry.payload)
        setRecentWorkspaces(rememberRecentWorkspace(snapshot, entry.payload, entry.name))
      } catch (error) {
        setExportError(error instanceof Error ? error.message : 'Failed to load recent workspace.')
      }
    },
    [loadWorkspacePayload],
  )

  const moveDockToLeft = () => {
    setDockPosition('left')
    setDockCollapsed(false)
    if (drawerTab === 'dock') {
      setDrawerTab('journeys')
    }
  }

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

  const moveDockToFloating = () => {
    setDockPosition('floating')
    setDockCollapsed(false)
    setFloatingDockRect((current) => clampFloatingDockRectInLayout(current))
    if (drawerTab === 'dock') {
      setDrawerTab('journeys')
    }
  }

  const openDockTab = (tab: DockTab) => {
    setActiveDockTab(tab)
    if (isManagedDockTab(tab)) {
      setManagedWindows((current) => {
        if (dockPosition === 'left' || dockPosition === 'right' || dockPosition === 'bottom') {
          return dockManagedWindowState(current, tab, dockPosition as ManagedWindowDockHostId)
        }
        return closeManagedWindow(current, tab)
      })
    }
    setDockCollapsed(false)
    if (dockPosition === 'bottom') {
      setDrawerCollapsed(false)
      setDrawerTab('dock')
      setJourneyHeight((current) => Math.max(current, MIN_DOCK_HEIGHT))
    }
  }

  const onFloatingDockHeaderPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return
    }
    floatingDockDragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: floatingDockRect.x,
      startY: floatingDockRect.y,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onFloatingDockResizePointerDown = (
    handle: FloatingDockResizeHandle,
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (event.button !== 0) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    floatingDockResizeRef.current = {
      pointerId: event.pointerId,
      handle,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startRect: floatingDockRect,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
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
    if (
      journeyFilterId &&
      journeyFocusSettings.layoutMode === 'reflow' &&
      journeyFocusNodeIds.length > 0 &&
      journeyFocusEdgeIds.length > 0
    ) {
      autoArrangeCurrentView({
        nodeIds: journeyFocusNodeIds,
        edgeIds: journeyFocusEdgeIds,
      })
      setTransientStatus('Journey-focused auto layout applied.')
      setExportError(null)
      return
    }

    autoArrangeCurrentView()
    setTransientStatus('Auto arrange applied to current view.')
    setExportError(null)
  }, [
    autoArrangeCurrentView,
    journeyFilterId,
    journeyFocusEdgeIds,
    journeyFocusNodeIds,
    journeyFocusSettings.layoutMode,
    setTransientStatus,
  ])

  const refreshHistoryAvailability = useCallback(() => {
    setCanUndo(historyRef.current.past.length > 1)
    setCanRedo(historyRef.current.future.length > 0)
  }, [])

  const captureHistorySnapshot = useCallback((): HistorySnapshot => ({
    store: {
      workspace: cloneSerializable(workspace),
      currentViewId,
      viewHistory: cloneSerializable(viewHistory),
      viewport: cloneSerializable(viewport),
      selectedNodeId,
      selectedNodeIds: cloneSerializable(selectedNodeIds),
      selectedEdgeId,
      activeTool,
      pendingConnectionFrom,
      pendingConnectionPortId,
      activeJourneyId,
      journeyFilterId,
      playerJourneyId,
      playerIsRunning,
      playerStepIndex,
      playerLoop,
      playerSpeedMs,
      playerHighlightNodes,
      playerTrailEnabled,
      playerConfettiNonce,
      playerConfettiNodeId: useEditorStore.getState().playerConfettiNodeId,
    },
    ui: {
      leftSidebarWidth,
      leftDockWidth,
      rightDockWidth,
      journeyHeight,
      drawerTab,
      dslMaximized,
      focusMode,
      presentationMode,
      leftSidebarCollapsed,
      dockCollapsed,
      drawerCollapsed,
      dockPosition,
      floatingDockRect: cloneSerializable(floatingDockRect),
      dockTabOrder: cloneSerializable(dockTabOrder),
      activeDockTab,
      journeyDraftName,
    },
  }), [
    workspace,
    currentViewId,
    viewHistory,
    viewport,
    selectedNodeId,
    selectedNodeIds,
    selectedEdgeId,
    activeTool,
    pendingConnectionFrom,
    pendingConnectionPortId,
    activeJourneyId,
    journeyFilterId,
    playerJourneyId,
    playerIsRunning,
    playerStepIndex,
    playerLoop,
    playerSpeedMs,
    playerHighlightNodes,
    playerTrailEnabled,
    playerConfettiNonce,
    leftSidebarWidth,
    leftDockWidth,
    rightDockWidth,
    journeyHeight,
    drawerTab,
    dslMaximized,
    focusMode,
    presentationMode,
    leftSidebarCollapsed,
    dockCollapsed,
    drawerCollapsed,
    dockPosition,
    floatingDockRect,
    dockTabOrder,
    activeDockTab,
    journeyDraftName,
  ])

  const applyHistorySnapshot = useCallback((snapshot: HistorySnapshot) => {
    if (historyReleaseTimerRef.current !== null) {
      window.clearTimeout(historyReleaseTimerRef.current)
      historyReleaseTimerRef.current = null
    }
    historyApplyingRef.current = true
    useEditorStore.setState({
      workspace: cloneSerializable(snapshot.store.workspace),
      currentViewId: snapshot.store.currentViewId,
      viewHistory: cloneSerializable(snapshot.store.viewHistory),
      viewport: cloneSerializable(snapshot.store.viewport),
      selectedNodeId: snapshot.store.selectedNodeId,
      selectedNodeIds: cloneSerializable(snapshot.store.selectedNodeIds),
      selectedEdgeId: snapshot.store.selectedEdgeId,
      activeTool: snapshot.store.activeTool,
      pendingConnectionFrom: snapshot.store.pendingConnectionFrom,
      pendingConnectionPortId: snapshot.store.pendingConnectionPortId,
      activeJourneyId: snapshot.store.activeJourneyId,
      journeyFilterId: snapshot.store.journeyFilterId,
      playerJourneyId: snapshot.store.playerJourneyId,
      playerIsRunning: snapshot.store.playerIsRunning,
      playerStepIndex: snapshot.store.playerStepIndex,
      playerLoop: snapshot.store.playerLoop,
      playerSpeedMs: snapshot.store.playerSpeedMs,
      playerHighlightNodes: snapshot.store.playerHighlightNodes,
      playerTrailEnabled: snapshot.store.playerTrailEnabled,
      playerConfettiNonce: snapshot.store.playerConfettiNonce,
      playerConfettiNodeId: snapshot.store.playerConfettiNodeId,
    })
    setLeftSidebarWidth(snapshot.ui.leftSidebarWidth)
    setLeftDockWidth(snapshot.ui.leftDockWidth)
    setRightDockWidth(snapshot.ui.rightDockWidth)
    setJourneyHeight(snapshot.ui.journeyHeight)
    setDrawerTab(snapshot.ui.drawerTab)
    setDslMaximized(snapshot.ui.dslMaximized)
    setFocusMode(snapshot.ui.focusMode)
    setPresentationMode(snapshot.ui.presentationMode)
    setLeftSidebarCollapsed(snapshot.ui.leftSidebarCollapsed)
    setDockCollapsed(snapshot.ui.dockCollapsed)
    setDrawerCollapsed(snapshot.ui.drawerCollapsed)
    setDockPosition(snapshot.ui.dockPosition)
    setFloatingDockRect(cloneSerializable(snapshot.ui.floatingDockRect))
    setDockTabOrder(normalizeDockTabOrder(cloneSerializable(snapshot.ui.dockTabOrder)))
    setActiveDockTab(snapshot.ui.activeDockTab)
    setJourneyDraftName(snapshot.ui.journeyDraftName)
    setOpenDesktopMenu(null)
    historyReleaseTimerRef.current = window.setTimeout(() => {
      historyApplyingRef.current = false
      historyReleaseTimerRef.current = null
    }, 0)
  }, [])

  const undoHistory = useCallback(() => {
    const stacks = historyRef.current
    if (stacks.past.length <= 1) {
      return false
    }
    const currentSnapshot = stacks.past.pop()
    if (!currentSnapshot) {
      return false
    }
    stacks.future.push(currentSnapshot)
    const previousSnapshot = stacks.past[stacks.past.length - 1]
    if (!previousSnapshot) {
      return false
    }
    applyHistorySnapshot(previousSnapshot)
    refreshHistoryAvailability()
    setTransientStatus('Undo applied.')
    return true
  }, [applyHistorySnapshot, refreshHistoryAvailability, setTransientStatus])

  const redoHistory = useCallback(() => {
    const stacks = historyRef.current
    if (!stacks.future.length) {
      return false
    }
    const nextSnapshot = stacks.future.pop()
    if (!nextSnapshot) {
      return false
    }
    stacks.past.push(nextSnapshot)
    applyHistorySnapshot(nextSnapshot)
    refreshHistoryAvailability()
    setTransientStatus('Redo applied.')
    return true
  }, [applyHistorySnapshot, refreshHistoryAvailability, setTransientStatus])

  const handleDslEditorBeforeMount = (monaco: Monaco): void => {
    registerJourneyScriptLanguage(monaco)
  }

  const onDockSideSplitterPointerDown = (side: DockSide, event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return
    }
    const startWidth = side === 'left' ? leftDockWidth : rightDockWidth
    dockSideResizeRef.current = {
      pointerId: event.pointerId,
      side,
      startClientX: event.clientX,
      startWidth,
      maxWidth: getMaxDockSideWidth(side),
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onDockSideSplitterPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const resize = dockSideResizeRef.current
    if (!resize || resize.pointerId !== event.pointerId) {
      return
    }
    const nextWidth = resolveDockSideWidth({
      side: resize.side,
      startWidth: resize.startWidth,
      startClientX: resize.startClientX,
      currentClientX: event.clientX,
      minWidth: MIN_DOCK_SIDE_WIDTH,
      maxWidth: resize.maxWidth,
    })
    if (resize.side === 'left') {
      setLeftDockWidth(nextWidth)
      return
    }
    setRightDockWidth(nextWidth)
  }

  const stopDockSideResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    const resize = dockSideResizeRef.current
    if (!resize || resize.pointerId !== event.pointerId) {
      return
    }
    dockSideResizeRef.current = null
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
    const onWindowPointerMove = (event: PointerEvent) => {
      const resize = floatingDockResizeRef.current
      if (resize && resize.pointerId === event.pointerId) {
        const nextRect = resolveFloatingDockResizeRect({
          handle: resize.handle,
          startRect: resize.startRect,
          startClientX: resize.startClientX,
          startClientY: resize.startClientY,
          currentClientX: event.clientX,
          currentClientY: event.clientY,
        })
        setFloatingDockRect(() => clampFloatingDockRectInLayout(nextRect))
        return
      }
      const drag = floatingDockDragRef.current
      if (!drag || drag.pointerId !== event.pointerId) {
        return
      }
      const nextX = drag.startX + (event.clientX - drag.startClientX)
      const nextY = drag.startY + (event.clientY - drag.startClientY)
      setFloatingDockRect((current) => clampFloatingDockRectInLayout({ ...current, x: nextX, y: nextY }))
    }

    const stopFloatingDockInteraction = (event: PointerEvent) => {
      if (floatingDockDragRef.current?.pointerId === event.pointerId) {
        floatingDockDragRef.current = null
      }
      if (floatingDockResizeRef.current?.pointerId === event.pointerId) {
        floatingDockResizeRef.current = null
      }
    }

    const onWindowBlur = () => {
      floatingDockDragRef.current = null
      floatingDockResizeRef.current = null
      dockSideResizeRef.current = null
    }

    window.addEventListener('pointermove', onWindowPointerMove)
    window.addEventListener('pointerup', stopFloatingDockInteraction)
    window.addEventListener('pointercancel', stopFloatingDockInteraction)
    window.addEventListener('blur', onWindowBlur)
    return () => {
      window.removeEventListener('pointermove', onWindowPointerMove)
      window.removeEventListener('pointerup', stopFloatingDockInteraction)
      window.removeEventListener('pointercancel', stopFloatingDockInteraction)
      window.removeEventListener('blur', onWindowBlur)
    }
  }, [clampFloatingDockRectInLayout])

  useEffect(() => {
    if (dockPosition !== 'floating') {
      return
    }
    const clampNow = () => {
      setFloatingDockRect((current) => {
        const clamped = clampFloatingDockRectInLayout(current)
        return clamped.x === current.x &&
          clamped.y === current.y &&
          clamped.width === current.width &&
          clamped.height === current.height
          ? current
          : clamped
      })
    }
    clampNow()
    window.addEventListener('resize', clampNow)
    return () => {
      window.removeEventListener('resize', clampNow)
    }
  }, [dockPosition, clampFloatingDockRectInLayout])

  useEffect(() => {
    const clampDockSideWidths = () => {
      setLeftDockWidth((current) => Math.min(current, getMaxDockSideWidth('left')))
      setRightDockWidth((current) => Math.min(current, getMaxDockSideWidth('right')))
    }
    clampDockSideWidths()
    window.addEventListener('resize', clampDockSideWidths)
    return () => {
      window.removeEventListener('resize', clampDockSideWidths)
    }
  }, [getMaxDockSideWidth])

  useEffect(() => {
    const topbarElement = topbarRef.current
    if (!topbarElement) {
      return
    }

    const updateTopbarHeight = () => {
      const nextHeight = resolveTopbarHeight({
        minHeight: DEFAULT_TOPBAR_HEIGHT,
        renderedHeight: topbarElement.getBoundingClientRect().height,
        scrollHeight: topbarElement.scrollHeight,
      })
      setTopbarHeight((current) => (current === nextHeight ? current : nextHeight))
    }

    updateTopbarHeight()
    window.addEventListener('resize', updateTopbarHeight)
    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        updateTopbarHeight()
      })
      observer.observe(topbarElement)
    }

    return () => {
      window.removeEventListener('resize', updateTopbarHeight)
      observer?.disconnect()
    }
  }, [hasVisibleToolbarSection, presentationMode, uiPreferences.toolbarVisibility])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    window.localStorage.setItem(
      UI_PREFERENCES_STORAGE_KEY,
      JSON.stringify(uiPreferences),
    )
  }, [uiPreferences])

  useEffect(() => {
    setLeftSidebarCollapsed(!paletteWindowOpen)
  }, [paletteWindowOpen])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    window.localStorage.setItem(
      MANAGED_WINDOWS_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        managedWindows,
        dockPosition,
        dockCollapsed,
        drawerCollapsed,
        floatingDockRect,
        leftDockWidth,
        rightDockWidth,
        journeyHeight,
        dockTabOrder,
        activeDockTab,
      }),
    )
  }, [
    activeDockTab,
    dockCollapsed,
    dockPosition,
    dockTabOrder,
    drawerCollapsed,
    floatingDockRect,
    journeyHeight,
    leftDockWidth,
    managedWindows,
    rightDockWidth,
  ])

  useEffect(() => {
    if (!initialUiPreferences.splashEnabled) {
      setSplashVisible(false)
      return
    }
    const timeout = window.setTimeout(() => {
      setSplashVisible(false)
    }, 2200)
    return () => window.clearTimeout(timeout)
  }, [initialUiPreferences.splashEnabled])

  useEffect(() => {
    const timeout = window.setTimeout(() => persist(), DEBOUNCE_SAVE_MS)
    return () => window.clearTimeout(timeout)
  }, [workspace, currentViewId, viewport, persist])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      saveWorkspaceLayout(workspace)
    }, DEBOUNCE_SAVE_MS)
    return () => window.clearTimeout(timeout)
  }, [workspace])

  useEffect(() => {
    if (!dslSyncEnabled) {
      dslSyncLastAppliedTextRef.current = null
      return
    }
    if (dslSyncLastAppliedTextRef.current === dslText) {
      return
    }
    try {
      const imported = resolveWorkspaceFromDslText(dslText)
      replaceWorkspace(imported.workspace, imported.entryViewId)
      dslSyncLastAppliedTextRef.current = dslText
      setDslError(null)
    } catch (error) {
      setDslError(error instanceof Error ? error.message : 'Failed to sync SJV Script.')
    }
  }, [dslSyncEnabled, dslText, replaceWorkspace, resolveWorkspaceFromDslText])

  useEffect(() => {
    if (historyApplyingRef.current) {
      return
    }
    const snapshot = captureHistorySnapshot()
    const stacks = historyRef.current
    const now = Date.now()
    const shouldCoalesce = now - historyLastCommitAtRef.current < 180

    if (!stacks.past.length) {
      stacks.past.push(snapshot)
    } else if (shouldCoalesce) {
      stacks.past[stacks.past.length - 1] = snapshot
    } else {
      stacks.past.push(snapshot)
    }
    if (stacks.past.length > HISTORY_LIMIT) {
      stacks.past.splice(0, stacks.past.length - HISTORY_LIMIT)
    }
    stacks.future = []
    historyLastCommitAtRef.current = now
    refreshHistoryAvailability()
  }, [captureHistorySnapshot, refreshHistoryAvailability])

  useEffect(
    () => () => {
      if (historyReleaseTimerRef.current !== null) {
        window.clearTimeout(historyReleaseTimerRef.current)
        historyReleaseTimerRef.current = null
      }
    },
    [],
  )

  useEffect(() => {
    if (journeyFocusSettings.autoLayoutMode !== 'always') {
      lastJourneyAutoLayoutKeyRef.current = null
      return
    }
    if (journeyFocusSettings.layoutMode !== 'reflow') {
      lastJourneyAutoLayoutKeyRef.current = null
      return
    }
    if (!journeyFilterId || !journeyFocusNodeIds.length || !journeyFocusEdgeIds.length) {
      lastJourneyAutoLayoutKeyRef.current = null
      return
    }

    const key = [
      currentViewId,
      journeyFilterId,
      journeyFocusNodeIds.join(','),
      journeyFocusEdgeIds.join(','),
    ].join('::')

    if (lastJourneyAutoLayoutKeyRef.current === key) {
      return
    }

    autoArrangeCurrentView({
      nodeIds: journeyFocusNodeIds,
      edgeIds: journeyFocusEdgeIds,
    })
    lastJourneyAutoLayoutKeyRef.current = key
  }, [
    autoArrangeCurrentView,
    currentViewId,
    journeyFilterId,
    journeyFocusEdgeIds,
    journeyFocusNodeIds,
    journeyFocusSettings.autoLayoutMode,
    journeyFocusSettings.layoutMode,
  ])

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
      setManagedWindows((current) => {
        let next = closeManagedWindow(current, 'preferences')
        next = closeManagedWindow(next, 'help')
        return next
      })
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
      const action = resolveModeShortcutAction(event.key, { focusMode, presentationMode })
      if (!action) {
        return
      }
      event.preventDefault()
      if (action === 'toggle-focus') {
        setPresentationMode(false)
        setFocusMode((current) => !current)
        return
      }
      if (action === 'exit-immersive') {
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
  }, [focusMode, presentationMode])

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

      if (hasCommand && !event.altKey && key === 'z') {
        event.preventDefault()
        if (event.shiftKey) {
          redoHistory()
        } else {
          undoHistory()
        }
        return
      }

      if (hasCommand && !event.altKey && key === 'y') {
        event.preventDefault()
        redoHistory()
        return
      }

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
  }, [deleteCurrentSelection, duplicateCurrentSelection, redoHistory, runAutoArrange, undoHistory])

  const exportFromCanvas = async (format: 'svg' | 'png' | 'pdf') => {
    const svg = document.querySelector('.diagram-canvas')
    if (!(svg instanceof SVGSVGElement)) {
      setExportError('Canvas not found for export.')
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
      setExportError(error instanceof Error ? error.message : 'Failed to export file.')
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
      setExportError('Canvas not found for animated export.')
      return
    }

    const journeyId = resolveCurrentExportJourneyId()
    if (!journeyId) {
      setExportError('Select a journey to export.')
      return
    }
    const journey = workspace.journeys[journeyId]
    if (!journey || !journey.steps.length) {
      setExportError('The selected journey has no steps for animated export.')
      return
    }

    const filenameBase = `${workspace.workspace.name}-${journey.name}`
    const exportSpeedMs = resolveExportPlaybackSpeedMs(playerSpeedMs)
    const durationMs = resolveJourneyAnimationDurationMs(journey.steps.length, exportSpeedMs)

    setExportError(null)
    setAnimatedExportRunning(true)
    setExportFocusJourneyId(journeyId)
    await waitForCanvasFrames(3)

    if (format === 'svg') {
      try {
        setExportStatus('Generating animated SVG...')
        exportAnimatedJourneySvg({
          svg,
          workspace,
          journey,
          playerSpeedMs: exportSpeedMs,
          filenameBase,
        })
        setExportStatus('Animated SVG exported.')
        window.setTimeout(() => setExportStatus(null), 2800)
      } catch (error) {
        setExportError(error instanceof Error ? error.message : 'Failed to export animated SVG.')
      } finally {
        setExportFocusJourneyId(null)
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
      setExportStatus('Preparing animated capture...')
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
        setExportStatus('Rendering animated GIF...')
        await exportAnimatedJourneyGif({
          svg,
          trailCanvas,
          canvasPanel: canvasPanelRef.current,
          durationMs,
          resolveBaseKey,
          filenameBase,
        })
        setExportStatus('Animated GIF exported.')
      } else {
        setExportStatus('Recording journey video...')
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
            ? 'MP4 video (mobile-compatible) exported.'
            : 'Video exported.',
        )
      }
      window.setTimeout(() => setExportStatus(null), 3200)
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Failed to export animated journey.')
    } finally {
      restorePlayerAfterAnimatedExport(snapshot)
      setExportFocusJourneyId(null)
      setAnimatedExportRunning(false)
    }
  }

  const journeyTimelineContent = (
    <>
      <div className="journey-timeline-toolbar">
        <strong>Active journey timeline</strong>
        <span className="player-step-info">
          Step {playerStepIndex + 1}/{playerJourney?.steps.length ?? 0}
        </span>
      </div>
      {activeJourney ? (
        <ol className="journey-steps">
          {activeJourneySteps.map((step) => (
            <li
              key={`${activeJourney.id}:${step.edgeId}`}
              className="journey-step-item journey-item"
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
              <span className="journey-drag-handle" aria-hidden="true">
                <GripVertical size={13} />
              </span>
              <span className="journey-color-dot" style={{ background: activeJourney.colorKey }} />
              <span>
                {step.n}. {workspace.edges[step.edgeId]?.label ?? step.edgeId}
              </span>
              <span className="journey-step-actions">
                <button type="button" onClick={() => removeEdgeFromJourney(activeJourney.id, step.edgeId)}>
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p>Select a journey on the sidebar to view the timeline.</p>
      )}
    </>
  )

  const dslPanelContent = (
    <div className={`dsl-panel ${dslMaximized ? 'dsl-panel-maximized' : ''}`} data-tutorial-id="dsl-panel">
      <div className="dsl-toolbar">
        <strong>{JOURNEY_SCRIPT_NAME}</strong>
        <label className="dsl-sync-toggle">
          <input
            type="checkbox"
            checked={dslSyncEnabled}
          onChange={(event) => {
              const enabled = event.target.checked
              setDslSyncEnabled(enabled)
              dslSyncLastAppliedTextRef.current = enabled ? dslText : null
              if (enabled) {
                setDslError(null)
              }
            }}
          />
          Sync with editor
        </label>
        <button
          type="button"
          onClick={() => {
            setDslText(fullWorkspaceToLiteDsl(workspace))
            setDslError(null)
          }}
          title={withTooltip('Generate SJV Script from the current workspace state')}
        >
          Export full workspace
        </button>
        <button
          type="button"
          onClick={() => {
            try {
              const imported = resolveWorkspaceFromDslText(dslText)
              replaceWorkspace(imported.workspace, imported.entryViewId)
              setDslError(null)
            } catch (error) {
              setDslError(error instanceof Error ? error.message : 'Failed to import SJV Script.')
            }
          }}
          disabled={dslSyncEnabled}
          title={withTooltip('Apply SJV Script content to the current workspace')}
        >
          Import SJV Script
        </button>
      </div>
      <div className="dsl-monaco-editor">
        <Suspense fallback={<p className="dsl-status-message">Loading SJV Script editor...</p>}>
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
      <div className="dsl-status-stack">
        {dslSyncEnabled ? (
          <p className="dsl-status-message">Sync active: valid SJV Script changes are applied to the view in real time.</p>
        ) : null}
        {dslError ? <p className="dsl-error">{dslError}</p> : null}
      </div>
    </div>
  )

  const helpPanelContent = (
    <section className="help-panel" data-tutorial-id="help-panel">
      <div className="help-section-tabs">
        <button
          type="button"
          className={helpSection === 'guide' ? 'help-section-tab help-section-tab-active' : 'help-section-tab'}
          onClick={() => setHelpSection('guide')}
        >
          Guide
        </button>
        <button
          type="button"
          className={helpSection === 'gallery' ? 'help-section-tab help-section-tab-active' : 'help-section-tab'}
          onClick={() => setHelpSection('gallery')}
        >
          Export Gallery
        </button>
        <button
          type="button"
          className={helpSection === 'about' ? 'help-section-tab help-section-tab-active' : 'help-section-tab'}
          onClick={() => setHelpSection('about')}
        >
          About
        </button>
      </div>
      {helpSection === 'guide' ? (
        <>
          <div className="help-guide-actions">
            <button type="button" onClick={() => startGuidedTutorial()}>
              Start Guided Tutorial
            </button>
            <button type="button" onClick={() => loadShowcasePreset('tutorial', uiPreferences.showcaseLocale)}>
              Load Tutorial Workspace ({uiPreferences.showcaseLocale.toUpperCase()})
            </button>
          </div>
          <ReactMarkdown>{helpGuideMarkdown}</ReactMarkdown>
        </>
      ) : null}
      {helpSection === 'gallery' ? (
        <div className="help-gallery">
          <p>
            Sample animated exports and live actions from the current workspace.
          </p>
          <div className="help-gallery-grid">
            <article className="help-gallery-card">
              <h3>Live Demo GIF</h3>
              <img src="/gallery/readme-live-demo.gif" alt="Sample GIF export playback" loading="lazy" />
            </article>
            <article className="help-gallery-card">
              <h3>Order Creation MP4</h3>
              <video src="/gallery/orders-platform-showcase-order-creation-sync-event.mp4" controls muted loop preload="metadata" />
            </article>
            <article className="help-gallery-card">
              <h3>UI Screenshot</h3>
              <img src="/gallery/print-ui.png" alt="SJV interface screenshot" loading="lazy" />
            </article>
          </div>
          <div className="help-gallery-actions">
            <button
              type="button"
              disabled={animatedExportRunning}
              onClick={() => {
                void exportAnimatedFromCanvas('gif')
              }}
            >
              {animatedExportRunning ? 'Exporting...' : 'Export GIF now'}
            </button>
            <button
              type="button"
              disabled={animatedExportRunning}
              onClick={() => {
                void exportAnimatedFromCanvas('mp4')
              }}
            >
              {animatedExportRunning ? 'Exporting...' : 'Export MP4 now'}
            </button>
            <button
              type="button"
              disabled={animatedExportRunning}
              onClick={() => {
                void exportAnimatedFromCanvas('svg')
              }}
            >
              {animatedExportRunning ? 'Exporting...' : 'Export Animated SVG now'}
            </button>
          </div>
        </div>
      ) : null}
      {helpSection === 'about' ? (
        <div className="help-about">
          <h3>System Journey Viewer</h3>
          <p>Version: {APP_VERSION_LABEL}</p>
          <p>Copyright: {APP_COPYRIGHT_LABEL}</p>
          <p>
            SJV is a desktop-inspired modeling canvas for architecture, journeys,
            drilldown navigation, and animated exports.
          </p>
        </div>
      ) : null}
    </section>
  )

  const preferencesPanelContent = (
    <div className="preferences-body">
      <label className="preferences-toggle">
        <input
          type="checkbox"
          checked={uiPreferences.tooltipsEnabled}
          onChange={(event) =>
            setUiPreferences((current) => ({
              ...current,
              tooltipsEnabled: event.target.checked,
            }))
          }
        />
        Enable tooltips
      </label>
      <label className="preferences-toggle">
        <input
          type="checkbox"
          checked={uiPreferences.splashEnabled}
          onChange={(event) =>
            setUiPreferences((current) => ({
              ...current,
              splashEnabled: event.target.checked,
            }))
          }
        />
        Show startup splash
      </label>
      <button
        type="button"
        className="preferences-inline-action"
        onClick={() => setSplashVisible(true)}
      >
        Show splash now
      </button>
      <label className="preferences-select">
        Showcase language
        <select
          value={uiPreferences.showcaseLocale}
          onChange={(event) =>
            setUiPreferences((current) => ({
              ...current,
              showcaseLocale: event.target.value as ShowcaseLocale,
            }))
          }
        >
          <option value="en">English</option>
          <option value="pt">Portuguese</option>
        </select>
      </label>
      <fieldset className="preferences-fieldset">
        <legend>Toolbar sections</legend>
        <label className="preferences-toggle">
          <input
            type="checkbox"
            checked={uiPreferences.toolbarVisibility.navigation}
            onChange={() => toggleToolbarSection('navigation')}
          />
          Navigation
        </label>
        <label className="preferences-toggle">
          <input
            type="checkbox"
            checked={uiPreferences.toolbarVisibility.editing}
            onChange={() => toggleToolbarSection('editing')}
          />
          Editing
        </label>
        <label className="preferences-toggle">
          <input
            type="checkbox"
            checked={uiPreferences.toolbarVisibility.panels}
            onChange={() => toggleToolbarSection('panels')}
          />
          Panels
        </label>
        <label className="preferences-toggle">
          <input
            type="checkbox"
            checked={uiPreferences.toolbarVisibility.modes}
            onChange={() => toggleToolbarSection('modes')}
          />
          Modes
        </label>
      </fieldset>
    </div>
  )

  const palettePanelContent = (
    <div className="dock-content-section">
      <h2>Palette</h2>
      <p>Drag to canvas:</p>
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
    </div>
  )

  const dockLabelByTab: Record<DockTab, string> = {
    palette: 'Palette',
    inspector: 'Inspector',
    journeys: 'Journeys',
    timeline: 'Timeline',
    dsl: 'SJV Script',
    help: 'Help',
    preferences: 'Preferences',
  }
  const dockIconByTab: Record<DockTab, ReactNode> = {
    palette: <PanelLeftOpen size={13} />,
    inspector: <SlidersHorizontal size={13} />,
    journeys: <Workflow size={13} />,
    timeline: <ListOrdered size={13} />,
    dsl: <Code2 size={13} />,
    help: <CircleHelp size={13} />,
    preferences: <SlidersHorizontal size={13} />,
  }
  const legacyDockTabOrder = dockTabOrder.filter((tab) => !isManagedDockTab(tab)) as DockTab[]
  const resolvedActiveDockTab = dockTabOrder.includes(activeDockTab) ? activeDockTab : dockTabOrder[0]
  const resolvedLegacyDockTab =
    legacyDockTabOrder.length === 0
      ? null
      : legacyDockTabOrder.includes(activeDockTab)
        ? activeDockTab
        : legacyDockTabOrder[0]

  const resolveDockTabContent = (tab: DockTab) => {
    if (tab === 'palette') {
      return palettePanelContent
    }
    if (tab === 'inspector') {
      return inspectorDockContent
    }
    if (tab === 'journeys') {
      return journeysDockContent
    }
    if (tab === 'timeline') {
      return journeyTimelineContent
    }
    if (tab === 'dsl') {
      return dslPanelContent
    }
    if (tab === 'help') {
      return helpPanelContent
    }
    return preferencesPanelContent
  }

  const inspectorDockContent = (
    <div className="dock-content-section">
      <h2>Inspector</h2>
      {!selectedNode && !selectedEdge ? <p>Select a node or edge on the canvas.</p> : null}
      {selectedNodes.length > 1 ? (
        <p>{selectedNodes.length} selected components (current focus: {selectedNode?.name ?? 'n/a'}).</p>
      ) : null}
      {selectedNode ? (
        <div className="inspector-form">
          <label htmlFor="node-id">ID</label>
          <input id="node-id" value={selectedNode.id} disabled />
          <label htmlFor="node-kind">Type</label>
          <input id="node-kind" value={selectedNode.kind} disabled />
          <label htmlFor="node-name">Name</label>
          {selectedNode.kind === 'note' ? (
            <textarea
              id="node-name"
              rows={4}
              value={selectedNode.name}
              onChange={(event) => setNodeName(selectedNode.id, event.target.value)}
            />
          ) : (
            <input
              id="node-name"
              value={selectedNode.name}
              onChange={(event) => setNodeName(selectedNode.id, event.target.value)}
            />
          )}
          <label htmlFor="node-preset">Preset</label>
          <input
            id="node-preset"
            value={resolveNodePreset(selectedNode.presetId ?? '')?.label ?? 'Custom'}
            disabled
          />
          <label htmlFor="node-tech">Technology</label>
          <input
            id="node-tech"
            value={selectedNode.tech?.label ?? ''}
            onChange={(event) => setNodeTech(selectedNode.id, event.target.value)}
          />
          {selectedNode.kind !== 'boundary' ? (
            <>
              <label htmlFor="node-color">Node color</label>
              <input
                id="node-color"
                type="color"
                value={
                  isHexColor(selectedNode.style?.fillColor)
                    ? selectedNode.style?.fillColor ?? '#2563eb'
                    : '#2563eb'
                }
                onChange={(event) => setNodeColor(selectedNode.id, event.target.value)}
              />
              <label>Suggested palette ({theme === 'dark' ? 'Tailwind dark' : 'Tailwind light'})</label>
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
                    title={withTooltip(color)}
                    onClick={() => setNodeColor(selectedNode.id, color)}
                  />
                ))}
              </div>
            </>
          ) : null}
          <label htmlFor="node-text-color">Text color</label>
          <input
            id="node-text-color"
            type="color"
            value={
              isHexColor(selectedNode.style?.textColor)
                ? selectedNode.style?.textColor ?? (theme === 'dark' ? '#f8fafc' : '#0f172a')
                : theme === 'dark'
                  ? '#f8fafc'
                  : '#0f172a'
            }
            onChange={(event) => setNodeTextColor(selectedNode.id, event.target.value)}
          />
          <label>Text palette</label>
          <div className="node-color-presets">
            {nodeTextColorPresets.map((color) => (
              <button
                key={color}
                type="button"
                className={
                  selectedNode.style?.textColor === color
                    ? 'node-color-chip node-color-chip-active'
                    : 'node-color-chip'
                }
                style={{ background: color }}
                title={withTooltip(color)}
                onClick={() => setNodeTextColor(selectedNode.id, color)}
              />
            ))}
          </div>
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
          <label htmlFor="edge-protocol">Protocol</label>
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
          <label htmlFor="edge-label-side">Label Side</label>
          <select
            id="edge-label-side"
            value={selectedEdge.style.labelSide ?? 'left'}
            onChange={(event) =>
              setEdgeLabelSide(selectedEdge.id, event.target.value as 'left' | 'right')
            }
          >
            <option value="left">Left / Top</option>
            <option value="right">Right / Bottom</option>
          </select>
          <label htmlFor="edge-label-angle">Label Rotation</label>
          <input
            id="edge-label-angle"
            type="range"
            min={-180}
            max={180}
            step={1}
            value={selectedEdge.style.labelAngle ?? 0}
            onChange={(event) => setEdgeLabelAngle(selectedEdge.id, Number(event.target.value))}
          />
          <span className="edge-label-position-value">
            {Math.round(selectedEdge.style.labelAngle ?? 0)}°
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
      <section className="journey-side-group">
        <h3>Creation</h3>
        <div className="journey-side-create">
          <input
            placeholder="New journey"
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
            Create journey
          </button>
        </div>
      </section>
      <section className="journey-side-group">
        <h3>Filter & Layout</h3>
        <div className="journey-side-filter">
          <select
            value={journeyFilterId ?? ''}
            onChange={(event) => {
              const nextJourneyId = event.target.value || null
              applyJourneyFilter(nextJourneyId, { activateJourney: true })
            }}
          >
            <option value="">Filter: all journeys</option>
            {viewJourneys.map((journey) => (
              <option key={journey.id} value={journey.id}>
                {journey.name}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => applyJourneyFilter(null, { activateJourney: false })}>
            Clear filter
          </button>
          <select
            value={journeyFocusSettings.offscopeRenderMode}
            onChange={(event) =>
              setJourneyFocusSettings({
                offscopeRenderMode: event.target.value as typeof journeyFocusSettings.offscopeRenderMode,
              })
            }
          >
            <option value="show">Focus: show all</option>
            <option value="dim">Focus: dim outside journey</option>
            <option value="hide">Focus: hide outside journey</option>
          </select>
          <select
            value={journeyFocusSettings.layoutMode}
            onChange={(event) =>
              setJourneyFocusSettings({
                layoutMode: event.target.value as typeof journeyFocusSettings.layoutMode,
              })
            }
          >
            <option value="preserve">Filter layout: preserve positions</option>
            <option value="reflow">Filter layout: reflow journey</option>
          </select>
          <select
            value={journeyFocusSettings.autoLayoutMode}
            onChange={(event) =>
              setJourneyFocusSettings({
                autoLayoutMode: event.target.value as typeof journeyFocusSettings.autoLayoutMode,
              })
            }
          >
            <option value="manual">Auto-layout: apply manually</option>
            <option value="always">Auto-layout: always while filtering</option>
          </select>
          <button
            type="button"
            onClick={() => runAutoArrange()}
            disabled={
              journeyFocusSettings.layoutMode !== 'reflow' ||
              !journeyFilterId ||
              !journeyFocusNodeIds.length
            }
          >
            Apply layout now
          </button>
        </div>
      </section>
      <section className="journey-side-group">
        <h3>Player</h3>
        <div className="journey-side-player">
          <select value={playerJourneyId ?? ''} onChange={(event) => activateJourneyPlayback(event.target.value || null)}>
            <option value="">Player: select journey</option>
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
            <option value="cinematic">Animation: Cinematic</option>
            <option value="orb">Animation: Orb only</option>
            <option value="minimal">Animation: Minimal</option>
          </select>
          <div className="journey-player-actions journey-player-actions-iconic" role="group" aria-label="Player controls">
            <button type="button" disabled={!playerJourney} onClick={() => prevPlayerStep()} aria-label="Previous step">
              <SkipBack size={15} />
            </button>
            <button
              type="button"
              disabled={!playerJourney}
              onClick={() => setPlayerRunning(!playerIsRunning)}
              aria-label={playerIsRunning ? 'Pause player' : 'Start player'}
            >
              {playerIsRunning ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button type="button" disabled={!playerJourney} onClick={() => stepPlayer()} aria-label="Next step">
              <SkipForward size={15} />
            </button>
            <button type="button" disabled={!playerJourney} onClick={() => resetPlayer()} aria-label="Reset player">
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
      </section>
      <section className="journey-side-group">
        <h3>Journeys</h3>
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
                  const nextJourneyFilter = journeyFilterId === journey.id ? null : journey.id
                  applyJourneyFilter(nextJourneyFilter, {
                    activateJourney: nextJourneyFilter !== null,
                  })
                  if (!nextJourneyFilter) {
                    setActiveJourney(journey.id)
                    activateJourneyPlayback(journey.id)
                  }
                }}
              >
                {journeyFilterId === journey.id ? 'Filtering' : 'Filter'}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )

  const dockHeaderBar = (
    <div className="topbar-dock-strip dock-tab-strip" data-tutorial-id="panel-shortcuts-strip">
      {dockTabOrder.map((tab) => (
        <button
          key={tab}
          type="button"
          draggable
          className={resolvedActiveDockTab === tab ? 'dock-tab dock-tab-active' : 'dock-tab'}
          onClick={() => openManagedDockedWindowFromDockTab(tab)}
          title={withTooltip(`Open ${dockLabelByTab[tab]} window (drag to reorder shortcuts)`)}
          aria-label={dockLabelByTab[tab]}
          onDragStart={() => handleDockTabDragStart(tab)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => handleDockTabDrop(tab)}
          onDragEnd={() => {
            dockTabDragRef.current = null
          }}
        >
          <span className="dock-tab-icon" aria-hidden="true">
            {dockIconByTab[tab]}
          </span>
          <span className="dock-tab-label">{dockLabelByTab[tab]}</span>
        </button>
      ))}
      <span className="dock-tab-spacer" />
      <div className="dock-placement-actions">
        <button
          type="button"
          className={dockPosition === 'left' ? 'dock-placement dock-placement-active' : 'dock-placement'}
          onClick={() => moveDockToLeft()}
          title={withTooltip('Dock left')}
          aria-label="Dock left"
        >
          <PanelLeftOpen size={14} />
        </button>
        <button
          type="button"
          className={dockPosition === 'right' ? 'dock-placement dock-placement-active' : 'dock-placement'}
          onClick={() => moveDockToRight()}
          title={withTooltip('Dock right')}
          aria-label="Dock right"
        >
          <PanelRightOpen size={14} />
        </button>
        <button
          type="button"
          className={dockPosition === 'bottom' ? 'dock-placement dock-placement-active' : 'dock-placement'}
          onClick={() => moveDockToBottom()}
          title={withTooltip('Dock bottom')}
          aria-label="Dock bottom"
        >
          <PanelBottomOpen size={14} />
        </button>
        <button
          type="button"
          className={dockPosition === 'floating' ? 'dock-placement dock-placement-active' : 'dock-placement'}
          onClick={() => moveDockToFloating()}
          title={withTooltip('Floating dock')}
          aria-label="Floating dock"
        >
          <Dock size={14} />
        </button>
      </div>
    </div>
  )

  const currentManagedDockHostId: ManagedWindowDockHostId | null =
    dockPosition === 'left' || dockPosition === 'right' || dockPosition === 'bottom'
      ? dockPosition
      : null
  const currentManagedDockHost =
    currentManagedDockHostId ? managedWindows.hosts[currentManagedDockHostId] : null
  const renderManagedWindowDockContent = (windowId: ManagedWindowId) => {
    if (windowId === 'palette') {
      return palettePanelContent
    }
    if (windowId === 'inspector') {
      return inspectorDockContent
    }
    if (windowId === 'journeys') {
      return journeysDockContent
    }
    if (windowId === 'timeline') {
      return journeyTimelineContent
    }
    if (windowId === 'dsl') {
      return dslPanelContent
    }
    if (windowId === 'help') {
      return helpPanelContent
    }
    return preferencesPanelContent
  }
  const resolveManagedHostActiveTab = (hostId: ManagedWindowDockHostId): ManagedWindowId | null => {
    const host = managedWindows.hosts[hostId]
    if (host.activeTab && host.tabs.includes(host.activeTab)) {
      return host.activeTab
    }
    return host.tabs[0] ?? null
  }
  const buildManagedDockHostHeaderActions = (
    hostId: ManagedWindowDockHostId,
    activeWindowId: ManagedWindowId | null,
  ) =>
    activeWindowId ? (
      <span className="dock-placement-actions">
        <button
          type="button"
          className={hostId === 'left' ? 'dock-placement dock-placement-active' : 'dock-placement'}
          onClick={() => dockManagedWindowToHost(activeWindowId, 'left')}
          title={withTooltip(`Dock ${dockLabelByTab[activeWindowId]} left`)}
          aria-label={`Dock ${dockLabelByTab[activeWindowId]} left`}
        >
          <PanelLeftOpen size={14} />
        </button>
        <button
          type="button"
          className={hostId === 'right' ? 'dock-placement dock-placement-active' : 'dock-placement'}
          onClick={() => dockManagedWindowToHost(activeWindowId, 'right')}
          title={withTooltip(`Dock ${dockLabelByTab[activeWindowId]} right`)}
          aria-label={`Dock ${dockLabelByTab[activeWindowId]} right`}
        >
          <PanelRightOpen size={14} />
        </button>
        <button
          type="button"
          className={hostId === 'bottom' ? 'dock-placement dock-placement-active' : 'dock-placement'}
          onClick={() => dockManagedWindowToHost(activeWindowId, 'bottom')}
          title={withTooltip(`Dock ${dockLabelByTab[activeWindowId]} bottom`)}
          aria-label={`Dock ${dockLabelByTab[activeWindowId]} bottom`}
        >
          <PanelBottomOpen size={14} />
        </button>
        <button
          type="button"
          className="dock-placement"
          onClick={() => floatManagedDockHostWindow(hostId, activeWindowId)}
          title={withTooltip(`Float ${dockLabelByTab[activeWindowId]}`)}
          aria-label={`Float ${dockLabelByTab[activeWindowId]}`}
        >
          <Dock size={14} />
        </button>
        <button
          type="button"
          className="dock-placement"
          onClick={() => closeManagedDockHostWindow(hostId, activeWindowId)}
          title={withTooltip(`Close ${dockLabelByTab[activeWindowId]}`)}
          aria-label={`Close ${dockLabelByTab[activeWindowId]}`}
        >
          <X size={14} />
        </button>
      </span>
    ) : null

  const renderManagedDockHostPanel = (hostId: ManagedWindowDockHostId) => {
    const host = managedWindows.hosts[hostId]
    const activeTabId = resolveManagedHostActiveTab(hostId)
    return (
      <div className="dock-panel dock-panel-managed">
        <div className="dock-tab-body">
          <DockHost
            tabs={host.tabs.map((windowId) => ({
              id: windowId,
              label: dockLabelByTab[windowId],
              icon: dockIconByTab[windowId],
            }))}
            activeTabId={activeTabId}
            onTabSelect={(windowId) => selectManagedDockHostTab(hostId, windowId)}
            renderTabPanel={renderManagedWindowDockContent}
            headerActions={buildManagedDockHostHeaderActions(hostId, activeTabId)}
            emptyState={<p className="dock-host-empty">No docked windows in this host.</p>}
          />
        </div>
      </div>
    )
  }

  const currentManagedDockHostRenderedStandalone =
    (currentManagedDockHostId === 'left' && managedLeftHostVisible) ||
    (currentManagedDockHostId === 'right' && managedRightHostVisible) ||
    (currentManagedDockHostId === 'bottom' && managedBottomHostVisible)
  const managedDockActiveTab =
    currentManagedDockHostId && currentManagedDockHost ? resolveManagedHostActiveTab(currentManagedDockHostId) : null
  const renderManagedDockHostInDockPanel =
    Boolean(currentManagedDockHostId) &&
    isManagedDockTab(resolvedActiveDockTab) &&
    Boolean(currentManagedDockHost?.tabs.includes(resolvedActiveDockTab)) &&
    !currentManagedDockHostRenderedStandalone

  const dockPanelBodyContent = renderManagedDockHostInDockPanel && currentManagedDockHostId && currentManagedDockHost ? (
    <DockHost
      tabs={currentManagedDockHost.tabs.map((windowId) => ({
        id: windowId,
        label: dockLabelByTab[windowId],
        icon: dockIconByTab[windowId],
      }))}
      activeTabId={managedDockActiveTab}
      onTabSelect={(windowId) => selectManagedDockHostTab(currentManagedDockHostId, windowId)}
      renderTabPanel={renderManagedWindowDockContent}
      headerActions={buildManagedDockHostHeaderActions(currentManagedDockHostId, managedDockActiveTab)}
      emptyState={<p className="dock-host-empty">No docked windows in this host.</p>}
    />
  ) : resolvedLegacyDockTab ? (
    resolveDockTabContent(resolvedLegacyDockTab)
  ) : (
    <p className="dock-host-empty">Legacy dock is empty. Use the managed window hosts or float windows.</p>
  )

  const dockPanelBodyClassName =
    !renderManagedDockHostInDockPanel && resolvedLegacyDockTab === 'dsl'
      ? 'dock-tab-body dock-tab-body-dsl'
      : 'dock-tab-body'

  const dockPanel = (
    <div
      className={
        dockPosition === 'left'
          ? 'dock-panel dock-panel-left'
          : dockPosition === 'right'
          ? 'dock-panel dock-panel-right'
          : dockPosition === 'bottom'
            ? 'dock-panel dock-panel-bottom'
            : 'dock-panel dock-panel-floating'
      }
    >
      <div className={dockPanelBodyClassName}>{dockPanelBodyContent}</div>
    </div>
  )

  const drawerClassName =
    drawerTab === 'dsl'
      ? 'journey-drawer journey-drawer-dsl'
      : drawerTab === 'dock'
        ? 'journey-drawer journey-drawer-dock'
        : 'journey-drawer'

  const buildManagedWindowDockActions = (windowId: ManagedWindowId) => (
    <span className="dock-placement-actions">
      <button
        type="button"
        className={
          managedWindows.windows[windowId].placement === 'floating'
            ? 'dock-placement dock-placement-active'
            : 'dock-placement'
        }
        onClick={() => {
          setManagedWindows((current) => floatManagedWindow(current, windowId))
        }}
        title={withTooltip('Floating window')}
        aria-label="Keep floating"
      >
        <Dock size={14} />
      </button>
      <button
        type="button"
        className="dock-placement"
        onClick={() => dockManagedWindowToHost(windowId, 'left')}
        title={withTooltip('Dock left')}
        aria-label="Dock left"
      >
        <PanelLeftOpen size={14} />
      </button>
      <button
        type="button"
        className="dock-placement"
        onClick={() => dockManagedWindowToHost(windowId, 'right')}
        title={withTooltip('Dock right')}
        aria-label="Dock right"
      >
        <PanelRightOpen size={14} />
      </button>
      <button
        type="button"
        className="dock-placement"
        onClick={() => dockManagedWindowToHost(windowId, 'bottom')}
        title={withTooltip('Dock bottom')}
        aria-label="Dock bottom"
      >
        <PanelBottomOpen size={14} />
      </button>
    </span>
  )

  const floatingManagedWindows = MANAGED_WINDOW_IDS.filter((windowId) => {
    const windowState = managedWindows.windows[windowId]
    return windowState.open && windowState.placement === 'floating'
  })
  const renderManagedWindowFloatingContent = (windowId: ManagedWindowId) => {
    const content = renderManagedWindowDockContent(windowId)
    if (windowId === 'help' || windowId === 'preferences') {
      return content
    }
    return (
      <div className={windowId === 'dsl' ? 'dock-tab-body dock-tab-body-dsl' : 'dock-tab-body'}>
        {content}
      </div>
    )
  }

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
      {splashVisible ? (
        <div className="splash-screen" role="status" aria-live="polite">
          <div className="splash-card">
            <div className="app-logo-badge splash-logo" aria-hidden="true">
              <svg viewBox="0 0 64 64">
                <defs>
                  <linearGradient id="sjvSplashGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#22c55e" />
                  </linearGradient>
                </defs>
                <rect x="6" y="6" width="52" height="52" rx="14" fill="url(#sjvSplashGradient)" opacity="0.18" />
                <path
                  d="M17 20 H29 M35 20 H47 M17 44 H29 M35 44 H47 M23 20 V44 M41 20 V44"
                  stroke="url(#sjvSplashGradient)"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
                <circle cx="23" cy="20" r="4.2" fill="#38bdf8" />
                <circle cx="41" cy="20" r="4.2" fill="#22c55e" />
                <circle cx="23" cy="44" r="4.2" fill="#22c55e" />
                <circle cx="41" cy="44" r="4.2" fill="#38bdf8" />
              </svg>
            </div>
            <h2>System Journey Viewer</h2>
            <p>{APP_VERSION_LABEL}</p>
            <small>Copyright {APP_COPYRIGHT_LABEL}</small>
          </div>
        </div>
      ) : null}
      <header ref={topbarRef} className="topbar">
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
            <nav
              className="desktop-menu-bar"
              aria-label="Main menu"
              ref={desktopMenuBarRef}
              data-tutorial-id="main-menu-bar"
            >
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
                  {recentWorkspaces.map((entry) => (
                    <button
                      key={`recent-${entry.id}`}
                      type="button"
                      role="menuitem"
                      onClick={() => runDesktopMenuAction(() => openRecentWorkspace(entry))}
                      title={withTooltip(new Date(entry.savedAtIso).toLocaleString())}
                    >
                      <span>Recent: {entry.name}</span>
                    </button>
                  ))}
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
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!canUndo}
                    onClick={() => runDesktopMenuAction(() => undoHistory())}
                  >
                    <span>Undo</span>
                    <kbd>Ctrl+Z</kbd>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!canRedo}
                    onClick={() => runDesktopMenuAction(() => redoHistory())}
                  >
                    <span>Redo</span>
                    <kbd>Ctrl+Shift+Z</kbd>
                  </button>
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
                  </button>
                </div>
              ) : null}
            </div>
            <div
              className={openDesktopMenu === 'window' ? 'desktop-menu desktop-menu-open' : 'desktop-menu'}
              onMouseEnter={() => {
                if (openDesktopMenu) {
                  setOpenDesktopMenu('window')
                }
              }}
            >
              <button
                type="button"
                className="desktop-menu-trigger"
                aria-haspopup="menu"
                aria-expanded={openDesktopMenu === 'window'}
                aria-controls="desktop-menu-window"
                data-tutorial-id="menu-window-trigger"
                onClick={() => toggleDesktopMenu('window')}
              >
                Window
              </button>
              {openDesktopMenu === 'window' ? (
                <div id="desktop-menu-window" className="desktop-menu-list" role="menu" aria-label="Window menu">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => openManagedDockedWindowFromDockTab('palette'))}
                  >
                    <span>Open Palette Panel</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => openManagedDockedWindowFromDockTab('inspector'))}
                  >
                    <span>Open Inspector Panel</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => openManagedDockedWindowFromDockTab('journeys'))}
                  >
                    <span>Open Journeys Panel</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => openManagedDockedWindowFromDockTab('timeline'))}
                  >
                    <span>Open Timeline Panel</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => openManagedDockedWindowFromDockTab('dsl'))}
                  >
                    <span>Open SJV Script Panel</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => openManagedDockedWindowFromDockTab('help'))}
                  >
                    <span>Open Help Panel</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => openManagedDockedWindowFromDockTab('preferences'))}
                  >
                    <span>Open Preferences Panel</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => toggleLeftSidebar())}
                  >
                    <span>{paletteWindowOpen ? 'Hide Palette' : 'Show Palette'}</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => toggleDockPanel())}
                  >
                    <span>{dockCollapsed ? 'Show Dock' : 'Hide Dock'}</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => toggleWorkbench())}
                  >
                    <span>{drawerCollapsed ? 'Show Workbench' : 'Hide Workbench'}</span>
                  </button>
                  <button type="button" role="menuitem" onClick={() => runDesktopMenuAction(() => moveDockToLeft())}>
                    <span>Dock Left</span>
                  </button>
                  <button type="button" role="menuitem" onClick={() => runDesktopMenuAction(() => moveDockToRight())}>
                    <span>Dock Right</span>
                  </button>
                  <button type="button" role="menuitem" onClick={() => runDesktopMenuAction(() => moveDockToBottom())}>
                    <span>Dock Bottom</span>
                  </button>
                  <button type="button" role="menuitem" onClick={() => runDesktopMenuAction(() => moveDockToFloating())}>
                    <span>Dock Floating</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => restoreWindowLayout())}
                  >
                    <span>Restore Window Layout</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => resetWindowLayout())}
                  >
                    <span>Reset Window Layout</span>
                  </button>
                  <button type="button" role="menuitem" onClick={() => runDesktopMenuAction(() => setSplashVisible(true))}>
                    <span>Show Splash</span>
                  </button>
                </div>
              ) : null}
            </div>
            <div
              className={openDesktopMenu === 'journey' ? 'desktop-menu desktop-menu-open' : 'desktop-menu'}
              onMouseEnter={() => {
                if (openDesktopMenu) {
                  setOpenDesktopMenu('journey')
                }
              }}
            >
              <button
                type="button"
                className="desktop-menu-trigger"
                aria-haspopup="menu"
                aria-expanded={openDesktopMenu === 'journey'}
                aria-controls="desktop-menu-journey"
                onClick={() => toggleDesktopMenu('journey')}
              >
                Journey
              </button>
              {openDesktopMenu === 'journey' ? (
                <div id="desktop-menu-journey" className="desktop-menu-list" role="menu" aria-label="Journey menu">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runDesktopMenuAction(() => {
                        const createdJourneyId = createJourney(journeyDraftName || undefined)
                        setJourneyDraftName('')
                        setActiveJourney(createdJourneyId)
                        activateJourneyPlayback(createdJourneyId)
                      })
                    }
                  >
                    <span>Create Journey</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runDesktopMenuAction(() => {
                        applyJourneyFilter(null, { activateJourney: false })
                      })
                    }
                  >
                    <span>Clear Journey Filter</span>
                  </button>
                  {viewJourneys.length ? (
                    <>
                      {viewJourneys.map((journey) => (
                        <button
                          key={`menu-filter-${journey.id}`}
                          type="button"
                          role="menuitem"
                          onClick={() =>
                            runDesktopMenuAction(() => {
                              applyJourneyFilter(journey.id, { activateJourney: true })
                            })
                          }
                        >
                          <span>
                            {journeyFilterId === journey.id ? 'Filtering: ' : 'Filter: '}
                            {journey.name}
                          </span>
                        </button>
                      ))}
                    </>
                  ) : null}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runDesktopMenuAction(() =>
                        setJourneyFocusSettings({
                          offscopeRenderMode: 'show',
                        }),
                      )
                    }
                  >
                    <span>
                      Focus: Show{journeyFocusSettings.offscopeRenderMode === 'show' ? ' (active)' : ''}
                    </span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runDesktopMenuAction(() =>
                        setJourneyFocusSettings({
                          offscopeRenderMode: 'dim',
                        }),
                      )
                    }
                  >
                    <span>
                      Focus: Dim{journeyFocusSettings.offscopeRenderMode === 'dim' ? ' (active)' : ''}
                    </span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runDesktopMenuAction(() =>
                        setJourneyFocusSettings({
                          offscopeRenderMode: 'hide',
                        }),
                      )
                    }
                  >
                    <span>
                      Focus: Hide{journeyFocusSettings.offscopeRenderMode === 'hide' ? ' (active)' : ''}
                    </span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runDesktopMenuAction(() =>
                        setJourneyFocusSettings({
                          layoutMode: 'preserve',
                        }),
                      )
                    }
                  >
                    <span>
                      Filter Layout: Preserve
                      {journeyFocusSettings.layoutMode === 'preserve' ? ' (active)' : ''}
                    </span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runDesktopMenuAction(() =>
                        setJourneyFocusSettings({
                          layoutMode: 'reflow',
                        }),
                      )
                    }
                  >
                    <span>
                      Filter Layout: Reflow
                      {journeyFocusSettings.layoutMode === 'reflow' ? ' (active)' : ''}
                    </span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runDesktopMenuAction(() =>
                        setJourneyFocusSettings({
                          autoLayoutMode: 'manual',
                        }),
                      )
                    }
                  >
                    <span>
                      Auto-layout: Manual
                      {journeyFocusSettings.autoLayoutMode === 'manual' ? ' (active)' : ''}
                    </span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runDesktopMenuAction(() =>
                        setJourneyFocusSettings({
                          autoLayoutMode: 'always',
                        }),
                      )
                    }
                  >
                    <span>
                      Auto-layout: Always
                      {journeyFocusSettings.autoLayoutMode === 'always' ? ' (active)' : ''}
                    </span>
                  </button>
                  <button type="button" role="menuitem" onClick={() => runDesktopMenuAction(() => runAutoArrange())}>
                    <span>Apply Layout Now</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runDesktopMenuAction(() =>
                        applyPlayerAnimationPreset('cinematic'),
                      )
                    }
                  >
                    <span>Animation: Cinematic</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runDesktopMenuAction(() =>
                        applyPlayerAnimationPreset('orb'),
                      )
                    }
                  >
                    <span>Animation: Orb only</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runDesktopMenuAction(() =>
                        applyPlayerAnimationPreset('minimal'),
                      )
                    }
                  >
                    <span>Animation: Minimal</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!playerJourney}
                    onClick={() => runDesktopMenuAction(() => prevPlayerStep())}
                  >
                    <span>Player: Previous Step</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!playerJourney}
                    onClick={() => runDesktopMenuAction(() => setPlayerRunning(!playerIsRunning))}
                  >
                    <span>{playerIsRunning ? 'Player: Pause' : 'Player: Play'}</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!playerJourney}
                    onClick={() => runDesktopMenuAction(() => stepPlayer())}
                  >
                    <span>Player: Next Step</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!playerJourney}
                    onClick={() => runDesktopMenuAction(() => resetPlayer())}
                  >
                    <span>Player: Reset</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => setPlayerLoop(!playerLoop))}
                  >
                    <span>{playerLoop ? 'Loop: On' : 'Loop: Off'}</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => setPlayerHighlightNodes(!playerHighlightNodes))}
                  >
                    <span>{playerHighlightNodes ? 'Highlight: On' : 'Highlight: Off'}</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => setPlayerTrailEnabled(!playerTrailEnabled))}
                  >
                    <span>{playerTrailEnabled ? 'Trail: On' : 'Trail: Off'}</span>
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
                    onClick={() =>
                      runDesktopMenuAction(() => loadShowcasePreset('showcase', uiPreferences.showcaseLocale))
                    }
                  >
                    <span>Load Showcase ({uiPreferences.showcaseLocale.toUpperCase()})</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => loadShowcasePreset('showcase', 'en'))}
                  >
                    <span>Load Showcase (EN)</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => loadShowcasePreset('showcase', 'pt'))}
                  >
                    <span>Load Showcase (PT)</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => loadShowcasePreset('tutorial', 'en'))}
                  >
                    <span>Load Tutorial (EN)</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => loadShowcasePreset('tutorial', 'pt'))}
                  >
                    <span>Load Tutorial (PT)</span>
                  </button>
                </div>
              ) : null}
            </div>
            <div
              className={openDesktopMenu === 'settings' ? 'desktop-menu desktop-menu-open' : 'desktop-menu'}
              onMouseEnter={() => {
                if (openDesktopMenu) {
                  setOpenDesktopMenu('settings')
                }
              }}
            >
              <button
                type="button"
                className="desktop-menu-trigger"
                aria-haspopup="menu"
                aria-expanded={openDesktopMenu === 'settings'}
                aria-controls="desktop-menu-settings"
                onClick={() => toggleDesktopMenu('settings')}
              >
                Settings
              </button>
              {openDesktopMenu === 'settings' ? (
                <div id="desktop-menu-settings" className="desktop-menu-list" role="menu" aria-label="Settings menu">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => openPreferencesWindow())}
                  >
                    <span>Open Preferences</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runDesktopMenuAction(() =>
                        setUiPreferences((current) => ({
                          ...current,
                          tooltipsEnabled: !current.tooltipsEnabled,
                        })),
                      )
                    }
                  >
                    <span>{uiPreferences.tooltipsEnabled ? 'Disable Tooltips' : 'Enable Tooltips'}</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runDesktopMenuAction(() =>
                        setUiPreferences((current) => ({
                          ...current,
                          splashEnabled: !current.splashEnabled,
                        })),
                      )
                    }
                  >
                    <span>{uiPreferences.splashEnabled ? 'Disable Startup Splash' : 'Enable Startup Splash'}</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runDesktopMenuAction(() =>
                        setUiPreferences((current) => ({ ...current, showcaseLocale: 'en' })),
                      )
                    }
                  >
                    <span>Showcase Language: English{uiPreferences.showcaseLocale === 'en' ? ' (active)' : ''}</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runDesktopMenuAction(() =>
                        setUiPreferences((current) => ({ ...current, showcaseLocale: 'pt' })),
                      )
                    }
                  >
                    <span>Showcase Language: Portuguese{uiPreferences.showcaseLocale === 'pt' ? ' (active)' : ''}</span>
                  </button>
                </div>
              ) : null}
            </div>
            <div
              className={openDesktopMenu === 'help' ? 'desktop-menu desktop-menu-open' : 'desktop-menu'}
              onMouseEnter={() => {
                if (openDesktopMenu) {
                  setOpenDesktopMenu('help')
                }
              }}
            >
              <button
                type="button"
                className="desktop-menu-trigger"
                aria-haspopup="menu"
                aria-expanded={openDesktopMenu === 'help'}
                aria-controls="desktop-menu-help"
                onClick={() => toggleDesktopMenu('help')}
              >
                Help
              </button>
              {openDesktopMenu === 'help' ? (
                <div id="desktop-menu-help" className="desktop-menu-list" role="menu" aria-label="Help menu">
                  <button type="button" role="menuitem" onClick={() => runDesktopMenuAction(() => startGuidedTutorial())}>
                    <span>Start Guided Tutorial</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runDesktopMenuAction(() => {
                        openHelpWindow('guide')
                      })
                    }
                  >
                    <span>Open Help Guide</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runDesktopMenuAction(() => {
                        openHelpWindow('gallery')
                      })
                    }
                  >
                    <span>Open Export Gallery</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runDesktopMenuAction(() => {
                        openHelpWindow('about')
                      })
                    }
                  >
                    <span>Open About</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runDesktopMenuAction(() => {
                        setSplashVisible(true)
                      })
                    }
                  >
                    <span>Show Splash</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => loadShowcasePreset('showcase', 'en'))}
                  >
                    <span>Load Showcase (EN)</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => loadShowcasePreset('showcase', 'pt'))}
                  >
                    <span>Load Showcase (PT)</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => loadShowcasePreset('tutorial', 'en'))}
                  >
                    <span>Load Tutorial (EN)</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => loadShowcasePreset('tutorial', 'pt'))}
                  >
                    <span>Load Tutorial (PT)</span>
                  </button>
                </div>
              ) : null}
            </div>
            </nav>
          ) : null}
          {!presentationMode ? (
            <div className="mode-indicators">
                <span className={activeTool === 'connector' ? 'mode-pill mode-pill-active' : 'mode-pill'}>
                {activeTool === 'connector' ? 'Mode: Connector' : 'Mode: Select'}
              </span>
              <span className="mode-pill">Layer: {currentViewModeLabel}</span>
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
              {currentPlayerStepLabel ? (
                <span
                  className={
                    playerIsRunning
                      ? 'mode-pill mode-pill-playing mode-pill-step-name'
                      : 'mode-pill mode-pill-step-name'
                  }
                  title={withTooltip(currentPlayerStepLabel)}
                >
                  {currentPlayerStepLabel}
                </span>
              ) : null}
            </div>
          )}
        </div>
        <div className="topbar-actions" data-tutorial-id="topbar-toolbar">
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
                <option value="">Player: select journey</option>
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
                <option value="cinematic">Animation: Cinematic</option>
                <option value="orb">Animation: Orb only</option>
                <option value="minimal">Animation: Minimal</option>
              </select>
              <div className="journey-player-actions journey-player-actions-iconic" role="group" aria-label="Player controls">
                <button type="button" disabled={!playerJourney} onClick={() => prevPlayerStep()} aria-label="Previous step">
                  <SkipBack size={15} />
                </button>
                <button
                  type="button"
                  disabled={!playerJourney}
                  onClick={() => setPlayerRunning(!playerIsRunning)}
                  aria-label={playerIsRunning ? 'Pause player' : 'Start player'}
                >
                  {playerIsRunning ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button type="button" disabled={!playerJourney} onClick={() => stepPlayer()} aria-label="Next step">
                  <SkipForward size={15} />
                </button>
                <button type="button" disabled={!playerJourney} onClick={() => resetPlayer()} aria-label="Reset player">
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
                {animatedExportRunning ? 'Exporting...' : 'Export GIF'}
              </button>
              <button
                type="button"
                className="presentation-export-button"
                disabled={!playerJourney || animatedExportRunning}
                onClick={() => {
                  void exportAnimatedFromCanvas('mp4')
                }}
              >
                {animatedExportRunning ? 'Exporting...' : 'Export MP4'}
              </button>
              <button
                type="button"
                className="presentation-export-button"
                disabled={!playerJourney || animatedExportRunning}
                onClick={() => {
                  void exportAnimatedFromCanvas('svg')
                }}
              >
                {animatedExportRunning ? 'Exporting...' : 'Export Animated SVG'}
              </button>
              <button type="button" className="focus-toggle-button" onClick={() => togglePresentationMode()}>
                Exit presentation
              </button>
            </div>
          ) : (
            <>
              {toolbarVisibility.navigation ? (
                <div className="toolbar-group">
                  <label className="view-hierarchy-control" data-tutorial-id="view-picker">
                    View
                    <select
                      className="view-hierarchy-select"
                      value={currentViewId}
                      onChange={(event) => goToView(event.target.value)}
                    >
                      {viewHierarchyOptions.map((option) => {
                        const view = workspace.views[option.viewId]
                        const prefix = `${'\u00A0\u00A0'.repeat(option.depth)}${option.depth > 0 ? '\u21B3 ' : ''}`
                        return (
                          <option key={option.viewId} value={option.viewId}>
                            {`${prefix}${view?.name ?? option.viewId}`}
                          </option>
                        )
                      })}
                    </select>
                  </label>
                </div>
              ) : null}
              {toolbarVisibility.editing ? (
                <div className="toolbar-group" data-tutorial-id="toolbar-editing-group">
                  <button
                    type="button"
                    className={activeTool === 'select' ? 'tool-button tool-active toolbar-icon-button' : 'tool-button toolbar-icon-button'}
                    onClick={() => setActiveTool('select')}
                    title={withTooltip('Select and move nodes or edges')}
                    aria-label="Select mode"
                  >
                    <MousePointer size={14} />
                    <span className="toolbar-button-label">Select</span>
                  </button>
                  <button
                    type="button"
                    className={
                      activeTool === 'connector'
                        ? 'tool-button tool-active toolbar-icon-button'
                        : 'tool-button toolbar-icon-button'
                    }
                    onClick={() => setActiveTool('connector')}
                    title={withTooltip('Connect nodes by dragging from one port to another')}
                    aria-label="Connector mode"
                  >
                    <Link2 size={14} />
                    <span className="toolbar-button-label">Connector</span>
                  </button>
                </div>
              ) : null}
              {toolbarVisibility.panels ? (
                <div className="toolbar-group toolbar-group-panels" data-tutorial-id="toolbar-panels-group">
                  <button
                    type="button"
                    className="icon-toggle-button"
                    onClick={() => toggleLeftSidebar()}
                    title={withTooltip(paletteWindowOpen ? 'Hide palette' : 'Show palette')}
                  >
                    {paletteWindowOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
                  </button>
                  <button
                    type="button"
                    className="icon-toggle-button"
                    onClick={() => toggleDockPanel()}
                    title={withTooltip(dockCollapsed ? 'Show dock panel' : 'Hide dock panel')}
                  >
                    {dockPosition === 'bottom' ? (
                      dockCollapsed ? (
                        <PanelBottomOpen size={15} />
                      ) : (
                        <PanelBottomClose size={15} />
                      )
                    ) : dockPosition === 'floating' ? (
                      <Dock size={15} />
                    ) : dockPosition === 'left' ? (
                      dockCollapsed ? (
                        <PanelLeftOpen size={15} />
                      ) : (
                        <PanelLeftClose size={15} />
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
                    title={withTooltip(drawerCollapsed ? 'Show workbench' : 'Hide workbench')}
                  >
                    {drawerCollapsed ? <PanelBottomOpen size={15} /> : <PanelBottomClose size={15} />}
                  </button>
                  {!immersiveMode ? dockHeaderBar : null}
                </div>
              ) : null}
              {toolbarVisibility.modes ? (
                <div className="toolbar-group">
                  <button
                    type="button"
                    className="focus-toggle-button toolbar-icon-button"
                    onClick={() => toggleFocusMode()}
                    title={withTooltip('Toggle focus mode')}
                    aria-label={focusMode ? 'Exit focus mode' : 'Focus mode'}
                  >
                    <Target size={14} />
                    <span className="toolbar-button-label">{focusMode ? 'Exit focus' : 'Focus'}</span>
                  </button>
                  <button
                    type="button"
                    className="focus-toggle-button toolbar-icon-button"
                    onClick={() => togglePresentationMode()}
                    title={withTooltip('Toggle presentation mode')}
                    aria-label={presentationMode ? 'Exit presentation mode' : 'Presentation mode'}
                  >
                    <Presentation size={14} />
                    <span className="toolbar-button-label">
                      {presentationMode ? 'Exit presentation' : 'Presentation mode'}
                    </span>
                  </button>
                </div>
              ) : null}
              {!hasVisibleToolbarSection ? <p className="toolbar-empty-label">Enable toolbar sections in Settings.</p> : null}
            </>
          )}
        </div>
        {exportError ? <p className="topbar-error">{exportError}</p> : null}
        {!exportError && exportStatus ? <p className="topbar-status">{exportStatus}</p> : null}
      </header>
      {floatingManagedWindows.map((windowId) => {
        const windowState = managedWindows.windows[windowId]
        const floatingConfig = MANAGED_WINDOW_FLOATING_UI_CONFIG[windowId]
        return (
          <FloatingWindow
            key={windowId}
            title={floatingConfig.title}
            className={floatingConfig.className}
            bodyClassName={floatingConfig.bodyClassName}
            rect={windowState.floatingRect}
            onRectChange={(rect) => setManagedWindowRect(windowId, rect)}
            topbarHeight={topbarHeight}
            minWidth={floatingConfig.minWidth}
            minHeight={floatingConfig.minHeight}
            zIndex={floatingConfig.zIndex}
            headerActions={buildManagedWindowDockActions(windowId)}
            onClose={() => closeManagedWindowById(windowId)}
          >
            {renderManagedWindowFloatingContent(windowId)}
          </FloatingWindow>
        )
      })}
      {!immersiveMode && leftDockVisible ? (
        <div
          className="layout-splitter layout-splitter-left"
          style={{ left: leftDockWidth - 3, top: topbarHeight, bottom: bottomPanelsInset }}
          onPointerDown={(event) => onDockSideSplitterPointerDown('left', event)}
          onPointerMove={onDockSideSplitterPointerMove}
          onPointerUp={stopDockSideResize}
          onPointerCancel={stopDockSideResize}
        />
      ) : null}
      {!immersiveMode && rightDockVisible ? (
        <div
          className="layout-splitter layout-splitter-right"
          style={{ right: rightDockWidth - 3, top: topbarHeight, bottom: bottomPanelsInset }}
          onPointerDown={(event) => onDockSideSplitterPointerDown('right', event)}
          onPointerMove={onDockSideSplitterPointerMove}
          onPointerUp={stopDockSideResize}
          onPointerCancel={stopDockSideResize}
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
      {leftDockVisible ? <aside className="left-sidebar left-sidebar-dock">{dockPanel}</aside> : null}
      {managedLeftHostVisible ? (
        <aside className="managed-host-sidebar managed-host-sidebar-left" data-tutorial-id="managed-host-left">
          {renderManagedDockHostPanel('left')}
        </aside>
      ) : null}
      <main
        className={`canvas-panel ${gridEnabled && !presentationMode ? 'canvas-panel-grid-visible' : 'canvas-panel-grid-hidden'} ${
          presentationMode ? 'canvas-panel-presentation' : ''
        }`}
        ref={canvasPanelRef}
        data-tutorial-id="canvas-panel"
      >
        {!presentationMode && activeTool === 'connector' ? (
          <p className="canvas-hint">
            {pendingConnectionFrom
              ? `Select a destination to connect from ${pendingConnectionFrom}${pendingConnectionPortId ? `:${pendingConnectionPortId}` : ''}`
              : 'Drag from one handle to another to create an edge'}
          </p>
        ) : null}
        {!presentationMode && currentView.kind === 'container' ? (
          <p className="canvas-hint secondary-hint">
            Double-click opens existing drilldown. Ctrl+Alt+double-click creates a new drilldown.
          </p>
        ) : !presentationMode && currentView.kind === 'component' ? (
          <p className="canvas-hint secondary-hint">
            Double-click opens existing drilldown. Ctrl+Alt+double-click creates a new drilldown.
          </p>
        ) : null}
        <DiagramCanvas
          presentationMode={presentationMode}
          forceGridHidden={presentationMode}
          exportFocusJourneyId={exportFocusJourneyId}
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
      {managedRightHostVisible ? (
        <aside className="managed-host-sidebar managed-host-sidebar-right" data-tutorial-id="managed-host-right">
          {renderManagedDockHostPanel('right')}
        </aside>
      ) : null}
      {rightDockVisible ? <aside className="right-sidebar right-sidebar-dock">{dockPanel}</aside> : null}
      {floatingDockVisible ? (
        <div
          className="floating-dock-window"
          style={{
            left: `${floatingDockRect.x}px`,
            top: `${floatingDockRect.y}px`,
            width: `${floatingDockRect.width}px`,
            height: `${floatingDockRect.height}px`,
          }}
        >
          {(['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as FloatingDockResizeHandle[]).map((handle) => (
            <div
              key={handle}
              className={`floating-dock-resize-handle floating-dock-resize-${handle}`}
              onPointerDown={(event) => onFloatingDockResizePointerDown(handle, event)}
            />
          ))}
          <div className="floating-dock-header" onPointerDown={onFloatingDockHeaderPointerDown}>
            <strong>Dock</strong>
            <span
              className="floating-dock-actions"
              onPointerDown={(event) => {
                event.stopPropagation()
              }}
            >
                <button type="button" onClick={() => moveDockToRight()}>
                  Right
                </button>
                <button type="button" onClick={() => moveDockToLeft()}>
                  Left
                </button>
                <button type="button" onClick={() => moveDockToBottom()}>
                  Bottom
                </button>
              <button type="button" onClick={() => setDockCollapsed(true)}>
                Hide
              </button>
            </span>
          </div>
          {dockPanel}
        </div>
      ) : null}
      {managedBottomHostVisible ? (
        <section className="managed-host-bottom" data-tutorial-id="managed-host-bottom">
          {renderManagedDockHostPanel('bottom')}
        </section>
      ) : null}
      {drawerVisible ? (
        <section className={drawerClassName}>
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
              SJV Script
            </button>
            <button
              type="button"
              className={drawerTab === 'help' ? 'drawer-tab drawer-tab-active' : 'drawer-tab'}
              onClick={() => switchDrawerTab('help')}
            >
              Help
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
                {dslMaximized ? 'Restore SJV Script' : 'Maximize SJV Script'}
              </button>
            ) : null}
          </div>
          {drawerTab === 'journeys' ? (
            journeyTimelineContent
          ) : drawerTab === 'dsl' ? (
            dslPanelContent
          ) : drawerTab === 'help' ? (
            helpPanelContent
          ) : dockPosition === 'bottom' ? (
            dockCollapsed ? <p>Dock is hidden. Use the topbar toggle to reopen it.</p> : dockPanel
          ) : (
            <p>Dock is in side mode.</p>
          )}
        </section>
      ) : null}
      {guidedTutorialStepIndex !== null ? (
        <GuidedTutorialOverlay
          step={GUIDED_UI_TUTORIAL_STEPS[guidedTutorialStepIndex]}
          stepIndex={guidedTutorialStepIndex}
          totalSteps={GUIDED_UI_TUTORIAL_STEPS.length}
          onNext={() => nextGuidedTutorialStep()}
          onBack={() => previousGuidedTutorialStep()}
          onSkip={() => closeGuidedTutorial()}
        />
      ) : null}
    </div>
  )
}

export default App
