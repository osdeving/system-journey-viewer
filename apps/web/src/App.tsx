/**
 * Purpose: Orchestrate the desktop-style SJV web app shell, window layout, and editor interactions.
 */

import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  ChangeEvent,
  CSSProperties,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from 'react'
import confetti from 'canvas-confetti'
import type { Monaco } from '@monaco-editor/react'
import ReactMarkdown from 'react-markdown'
import {
  BookOpen,
  Circle,
  CircleHelp,
  Code2,
  Copy,
  Diamond,
  Dock,
  Download,
  FilePlus2,
  Filter,
  FolderOpen,
  Grid3X3,
  GripVertical,
  Image,
  Info,
  Languages,
  Link2,
  ListOrdered,
  Magnet,
  Moon,
  MousePointer,
  PanelBottomClose,
  PanelBottomOpen,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightOpen,
  Pause,
  Play,
  Plus,
  Presentation,
  Redo2,
  RotateCcw,
  Save,
  Search,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Sparkles,
  Square,
  Sun,
  Target,
  Triangle,
  Trash2,
  Undo2,
  Workflow,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import './App.css'
import type { CommandPaletteItem } from './commandPalette/commandPalette'
import { CommandPalette } from './components/chrome/CommandPalette'
import { ConfirmationDialog, type ConfirmationDialogTone } from './components/chrome/ConfirmationDialog'
import { StatusBar, type StatusBarAction, type StatusBarItem } from './components/chrome/StatusBar'
import { PanelGroup } from './components/chrome/PanelGroup'
import { SequenceDiagramView } from './components/sequence/SequenceDiagramView'
import { OverflowStrip } from './components/chrome/OverflowStrip'
import { SplashScreen } from './components/chrome/SplashScreen'
import { GuidedTutorialOverlay } from './components/tutorial/GuidedTutorialOverlay'
import { DockHost } from './components/windowing/DockHost'
import { DiagramCanvas } from './components/canvas/DiagramCanvas'
import { FloatingWindow } from './components/windowing/FloatingWindow'
import { PalettePanel, type PalettePanelCategory } from './components/palette/PalettePanel'
import { JourneyTimelinePanel } from './components/journeys/JourneyTimelinePanel'
import { InspectorPanel } from './components/inspector/InspectorPanel'
import { AppIcon, PresetIcon } from './icons/IconRegistry'
import type { AppIconId } from './icons/iconRegistryData'
import { APP_ICON_SET_OPTIONS } from './icons/iconSets'
import { TechIconGlyph } from './icons/TechIconGlyph'
import {
  TECH_ICON_CATEGORY_LABELS,
  TECH_ICON_CATEGORY_ORDER,
  TECH_ICON_DRAG_MIME_TYPE,
  techIconDefinitions,
} from './icons/techIconCatalog'
import {
  buildNodeConfettiBursts,
  resolveNodeConfettiAnchor,
} from './diagram/player/playerConfetti'
import {
  resolveMinimapModel,
  resolveMinimapWorldPoint,
  type MinimapSize,
} from './diagram/canvas/minimap'
import { fullWorkspaceToLiteDsl } from './dsl-lite/convert'
import { parseDslToWorkspaceDocumentWithTheme } from './dsl-lite/sync'
import {
  JOURNEY_SCRIPT_LANGUAGE_ID,
  JOURNEY_SCRIPT_NAME,
  registerJourneyScriptLanguage,
  resolveJourneyScriptTheme,
} from './dsl-lite/monacoJourneyScript'
import { preserveWorkspaceVisualStateForDslSync } from './dsl-lite/preserveVisualState'
import {
  createAnimatedJourneyGifBlob,
  createAnimatedJourneySvgBlob,
  createAnimatedJourneyVideoBlob,
  resolveAnimatedExportRasterOutputDimensions,
  resolveAnimatedExportFilenameBase,
  resolveExportPlaybackSpeedMs,
  resolveJourneyAnimationDurationMs,
} from './export/animatedExport'
import { createPngExportBlob, exportPdf, exportSvg, saveBlobAsFile } from './export/exporters'
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
import {
  buildSupabaseCloudLibrarySections,
  type SupabaseCloudLibraryItem,
} from './integrations/supabase/cloudLibrary'
import {
  filterSupabaseCloudScripts,
  formatSupabaseCloudScriptUpdatedAt,
} from './integrations/supabase/cloudScriptSelection'
import {
  buildSharedSupabaseAssetViewerUrl,
  isSharedSupabaseAssetViewerLocation,
  isSupabaseGalleryAssetShareable,
  resolveSharedSupabaseAssetViewFromLocation,
} from './integrations/supabase/sharedAssetLink'
import {
  SUPABASE_GALLERY_BUCKET,
  SUPABASE_PUBLIC_ENV_HINT,
  supabaseCloudConfigured,
  supabaseWorkspaceCloudStore,
  workspaceCloudDatabaseUrl,
  workspaceCloudProviderLabel,
  workspaceCloudStatusLabel,
  type SupabaseCloudScriptSummary,
  type SupabaseGalleryAsset,
  type SupabaseCloudUser,
} from './integrations/supabase/workspaceCloudStore'
import { resolveJourneyFocusScope } from './journeys/focus'
import { resolveJourneyPlaybackLength, resolveJourneyPlaybackTicks } from './journeys/playbackPlan'
import { resolvePlayerStepLabel } from './journeys/playerStepLabel'
import { resolveJourneyTimelineRows } from './journeys/timelineRows'
import { resolveModeShortcutAction } from './keyboard/modeShortcuts'
import {
  resolveDockHostMinWidth,
  resolveDockSideWidth,
  resolveFloatingDockResizeRect,
  type DockSide,
  type FloatingDockResizeHandle,
} from './layout/dockSizing'
import { resolveLayoutGridTemplateRows } from './layout/layoutGrid'
import { clampFloatingDockRect, type FloatingDockRect } from './layout/floatingDock'
import {
  buildMobileShellPath,
  resolveRequestedAppShellMode,
  shouldAutoOpenMobileShell,
  type AppShellMode,
} from './layout/mobileShellRoute'
import { resolveTopbarHeight } from './layout/topbarSizing'
import { BLANK_WORKSPACE_VIEW_ID, createBlankWorkspace } from './model/blankWorkspace'
import type { BasicShapeKind, EditorActiveTool, EditorSnapshot, JourneyModel, ViewportState, WorkspaceModel } from './model/types'
import { nodePresetsByCategory, protocolPresets, resolveNodePreset } from './presets/catalog'
import {
  CANVAS_BACKGROUND_PRESETS,
  CHROME_THEME_PRESETS,
  DEFAULT_CUSTOM_CANVAS_BACKGROUND,
  DEFAULT_CUSTOM_CHROME_COLORS,
  resolveInitialUiPreferences,
  resolveUiPreferenceCssVariables,
  UI_PREFERENCES_STORAGE_KEY,
  type CanvasBackgroundPresetId,
  type ChromeThemeId,
  type UiChromeCustomColors,
  type UiDensity,
  type UiFontScale,
  type UiPreferences,
  type ToolbarSectionId,
} from './preferences/uiPreferences'
import { applyWorkspaceLayout, loadWorkspaceLayout, saveWorkspaceLayout } from './store/layoutPersistence'
import { useEditorStore } from './store/useEditorStore'
import { deriveSequenceDiagramScene } from './sequence/deriveSequenceScene'
import {
  DEFAULT_SHOWCASE_ANIMATIONS,
  DEFAULT_SHOWCASE_LIBRARY_SECTIONS,
  DEFAULT_SHOWCASE_SCRIPTS,
  type DefaultShowcaseLibraryItem,
  type DefaultShowcaseScriptItem,
} from './showcaseGallery/defaultShowcaseGallery'
import {
  buildViewHierarchyOptions,
  resolvePreferredEntryViewId,
} from './viewHierarchy'
import type { ShowcaseLocale, ShowcaseMode } from './model/showcaseWorkspace'
import {
  BASIC_SHAPE_DEFINITIONS,
  isExperimentalShapeNode,
  resolveBasicShapeDefinition,
} from './model/experimentalShapes'
import { isFreeformShapeTool } from './diagram/canvas/freeformShapeDrawing'
import {
  clampGuidedTutorialStepIndex,
  GUIDED_UI_TUTORIAL_STEPS,
  resolveGuidedTutorialStepCompletion,
  type GuidedTutorialStepSetupAction,
} from './tutorial/guidedTutorial'
import {
  closeManagedWindow,
  createManagedWindowsState,
  dockManagedWindow as dockManagedWindowState,
  floatManagedWindow,
  MANAGED_WINDOW_IDS,
  reorderManagedHostTab,
  resolveManagedDockPlacementForPanelOpen,
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

const SANITIZED_HELP_GUIDE_MARKDOWN = helpGuideMarkdown.replace(/<!--[\s\S]*?-->/g, '').trimStart()

const DEBOUNCE_SAVE_MS = 900
const DEFAULT_LEFT_SIDEBAR_WIDTH = 240
const DEFAULT_DOCK_SIDE_WIDTH = 340
const DEFAULT_MANAGED_HOST_SIDE_WIDTH = 320
const DEFAULT_JOURNEY_HEIGHT = 220
const DEFAULT_MANAGED_HOST_BOTTOM_HEIGHT = 240
const MIN_DOCK_SIDE_WIDTH = 260
const MIN_MANAGED_HOST_SIDE_WIDTH = 240
const MIN_JOURNEY_HEIGHT = 160
const MIN_MANAGED_HOST_BOTTOM_HEIGHT = 160
const DEFAULT_TOPBAR_HEIGHT = 108
const SUPABASE_SHARED_ASSET_LINK_EXPIRY_SECONDS = 60 * 60 * 24 * 7
const CLOUD_PROVIDER_LABEL = workspaceCloudProviderLabel
const CLOUD_STATUS_LABEL = workspaceCloudStatusLabel
const CLOUD_SIGN_IN_PROMPT = `Sign in to enable ${CLOUD_STATUS_LABEL} save/load.`
const CLOUD_SIGNED_OUT_STATUS = `Signed out. ${CLOUD_SIGN_IN_PROMPT}`
const CLOUD_NOT_CONFIGURED_STATUS = `Cloud persistence is not configured. ${SUPABASE_PUBLIC_ENV_HINT}`
const MIN_CANVAS_WIDTH = 320
const MIN_CANVAS_HEIGHT = 220
const MIN_DOCK_HEIGHT = 260
const DEFAULT_FILE_VIEWPORT = { x: 100, y: 80, zoom: 1 }
const DEFAULT_FLOATING_DOCK_RECT = { x: 28, y: 108, width: 480, height: 420 }
const DEFAULT_MINIMAP_SIZE: MinimapSize = { width: 196, height: 124 }
const STATUS_BAR_HEIGHT = 24
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
const CUSTOM_CHROME_COLOR_FIELDS: Array<{ key: keyof UiChromeCustomColors; label: string }> = [
  { key: 'shellBackground', label: 'Shell background' },
  { key: 'panelBackground', label: 'Panel background' },
  { key: 'controlBackground', label: 'Control background' },
  { key: 'accentColor', label: 'Accent' },
  { key: 'textColor', label: 'Text' },
  { key: 'mutedTextColor', label: 'Muted text' },
  { key: 'borderColor', label: 'Border' },
]

type CanvasContextMenuTarget = 'canvas' | 'node' | 'edge'
type CanvasContextMenuState = {
  x: number
  y: number
  worldX: number
  worldY: number
  target: CanvasContextMenuTarget
  nodeId?: string
  edgeId?: string
}

type ConfirmationDialogState = {
  title: string
  message: string
  details?: string[]
  confirmLabel?: string
  cancelLabel?: string
  tone?: ConfirmationDialogTone
}

const MonacoEditor = lazy(() => import('@monaco-editor/react'))
const NODE_PALETTE_CATEGORIES = Object.entries(nodePresetsByCategory).map(
  ([category, presets]) => ({
    id: category,
    title: category,
    presets,
  }),
) satisfies PalettePanelCategory[]
const TECH_ICON_PALETTE_CATEGORIES = TECH_ICON_CATEGORY_ORDER.map((categoryId) => ({
  id: `tech-${categoryId}`,
  title: TECH_ICON_CATEGORY_LABELS[categoryId],
  presets: techIconDefinitions
    .filter((icon) => icon.category === categoryId)
    .map((icon) => ({
      id: icon.id,
      label: icon.label,
      iconKey: icon.source === 'simple-icons' ? 'brand svg' : 'ui stencil',
      dragMimeType: TECH_ICON_DRAG_MIME_TYPE,
      searchText: icon.aliases.join(' '),
    })),
})) satisfies PalettePanelCategory[]
const MIXED_PALETTE_CATEGORIES = [
  ...NODE_PALETTE_CATEGORIES,
  ...TECH_ICON_PALETTE_CATEGORIES,
] satisfies PalettePanelCategory[]

const formatBytesLabel = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return '0 B'
  }
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

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
type PresentationSurface = 'journey' | 'sequence'
type FileWriteMode = 'prompt' | 'reuse'
type StepDragState = { journeyId: string; edgeId: string }
type AppActionResult = void | boolean | Promise<void | boolean>
type HelpSection = 'guide' | 'gallery' | 'about'
type SupabaseAuthDraft = {
  email: string
  password: string
}
type CommandPaletteActionItem = CommandPaletteItem & {
  run: () => void
}

const renderBasicShapeToolbarIcon = (kind: BasicShapeKind, size = 16): ReactNode => {
  switch (kind) {
    case 'shape-circle':
      return <Circle size={size} />
    case 'shape-triangle':
      return <Triangle size={size} />
    case 'shape-diamond':
      return <Diamond size={size} />
    case 'shape-rectangle':
    default:
      return <Square size={size} />
  }
}

const resolveActiveToolLabel = (activeTool: EditorActiveTool): string => {
  if (activeTool === 'connector') {
    return 'Connector'
  }
  if (activeTool === 'select') {
    return 'Select'
  }
  return resolveBasicShapeDefinition(activeTool).label
}

const resolveInitialAppShellMode = (): AppShellMode => {
  if (typeof window === 'undefined') {
    return 'desktop'
  }
  const routeMode = resolveRequestedAppShellMode(window.location.pathname)
  if (routeMode === 'mobile') {
    return routeMode
  }
  const pointerCoarse =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches
  return window.location.pathname === '/' &&
    shouldAutoOpenMobileShell({
      innerWidth: window.innerWidth,
      maxTouchPoints: navigator.maxTouchPoints ?? 0,
      pointerCoarse,
    })
    ? 'mobile'
    : 'desktop'
}

type HistoryStoreSnapshot = {
  workspace: WorkspaceModel
  currentViewId: string
  viewHistory: string[]
  viewport: ViewportState
  selectedNodeId: string | null
  selectedNodeIds: string[]
  selectedEdgeId: string | null
  activeTool: EditorActiveTool
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
  managedLeftHostWidth: number
  managedRightHostWidth: number
  managedBottomHostHeight: number
  leftDockWidth: number
  rightDockWidth: number
  journeyHeight: number
  dockTabOrder: DockTab[]
  activeDockTab: DockTab
  leftSidebarWidth: number
  drawerTab: DrawerTab
  dslMaximized: boolean
  focusMode: boolean
  presentationMode: boolean
  helpSection: HelpSection
  journeyDraftName: string
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

const isDrawerTabValue = (value: unknown): value is DrawerTab =>
  value === 'journeys' || value === 'dsl' || value === 'dock' || value === 'help'

const isHelpSectionValue = (value: unknown): value is HelpSection =>
  value === 'guide' || value === 'gallery' || value === 'about'

const createDefaultWindowLayoutBootstrap = (topbarHeight: number): WindowLayoutBootstrap => ({
  managedWindows: createBaselineManagedWindowsState(topbarHeight),
  dockPosition: 'right',
  dockCollapsed: true,
  drawerCollapsed: true,
  floatingDockRect: { ...DEFAULT_FLOATING_DOCK_RECT },
  managedLeftHostWidth: DEFAULT_MANAGED_HOST_SIDE_WIDTH,
  managedRightHostWidth: DEFAULT_MANAGED_HOST_SIDE_WIDTH,
  managedBottomHostHeight: DEFAULT_MANAGED_HOST_BOTTOM_HEIGHT,
  leftDockWidth: DEFAULT_DOCK_SIDE_WIDTH,
  rightDockWidth: DEFAULT_DOCK_SIDE_WIDTH,
  journeyHeight: DEFAULT_JOURNEY_HEIGHT,
  dockTabOrder: normalizeDockTabOrder(DEFAULT_DOCK_TAB_ORDER),
  activeDockTab: 'palette',
  leftSidebarWidth: DEFAULT_LEFT_SIDEBAR_WIDTH,
  drawerTab: 'journeys',
  dslMaximized: false,
  focusMode: false,
  presentationMode: false,
  helpSection: 'guide',
  journeyDraftName: '',
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
    managedLeftHostWidth: isFiniteNumber(candidate.managedLeftHostWidth)
      ? Math.max(MIN_MANAGED_HOST_SIDE_WIDTH, candidate.managedLeftHostWidth)
      : fallback.managedLeftHostWidth,
    managedRightHostWidth: isFiniteNumber(candidate.managedRightHostWidth)
      ? Math.max(MIN_MANAGED_HOST_SIDE_WIDTH, candidate.managedRightHostWidth)
      : fallback.managedRightHostWidth,
    managedBottomHostHeight: isFiniteNumber(candidate.managedBottomHostHeight)
      ? Math.max(MIN_MANAGED_HOST_BOTTOM_HEIGHT, candidate.managedBottomHostHeight)
      : fallback.managedBottomHostHeight,
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
    leftSidebarWidth: isFiniteNumber(candidate.leftSidebarWidth)
      ? Math.max(180, candidate.leftSidebarWidth)
      : fallback.leftSidebarWidth,
    drawerTab: isDrawerTabValue(candidate.drawerTab) ? candidate.drawerTab : fallback.drawerTab,
    dslMaximized: typeof candidate.dslMaximized === 'boolean' ? candidate.dslMaximized : fallback.dslMaximized,
    focusMode: typeof candidate.focusMode === 'boolean' ? candidate.focusMode : fallback.focusMode,
    presentationMode:
      typeof candidate.presentationMode === 'boolean' ? candidate.presentationMode : fallback.presentationMode,
    helpSection: isHelpSectionValue(candidate.helpSection) ? candidate.helpSection : fallback.helpSection,
    journeyDraftName:
      typeof candidate.journeyDraftName === 'string' ? candidate.journeyDraftName : fallback.journeyDraftName,
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
  const supabaseGalleryFileInputRef = useRef<HTMLInputElement | null>(null)
  const canvasPanelRef = useRef<HTMLElement | null>(null)
  const dslRestoreHeightRef = useRef<number | null>(null)
  const previousViewIdRef = useRef<string | null>(null)
  const journeyDragRef = useRef<string | null>(null)
  const journeyStepDragRef = useRef<StepDragState | null>(null)
  const workspaceFileHandleRef = useRef<WorkspaceFileHandle | null>(null)
  const drawerCollapsedBeforePresentationRef = useRef(true)
  const dslSyncLastAppliedTextRef = useRef<string | null>(null)
  const dslSyncApplyingWorkspaceFromTextRef = useRef(false)
  const dslSyncUpdatingTextFromWorkspaceRef = useRef(false)
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
  const managedHostSideResizeRef = useRef<{
    pointerId: number
    side: 'left' | 'right'
    startClientX: number
    startWidth: number
    minWidth: number
    maxWidth: number
  } | null>(null)
  const managedBottomHostResizeRef = useRef<{
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
  const dslSyncWorkspaceRef = useRef(workspace)
  dslSyncWorkspaceRef.current = workspace
  const hydrate = useEditorStore((state) => state.hydrate)
  const persist = useEditorStore((state) => state.persist)
  const resetWorkspace = useEditorStore((state) => state.resetWorkspace)
  const replaceWorkspace = useEditorStore((state) => state.replaceWorkspace)
  const zoomByFactor = useEditorStore((state) => state.zoomByFactor)
  const setViewport = useEditorStore((state) => state.setViewport)
  const setActiveTool = useEditorStore((state) => state.setActiveTool)
  const selectNode = useEditorStore((state) => state.selectNode)
  const selectEdge = useEditorStore((state) => state.selectEdge)
  const goToView = useEditorStore((state) => state.goToView)
  const openDrilldown = useEditorStore((state) => state.openDrilldown)
  const createDrilldownForNode = useEditorStore((state) => state.createDrilldownForNode)
  const addBasicShape = useEditorStore((state) => state.addBasicShape)
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
  const indentJourneyStepToThread = useEditorStore((state) => state.indentJourneyStepToThread)
  const outdentJourneyThreadStep = useEditorStore((state) => state.outdentJourneyThreadStep)
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
  const [journeyDraftName, setJourneyDraftName] = useState(windowLayoutBootstrap.journeyDraftName)
  const [dslText, setDslText] = useState('')
  const [dslSyncEnabled, setDslSyncEnabled] = useState(false)
  const [dslError, setDslError] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportStatus, setExportStatus] = useState<string | null>(null)
  const [appShellMode, setAppShellMode] = useState<AppShellMode>(() => resolveInitialAppShellMode())
  const [mobilePanelTab, setMobilePanelTab] = useState<DockTab>('journeys')
  const [mobilePanelCollapsed, setMobilePanelCollapsed] = useState(false)
  const [draggedEdgeId, setDraggedEdgeId] = useState<string | null>(null)
  const [animatedExportRunning, setAnimatedExportRunning] = useState(false)
  const [exportFocusJourneyId, setExportFocusJourneyId] = useState<string | null>(null)
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(windowLayoutBootstrap.leftSidebarWidth)
  const [leftDockWidth, setLeftDockWidth] = useState(windowLayoutBootstrap.leftDockWidth)
  const [rightDockWidth, setRightDockWidth] = useState(windowLayoutBootstrap.rightDockWidth)
  const [managedLeftHostWidth, setManagedLeftHostWidth] = useState(windowLayoutBootstrap.managedLeftHostWidth)
  const [managedRightHostWidth, setManagedRightHostWidth] = useState(windowLayoutBootstrap.managedRightHostWidth)
  const [managedBottomHostHeight, setManagedBottomHostHeight] = useState(windowLayoutBootstrap.managedBottomHostHeight)
  const [journeyHeight, setJourneyHeight] = useState(windowLayoutBootstrap.journeyHeight)
  const [drawerTab, setDrawerTab] = useState<DrawerTab>(windowLayoutBootstrap.drawerTab)
  const [dslMaximized, setDslMaximized] = useState(windowLayoutBootstrap.dslMaximized)
  const [focusMode, setFocusMode] = useState(windowLayoutBootstrap.focusMode)
  const [presentationMode, setPresentationMode] = useState(windowLayoutBootstrap.presentationMode)
  const [presentationSurface, setPresentationSurface] = useState<PresentationSurface>('journey')
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false)
  const [dockCollapsed, setDockCollapsed] = useState(windowLayoutBootstrap.dockCollapsed)
  const [drawerCollapsed, setDrawerCollapsed] = useState(windowLayoutBootstrap.drawerCollapsed)
  const [dockPosition, setDockPosition] = useState<DockPosition>(windowLayoutBootstrap.dockPosition)
  const [dockTabOrder, setDockTabOrder] = useState<DockTab[]>(windowLayoutBootstrap.dockTabOrder)
  const [activeDockTab, setActiveDockTab] = useState<DockTab>(windowLayoutBootstrap.activeDockTab)
  const [floatingDockRect, setFloatingDockRect] = useState<FloatingDockRect>(windowLayoutBootstrap.floatingDockRect)
  const [recentWorkspaces, setRecentWorkspaces] = useState<RecentWorkspaceEntry[]>(() => loadRecentWorkspaces())
  const [supabaseAuthDraft, setSupabaseAuthDraft] = useState<SupabaseAuthDraft>({
    email: '',
    password: '',
  })
  const [supabaseCloudUser, setSupabaseCloudUser] = useState<SupabaseCloudUser | null>(null)
  const [supabaseCloudBusy, setSupabaseCloudBusy] = useState(false)
  const [supabaseCloudStatus, setSupabaseCloudStatus] = useState<string>(() =>
    supabaseCloudConfigured ? CLOUD_SIGN_IN_PROMPT : CLOUD_NOT_CONFIGURED_STATUS,
  )
  const [supabaseCloudPanelOpen, setSupabaseCloudPanelOpen] = useState(false)
  const [supabaseCloudScripts, setSupabaseCloudScripts] = useState<SupabaseCloudScriptSummary[]>([])
  const [supabaseCloudScriptPickerOpen, setSupabaseCloudScriptPickerOpen] = useState(false)
  const [supabaseCloudScriptSearch, setSupabaseCloudScriptSearch] = useState('')
  const [supabaseGalleryAssets, setSupabaseGalleryAssets] = useState<SupabaseGalleryAsset[]>([])
  const [supabaseGalleryPreviewUrls, setSupabaseGalleryPreviewUrls] = useState<Record<string, string>>({})
  const [activeSupabaseScriptWorkspaceId, setActiveSupabaseScriptWorkspaceId] = useState<string | null>(null)
  const [openDesktopMenu, setOpenDesktopMenu] = useState<DesktopMenuId | null>(null)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [commandPaletteQuery, setCommandPaletteQuery] = useState('')
  const [canvasContextMenu, setCanvasContextMenu] = useState<CanvasContextMenuState | null>(null)
  const [lightThemeNoticeOpen, setLightThemeNoticeOpen] = useState(false)
  const [confirmationDialog, setConfirmationDialog] = useState<ConfirmationDialogState | null>(null)
  const [guidedTutorialStepIndex, setGuidedTutorialStepIndex] = useState<number | null>(null)
  const [guidedTutorialEventCounts, setGuidedTutorialEventCounts] = useState<Record<string, number>>({})
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const initialUiPreferences = useMemo(() => resolveInitialUiPreferences(), [])
  const [topbarHeight, setTopbarHeight] = useState(DEFAULT_TOPBAR_HEIGHT)
  const [helpSection, setHelpSection] = useState<HelpSection>(windowLayoutBootstrap.helpSection)
  const [managedWindows, setManagedWindows] = useState<ManagedWindowsState>(windowLayoutBootstrap.managedWindows)
  const [uiPreferences, setUiPreferences] = useState<UiPreferences>(initialUiPreferences)
  const [splashVisible, setSplashVisible] = useState(initialUiPreferences.splashEnabled)
  const [canvasPanelSize, setCanvasPanelSize] = useState<MinimapSize>({ width: 0, height: 0 })
  const lastJourneyAutoLayoutKeyRef = useRef<string | null>(null)
  const guidedTutorialEventCountsRef = useRef<Record<string, number>>({})
  const guidedTutorialStepEventBaselineRef = useRef<Record<string, number>>({})
  const lastGuidedTutorialSelectedNodeIdRef = useRef<string | null>(selectedNodeId)
  const lastGuidedTutorialSelectedEdgeIdRef = useRef<string | null>(selectedEdgeId)
  const topbarCloudShellRef = useRef<HTMLDivElement | null>(null)
  const confirmationDialogResolverRef = useRef<((confirmed: boolean) => void) | null>(null)

  const selectedNode = selectedNodeId ? workspace.nodes[selectedNodeId] : undefined
  const selectedEdge = selectedEdgeId ? workspace.edges[selectedEdgeId] : undefined
  const selectedNodes = useMemo(
    () =>
      selectedNodeIds
        .map((nodeId) => workspace.nodes[nodeId])
        .filter((node): node is NonNullable<typeof selectedNode> => !!node),
    [selectedNodeIds, workspace.nodes],
  )
  const filteredSupabaseCloudScripts = useMemo(
    () => filterSupabaseCloudScripts(supabaseCloudScripts, supabaseCloudScriptSearch),
    [supabaseCloudScriptSearch, supabaseCloudScripts],
  )
  const supabaseCloudLibrarySections = useMemo(
    () => buildSupabaseCloudLibrarySections(supabaseCloudScripts, supabaseGalleryAssets),
    [supabaseCloudScripts, supabaseGalleryAssets],
  )
  const renderDefaultShowcaseLibraryPreview = useCallback((item: DefaultShowcaseLibraryItem): ReactNode => {
    if (item.kind === 'script') {
      return (
        <div className="help-gallery-script-preview" aria-hidden="true">
          <span className="help-gallery-script-preview-badge">
            <Code2 size={15} />
            Sample Script
          </span>
          <span className="help-gallery-script-preview-line help-gallery-script-preview-line-wide" />
          <span className="help-gallery-script-preview-line" />
          <span className="help-gallery-script-preview-line help-gallery-script-preview-line-short" />
        </div>
      )
    }

    return <img src={item.href} alt={item.title} loading="lazy" />
  }, [])
  const renderSupabaseCloudLibraryPreview = useCallback(
    (item: SupabaseCloudLibraryItem): ReactNode => {
      if (item.kind === 'script') {
        return (
          <div className="help-gallery-script-preview" aria-hidden="true">
            <span className="help-gallery-script-preview-badge">
              <Code2 size={15} />
              SJV Script
            </span>
            <span className="help-gallery-script-preview-line help-gallery-script-preview-line-wide" />
            <span className="help-gallery-script-preview-line" />
            <span className="help-gallery-script-preview-line help-gallery-script-preview-line-short" />
          </div>
        )
      }

      const previewUrl = supabaseGalleryPreviewUrls[item.asset.storagePath] ?? null
      if (item.asset.contentType.startsWith('video/')) {
        return previewUrl ? (
          <video src={previewUrl} controls muted loop preload="metadata" />
        ) : (
          <div className="help-gallery-preview-empty">Preparing secure video preview...</div>
        )
      }

      return previewUrl ? (
        <img src={previewUrl} alt={item.asset.title} loading="lazy" />
      ) : (
        <div className="help-gallery-preview-empty">Preparing secure image preview...</div>
      )
    },
    [supabaseGalleryPreviewUrls],
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
    (
      dslTextInput: string,
    ): { workspace: WorkspaceModel; entryViewId: string; hasUiLayoutMetadata: boolean } => {
      const parsedDocument = parseDslToWorkspaceDocumentWithTheme(dslTextInput, theme)
      const restoredLayout = parsedDocument.hasUiLayoutMetadata
        ? null
        : loadWorkspaceLayout(parsedDocument.workspace.workspace.id)
      const workspaceWithLayout = applyWorkspaceLayout(parsedDocument.workspace, restoredLayout)
      return {
        workspace: workspaceWithLayout,
        entryViewId: resolveEntryViewId(workspaceWithLayout),
        hasUiLayoutMetadata: parsedDocument.hasUiLayoutMetadata,
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
  const supabaseCloudReady = supabaseCloudConfigured && !!supabaseCloudUser
  const nodeDepthEffectsActive =
    uiPreferences.nodeDepthEffectsEnabled && !uiPreferences.performanceModeEnabled
  const isSharedSupabaseAssetRoute = useMemo(
    () =>
      typeof window === 'undefined'
        ? false
        : isSharedSupabaseAssetViewerLocation(window.location),
    [],
  )
  const sharedSupabaseAssetView = useMemo(() => {
    if (typeof window === 'undefined') {
      return null
    }
    return resolveSharedSupabaseAssetViewFromLocation(window.location)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const routeMode = resolveRequestedAppShellMode(window.location.pathname)
    if (routeMode === 'mobile') {
      if (appShellMode !== 'mobile') {
        setAppShellMode('mobile')
      }
      return
    }
    if (appShellMode !== 'mobile') {
      return
    }
    if (window.location.pathname === '/') {
      window.history.replaceState(window.history.state, '', buildMobileShellPath(window.location.search, window.location.hash))
    }
  }, [appShellMode])

  const viewJourneys = useMemo(
    () =>
      currentView.journeyIds
        .map((journeyId) => workspace.journeys[journeyId])
        .filter((journey) => !!journey),
    [currentView.journeyIds, workspace.journeys],
  ) as Array<(typeof workspace.journeys)[string]>
  const minimapNodes = useMemo(
    () =>
      currentView.nodeIds
        .map((nodeId) => workspace.nodes[nodeId])
        .filter((node): node is NonNullable<(typeof workspace.nodes)[string]> => !!node)
        .map((node) => ({
          id: node.id,
          kind: node.kind,
          bounds: node.bounds,
        })),
    [currentView.nodeIds, workspace],
  )
  const minimapModel = useMemo(
    () =>
      resolveMinimapModel({
        nodes: minimapNodes,
        viewport,
        canvasSize: canvasPanelSize,
        minimapSize: DEFAULT_MINIMAP_SIZE,
      }),
    [canvasPanelSize, minimapNodes, viewport],
  )
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
  const activeJourneyTimelineRows = useMemo(
    () => resolveJourneyTimelineRows(activeJourney),
    [activeJourney],
  )
  const playerJourney = playerJourneyId ? workspace.journeys[playerJourneyId] : undefined
  const playerJourneyPlaybackLength = useMemo(
    () => resolveJourneyPlaybackLength(playerJourney),
    [playerJourney],
  )
  const currentPlayerStepLabel = useMemo(
    () => resolvePlayerStepLabel(playerJourney, workspace.edges, playerStepIndex),
    [playerJourney, playerStepIndex, workspace.edges],
  )
  const presentationSequenceScene = useMemo(
    () =>
      playerJourneyId
        ? deriveSequenceDiagramScene({
            workspace,
            viewId: currentViewId,
            journeyId: playerJourneyId,
            theme,
          })
        : null,
    [currentViewId, playerJourneyId, theme, workspace],
  )
  const currentViewModeLabel = viewKindLabel[currentView.kind] ?? currentView.kind
  const playerModeLabel =
    presentationMode && presentationSurface === 'sequence'
      ? 'Sequence'
      : playerIsRunning
        ? 'Animation'
        : 'Render'
  const immersiveMode = focusMode || presentationMode
  const canNavigateBack = viewHistory.length > 0
  const legacyDockShellAvailable = dockTabOrder.some((tab) => !isManagedDockTab(tab))
  const leftDockVisible = !immersiveMode && legacyDockShellAvailable && dockPosition === 'left' && !dockCollapsed
  const rightDockVisible = !immersiveMode && legacyDockShellAvailable && dockPosition === 'right' && !dockCollapsed
  const floatingDockVisible = !immersiveMode && legacyDockShellAvailable && dockPosition === 'floating' && !dockCollapsed
  const drawerVisible = !immersiveMode && !drawerCollapsed
  const paletteWindowOpen = managedWindows.windows.palette.open
  const managedLeftHostTabCount = managedWindows.hosts.left.tabs.length
  const managedRightHostTabCount = managedWindows.hosts.right.tabs.length
  const managedBottomHostTabCount = managedWindows.hosts.bottom.tabs.length
  const managedLeftHostVisible = !immersiveMode && managedLeftHostTabCount > 0
  const managedRightHostVisible = !immersiveMode && managedRightHostTabCount > 0
  const managedBottomHostVisible = !immersiveMode && managedBottomHostTabCount > 0
  const statusBarVisible = !presentationMode && uiPreferences.statusBarEnabled
  const statusBarHeight = statusBarVisible ? STATUS_BAR_HEIGHT : 0
  const bottomPanelsInset =
    (managedBottomHostVisible ? managedBottomHostHeight : 0) +
    (drawerVisible ? journeyHeight : 0) +
    statusBarHeight
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
              statusBarVisible,
              statusBarHeight: STATUS_BAR_HEIGHT,
            }),
            gridTemplateAreas: `'topbar' 'main' 'statusbar'`,
          }
        : {
            gridTemplateColumns: `${leftDockVisible ? leftDockWidth : 0}px ${
              managedLeftHostVisible ? managedLeftHostWidth : 0
            }px 1fr ${
              managedRightHostVisible ? managedRightHostWidth : 0
            }px ${rightDockVisible ? rightDockWidth : 0}px`,
            gridTemplateRows: resolveLayoutGridTemplateRows({
              immersiveMode: false,
              drawerVisible,
              journeyHeight,
              managedBottomHostVisible,
              managedBottomHostHeight,
              statusBarVisible,
              statusBarHeight: STATUS_BAR_HEIGHT,
            }),
            gridTemplateAreas: `'topbar topbar topbar topbar topbar'
              'left managedLeft main managedRight right'
              'managedBottom managedBottom managedBottom managedBottom managedBottom'
              'journey journey journey journey journey'
              'statusbar statusbar statusbar statusbar statusbar'`,
          },
    [
      drawerVisible,
      immersiveMode,
      journeyHeight,
      leftDockVisible,
      leftDockWidth,
      managedBottomHostHeight,
      managedBottomHostVisible,
      managedLeftHostWidth,
      managedLeftHostVisible,
      managedRightHostWidth,
      managedRightHostVisible,
      rightDockVisible,
      rightDockWidth,
      statusBarVisible,
    ],
  )
  const uiAppearanceStyle = useMemo(
    () => resolveUiPreferenceCssVariables(uiPreferences),
    [uiPreferences],
  )
  const appLayoutStyle = useMemo<CSSProperties>(
    () => ({
      ...layoutStyle,
      ...uiAppearanceStyle,
      '--sjv-topbar-height': `${topbarHeight}px`,
    }),
    [layoutStyle, topbarHeight, uiAppearanceStyle],
  )

  const playerAnimationPreset = useMemo(
    () => resolvePlayerAnimationPreset(playerTrailEnabled, playerHighlightNodes),
    [playerHighlightNodes, playerTrailEnabled],
  )
  const renderAppIcon = useCallback(
    (id: AppIconId, size = 13): ReactNode => (
      <AppIcon id={id} iconSet={uiPreferences.iconSet} size={size} />
    ),
    [uiPreferences.iconSet],
  )
  const withTooltip = useCallback(
    (label: string): string | undefined =>
      uiPreferences.tooltipsEnabled ? label : undefined,
    [uiPreferences.tooltipsEnabled],
  )
  const openCommandPalette = useCallback((initialQuery = '') => {
    setOpenDesktopMenu(null)
    setSupabaseCloudPanelOpen(false)
    setSupabaseCloudScriptPickerOpen(false)
    setSupabaseCloudScriptSearch('')
    setCommandPaletteQuery(initialQuery)
    setCommandPaletteOpen(true)
  }, [])
  const closeCommandPalette = useCallback(() => {
    setCommandPaletteOpen(false)
    setCommandPaletteQuery('')
  }, [])
  const renderDesktopMenuItemLabel = useCallback(
    (icon: ReactNode, label: string) => (
      <span className="desktop-menu-item-main">
        <span className="desktop-menu-item-icon" aria-hidden="true">
          {icon}
        </span>
        <span>{label}</span>
      </span>
    ),
    [],
  )
  const renderDesktopMenuItem = useCallback(
    (icon: ReactNode, label: ReactNode, trailing?: ReactNode) => (
      <>
        <span className="desktop-menu-item-main">
          <span className="desktop-menu-item-icon" aria-hidden="true">
            {icon}
          </span>
          <span>{label}</span>
        </span>
        {trailing ?? null}
      </>
    ),
    [],
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

  const centerViewportOnWorldPoint = useCallback(
    (worldPoint: { x: number; y: number }, preferredZoom = viewport.zoom) => {
      const canvasPanel = canvasPanelRef.current
      const rect = canvasPanel?.getBoundingClientRect()
      const width = rect?.width && rect.width > 0 ? rect.width : canvasPanelSize.width
      const height = rect?.height && rect.height > 0 ? rect.height : canvasPanelSize.height
      if (width <= 0 || height <= 0) {
        return
      }
      const zoom = Math.max(0.35, Math.min(2.2, preferredZoom))
      setViewport({
        x: width / 2 - worldPoint.x * zoom,
        y: height / 2 - worldPoint.y * zoom,
        zoom,
      })
    },
    [canvasPanelSize.height, canvasPanelSize.width, setViewport, viewport.zoom],
  )

  const onMinimapPointerDown = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (event.button !== 0 || !minimapModel) {
        return
      }
      event.preventDefault()
      const rect = event.currentTarget.getBoundingClientRect()
      const worldPoint = resolveMinimapWorldPoint(
        {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        },
        minimapModel,
      )
      centerViewportOnWorldPoint(worldPoint, viewport.zoom)
    },
    [centerViewportOnWorldPoint, minimapModel, viewport.zoom],
  )

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

  const getManagedHostSideMinWidth = useCallback(
    (side: 'left' | 'right'): number =>
      resolveDockHostMinWidth(
        side === 'left' ? managedLeftHostTabCount : managedRightHostTabCount,
        MIN_MANAGED_HOST_SIDE_WIDTH,
      ),
    [managedLeftHostTabCount, managedRightHostTabCount],
  )

  const getMaxManagedHostSideWidth = useCallback(
    (side: 'left' | 'right'): number => {
      const layoutWidth = layoutRef.current?.getBoundingClientRect().width ?? window.innerWidth
      const leftFixed =
        (leftDockVisible ? leftDockWidth : 0) +
        (side === 'left' ? 0 : managedLeftHostVisible ? managedLeftHostWidth : 0)
      const rightFixed =
        (rightDockVisible ? rightDockWidth : 0) +
        (side === 'right' ? 0 : managedRightHostVisible ? managedRightHostWidth : 0)
      return Math.max(getManagedHostSideMinWidth(side), layoutWidth - leftFixed - rightFixed - MIN_CANVAS_WIDTH)
    },
    [
      getManagedHostSideMinWidth,
      leftDockVisible,
      leftDockWidth,
      managedLeftHostVisible,
      managedLeftHostWidth,
      managedRightHostVisible,
      managedRightHostWidth,
      rightDockVisible,
      rightDockWidth,
    ],
  )

  const getMaxManagedBottomHostHeight = useCallback((): number => {
    const layoutHeight = layoutRef.current?.getBoundingClientRect().height ?? window.innerHeight
    const reservedHeight = topbarHeight + (drawerVisible ? journeyHeight : 0) + MIN_CANVAS_HEIGHT
    return Math.max(MIN_MANAGED_HOST_BOTTOM_HEIGHT, layoutHeight - reservedHeight)
  }, [drawerVisible, journeyHeight, topbarHeight])

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
        drawerCollapsedBeforePresentationRef.current = drawerCollapsed
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
        setDrawerCollapsed(drawerCollapsedBeforePresentationRef.current)
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

  const runDesktopMenuAction = (action: () => AppActionResult) => {
    action()
    setOpenDesktopMenu(null)
  }

  const recordGuidedTutorialEvent = useCallback((eventId: string) => {
    setGuidedTutorialEventCounts((current) => {
      const next = {
        ...current,
        [eventId]: (current[eventId] ?? 0) + 1,
      }
      guidedTutorialEventCountsRef.current = next
      return next
    })
  }, [])

  const setNodeNameWithTutorialTracking = (nodeId: string, nextName: string) => {
    recordGuidedTutorialEvent('inspector-node-name-edit')
    setNodeName(nodeId, nextName)
  }

  const setEdgeLabelWithTutorialTracking = (edgeId: string, nextLabel: string) => {
    recordGuidedTutorialEvent('inspector-edge-label-edit')
    setEdgeLabel(edgeId, nextLabel)
  }

  const setEdgeProtocolWithTutorialTracking = (edgeId: string, nextProtocolId: string) => {
    recordGuidedTutorialEvent('inspector-edge-protocol-edit')
    setEdgeProtocol(edgeId, nextProtocolId)
  }

  const openManagedFloatingWindow = useCallback((windowId: ManagedWindowId) => {
    recordGuidedTutorialEvent(`open-window:${windowId}`)
    setManagedWindows((current) => floatManagedWindow(current, windowId))
  }, [recordGuidedTutorialEvent])

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

  const reorderManagedDockHostTabs = (
    hostId: ManagedWindowDockHostId,
    sourceWindowId: ManagedWindowId,
    targetWindowId: ManagedWindowId,
  ) => {
    setManagedWindows((current) => reorderManagedHostTab(current, hostId, sourceWindowId, targetWindowId))
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
    recordGuidedTutorialEvent(`open-window:${windowId}`)
    setManagedWindows((current) => {
      const preferredPlacement = resolveManagedDockPlacementForPanelOpen(
        current.windows[windowId],
        MANAGED_WINDOW_DEFAULT_HOST_BY_ID[windowId],
      )
      return dockManagedWindowState(current, windowId, preferredPlacement)
    })
    setActiveDockTab(windowId)
  }

  const openManagedDockedWindowFromDockTab = (tab: DockTab) => {
    if (isManagedDockTab(tab)) {
      openManagedDockedWindow(tab)
      return
    }
    openDockTab(tab)
  }

  const openHelpWindow = useCallback((section: HelpSection) => {
    setHelpSection(section)
    setFocusMode(false)
    setPresentationMode(false)
    openManagedFloatingWindow('help')
  }, [openManagedFloatingWindow])

  const toggleToolbarSection = useCallback((sectionId: ToolbarSectionId) => {
    setUiPreferences((current) => ({
      ...current,
      toolbarVisibility: {
        ...current.toolbarVisibility,
        [sectionId]: !current.toolbarVisibility[sectionId],
      },
    }))
  }, [])
  const setUiFontScalePreference = useCallback((fontScale: UiFontScale) => {
    setUiPreferences((current) => ({
      ...current,
      fontScale,
    }))
  }, [])
  const setChromeThemePreference = useCallback((chromeThemeId: ChromeThemeId) => {
    setUiPreferences((current) => ({
      ...current,
      chromeThemeId,
    }))
  }, [])
  const setCanvasBackgroundPresetPreference = useCallback(
    (canvasBackgroundPresetId: CanvasBackgroundPresetId) => {
      setUiPreferences((current) => ({
        ...current,
        canvasBackgroundPresetId,
      }))
    },
    [],
  )
  const updateCustomCanvasBackground = useCallback((value: string) => {
    setUiPreferences((current) => ({
      ...current,
      canvasBackgroundPresetId: 'custom',
      customCanvasBackground: value,
    }))
  }, [])
  const updateCustomChromeColor = useCallback(
    (colorKey: keyof UiChromeCustomColors, value: string) => {
      setUiPreferences((current) => ({
        ...current,
        chromeThemeId: 'custom',
        customChromeColors: {
          ...current.customChromeColors,
          [colorKey]: value,
        },
      }))
    },
    [],
  )
  const applyWorkspaceTheme = useCallback(
    (nextTheme: WorkspaceModel['settings']['theme']) => {
      setTheme(nextTheme)
      if (nextTheme === 'light') {
        setLightThemeNoticeOpen(true)
      }
    },
    [setTheme],
  )

  const openPreferencesWindow = () => {
    openManagedFloatingWindow('preferences')
  }

  useEffect(() => {
    const previousSelectedNodeId = lastGuidedTutorialSelectedNodeIdRef.current
    if (selectedNodeId && selectedNodeId !== previousSelectedNodeId) {
      recordGuidedTutorialEvent('node-select')
    }
    lastGuidedTutorialSelectedNodeIdRef.current = selectedNodeId
  }, [recordGuidedTutorialEvent, selectedNodeId])

  useEffect(() => {
    const previousSelectedEdgeId = lastGuidedTutorialSelectedEdgeIdRef.current
    if (selectedEdgeId && selectedEdgeId !== previousSelectedEdgeId) {
      recordGuidedTutorialEvent('edge-select')
    }
    lastGuidedTutorialSelectedEdgeIdRef.current = selectedEdgeId
  }, [recordGuidedTutorialEvent, selectedEdgeId])

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
    if (nextStep?.completionRule?.kind === 'event') {
      guidedTutorialStepEventBaselineRef.current[nextStep.id] =
        guidedTutorialEventCountsRef.current[nextStep.completionRule.eventId] ?? 0
    }
    setGuidedTutorialStepIndex(nextIndex)
  }

  const startGuidedTutorial = () => {
    setHelpSection('guide')
    guidedTutorialEventCountsRef.current = {}
    guidedTutorialStepEventBaselineRef.current = {}
    setGuidedTutorialEventCounts({})
    goToGuidedTutorialStep(0)
    setTransientStatus('Guided tutorial started.')
  }

  const nextGuidedTutorialStep = () => {
    if (guidedTutorialStepIndex === null) {
      startGuidedTutorial()
      return
    }
    const currentStep = GUIDED_UI_TUTORIAL_STEPS[guidedTutorialStepIndex]
    const completion = resolveGuidedTutorialStepCompletion(currentStep, {
      openDesktopMenuId: openDesktopMenu,
      eventCounts: guidedTutorialEventCountsRef.current,
      eventBaselineByStepId: guidedTutorialStepEventBaselineRef.current,
    })
    if (completion.requiresAction && !completion.isComplete) {
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

  const guidedTutorialCurrentStep =
    guidedTutorialStepIndex === null ? null : GUIDED_UI_TUTORIAL_STEPS[guidedTutorialStepIndex]
  const guidedTutorialCurrentStepCompletion =
    guidedTutorialCurrentStep === null
      ? { requiresAction: false, isComplete: true, prompt: null }
      : resolveGuidedTutorialStepCompletion(guidedTutorialCurrentStep, {
          openDesktopMenuId: openDesktopMenu,
          eventCounts: guidedTutorialEventCounts,
          eventBaselineByStepId: guidedTutorialStepEventBaselineRef.current,
        })

  const setTransientStatus = useCallback((message: string, timeoutMs = 2800) => {
    setExportStatus(message)
    window.setTimeout(() => setExportStatus(null), timeoutMs)
  }, [])

  const requestConfirmation = useCallback((dialog: ConfirmationDialogState): Promise<boolean> => {
    confirmationDialogResolverRef.current?.(false)
    return new Promise((resolve) => {
      confirmationDialogResolverRef.current = resolve
      setConfirmationDialog(dialog)
    })
  }, [])

  const resolveCurrentConfirmationDialog = useCallback((confirmed: boolean) => {
    const resolve = confirmationDialogResolverRef.current
    confirmationDialogResolverRef.current = null
    setConfirmationDialog(null)
    resolve?.(confirmed)
  }, [])

  useEffect(
    () => () => {
      confirmationDialogResolverRef.current?.(false)
      confirmationDialogResolverRef.current = null
    },
    [],
  )

  const addExperimentalShapeToCanvas = useCallback(
    (shapeKind: BasicShapeKind, worldPoint?: { x: number; y: number }) => {
      const definition = resolveBasicShapeDefinition(shapeKind)
      const canvasPanel = canvasPanelRef.current
      const rect = canvasPanel?.getBoundingClientRect()
      const centerWorldPoint =
        worldPoint ??
        {
          x: ((rect?.width ?? canvasPanelSize.width) / 2 - viewport.x) / viewport.zoom,
          y: ((rect?.height ?? canvasPanelSize.height) / 2 - viewport.y) / viewport.zoom,
        }
      addBasicShape(shapeKind, {
        x: centerWorldPoint.x - definition.defaultWidth / 2,
        y: centerWorldPoint.y - definition.defaultHeight / 2,
        w: definition.defaultWidth,
        h: definition.defaultHeight,
      })
      setActiveTool('select')
      setTransientStatus(`${definition.label} shape added. Experimental shapes stay out of SJV Script and journeys.`)
    },
    [addBasicShape, canvasPanelSize.height, canvasPanelSize.width, setActiveTool, setTransientStatus, viewport],
  )

  const canUseNodeDrilldown = useCallback(
    (nodeId: string): boolean => {
      const node = workspace.nodes[nodeId]
      return Boolean(node && node.kind !== 'note' && !isExperimentalShapeNode(node))
    },
    [workspace.nodes],
  )

  const resolveNodeDrilldownActionLabel = useCallback(
    (nodeId: string): string => {
      const node = workspace.nodes[nodeId]
      return node?.drilldownRef && workspace.views[node.drilldownRef]
        ? 'Open Drilldown'
        : 'Create Drilldown'
    },
    [workspace.nodes, workspace.views],
  )

  const runNodeDrilldownAction = useCallback(
    (nodeId: string) => {
      const node = workspace.nodes[nodeId]
      if (!node || node.kind === 'note' || isExperimentalShapeNode(node)) {
        return false
      }

      if (node.drilldownRef && workspace.views[node.drilldownRef]) {
        openDrilldown(nodeId)
        setTransientStatus(`Opened drilldown: ${node.name}`)
        return true
      }

      const createdViewId = createDrilldownForNode(nodeId)
      if (!createdViewId) {
        return false
      }
      setTransientStatus(`Created drilldown: ${node.name}`)
      return true
    },
    [createDrilldownForNode, openDrilldown, setTransientStatus, workspace.nodes, workspace.views],
  )

  const focusNodeFromPalette = useCallback(
    (viewId: string, nodeId: string) => {
      const node = workspace.nodes[nodeId]
      if (!node || !workspace.views[viewId]?.nodeIds.includes(nodeId)) {
        return
      }
      if (currentViewId !== viewId) {
        goToView(viewId)
      }
      setActiveTool('select')
      selectNode(nodeId)
      centerViewportOnWorldPoint(
        {
          x: node.bounds.x + node.bounds.w / 2,
          y: node.bounds.y + node.bounds.h / 2,
        },
        Math.max(0.72, Math.min(viewport.zoom, 1.4)),
      )
      setTransientStatus(`Selected node: ${node.name}`)
    },
    [
      centerViewportOnWorldPoint,
      currentViewId,
      goToView,
      selectNode,
      setActiveTool,
      setTransientStatus,
      viewport.zoom,
      workspace.nodes,
      workspace.views,
    ],
  )

  const focusEdgeFromPalette = useCallback(
    (viewId: string, edgeId: string) => {
      const edge = workspace.edges[edgeId]
      const fromNode = edge ? workspace.nodes[edge.from.nodeId] : undefined
      const toNode = edge ? workspace.nodes[edge.to.nodeId] : undefined
      if (!edge || !fromNode || !toNode || !workspace.views[viewId]?.edgeIds.includes(edgeId)) {
        return
      }
      if (currentViewId !== viewId) {
        goToView(viewId)
      }
      setActiveTool('select')
      selectEdge(edgeId)
      centerViewportOnWorldPoint(
        {
          x: (fromNode.bounds.x + fromNode.bounds.w / 2 + toNode.bounds.x + toNode.bounds.w / 2) / 2,
          y: (fromNode.bounds.y + fromNode.bounds.h / 2 + toNode.bounds.y + toNode.bounds.h / 2) / 2,
        },
        Math.max(0.72, Math.min(viewport.zoom, 1.35)),
      )
      setTransientStatus(`Selected edge: ${edge.label || edge.id}`)
    },
    [
      centerViewportOnWorldPoint,
      currentViewId,
      goToView,
      selectEdge,
      setActiveTool,
      setTransientStatus,
      viewport.zoom,
      workspace.edges,
      workspace.nodes,
      workspace.views,
    ],
  )

  const restoreWindowLayout = useCallback(() => {
    const fallback = createDefaultWindowLayoutBootstrap(topbarHeight)
    if (typeof window === 'undefined') {
      setManagedWindows(fallback.managedWindows)
      setDockPosition(fallback.dockPosition)
      setDockCollapsed(fallback.dockCollapsed)
      setDrawerCollapsed(fallback.drawerCollapsed)
      setFloatingDockRect(clampFloatingDockRectInLayout(fallback.floatingDockRect))
      setManagedLeftHostWidth(fallback.managedLeftHostWidth)
      setManagedRightHostWidth(fallback.managedRightHostWidth)
      setManagedBottomHostHeight(fallback.managedBottomHostHeight)
      setLeftDockWidth(fallback.leftDockWidth)
      setRightDockWidth(fallback.rightDockWidth)
      setJourneyHeight(fallback.journeyHeight)
      setDockTabOrder(fallback.dockTabOrder)
      setActiveDockTab(fallback.activeDockTab)
      setLeftSidebarWidth(fallback.leftSidebarWidth)
      setDrawerTab(fallback.drawerTab)
      setDslMaximized(fallback.dslMaximized)
      setFocusMode(fallback.focusMode)
      setPresentationMode(fallback.presentationMode)
      setHelpSection(fallback.helpSection)
      setJourneyDraftName(fallback.journeyDraftName)
      return
    }
    const raw = window.localStorage.getItem(MANAGED_WINDOWS_LAYOUT_STORAGE_KEY)
    if (!raw) {
      setTransientStatus('No saved window layout found.')
      return
    }
    try {
      const restored = resolveWindowLayoutBootstrapFromCandidate(topbarHeight, JSON.parse(raw))
      setFocusMode(restored.focusMode)
      setPresentationMode(restored.presentationMode)
      setManagedWindows(restored.managedWindows)
      setDockPosition(restored.dockPosition)
      setDockCollapsed(restored.dockCollapsed)
      setDrawerCollapsed(restored.drawerCollapsed)
      setFloatingDockRect(clampFloatingDockRectInLayout(restored.floatingDockRect))
      setManagedLeftHostWidth(restored.managedLeftHostWidth)
      setManagedRightHostWidth(restored.managedRightHostWidth)
      setManagedBottomHostHeight(restored.managedBottomHostHeight)
      setLeftDockWidth(restored.leftDockWidth)
      setRightDockWidth(restored.rightDockWidth)
      setJourneyHeight(restored.journeyHeight)
      setDockTabOrder(restored.dockTabOrder)
      setActiveDockTab(restored.activeDockTab)
      setLeftSidebarWidth(restored.leftSidebarWidth)
      setDrawerTab(restored.drawerTab)
      setDslMaximized(restored.dslMaximized)
      setHelpSection(restored.helpSection)
      setJourneyDraftName(restored.journeyDraftName)
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
    setManagedLeftHostWidth(baseline.managedLeftHostWidth)
    setManagedRightHostWidth(baseline.managedRightHostWidth)
    setManagedBottomHostHeight(baseline.managedBottomHostHeight)
    setLeftDockWidth(baseline.leftDockWidth)
    setRightDockWidth(baseline.rightDockWidth)
    setJourneyHeight(baseline.journeyHeight)
    setDockTabOrder(baseline.dockTabOrder)
    setActiveDockTab(baseline.activeDockTab)
    setLeftSidebarWidth(baseline.leftSidebarWidth)
    setDrawerTab(baseline.drawerTab)
    setDslMaximized(baseline.dslMaximized)
    setHelpSection(baseline.helpSection)
    setJourneyDraftName(baseline.journeyDraftName)
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

  const refreshSupabaseGalleryAssets = useCallback(async () => {
    if (!supabaseWorkspaceCloudStore) {
      setSupabaseCloudStatus(CLOUD_NOT_CONFIGURED_STATUS)
      throw new Error(CLOUD_NOT_CONFIGURED_STATUS)
    }

    try {
      const assets = await supabaseWorkspaceCloudStore.listGalleryAssets()
      setSupabaseGalleryAssets(assets)
      return assets
    } catch (error) {
      setSupabaseCloudStatus(
        error instanceof Error ? `Gallery refresh failed: ${error.message}` : 'Gallery refresh failed.',
      )
      throw error instanceof Error ? error : new Error('Gallery refresh failed.')
    }
  }, [])

  const refreshSupabaseCloudScripts = useCallback(async () => {
    if (!supabaseWorkspaceCloudStore) {
      setSupabaseCloudStatus(CLOUD_NOT_CONFIGURED_STATUS)
      throw new Error(CLOUD_NOT_CONFIGURED_STATUS)
    }

    try {
      const scripts = await supabaseWorkspaceCloudStore.listScripts()
      setSupabaseCloudScripts(scripts)
      return scripts
    } catch (error) {
      setSupabaseCloudStatus(
        error instanceof Error ? `Cloud script refresh failed: ${error.message}` : 'Cloud script refresh failed.',
      )
      throw error instanceof Error ? error : new Error('Cloud script refresh failed.')
    }
  }, [])

  const refreshSupabaseCloudLibrary = useCallback(async () => {
    setSupabaseCloudBusy(true)
    try {
      await Promise.all([refreshSupabaseGalleryAssets(), refreshSupabaseCloudScripts()])
      setSupabaseCloudStatus(`${CLOUD_PROVIDER_LABEL} library refreshed.`)
    } catch {
      // Individual refresh handlers already surface a specific error message.
    } finally {
      setSupabaseCloudBusy(false)
    }
  }, [refreshSupabaseGalleryAssets, refreshSupabaseCloudScripts])

  useEffect(() => {
    if (!supabaseWorkspaceCloudStore) {
      return
    }

    return supabaseWorkspaceCloudStore.observeAuth((user) => {
      setSupabaseCloudUser(user)
      setSupabaseCloudStatus(
        user
          ? `${CLOUD_PROVIDER_LABEL} ready for ${user.email ?? user.id}.`
          : CLOUD_SIGNED_OUT_STATUS,
      )
    })
  }, [])

  useEffect(() => {
    if (!supabaseCloudUser) {
      setSupabaseCloudScripts([])
      setSupabaseGalleryAssets([])
      setSupabaseGalleryPreviewUrls({})
      return
    }
    void refreshSupabaseGalleryAssets().catch(() => undefined)
    void refreshSupabaseCloudScripts().catch(() => undefined)
  }, [refreshSupabaseCloudScripts, refreshSupabaseGalleryAssets, supabaseCloudUser])

  useEffect(() => {
    if (!supabaseWorkspaceCloudStore || !supabaseCloudUser || !supabaseGalleryAssets.length) {
      if (!supabaseGalleryAssets.length) {
        setSupabaseGalleryPreviewUrls({})
      }
      return
    }

    const cloudStore = supabaseWorkspaceCloudStore
    let cancelled = false

    void Promise.all(
      supabaseGalleryAssets.map(async (asset) => {
        try {
          const signedUrl = await cloudStore.createGalleryAssetPreviewUrl(
            asset.storagePath,
            3600,
          )
          return [asset.storagePath, signedUrl] as const
        } catch {
          return [asset.storagePath, null] as const
        }
      }),
    ).then((entries) => {
      if (cancelled) {
        return
      }

      const nextPreviewUrls: Record<string, string> = {}
      let missingPreviewCount = 0

      entries.forEach(([storagePath, signedUrl]) => {
        if (signedUrl) {
          nextPreviewUrls[storagePath] = signedUrl
        } else {
          missingPreviewCount += 1
        }
      })

      setSupabaseGalleryPreviewUrls(nextPreviewUrls)
      if (missingPreviewCount > 0) {
        setSupabaseCloudStatus(
          `Some gallery previews could not be refreshed (${missingPreviewCount}/${entries.length}).`,
        )
      }
    })

    return () => {
      cancelled = true
    }
  }, [supabaseCloudUser, supabaseGalleryAssets])

  const openSupabaseGalleryWindow = useCallback(() => {
    setHelpSection('gallery')
    openHelpWindow('gallery')
    setSupabaseCloudPanelOpen(false)
  }, [openHelpWindow])

  const loadDefaultShowcaseScript = useCallback(
    (sample: DefaultShowcaseScriptItem) => {
      setDslText(sample.script)
      try {
        const imported = resolveWorkspaceFromDslText(sample.script)
        replaceWorkspace(imported.workspace, imported.entryViewId)
        setViewport(DEFAULT_FILE_VIEWPORT)
        setDslError(null)
        setSupabaseCloudScriptPickerOpen(false)
        setSupabaseCloudScriptSearch('')
        setActiveSupabaseScriptWorkspaceId(null)
        setTransientStatus(`Loaded sample SJV Script "${sample.title}".`)
      } catch (error) {
        setDslError(error instanceof Error ? error.message : 'Failed to import sample SJV Script.')
        setTransientStatus('Sample SJV Script could not be loaded.')
      }
    },
    [replaceWorkspace, resolveWorkspaceFromDslText, setTransientStatus, setViewport],
  )

  const uploadGeneratedBlobToSupabaseGallery = useCallback(
    async (blob: Blob, fileName: string, title: string) => {
      if (!supabaseWorkspaceCloudStore) {
        throw new Error(CLOUD_NOT_CONFIGURED_STATUS)
      }

      const asset = await supabaseWorkspaceCloudStore.uploadGalleryAssetBlob(blob, {
        fileName,
        title,
        contentType: blob.type,
      })

      setSupabaseGalleryAssets((current) => {
        const next = [asset, ...current.filter((candidate) => candidate.id !== asset.id)]
        return next.slice(0, 24)
      })

      return asset
    },
    [],
  )

  const seedDefaultShowcaseLibrary = useCallback(async () => {
    if (!supabaseWorkspaceCloudStore) {
      setSupabaseCloudStatus(CLOUD_NOT_CONFIGURED_STATUS)
      return
    }

    const cloudStore = supabaseWorkspaceCloudStore
    setSupabaseCloudBusy(true)
    try {
      await Promise.all(
        DEFAULT_SHOWCASE_SCRIPTS.map((sample) =>
          cloudStore.saveScript(sample.workspaceId, sample.title, sample.script),
        ),
      )

      const existingAssets = await cloudStore.listGalleryAssets()
      const existingFileNames = new Set(existingAssets.map((asset) => asset.fileName))
      for (const sample of DEFAULT_SHOWCASE_ANIMATIONS) {
        if (existingFileNames.has(sample.fileName)) {
          continue
        }
        const response = await fetch(sample.href)
        if (!response.ok) {
          throw new Error(`Could not load bundled sample asset "${sample.fileName}".`)
        }
        const fetchedBlob = await response.blob()
        const blob =
          fetchedBlob.type === sample.contentType
            ? fetchedBlob
            : new Blob([fetchedBlob], { type: sample.contentType })
        await uploadGeneratedBlobToSupabaseGallery(blob, sample.fileName, sample.title)
        existingFileNames.add(sample.fileName)
      }

      const [scripts, assets] = await Promise.all([
        cloudStore.listScripts(),
        cloudStore.listGalleryAssets(),
      ])
      setSupabaseCloudScripts(scripts)
      setSupabaseGalleryAssets(assets)
      setSupabaseCloudStatus('Sample showcase library saved to your provider library.')
      setTransientStatus(`Sample showcase library saved to ${CLOUD_STATUS_LABEL}.`)
    } catch (error) {
      setSupabaseCloudStatus(
        error instanceof Error
          ? `Sample showcase seed failed: ${error.message}`
          : 'Sample showcase seed failed.',
      )
      setTransientStatus('Sample showcase library could not be saved.')
    } finally {
      setSupabaseCloudBusy(false)
    }
  }, [setTransientStatus, uploadGeneratedBlobToSupabaseGallery])

  const signInToSupabaseCloud = useCallback(async () => {
    if (!supabaseWorkspaceCloudStore) {
      setSupabaseCloudStatus(CLOUD_NOT_CONFIGURED_STATUS)
      setSupabaseCloudPanelOpen(true)
      return
    }

    setSupabaseCloudBusy(true)
    try {
      const user = await supabaseWorkspaceCloudStore.signIn(
        supabaseAuthDraft.email,
        supabaseAuthDraft.password,
      )
      setSupabaseCloudUser(user)
      setSupabaseCloudScripts([])
      setSupabaseCloudScriptPickerOpen(false)
      setSupabaseCloudScriptSearch('')
      setSupabaseCloudStatus(`Signed in as ${user.email ?? user.id}.`)
      setSupabaseCloudPanelOpen(false)
      setTransientStatus(`${CLOUD_PROVIDER_LABEL} sign-in successful.`)
    } catch (error) {
      setSupabaseCloudStatus(
        error instanceof Error
          ? `${CLOUD_PROVIDER_LABEL} sign-in failed: ${error.message}`
          : `${CLOUD_PROVIDER_LABEL} sign-in failed.`,
      )
    } finally {
      setSupabaseCloudBusy(false)
    }
  }, [setTransientStatus, supabaseAuthDraft.email, supabaseAuthDraft.password])

  const signOutOfSupabaseCloud = useCallback(async () => {
    if (!supabaseWorkspaceCloudStore) {
      setSupabaseCloudStatus(CLOUD_NOT_CONFIGURED_STATUS)
      setSupabaseCloudPanelOpen(true)
      return
    }

    setSupabaseCloudBusy(true)
    try {
      await supabaseWorkspaceCloudStore.signOut()
      setSupabaseCloudUser(null)
      setSupabaseCloudScripts([])
      setSupabaseCloudScriptPickerOpen(false)
      setSupabaseCloudScriptSearch('')
      setActiveSupabaseScriptWorkspaceId(null)
      setSupabaseCloudStatus(CLOUD_SIGNED_OUT_STATUS)
      setSupabaseCloudPanelOpen(false)
      setTransientStatus(`${CLOUD_PROVIDER_LABEL} sign-out complete.`)
    } catch (error) {
      setSupabaseCloudStatus(
        error instanceof Error
          ? `${CLOUD_PROVIDER_LABEL} sign-out failed: ${error.message}`
          : `${CLOUD_PROVIDER_LABEL} sign-out failed.`,
      )
    } finally {
      setSupabaseCloudBusy(false)
    }
  }, [setTransientStatus])

  const saveWorkspaceToSupabaseCloud = useCallback(async () => {
    if (!supabaseWorkspaceCloudStore) {
      setSupabaseCloudStatus(CLOUD_NOT_CONFIGURED_STATUS)
      return
    }

    setSupabaseCloudBusy(true)
    try {
      await supabaseWorkspaceCloudStore.saveWorkspace(buildEditorSnapshot())
      setSupabaseCloudStatus(`Cloud copy saved for workspace "${workspace.workspace.name}".`)
      setTransientStatus(`Workspace saved to ${CLOUD_STATUS_LABEL}.`)
    } catch (error) {
      setSupabaseCloudStatus(
        error instanceof Error ? `Cloud save failed: ${error.message}` : 'Cloud save failed.',
      )
    } finally {
      setSupabaseCloudBusy(false)
    }
  }, [buildEditorSnapshot, setTransientStatus, workspace.workspace.name])

  const loadWorkspaceFromSupabaseCloud = useCallback(async () => {
    if (!supabaseWorkspaceCloudStore) {
      setSupabaseCloudStatus(CLOUD_NOT_CONFIGURED_STATUS)
      return
    }

    setSupabaseCloudBusy(true)
    try {
      const snapshot = await supabaseWorkspaceCloudStore.loadWorkspace(workspace.workspace.id)
      if (!snapshot) {
        setSupabaseCloudStatus(`No cloud snapshot found for workspace id "${workspace.workspace.id}".`)
        return
      }

      replaceWorkspace(snapshot.workspace, snapshot.currentViewId)
      setViewport(snapshot.viewport)
      setDslText(fullWorkspaceToLiteDsl(snapshot.workspace))
      setDslError(null)
      setSupabaseCloudScriptPickerOpen(false)
      setSupabaseCloudScriptSearch('')
      setActiveSupabaseScriptWorkspaceId(null)
      setSupabaseCloudStatus(`Loaded cloud snapshot for workspace "${snapshot.workspace.workspace.name}".`)
      setTransientStatus(`Workspace loaded from ${CLOUD_STATUS_LABEL}.`)
    } catch (error) {
      setSupabaseCloudStatus(
        error instanceof Error ? `Cloud load failed: ${error.message}` : 'Cloud load failed.',
      )
    } finally {
      setSupabaseCloudBusy(false)
    }
  }, [replaceWorkspace, setTransientStatus, setViewport, workspace.workspace.id])

  const saveScriptToSupabaseCloud = useCallback(async () => {
    if (!supabaseWorkspaceCloudStore) {
      setSupabaseCloudStatus(CLOUD_NOT_CONFIGURED_STATUS)
      return
    }

    setSupabaseCloudBusy(true)
    try {
      const generatedScript = fullWorkspaceToLiteDsl(workspace)
      const cloudScriptWorkspaceId = activeSupabaseScriptWorkspaceId ?? workspace.workspace.id
      const cloudScriptTitle = `${workspace.workspace.name} Script`
      const updatedAt = new Date().toISOString()
      await supabaseWorkspaceCloudStore.saveScript(
        cloudScriptWorkspaceId,
        cloudScriptTitle,
        generatedScript,
      )
      setSupabaseCloudScripts((current) => {
        const next = [
          {
            workspaceId: cloudScriptWorkspaceId,
            title: cloudScriptTitle,
            updatedAt,
          },
          ...current.filter((script) => script.workspaceId !== cloudScriptWorkspaceId),
        ]
        return next.slice(0, 24)
      })
      setActiveSupabaseScriptWorkspaceId(cloudScriptWorkspaceId)
      setSupabaseCloudStatus(`Cloud script saved for workspace "${workspace.workspace.name}".`)
      setTransientStatus(`SJV Script saved to ${CLOUD_STATUS_LABEL}.`)
    } catch (error) {
      setSupabaseCloudStatus(
        error instanceof Error ? `Cloud script save failed: ${error.message}` : 'Cloud script save failed.',
      )
    } finally {
      setSupabaseCloudBusy(false)
    }
  }, [activeSupabaseScriptWorkspaceId, setTransientStatus, workspace])

  const loadScriptFromSupabaseCloud = useCallback(async () => {
    if (!supabaseWorkspaceCloudStore) {
      setSupabaseCloudStatus(CLOUD_NOT_CONFIGURED_STATUS)
      setSupabaseCloudPanelOpen(true)
      return
    }

    setSupabaseCloudPanelOpen(true)
    setSupabaseCloudBusy(true)
    try {
      const availableScripts = await refreshSupabaseCloudScripts()
      setSupabaseCloudScriptSearch('')
      setSupabaseCloudScriptPickerOpen(true)
      setSupabaseCloudStatus(
        availableScripts.length
          ? `Choose a saved SJV Script to load. ${availableScripts.length} script${
              availableScripts.length === 1 ? '' : 's'
            } available.`
          : 'No Supabase SJV Scripts have been saved for this account yet.',
      )
    } catch (error) {
      setSupabaseCloudScriptPickerOpen(false)
      setSupabaseCloudScriptSearch('')
      setSupabaseCloudStatus(
        error instanceof Error ? `Cloud script load failed: ${error.message}` : 'Cloud script load failed.',
      )
    } finally {
      setSupabaseCloudBusy(false)
    }
  }, [refreshSupabaseCloudScripts])

  const loadSelectedSupabaseCloudScript = useCallback(
    async (selectedScript: SupabaseCloudScriptSummary) => {
      if (!supabaseWorkspaceCloudStore) {
        setSupabaseCloudStatus(CLOUD_NOT_CONFIGURED_STATUS)
        setSupabaseCloudPanelOpen(true)
        return
      }

      setSupabaseCloudBusy(true)
      try {
        const script = await supabaseWorkspaceCloudStore.loadLatestScript(selectedScript.workspaceId)
        if (!script) {
          setSupabaseCloudStatus(`The selected cloud script "${selectedScript.title}" is no longer available.`)
          return
        }

        setDslText(script.content)
        try {
          const imported = resolveWorkspaceFromDslText(script.content)
          replaceWorkspace(imported.workspace, imported.entryViewId)
          setViewport(DEFAULT_FILE_VIEWPORT)
          setDslError(null)
          setSupabaseCloudScriptPickerOpen(false)
          setSupabaseCloudScriptSearch('')
          setActiveSupabaseScriptWorkspaceId(selectedScript.workspaceId)
          setSupabaseCloudStatus(`Loaded cloud script "${script.title}".`)
          setSupabaseCloudPanelOpen(false)
          setTransientStatus(`SJV Script loaded from ${CLOUD_STATUS_LABEL}.`)
        } catch (error) {
          setDslError(error instanceof Error ? error.message : 'Failed to import SJV Script.')
          setSupabaseCloudStatus(`Loaded cloud script "${script.title}" into the editor, but import failed.`)
        }
      } catch (error) {
        setSupabaseCloudStatus(
          error instanceof Error ? `Cloud script load failed: ${error.message}` : 'Cloud script load failed.',
        )
      } finally {
        setSupabaseCloudBusy(false)
      }
    },
    [replaceWorkspace, resolveWorkspaceFromDslText, setTransientStatus, setViewport],
  )

  const openSupabaseGalleryPicker = useCallback(() => {
    supabaseGalleryFileInputRef.current?.click()
  }, [])

  const downloadSupabaseGalleryAsset = useCallback(
    async (asset: SupabaseGalleryAsset) => {
      if (!supabaseWorkspaceCloudStore) {
        setSupabaseCloudStatus(CLOUD_NOT_CONFIGURED_STATUS)
        return
      }

      setSupabaseCloudBusy(true)
      try {
        const blob = await supabaseWorkspaceCloudStore.downloadGalleryAsset(asset.storagePath)
        const objectUrl = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = objectUrl
        link.download = asset.fileName
        document.body.append(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(objectUrl)
        setSupabaseCloudStatus(`Downloaded gallery asset "${asset.fileName}".`)
        setTransientStatus(`Gallery asset downloaded from ${CLOUD_STATUS_LABEL}.`)
      } catch (error) {
        setSupabaseCloudStatus(
          error instanceof Error ? `Gallery download failed: ${error.message}` : 'Gallery download failed.',
        )
      } finally {
        setSupabaseCloudBusy(false)
      }
    },
    [setTransientStatus],
  )

  const shareSupabaseGalleryAsset = useCallback(
    async (asset: SupabaseGalleryAsset) => {
      if (!supabaseWorkspaceCloudStore) {
        setSupabaseCloudStatus(CLOUD_NOT_CONFIGURED_STATUS)
        return
      }
      if (!isSupabaseGalleryAssetShareable(asset)) {
        setSupabaseCloudStatus('Only MP4 and GIF gallery exports can be shared right now.')
        return
      }
      if (typeof window === 'undefined') {
        return
      }

      setSupabaseCloudBusy(true)
      try {
        const signedUrl = await supabaseWorkspaceCloudStore.createGalleryAssetPreviewUrl(
          asset.storagePath,
          SUPABASE_SHARED_ASSET_LINK_EXPIRY_SECONDS,
        )
        const sharedViewerUrl = buildSharedSupabaseAssetViewerUrl(window.location.origin, {
          title: asset.title,
          fileName: asset.fileName,
          contentType: asset.contentType,
          signedUrl,
        })

        let copiedToClipboard = false
        if (window.navigator.clipboard?.writeText) {
          try {
            await window.navigator.clipboard.writeText(sharedViewerUrl)
            copiedToClipboard = true
          } catch {
            copiedToClipboard = false
          }
        }

        if (copiedToClipboard) {
          setSupabaseCloudStatus(`Share link copied for "${asset.title}". This private link expires in 7 days.`)
          setTransientStatus('Shared export link copied to clipboard.')
          return
        }

        window.open(sharedViewerUrl, '_blank', 'noopener,noreferrer')
        setSupabaseCloudStatus(
          `Share viewer opened for "${asset.title}". Copy the URL from the new tab to send it.`,
        )
        setTransientStatus('Shared export viewer opened in a new tab.')
      } catch (error) {
        setSupabaseCloudStatus(
          error instanceof Error ? `Share link failed: ${error.message}` : 'Share link failed.',
        )
      } finally {
        setSupabaseCloudBusy(false)
      }
    },
    [setTransientStatus],
  )

  const deleteSupabaseCloudScript = useCallback(
    async (script: SupabaseCloudScriptSummary) => {
      if (!supabaseWorkspaceCloudStore) {
        setSupabaseCloudStatus(CLOUD_NOT_CONFIGURED_STATUS)
        setSupabaseCloudPanelOpen(true)
        return
      }
      const confirmed = await requestConfirmation({
        title: 'Delete cloud script?',
        message: `Delete "${script.title}" from ${CLOUD_STATUS_LABEL}?`,
        details: ['This saved SJV Script will be removed from your cloud library.', 'This action cannot be undone.'],
        confirmLabel: 'Delete script',
        tone: 'danger',
      })
      if (!confirmed) {
        return
      }

      setSupabaseCloudBusy(true)
      try {
        await supabaseWorkspaceCloudStore.deleteScript(script.workspaceId)
        setSupabaseCloudScripts((current) => current.filter((candidate) => candidate.workspaceId !== script.workspaceId))
        if (activeSupabaseScriptWorkspaceId === script.workspaceId) {
          setActiveSupabaseScriptWorkspaceId(null)
        }
        setSupabaseCloudStatus(`Deleted cloud script "${script.title}".`)
        setTransientStatus(`SJV Script deleted from ${CLOUD_STATUS_LABEL}.`)
      } catch (error) {
        setSupabaseCloudStatus(
          error instanceof Error ? `Cloud script delete failed: ${error.message}` : 'Cloud script delete failed.',
        )
      } finally {
        setSupabaseCloudBusy(false)
      }
    },
    [activeSupabaseScriptWorkspaceId, requestConfirmation, setTransientStatus],
  )

  const deleteSupabaseGalleryAsset = useCallback(
    async (asset: SupabaseGalleryAsset) => {
      if (!supabaseWorkspaceCloudStore) {
        setSupabaseCloudStatus(CLOUD_NOT_CONFIGURED_STATUS)
        return
      }
      const confirmed = await requestConfirmation({
        title: 'Delete gallery asset?',
        message: `Delete "${asset.title}" from ${CLOUD_STATUS_LABEL}?`,
        details: ['The exported media file and its saved metadata will be removed.', 'This action cannot be undone.'],
        confirmLabel: 'Delete asset',
        tone: 'danger',
      })
      if (!confirmed) {
        return
      }

      setSupabaseCloudBusy(true)
      try {
        await supabaseWorkspaceCloudStore.deleteGalleryAsset(asset)
        setSupabaseGalleryAssets((current) => current.filter((candidate) => candidate.id !== asset.id))
        setSupabaseGalleryPreviewUrls((current) => {
          if (!current[asset.storagePath]) {
            return current
          }
          const next = { ...current }
          delete next[asset.storagePath]
          return next
        })
        setSupabaseCloudStatus(`Deleted gallery asset "${asset.fileName}".`)
        setTransientStatus(`Gallery asset deleted from ${CLOUD_STATUS_LABEL}.`)
      } catch (error) {
        setSupabaseCloudStatus(
          error instanceof Error ? `Gallery delete failed: ${error.message}` : 'Gallery delete failed.',
        )
      } finally {
        setSupabaseCloudBusy(false)
      }
    },
    [requestConfirmation, setTransientStatus],
  )

  const onSupabaseGalleryFileInputChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file) {
        return
      }
      if (!supabaseWorkspaceCloudStore) {
        setSupabaseCloudStatus(CLOUD_NOT_CONFIGURED_STATUS)
        return
      }

      setSupabaseCloudBusy(true)
      try {
        const asset = await supabaseWorkspaceCloudStore.uploadGalleryAsset(file)
        setSupabaseGalleryAssets((current) => [asset, ...current].slice(0, 24))
        setSupabaseCloudStatus(`Uploaded "${asset.fileName}" to bucket "${SUPABASE_GALLERY_BUCKET}".`)
        setTransientStatus(`Gallery asset uploaded to ${CLOUD_STATUS_LABEL}.`)
      } catch (error) {
        setSupabaseCloudStatus(
          error instanceof Error ? `Gallery upload failed: ${error.message}` : 'Gallery upload failed.',
        )
      } finally {
        setSupabaseCloudBusy(false)
      }
    },
    [setTransientStatus],
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

  const createNewWorkspaceFile = useCallback(async () => {
    const confirmed = await requestConfirmation({
      title: 'Create new workspace?',
      message: 'The current canvas state will be replaced in the editor.',
      details: ['Save your current workspace first if you need to keep it.'],
      confirmLabel: 'Create workspace',
    })
    if (!confirmed) {
      return
    }
    const nextWorkspace = createBlankWorkspace()
    replaceWorkspace(nextWorkspace, BLANK_WORKSPACE_VIEW_ID)
    setViewport(DEFAULT_FILE_VIEWPORT)
    workspaceFileHandleRef.current = null
    setSupabaseCloudScriptPickerOpen(false)
    setSupabaseCloudScriptSearch('')
    setActiveSupabaseScriptWorkspaceId(null)
    setExportError(null)
    setTransientStatus('New workspace created.')
  }, [replaceWorkspace, requestConfirmation, setTransientStatus, setViewport])

  const loadWorkspacePayload = useCallback(
    (payload: string, options?: { fileName?: string; fileHandle?: WorkspaceFileHandle | null }) => {
      try {
        const snapshot = parseWorkspaceSnapshotFile(payload)
        replaceWorkspace(snapshot.workspace, snapshot.currentViewId)
        setViewport(snapshot.viewport)
        workspaceFileHandleRef.current = options?.fileHandle ?? null
        setSupabaseCloudScriptPickerOpen(false)
        setSupabaseCloudScriptSearch('')
        setActiveSupabaseScriptWorkspaceId(null)
        setExportError(null)
        setTransientStatus(`Workspace file loaded: ${options?.fileName ?? 'workspace file'}`)
        return
      } catch (snapshotError) {
        try {
          const imported = resolveWorkspaceFromDslText(payload)
          replaceWorkspace(imported.workspace, imported.entryViewId)
          setViewport(DEFAULT_FILE_VIEWPORT)
          workspaceFileHandleRef.current = options?.fileHandle ?? null
          setSupabaseCloudScriptPickerOpen(false)
          setSupabaseCloudScriptSearch('')
          setActiveSupabaseScriptWorkspaceId(null)
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
    [replaceWorkspace, resolveWorkspaceFromDslText, setTransientStatus, setViewport],
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

  const onJourneyStepIndent = useCallback(
    (journeyId: string, edgeId: string, anchorEdgeId?: string) => {
      const changed = indentJourneyStepToThread(journeyId, edgeId, anchorEdgeId)
      setTransientStatus(changed ? 'Journey step indented as a thread.' : 'No valid thread anchor for that step.')
    },
    [indentJourneyStepToThread, setTransientStatus],
  )

  const onJourneyThreadStepOutdent = useCallback(
    (journeyId: string, threadId: string, edgeId: string) => {
      const changed = outdentJourneyThreadStep(journeyId, threadId, edgeId)
      setTransientStatus(changed ? 'Thread step moved back to the main lane.' : 'Thread step could not be moved.')
    },
    [outdentJourneyThreadStep, setTransientStatus],
  )

  const removeSelectedNodesWithConfirmation = useCallback(async () => {
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
    const message =
      selectedNodes.length === 1
        ? `Remove "${firstSelected.name}" from canvas?`
        : `Remove ${selectedNodes.length} selected nodes from canvas?`
    const details: string[] = []
    if (connectedEdgeIds.length > 0) {
      details.push(`This will also remove ${connectedEdgeIds.length} connected edge(s).`)
    }
    if (affectedJourneyNames.length > 0) {
      details.push(`Affected journeys: ${affectedJourneyNames.join(', ')}`)
    }

    const confirmed = await requestConfirmation({
      title: selectedNodes.length === 1 ? 'Delete node?' : 'Delete selected nodes?',
      message,
      details: [...details, 'This action cannot be undone.'],
      confirmLabel: selectedNodes.length === 1 ? 'Delete node' : 'Delete nodes',
      tone: 'danger',
    })
    if (!confirmed) {
      return false
    }

    selectedNodes.forEach((node) => removeNode(node.id))
    setTransientStatus(
      selectedNodes.length === 1 ? 'Node removed.' : `${selectedNodes.length} nodes removed.`,
    )
    return true
  }, [
    currentView.edgeIds,
    currentView.journeyIds,
    removeNode,
    requestConfirmation,
    selectedNodes,
    setTransientStatus,
    workspace.edges,
    workspace.journeys,
  ])

  const removeSelectedEdgeWithConfirmation = useCallback(async () => {
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
    const details: string[] = []
    if (affectedJourneyNames.length > 0) {
      details.push(`Journeys that will lose this step: ${affectedJourneyNames.join(', ')}`)
    }

    const confirmed = await requestConfirmation({
      title: 'Delete edge?',
      message: `Remove edge "${selectedEdge.label || selectedEdge.id}"?`,
      details: [...details, 'This action cannot be undone.'],
      confirmLabel: 'Delete edge',
      tone: 'danger',
    })
    if (!confirmed) {
      return false
    }

    removeEdge(selectedEdge.id)
    setTransientStatus('Edge removed.')
    return true
  }, [currentView.journeyIds, removeEdge, requestConfirmation, selectedEdge, setTransientStatus, workspace.journeys])

  const deleteCurrentSelection = useCallback(async () => {
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

  const closeCanvasContextMenu = useCallback(() => {
    setCanvasContextMenu(null)
  }, [])

  const handleAppContextMenu = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      event.preventDefault()
      if (presentationMode) {
        return
      }
      const targetElement = event.target instanceof Element ? event.target : null
      if (!targetElement?.closest('.canvas-panel')) {
        closeCanvasContextMenu()
        return
      }
      const nodeElement = targetElement?.closest<SVGGElement>('[data-node-id]')
      const edgeElement = targetElement?.closest<SVGGElement>('[data-edge-id]')
      const canvasPanel = canvasPanelRef.current
      const canvasRect = canvasPanel?.getBoundingClientRect()
      const worldX = canvasRect ? (event.clientX - canvasRect.left - viewport.x) / viewport.zoom : 0
      const worldY = canvasRect ? (event.clientY - canvasRect.top - viewport.y) / viewport.zoom : 0

      if (nodeElement?.dataset.nodeId && workspace.nodes[nodeElement.dataset.nodeId]) {
        const nodeId = nodeElement.dataset.nodeId
        selectNode(nodeId)
        setCanvasContextMenu({
          x: event.clientX,
          y: event.clientY,
          worldX,
          worldY,
          target: 'node',
          nodeId,
        })
        return
      }

      if (edgeElement?.dataset.edgeId && workspace.edges[edgeElement.dataset.edgeId]) {
        const edgeId = edgeElement.dataset.edgeId
        selectEdge(edgeId)
        setCanvasContextMenu({
          x: event.clientX,
          y: event.clientY,
          worldX,
          worldY,
          target: 'edge',
          edgeId,
        })
        return
      }

      setCanvasContextMenu({
        x: event.clientX,
        y: event.clientY,
        worldX,
        worldY,
        target: 'canvas',
      })
    },
    [closeCanvasContextMenu, presentationMode, selectEdge, selectNode, viewport, workspace.edges, workspace.nodes],
  )

  const runCanvasContextAction = useCallback(
    (action: () => AppActionResult) => {
      action()
      closeCanvasContextMenu()
    },
    [closeCanvasContextMenu],
  )

  useEffect(() => {
    if (!canvasContextMenu) {
      return
    }
    const onWindowPointerDown = (event: PointerEvent) => {
      const targetElement = event.target instanceof Element ? event.target : null
      if (targetElement?.closest('.canvas-context-menu')) {
        return
      }
      closeCanvasContextMenu()
    }
    const onWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeCanvasContextMenu()
      }
    }
    window.addEventListener('pointerdown', onWindowPointerDown)
    window.addEventListener('keydown', onWindowKeyDown)
    window.addEventListener('scroll', closeCanvasContextMenu, true)
    return () => {
      window.removeEventListener('pointerdown', onWindowPointerDown)
      window.removeEventListener('keydown', onWindowKeyDown)
      window.removeEventListener('scroll', closeCanvasContextMenu, true)
    }
  }, [canvasContextMenu, closeCanvasContextMenu])

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

  const onManagedHostSideSplitterPointerDown = (side: 'left' | 'right', event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return
    }
    const minWidth = getManagedHostSideMinWidth(side)
    const startWidth = Math.max(side === 'left' ? managedLeftHostWidth : managedRightHostWidth, minWidth)
    managedHostSideResizeRef.current = {
      pointerId: event.pointerId,
      side,
      startClientX: event.clientX,
      startWidth,
      minWidth,
      maxWidth: getMaxManagedHostSideWidth(side),
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onManagedHostSideSplitterPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const resize = managedHostSideResizeRef.current
    if (!resize || resize.pointerId !== event.pointerId) {
      return
    }
    const nextWidth = resolveDockSideWidth({
      side: resize.side,
      startWidth: resize.startWidth,
      startClientX: resize.startClientX,
      currentClientX: event.clientX,
      minWidth: resize.minWidth,
      maxWidth: resize.maxWidth,
    })
    if (resize.side === 'left') {
      setManagedLeftHostWidth(nextWidth)
      return
    }
    setManagedRightHostWidth(nextWidth)
  }

  const stopManagedHostSideResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    const resize = managedHostSideResizeRef.current
    if (!resize || resize.pointerId !== event.pointerId) {
      return
    }
    managedHostSideResizeRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const onManagedBottomHostSplitterPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return
    }
    managedBottomHostResizeRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startHeight: managedBottomHostHeight,
      maxHeight: getMaxManagedBottomHostHeight(),
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onManagedBottomHostSplitterPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const resize = managedBottomHostResizeRef.current
    if (!resize || resize.pointerId !== event.pointerId) {
      return
    }
    const delta = resize.startY - event.clientY
    const nextHeight = Math.max(
      MIN_MANAGED_HOST_BOTTOM_HEIGHT,
      Math.min(resize.maxHeight, resize.startHeight + delta),
    )
    setManagedBottomHostHeight(nextHeight)
  }

  const stopManagedBottomHostResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    const resize = managedBottomHostResizeRef.current
    if (!resize || resize.pointerId !== event.pointerId) {
      return
    }
    managedBottomHostResizeRef.current = null
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
      journeyResizeRef.current = null
      managedHostSideResizeRef.current = null
      managedBottomHostResizeRef.current = null
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
      setManagedLeftHostWidth((current) =>
        Math.min(Math.max(current, getManagedHostSideMinWidth('left')), getMaxManagedHostSideWidth('left')),
      )
      setManagedRightHostWidth((current) =>
        Math.min(Math.max(current, getManagedHostSideMinWidth('right')), getMaxManagedHostSideWidth('right')),
      )
      setManagedBottomHostHeight((current) => Math.min(current, getMaxManagedBottomHostHeight()))
    }
    clampDockSideWidths()
    window.addEventListener('resize', clampDockSideWidths)
    return () => {
      window.removeEventListener('resize', clampDockSideWidths)
    }
  }, [
    getManagedHostSideMinWidth,
    getMaxDockSideWidth,
    getMaxManagedBottomHostHeight,
    getMaxManagedHostSideWidth,
  ])

  useEffect(() => {
    const topbarElement = topbarRef.current
    if (!topbarElement) {
      return
    }

    const updateTopbarHeight = () => {
      const inFlowTopbarContentHeight = Array.from(topbarElement.children).reduce((maxBottom, child) => {
        if (!(child instanceof HTMLElement)) {
          return maxBottom
        }
        const childPosition = window.getComputedStyle(child).position
        if (childPosition === 'absolute' || childPosition === 'fixed') {
          return maxBottom
        }
        return Math.max(maxBottom, child.offsetTop + child.offsetHeight)
      }, 0)
      const nextHeight = resolveTopbarHeight({
        minHeight: DEFAULT_TOPBAR_HEIGHT,
        renderedHeight: topbarElement.getBoundingClientRect().height,
        contentHeight: inFlowTopbarContentHeight,
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
  }, [
    hasVisibleToolbarSection,
    presentationMode,
    uiPreferences.fontScale,
    uiPreferences.menuBarVisible,
    uiPreferences.toolbarInlineWithBrand,
    uiPreferences.toolbarVisibility,
  ])

  useEffect(() => {
    const canvasPanel = canvasPanelRef.current
    if (!canvasPanel) {
      return
    }

    const updateCanvasPanelSize = () => {
      const rect = canvasPanel.getBoundingClientRect()
      const nextSize = {
        width: Math.max(0, Math.round(rect.width)),
        height: Math.max(0, Math.round(rect.height)),
      }
      setCanvasPanelSize((current) =>
        current.width === nextSize.width && current.height === nextSize.height ? current : nextSize,
      )
    }

    updateCanvasPanelSize()
    window.addEventListener('resize', updateCanvasPanelSize)
    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(updateCanvasPanelSize)
      observer.observe(canvasPanel)
    }

    return () => {
      window.removeEventListener('resize', updateCanvasPanelSize)
      observer?.disconnect()
    }
  }, [appShellMode])

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
        managedLeftHostWidth,
        managedRightHostWidth,
        managedBottomHostHeight,
        leftDockWidth,
        rightDockWidth,
        journeyHeight,
        dockTabOrder,
        activeDockTab,
        leftSidebarWidth,
        drawerTab,
        dslMaximized,
        focusMode,
        presentationMode,
        helpSection,
        journeyDraftName,
      }),
    )
  }, [
    activeDockTab,
    dockCollapsed,
    dockPosition,
    dockTabOrder,
    drawerTab,
    drawerCollapsed,
    dslMaximized,
    floatingDockRect,
    focusMode,
    helpSection,
    journeyHeight,
    journeyDraftName,
    leftDockWidth,
    leftSidebarWidth,
    managedBottomHostHeight,
    managedLeftHostWidth,
    managedWindows,
    managedRightHostWidth,
    presentationMode,
    rightDockWidth,
  ])

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
      dslSyncUpdatingTextFromWorkspaceRef.current = false
      dslSyncApplyingWorkspaceFromTextRef.current = false
      return
    }
    if (dslSyncApplyingWorkspaceFromTextRef.current) {
      dslSyncApplyingWorkspaceFromTextRef.current = false
      return
    }
    const nextDslText = fullWorkspaceToLiteDsl(workspace)
    setDslText((current) => {
      if (current === nextDslText) {
        dslSyncLastAppliedTextRef.current = nextDslText
        return current
      }
      dslSyncUpdatingTextFromWorkspaceRef.current = true
      dslSyncLastAppliedTextRef.current = nextDslText
      return nextDslText
    })
    setDslError(null)
  }, [dslSyncEnabled, workspace])

  useEffect(() => {
    if (!dslSyncEnabled) {
      dslSyncLastAppliedTextRef.current = null
      return
    }
    if (dslSyncUpdatingTextFromWorkspaceRef.current) {
      dslSyncUpdatingTextFromWorkspaceRef.current = false
      return
    }
    if (dslSyncLastAppliedTextRef.current === dslText) {
      return
    }
    try {
      const imported = resolveWorkspaceFromDslText(dslText)
      const nextWorkspace =
        imported.hasUiLayoutMetadata
          ? imported.workspace
          : preserveWorkspaceVisualStateForDslSync(imported.workspace, dslSyncWorkspaceRef.current)
      dslSyncApplyingWorkspaceFromTextRef.current = true
      replaceWorkspace(nextWorkspace, imported.entryViewId)
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
    if (!playerConfettiNonce || uiPreferences.performanceModeEnabled) {
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
  }, [playerConfettiNonce, uiPreferences.performanceModeEnabled])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    const onWindowPointerDown = (event: MouseEvent) => {
      const target = event.target
      if (
        target instanceof Node &&
        topbarCloudShellRef.current &&
        !topbarCloudShellRef.current.contains(target)
      ) {
        setSupabaseCloudPanelOpen(false)
        setSupabaseCloudScriptPickerOpen(false)
        setSupabaseCloudScriptSearch('')
      }
      if (!desktopMenuBarRef.current) {
        return
      }
      if (target instanceof Node && desktopMenuBarRef.current.contains(target)) {
        return
      }
      setOpenDesktopMenu(null)
    }

    const onWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenDesktopMenu(null)
        setCommandPaletteOpen(false)
        setCommandPaletteQuery('')
        setSupabaseCloudPanelOpen(false)
        setSupabaseCloudScriptPickerOpen(false)
        setSupabaseCloudScriptSearch('')
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
    const onCommandPaletteShortcut = (event: KeyboardEvent) => {
      if (isTextInputTarget(event.target)) {
        return
      }
      const key = event.key.toLowerCase()
      const hasCommand = event.ctrlKey || event.metaKey
      if (hasCommand && !event.altKey && key === 'k') {
        event.preventDefault()
        openCommandPalette()
        return
      }
      if (!hasCommand && !event.altKey && !event.shiftKey && event.key === '/') {
        event.preventDefault()
        openCommandPalette()
      }
    }

    window.addEventListener('keydown', onCommandPaletteShortcut)
    return () => window.removeEventListener('keydown', onCommandPaletteShortcut)
  }, [openCommandPalette])

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
        void createNewWorkspaceFile()
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
    if (activeTool !== 'select' || pendingConnectionFrom) {
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
          setDrawerCollapsed(drawerCollapsedBeforePresentationRef.current)
        }
        setPresentationMode(false)
      }
    }

    window.addEventListener('keydown', onModeShortcut)
    return () => window.removeEventListener('keydown', onModeShortcut)
  }, [focusMode, presentationMode])

  useEffect(() => {
    const onToolShortcut = (event: KeyboardEvent) => {
      if (isTextInputTarget(event.target) || event.ctrlKey || event.metaKey || event.altKey) {
        return
      }
      const key = event.key.toLowerCase()
      if (key !== 'v' && key !== 'c') {
        return
      }
      event.preventDefault()
      setActiveTool(key === 'v' ? 'select' : 'connector')
    }

    window.addEventListener('keydown', onToolShortcut)
    return () => window.removeEventListener('keydown', onToolShortcut)
  }, [setActiveTool])

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
        void deleteCurrentSelection()
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

  const autoUploadExportedMediaToSupabaseGallery = useCallback(
    async (blob: Blob, fileName: string, title: string): Promise<boolean> => {
      if (!supabaseCloudReady) {
        return false
      }

      setSupabaseCloudBusy(true)
      try {
        const asset = await uploadGeneratedBlobToSupabaseGallery(blob, fileName, title)
        setSupabaseCloudStatus(`Auto-uploaded "${asset.fileName}" after local export.`)
        return true
      } catch (error) {
        setSupabaseCloudStatus(
          error instanceof Error
            ? `Automatic upload failed after local export: ${error.message}`
            : 'Automatic upload failed after local export.',
        )
        setTransientStatus('Local export completed, but Supabase auto-upload failed.')
        return false
      } finally {
        setSupabaseCloudBusy(false)
      }
    },
    [setTransientStatus, supabaseCloudReady, uploadGeneratedBlobToSupabaseGallery],
  )

  const exportFromCanvas = async (format: 'svg' | 'png' | 'pdf') => {
    const sequenceModeActive = presentationMode && presentationSurface === 'sequence'
    const svg = document.querySelector(sequenceModeActive ? '.sequence-diagram-svg' : '.diagram-canvas')
    if (!(svg instanceof SVGSVGElement)) {
      setExportError(sequenceModeActive ? 'Sequence diagram not found for export.' : 'Canvas not found for export.')
      return
    }
    try {
      const sequenceFilenameBase =
        sequenceModeActive && playerJourney
          ? `sequence-${playerJourney.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)/g, '') || 'diagram'}`
          : null
      if (format === 'svg') {
        exportSvg(svg, sequenceFilenameBase ? `${sequenceFilenameBase}.svg` : undefined)
      } else if (format === 'png') {
        const fileName = sequenceFilenameBase ? `${sequenceFilenameBase}.png` : `${workspace.workspace.name}.png`
        const blob = await createPngExportBlob(svg)
        saveBlobAsFile(blob, fileName)
        const autoUploaded = await autoUploadExportedMediaToSupabaseGallery(
          blob,
          fileName,
          sequenceModeActive
            ? playerJourney
              ? `Sequence PNG · ${playerJourney.name}`
              : 'Sequence PNG'
            : `${workspace.workspace.name} PNG`,
        )
        setExportStatus(
          autoUploaded
            ? `PNG exported and auto-uploaded to ${CLOUD_STATUS_LABEL} gallery.`
            : 'PNG exported.',
        )
        window.setTimeout(() => setExportStatus(null), 2800)
      } else {
        await exportPdf(svg, sequenceFilenameBase ? `${sequenceFilenameBase}.pdf` : undefined)
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
    viewport: ViewportState
  }

  const resolveCurrentExportJourneyId = useCallback((): string | null => {
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
  }, [activeJourneyId, currentView.journeyIds, journeyFilterId, playerJourneyId, workspace.journeys])

  const restorePlayerAfterAnimatedExport = useCallback((snapshot: PlayerExportSnapshot): void => {
    setPlayerRunning(false)
    setPlayerLoop(snapshot.playerLoop)
    setPlayerSpeedMs(snapshot.playerSpeedMs)
    setJourneyFilter(snapshot.journeyFilterId)
    if (!snapshot.playerJourneyId || !workspace.journeys[snapshot.playerJourneyId]) {
      setPlayerJourney(null)
      setViewport(snapshot.viewport)
      return
    }

    setPlayerJourney(snapshot.playerJourneyId)
    resetPlayer()
    for (let index = 0; index < snapshot.playerStepIndex; index += 1) {
      stepPlayer()
    }
    setPlayerRunning(snapshot.playerIsRunning)
    setViewport(snapshot.viewport)
  }, [
    setJourneyFilter,
    setPlayerJourney,
    setPlayerLoop,
    setPlayerRunning,
    setPlayerSpeedMs,
    setViewport,
    resetPlayer,
    stepPlayer,
    workspace.journeys,
  ])

  const waitForCanvasFrames = useCallback(async (frames = 2): Promise<void> => {
    for (let index = 0; index < Math.max(1, frames); index += 1) {
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve())
      })
    }
  }, [])

  const resolveAnimatedExportViewportForJourney = useCallback((journey: JourneyModel): ViewportState | null => {
    const canvasPanel = canvasPanelRef.current
    if (!canvasPanel) {
      return null
    }
    const rect = canvasPanel.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) {
      return null
    }

    const visibleNodeIds = new Set(currentView.nodeIds)
    const relatedNodeIds = new Set<string>()
    for (const tick of resolveJourneyPlaybackTicks(journey)) {
      for (const tickStep of tick.steps) {
        const edge = workspace.edges[tickStep.edgeId]
        if (edge) {
          relatedNodeIds.add(edge.from.nodeId)
          relatedNodeIds.add(edge.to.nodeId)
        }
        for (const nodeId of tickStep.highlightNodes ?? []) {
          relatedNodeIds.add(nodeId)
        }
      }
    }

    const nodesForBounds = Array.from(relatedNodeIds)
      .filter((nodeId) => visibleNodeIds.has(nodeId))
      .map((nodeId) => workspace.nodes[nodeId])
      .filter((node): node is NonNullable<(typeof workspace.nodes)[string]> => !!node)

    if (!nodesForBounds.length) {
      return null
    }

    const minX = Math.min(...nodesForBounds.map((node) => node.bounds.x))
    const minY = Math.min(...nodesForBounds.map((node) => node.bounds.y))
    const maxX = Math.max(...nodesForBounds.map((node) => node.bounds.x + node.bounds.w))
    const maxY = Math.max(...nodesForBounds.map((node) => node.bounds.y + node.bounds.h))
    const boundsWidth = Math.max(1, maxX - minX)
    const boundsHeight = Math.max(1, maxY - minY)
    const padding = Math.max(68, Math.min(rect.width, rect.height) * 0.1)
    const availableWidth = Math.max(1, rect.width - padding * 2)
    const availableHeight = Math.max(1, rect.height - padding * 2)
    const zoom = Math.min(availableWidth / boundsWidth, availableHeight / boundsHeight)
    const clampedZoom = Math.max(0.35, Math.min(2.4, zoom))
    const centerX = minX + boundsWidth / 2
    const centerY = minY + boundsHeight / 2
    return {
      x: rect.width / 2 - centerX * clampedZoom,
      y: rect.height / 2 - centerY * clampedZoom,
      zoom: clampedZoom,
    }
  }, [currentView.nodeIds, workspace])

  type AnimatedCanvasExportAsset = {
    blob: Blob
    fileName: string
    successMessage: string
  }

  const renderAnimatedExportAsset = useCallback(
    async (format: 'gif' | 'mp4' | 'svg'): Promise<AnimatedCanvasExportAsset | null> => {
      if (animatedExportRunning) {
        return null
      }
      const svg = document.querySelector('.diagram-canvas')
      const trailCanvas = document.querySelector('.trail-canvas')
      if (!(svg instanceof SVGSVGElement) || !(trailCanvas instanceof HTMLCanvasElement)) {
        setExportError('Canvas not found for animated export.')
        return null
      }

      const journeyId = resolveCurrentExportJourneyId()
      if (!journeyId) {
        setExportError('Select a journey to export.')
        return null
      }
      const journey = workspace.journeys[journeyId]
      if (!journey || !journey.steps.length) {
        setExportError('The selected journey has no steps for animated export.')
        return null
      }
      const filenameBase = `${workspace.workspace.name}-${journey.name}`
      const normalizedFilenameBase = resolveAnimatedExportFilenameBase(filenameBase)
      const exportSpeedMs = resolveExportPlaybackSpeedMs(playerSpeedMs)
      const durationMs = resolveJourneyAnimationDurationMs(resolveJourneyPlaybackLength(journey), exportSpeedMs)
      const exportViewport = resolveAnimatedExportViewportForJourney(journey)
      const canvasRect = canvasPanelRef.current?.getBoundingClientRect()
      const rasterOutputDimensions =
        format === 'svg' || !canvasRect || canvasRect.width <= 0 || canvasRect.height <= 0
          ? undefined
          : resolveAnimatedExportRasterOutputDimensions(canvasRect.width, canvasRect.height)
      const snapshot: PlayerExportSnapshot = {
        playerJourneyId,
        playerStepIndex,
        playerIsRunning,
        playerLoop,
        playerSpeedMs,
        journeyFilterId,
        viewport: { ...viewport },
      }

      setExportError(null)
      setAnimatedExportRunning(true)
      setExportFocusJourneyId(journeyId)
      if (exportViewport) {
        setViewport(exportViewport)
      }
      await waitForCanvasFrames(3)

      if (format === 'svg') {
        try {
          setExportStatus('Generating animated SVG...')
          return {
            blob: createAnimatedJourneySvgBlob({
              svg,
              workspace,
              journey,
              playerSpeedMs: exportSpeedMs,
              filenameBase,
            }),
            fileName: `${normalizedFilenameBase}-animated.svg`,
            successMessage: 'Animated SVG exported.',
          }
        } catch (error) {
          setExportError(error instanceof Error ? error.message : 'Failed to export animated SVG.')
          return null
        } finally {
          setViewport(snapshot.viewport)
          setExportFocusJourneyId(null)
          setAnimatedExportRunning(false)
        }
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
          return {
            blob: await createAnimatedJourneyGifBlob({
              svg,
              trailCanvas,
              canvasPanel: canvasPanelRef.current,
              durationMs,
              resolveBaseKey,
              filenameBase,
              outputDimensions: rasterOutputDimensions,
            }),
            fileName: `${normalizedFilenameBase}.gif`,
            successMessage: 'Animated GIF exported.',
          }
        }

        setExportStatus('Recording journey video...')
        const video = await createAnimatedJourneyVideoBlob({
          svg,
          trailCanvas,
          canvasPanel: canvasPanelRef.current,
          durationMs,
          resolveBaseKey,
          filenameBase,
          outputDimensions: rasterOutputDimensions,
          preferredExtension: 'mp4',
          allowFallback: false,
        })
        return {
          blob: video.blob,
          fileName: `${normalizedFilenameBase}.${video.mime.extension}`,
          successMessage:
            video.mime.extension === 'mp4'
              ? 'MP4 video (mobile-compatible) exported.'
              : 'Video exported.',
        }
      } catch (error) {
        setExportError(error instanceof Error ? error.message : 'Failed to export animated journey.')
        return null
      } finally {
        restorePlayerAfterAnimatedExport(snapshot)
        setExportFocusJourneyId(null)
        setAnimatedExportRunning(false)
      }
    },
    [
      animatedExportRunning,
      journeyFilterId,
      playerIsRunning,
      playerJourneyId,
      playerLoop,
      playerSpeedMs,
      playerStepIndex,
      resetPlayer,
      setPlayerJourney,
      setPlayerLoop,
      setPlayerRunning,
      setPlayerSpeedMs,
      setViewport,
      resolveAnimatedExportViewportForJourney,
      resolveCurrentExportJourneyId,
      restorePlayerAfterAnimatedExport,
      waitForCanvasFrames,
      viewport,
      workspace,
    ],
  )

  const exportAnimatedFromCanvas = useCallback(
    async (format: 'gif' | 'mp4' | 'svg') => {
      const asset = await renderAnimatedExportAsset(format)
      if (!asset) {
        return
      }

      saveBlobAsFile(asset.blob, asset.fileName)
      const autoUploaded =
        format === 'gif' || format === 'mp4'
          ? await autoUploadExportedMediaToSupabaseGallery(
              asset.blob,
              asset.fileName,
              format === 'gif'
                ? `${workspace.workspace.name} Animated GIF`
                : `${workspace.workspace.name} Journey MP4`,
            )
          : false
      setExportStatus(
        autoUploaded
          ? format === 'gif'
            ? `Animated GIF exported and auto-uploaded to ${CLOUD_STATUS_LABEL} gallery.`
            : `MP4 exported and auto-uploaded to ${CLOUD_STATUS_LABEL} gallery.`
          : asset.successMessage,
      )
      window.setTimeout(() => setExportStatus(null), format === 'svg' ? 2800 : 3200)
    },
    [autoUploadExportedMediaToSupabaseGallery, renderAnimatedExportAsset, workspace.workspace.name],
  )

  const journeyTimelineContent = (
    <JourneyTimelinePanel
      activeJourney={activeJourney}
      rows={activeJourneyTimelineRows}
      edgesById={workspace.edges}
      playerJourneyId={playerJourneyId}
      playerStepIndex={playerStepIndex}
      playerJourneyPlaybackLength={playerJourneyPlaybackLength}
      onStepDragStart={onJourneyStepDragStart}
      onStepDrop={onJourneyStepDrop}
      onStepDragEnd={() => {
        journeyStepDragRef.current = null
      }}
      onRemoveStep={removeEdgeFromJourney}
      onIndentStep={onJourneyStepIndent}
      onOutdentStep={onJourneyThreadStepOutdent}
    />
  )

  const dslPanelContent = (
    <div className={`dsl-panel ${dslMaximized ? 'dsl-panel-maximized' : ''}`} data-tutorial-id="dsl-panel">
      <OverflowStrip
        className="dsl-toolbar-overflow"
        viewportClassName="dsl-toolbar-viewport"
        contentClassName="dsl-toolbar"
        navAriaLabel="SJV Script toolbar"
      >
        <strong>
          <span className="dsl-toolbar-label-long">{JOURNEY_SCRIPT_NAME}</span>
          <span className="dsl-toolbar-label-short">Script</span>
        </strong>
        <label className="dsl-sync-toggle" data-tutorial-id="dsl-sync-toggle">
          <input
            type="checkbox"
            checked={dslSyncEnabled}
            onChange={(event) => {
              const enabled = event.target.checked
              recordGuidedTutorialEvent('dsl-sync-toggle')
              setDslSyncEnabled(enabled)
              dslSyncLastAppliedTextRef.current = enabled ? dslText : null
              if (enabled) {
                setDslError(null)
              }
            }}
          />
          <span className="dsl-toolbar-label-long">Sync with editor</span>
          <span className="dsl-toolbar-label-short">Sync</span>
        </label>
        <button
          type="button"
          onClick={() => {
            setDslText(fullWorkspaceToLiteDsl(workspace))
            setDslError(null)
          }}
          title={withTooltip('Generate SJV Script from the current workspace state')}
        >
          <span className="dsl-toolbar-label-long">Export full workspace</span>
          <span className="dsl-toolbar-label-short">Export</span>
        </button>
        <button
          type="button"
          onClick={() => {
            try {
              const imported = resolveWorkspaceFromDslText(dslText)
              const nextWorkspace =
                imported.hasUiLayoutMetadata
                  ? imported.workspace
                  : preserveWorkspaceVisualStateForDslSync(imported.workspace, workspace)
              replaceWorkspace(nextWorkspace, imported.entryViewId)
              setDslError(null)
            } catch (error) {
              setDslError(error instanceof Error ? error.message : 'Failed to import SJV Script.')
            }
          }}
          disabled={dslSyncEnabled}
          title={withTooltip('Apply SJV Script content to the current workspace')}
        >
          <span className="dsl-toolbar-label-long">Import SJV Script</span>
          <span className="dsl-toolbar-label-short">Import</span>
        </button>
      </OverflowStrip>
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
          <ReactMarkdown>{SANITIZED_HELP_GUIDE_MARKDOWN}</ReactMarkdown>
        </>
      ) : null}
      {helpSection === 'gallery' ? (
        <div className="help-gallery">
          <p>
            Sample showcase scripts and animated exports are always available below. Sign in to save
            the samples into your {CLOUD_STATUS_LABEL} library, then add your own PNG/GIF/MP4 exports.
          </p>
          <div className="help-gallery-actions">
            <button
              type="button"
              disabled={!supabaseCloudReady || supabaseCloudBusy}
              onClick={() => openSupabaseGalleryPicker()}
            >
              Upload Local Media
            </button>
            <button
              type="button"
              disabled={!supabaseCloudReady || supabaseCloudBusy}
              onClick={() => {
                void seedDefaultShowcaseLibrary()
              }}
            >
              Seed Sample Library
            </button>
            <button
              type="button"
              disabled={!supabaseCloudReady || supabaseCloudBusy}
              onClick={() => {
                void refreshSupabaseCloudLibrary()
              }}
            >
              Refresh Library
            </button>
          </div>
          <p className="help-gallery-provider-status">
            {supabaseCloudConfigured
              ? supabaseCloudReady
                ? `Your private ${CLOUD_PROVIDER_LABEL} library is live below. Saved scripts are grouped beside your uploaded assets. Standard PNG/GIF/MP4 exports now auto-upload here after the local file is generated.`
                : `Sign in from Preferences or the ${CLOUD_PROVIDER_LABEL} panel to unlock your private library, previews, automatic upload, and sample seeding.`
              : CLOUD_NOT_CONFIGURED_STATUS}
          </p>
          <div className="help-gallery-sections">
            {DEFAULT_SHOWCASE_LIBRARY_SECTIONS.map((section) => (
              <section key={section.id} className="help-gallery-section">
                <div className="help-gallery-section-header">
                  <h3>{section.title}</h3>
                  <span className="help-gallery-section-badge">{section.items.length}</span>
                </div>
                <div className="help-gallery-grid">
                  {section.items.map((item) => (
                    <article key={item.id} className="help-gallery-card">
                      {renderDefaultShowcaseLibraryPreview(item)}
                      <div className="help-gallery-card-copy">
                        <h4 title={item.title}>{item.title}</h4>
                        <p>{item.description}</p>
                        <span className="help-gallery-card-meta">
                          {item.kind === 'script' ? 'SJV Script sample' : 'Animated SVG export'}
                        </span>
                      </div>
                      <div className="help-gallery-card-actions">
                        {item.kind === 'script' ? (
                          <button type="button" onClick={() => loadDefaultShowcaseScript(item)}>
                            Load
                          </button>
                        ) : (
                          <>
                            <a href={item.href} target="_blank" rel="noreferrer">
                              Open
                            </a>
                            <a href={item.href} download={item.fileName}>
                              Download
                            </a>
                          </>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
            {supabaseCloudReady && supabaseCloudLibrarySections.length ? (
              supabaseCloudLibrarySections.map((section) => (
                <section key={`cloud-${section.id}`} className="help-gallery-section">
                  <div className="help-gallery-section-header">
                    <h3>{CLOUD_PROVIDER_LABEL} {section.title}</h3>
                    <span className="help-gallery-section-badge">{section.items.length}</span>
                  </div>
                  <div className="help-gallery-grid">
                    {section.items.map((item) => (
                      <article key={`${item.kind}:${item.id}`} className="help-gallery-card">
                        {renderSupabaseCloudLibraryPreview(item)}
                        <div className="help-gallery-card-copy">
                          <h4 title={item.title}>{item.title}</h4>
                        </div>
                        <div className="help-gallery-card-actions">
                          {item.kind === 'script' ? (
                            <button
                              type="button"
                              disabled={supabaseCloudBusy}
                              onClick={() => {
                                void loadSelectedSupabaseCloudScript(item.script)
                              }}
                            >
                              Load
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                disabled={supabaseCloudBusy}
                                onClick={() => {
                                  void downloadSupabaseGalleryAsset(item.asset)
                                }}
                              >
                                Download
                              </button>
                              {isSupabaseGalleryAssetShareable(item.asset) ? (
                                <button
                                  type="button"
                                  disabled={supabaseCloudBusy}
                                  onClick={() => {
                                    void shareSupabaseGalleryAsset(item.asset)
                                  }}
                                >
                                  Share link
                                </button>
                              ) : null}
                            </>
                          )}
                          <button
                            type="button"
                            className="help-gallery-icon-button"
                            aria-label={`Delete ${item.title}`}
                            title={item.kind === 'script' ? `Delete script from ${CLOUD_PROVIDER_LABEL}` : `Delete media from ${CLOUD_PROVIDER_LABEL}`}
                            disabled={supabaseCloudBusy}
                            onClick={() => {
                              if (item.kind === 'script') {
                                void deleteSupabaseCloudScript(item.script)
                                return
                              }
                              void deleteSupabaseGalleryAsset(item.asset)
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))
            ) : null}
          </div>
          {supabaseCloudReady && !supabaseCloudLibrarySections.length ? (
            <p className="help-gallery-empty">
              No private library items yet. Seed the sample library, run a normal PNG/GIF/MP4 export,
              save an SJV Script, or upload local media here.
            </p>
          ) : null}
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
      <PanelGroup title="Experience">
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
        <label className="preferences-toggle">
          <input
            type="checkbox"
            checked={uiPreferences.nodeDepthEffectsEnabled}
            onChange={(event) =>
              setUiPreferences((current) => ({
                ...current,
                nodeDepthEffectsEnabled: event.target.checked,
              }))
            }
          />
          Enable node depth effects (3D look)
        </label>
        <label className="preferences-toggle">
          <input
            type="checkbox"
            checked={uiPreferences.minimapEnabled}
            onChange={(event) =>
              setUiPreferences((current) => ({
                ...current,
                minimapEnabled: event.target.checked,
              }))
            }
          />
          Show canvas minimap
        </label>
        <label className="preferences-toggle">
          <input
            type="checkbox"
            checked={uiPreferences.statusBarEnabled}
            onChange={(event) =>
              setUiPreferences((current) => ({
                ...current,
                statusBarEnabled: event.target.checked,
              }))
            }
          />
          Show status bar
        </label>
        <label className="preferences-toggle">
          <input
            type="checkbox"
            checked={uiPreferences.performanceModeEnabled}
            onChange={(event) =>
              setUiPreferences((current) => ({
                ...current,
                performanceModeEnabled: event.target.checked,
              }))
            }
          />
          Performance mode
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
        <label className="preferences-select">
          UI density
          <select
            value={uiPreferences.density}
            onChange={(event) =>
              setUiPreferences((current) => ({
                ...current,
                density: event.target.value as UiDensity,
              }))
            }
          >
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
          </select>
        </label>
      </PanelGroup>
      <PanelGroup title="Appearance">
        <label className="preferences-select">
          UI font size
          <select
            value={uiPreferences.fontScale}
            onChange={(event) =>
              setUiFontScalePreference(event.target.value as UiFontScale)
            }
          >
            <option value="small">Small</option>
            <option value="normal">Normal</option>
            <option value="large">Large</option>
          </select>
        </label>
        <label className="preferences-select">
          Icon set
          <select
            value={uiPreferences.iconSet}
            onChange={(event) =>
              setUiPreferences((current) => ({
                ...current,
                iconSet: event.target.value as typeof current.iconSet,
              }))
            }
          >
            {APP_ICON_SET_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="preferences-theme-grid" role="list" aria-label="Chrome color themes">
          {CHROME_THEME_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              role="listitem"
              className={
                uiPreferences.chromeThemeId === preset.id
                  ? 'preferences-theme-card preferences-theme-card-active'
                  : 'preferences-theme-card'
              }
              onClick={() => setChromeThemePreference(preset.id)}
              title={withTooltip(preset.description)}
            >
              <span className="preferences-theme-swatches" aria-hidden="true">
                <span style={{ background: preset.colors.shellBackground }} />
                <span style={{ background: preset.colors.panelBackground }} />
                <span style={{ background: preset.colors.accentColor }} />
              </span>
              <span className="preferences-theme-copy">
                <strong>{preset.label}</strong>
                <span>{preset.description}</span>
              </span>
            </button>
          ))}
          <button
            type="button"
            role="listitem"
            className={
              uiPreferences.chromeThemeId === 'custom'
                ? 'preferences-theme-card preferences-theme-card-active'
                : 'preferences-theme-card'
            }
            onClick={() => setChromeThemePreference('custom')}
          >
            <span className="preferences-theme-swatches" aria-hidden="true">
              <span style={{ background: uiPreferences.customChromeColors.shellBackground }} />
              <span style={{ background: uiPreferences.customChromeColors.panelBackground }} />
              <span style={{ background: uiPreferences.customChromeColors.accentColor }} />
            </span>
            <span className="preferences-theme-copy">
              <strong>Custom</strong>
              <span>Edit the chrome color tokens below.</span>
            </span>
          </button>
        </div>
        <fieldset className="preferences-fieldset preferences-color-fieldset">
          <legend>Custom chrome colors</legend>
          <div className="preferences-color-grid">
            {CUSTOM_CHROME_COLOR_FIELDS.map((field) => (
              <label key={field.key} className="preferences-color-control">
                <span>{field.label}</span>
                <input
                  type="color"
                  value={uiPreferences.customChromeColors[field.key]}
                  onChange={(event) => updateCustomChromeColor(field.key, event.target.value)}
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            className="preferences-inline-action"
            onClick={() =>
              setUiPreferences((current) => ({
                ...current,
                chromeThemeId: 'custom',
                customChromeColors: DEFAULT_CUSTOM_CHROME_COLORS,
              }))
            }
          >
            Reset custom colors
          </button>
        </fieldset>
        <fieldset className="preferences-fieldset preferences-color-fieldset">
          <legend>Canvas color</legend>
          <div className="preferences-canvas-background-grid" role="list" aria-label="Canvas background presets">
            {CANVAS_BACKGROUND_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                role="listitem"
                className={
                  uiPreferences.canvasBackgroundPresetId === preset.id
                    ? 'preferences-canvas-background-card preferences-canvas-background-card-active'
                    : 'preferences-canvas-background-card'
                }
                onClick={() => setCanvasBackgroundPresetPreference(preset.id)}
              >
                <span
                  className="preferences-canvas-background-swatch"
                  style={{ background: preset.color }}
                  aria-hidden="true"
                />
                <span>{preset.label}</span>
              </button>
            ))}
            <button
              type="button"
              role="listitem"
              className={
                uiPreferences.canvasBackgroundPresetId === 'custom'
                  ? 'preferences-canvas-background-card preferences-canvas-background-card-active'
                  : 'preferences-canvas-background-card'
              }
              onClick={() => setCanvasBackgroundPresetPreference('custom')}
            >
              <span
                className="preferences-canvas-background-swatch"
                style={{ background: uiPreferences.customCanvasBackground }}
                aria-hidden="true"
              />
              <span>Custom</span>
            </button>
          </div>
          <label className="preferences-color-control">
            <span>Custom canvas</span>
            <input
              type="color"
              value={uiPreferences.customCanvasBackground}
              onChange={(event) => updateCustomCanvasBackground(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="preferences-inline-action"
            onClick={() =>
              setUiPreferences((current) => ({
                ...current,
                canvasBackgroundPresetId: 'soft-grid',
                customCanvasBackground: DEFAULT_CUSTOM_CANVAS_BACKGROUND,
              }))
            }
          >
            Reset canvas color
          </button>
        </fieldset>
      </PanelGroup>
      <PanelGroup title="Toolbar sections">
        <label className="preferences-toggle">
          <input
            type="checkbox"
            checked={uiPreferences.menuBarVisible}
            onChange={(event) =>
              setUiPreferences((current) => ({
                ...current,
                menuBarVisible: event.target.checked,
              }))
            }
          />
          Show main menu
        </label>
        <label className="preferences-toggle">
          <input
            type="checkbox"
            checked={uiPreferences.toolbarInlineWithBrand}
            onChange={(event) =>
              setUiPreferences((current) => ({
                ...current,
                toolbarInlineWithBrand: event.target.checked,
              }))
            }
          />
          Place toolbar beside app icon
        </label>
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
      </PanelGroup>
      <PanelGroup title={CLOUD_PROVIDER_LABEL} defaultExpanded={false}>
        <p className="preferences-status">Use this panel for sign-in, gallery access, and automatic upload after standard PNG/GIF/MP4 exports.</p>
        <p className="preferences-status">Provider URL: {workspaceCloudDatabaseUrl}</p>
        <p className="preferences-status">{supabaseCloudStatus}</p>
        <p className="preferences-status">Current workspace id: {workspace.workspace.id}</p>
        <p className="preferences-status">
          Active cloud script target: {activeSupabaseScriptWorkspaceId ?? 'none selected'}
        </p>
        <p className="preferences-status">
          Load Saved SJV Script opens the clickable script list in the cloud panel.
        </p>
        <label className="preferences-select">
          Account email
          <input
            type="email"
            value={supabaseAuthDraft.email}
            onChange={(event) =>
              setSupabaseAuthDraft((current) => ({
                ...current,
                email: event.target.value,
              }))
            }
            placeholder="tester@example.com"
            autoComplete="email"
          />
        </label>
        <label className="preferences-select">
          Password
          <input
            type="password"
            value={supabaseAuthDraft.password}
            onChange={(event) =>
              setSupabaseAuthDraft((current) => ({
                ...current,
                password: event.target.value,
              }))
            }
            placeholder="Provider password"
            autoComplete="current-password"
          />
        </label>
        <div className="preferences-inline-actions">
          <button
            type="button"
            className="preferences-inline-action"
            disabled={!supabaseCloudConfigured || supabaseCloudBusy}
            onClick={() => {
              void signInToSupabaseCloud()
            }}
          >
            {supabaseCloudBusy ? 'Working...' : 'Sign In'}
          </button>
          <button
            type="button"
            className="preferences-inline-action"
            disabled={!supabaseCloudConfigured || !supabaseCloudUser || supabaseCloudBusy}
            onClick={() => {
              void signOutOfSupabaseCloud()
            }}
          >
            Sign Out
          </button>
        </div>
        <div className="preferences-inline-actions">
          <button
            type="button"
            className="preferences-inline-action"
            disabled={!supabaseCloudConfigured || !supabaseCloudUser || supabaseCloudBusy}
            onClick={() => {
              void saveWorkspaceToSupabaseCloud()
            }}
          >
            Save Workspace to Cloud
          </button>
          <button
            type="button"
            className="preferences-inline-action"
            disabled={!supabaseCloudConfigured || !supabaseCloudUser || supabaseCloudBusy}
            onClick={() => {
              void loadWorkspaceFromSupabaseCloud()
            }}
          >
            Load Workspace from Cloud
          </button>
        </div>
        <div className="preferences-inline-actions">
          <button
            type="button"
            className="preferences-inline-action"
            disabled={!supabaseCloudConfigured || !supabaseCloudUser || supabaseCloudBusy}
            onClick={() => {
              void saveScriptToSupabaseCloud()
            }}
          >
            Save Generated SJV Script
          </button>
          <button
            type="button"
            className="preferences-inline-action"
            disabled={!supabaseCloudConfigured || !supabaseCloudUser || supabaseCloudBusy}
            onClick={() => {
              void loadScriptFromSupabaseCloud()
            }}
          >
            Load Saved SJV Script
          </button>
        </div>
        <p className="preferences-status">
          Upload local PNG, GIF, or MP4 files to the private `{SUPABASE_GALLERY_BUCKET}` bucket.
        </p>
        <div className="preferences-inline-actions">
          <button
            type="button"
            className="preferences-inline-action"
            disabled={!supabaseCloudConfigured || !supabaseCloudUser || supabaseCloudBusy}
            onClick={() => openSupabaseGalleryPicker()}
          >
            Upload File to Gallery
          </button>
          <button
            type="button"
            className="preferences-inline-action"
            disabled={!supabaseCloudConfigured || !supabaseCloudUser || supabaseCloudBusy}
            onClick={() => {
              void refreshSupabaseGalleryAssets().catch(() => undefined)
            }}
          >
            Refresh Gallery List
          </button>
        </div>
        <div className="preferences-gallery-list">
          {supabaseGalleryAssets.length ? (
            supabaseGalleryAssets.map((asset) => (
              <div key={asset.id} className="preferences-gallery-item">
                <div className="preferences-gallery-copy">
                  <strong>{asset.title}</strong>
                  <span>{asset.fileName}</span>
                  <span>
                    {asset.contentType} · {formatBytesLabel(asset.sizeBytes)}
                  </span>
                </div>
                <button
                  type="button"
                  className="preferences-inline-action"
                  disabled={supabaseCloudBusy}
                  onClick={() => {
                    void downloadSupabaseGalleryAsset(asset)
                  }}
                >
                  Download
                </button>
              </div>
            ))
          ) : (
            <p className="preferences-status">No gallery assets yet.</p>
          )}
        </div>
      </PanelGroup>
    </div>
  )

  const palettePanelContent = (
    <PalettePanel
      categories={MIXED_PALETTE_CATEGORIES}
      description="Drag components into the canvas or drop technology icons onto nodes."
      renderPresetIcon={(preset) =>
        preset.dragMimeType === TECH_ICON_DRAG_MIME_TYPE ? (
          <TechIconGlyph iconId={preset.id} size={18} className="palette-tech-icon-glyph" />
        ) : (
          <PresetIcon iconKey={preset.iconKey} iconSet={uiPreferences.iconSet} size={16} />
        )
      }
    />
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
    palette: renderAppIcon('panel-left-open'),
    inspector: renderAppIcon('sliders'),
    journeys: renderAppIcon('workflow'),
    timeline: renderAppIcon('list-ordered'),
    dsl: renderAppIcon('code'),
    help: renderAppIcon('help'),
    preferences: renderAppIcon('sliders'),
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
    <InspectorPanel
      selectedNode={selectedNode ?? null}
      selectedEdge={selectedEdge ?? null}
      selectedNodeCount={selectedNodes.length}
      selectedNodePresetLabel={
        selectedNode ? resolveNodePreset(selectedNode.presetId ?? '')?.label ?? 'Custom' : 'Custom'
      }
      theme={theme}
      nodeColorPresets={nodeColorPresets}
      nodeTextColorPresets={nodeTextColorPresets}
      protocolOptions={protocolPresets}
      activeJourneyId={activeJourneyId}
      getTooltip={withTooltip}
      onNodeNameChange={setNodeNameWithTutorialTracking}
      onNodeTechChange={setNodeTech}
      onNodeColorChange={setNodeColor}
      onNodeTextColorChange={setNodeTextColor}
      onEdgeLabelChange={setEdgeLabelWithTutorialTracking}
      onEdgeProtocolChange={setEdgeProtocolWithTutorialTracking}
      onEdgeLabelPositionChange={setEdgeLabelPosition}
      onEdgeLabelSideChange={setEdgeLabelSide}
      onEdgeLabelAngleChange={setEdgeLabelAngle}
      onDuplicateSelection={duplicateCurrentSelection}
      onDeleteSelection={deleteCurrentSelection}
      onNodeDrilldown={runNodeDrilldownAction}
      onAddEdgeToActiveJourney={(edgeId) => {
        if (activeJourneyId) {
          addEdgeToJourney(activeJourneyId, edgeId)
        }
      }}
    />
  )

  const journeysDockContent = (
    <div className="dock-content-section">
      <h2>Journeys</h2>
      <PanelGroup title="Creation" defaultExpanded={false} className="journey-side-group">
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
      </PanelGroup>
      <PanelGroup title="Filter & Layout" defaultExpanded={false} className="journey-side-group">
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
      </PanelGroup>
      <PanelGroup title="Player" defaultExpanded={false} className="journey-side-group">
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
            Step {playerStepIndex + 1}/{playerJourneyPlaybackLength}
          </span>
        </div>
      </PanelGroup>
      <PanelGroup title="Journeys" defaultExpanded className="journey-side-group">
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
                className="journey-filter-button"
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
      </PanelGroup>
    </div>
  )

  const dockHeaderBar = legacyDockShellAvailable ? (
    <div className="topbar-dock-strip topbar-dock-placement-strip" data-tutorial-id="panel-shortcuts-strip">
      <div className="dock-placement-actions">
        <button
          type="button"
          className={dockPosition === 'left' ? 'dock-placement dock-placement-active' : 'dock-placement'}
          onClick={() => moveDockToLeft()}
          title={withTooltip('Dock left')}
          aria-label="Dock left"
        >
          {renderAppIcon('panel-left-open', 14)}
        </button>
        <button
          type="button"
          className={dockPosition === 'right' ? 'dock-placement dock-placement-active' : 'dock-placement'}
          onClick={() => moveDockToRight()}
          title={withTooltip('Dock right')}
          aria-label="Dock right"
        >
          {renderAppIcon('panel-right-open', 14)}
        </button>
        <button
          type="button"
          className={dockPosition === 'bottom' ? 'dock-placement dock-placement-active' : 'dock-placement'}
          onClick={() => moveDockToBottom()}
          title={withTooltip('Dock bottom')}
          aria-label="Dock bottom"
        >
          {renderAppIcon('panel-bottom-open', 14)}
        </button>
        <button
          type="button"
          className={dockPosition === 'floating' ? 'dock-placement dock-placement-active' : 'dock-placement'}
          onClick={() => moveDockToFloating()}
          title={withTooltip('Floating dock')}
          aria-label="Floating dock"
        >
          {renderAppIcon('dock', 14)}
        </button>
      </div>
    </div>
  ) : null

  const currentManagedDockHostId: ManagedWindowDockHostId | null =
    legacyDockShellAvailable && (dockPosition === 'left' || dockPosition === 'right' || dockPosition === 'bottom')
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
          {renderAppIcon('panel-left-open', 14)}
        </button>
        <button
          type="button"
          className={hostId === 'right' ? 'dock-placement dock-placement-active' : 'dock-placement'}
          onClick={() => dockManagedWindowToHost(activeWindowId, 'right')}
          title={withTooltip(`Dock ${dockLabelByTab[activeWindowId]} right`)}
          aria-label={`Dock ${dockLabelByTab[activeWindowId]} right`}
        >
          {renderAppIcon('panel-right-open', 14)}
        </button>
        <button
          type="button"
          className={hostId === 'bottom' ? 'dock-placement dock-placement-active' : 'dock-placement'}
          onClick={() => dockManagedWindowToHost(activeWindowId, 'bottom')}
          title={withTooltip(`Dock ${dockLabelByTab[activeWindowId]} bottom`)}
          aria-label={`Dock ${dockLabelByTab[activeWindowId]} bottom`}
        >
          {renderAppIcon('panel-bottom-open', 14)}
        </button>
        <button
          type="button"
          className="dock-placement"
          onClick={() => floatManagedDockHostWindow(hostId, activeWindowId)}
          title={withTooltip(`Float ${dockLabelByTab[activeWindowId]}`)}
          aria-label={`Float ${dockLabelByTab[activeWindowId]}`}
        >
          {renderAppIcon('dock', 14)}
        </button>
        <button
          type="button"
          className="dock-placement"
          onClick={() => closeManagedDockHostWindow(hostId, activeWindowId)}
          title={withTooltip(`Close ${dockLabelByTab[activeWindowId]}`)}
          aria-label={`Close ${dockLabelByTab[activeWindowId]}`}
        >
          {renderAppIcon('close', 14)}
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
            onTabReorder={(sourceWindowId, targetWindowId) =>
              reorderManagedDockHostTabs(hostId, sourceWindowId, targetWindowId)}
            renderTabPanel={renderManagedWindowDockContent}
            headerActions={buildManagedDockHostHeaderActions(hostId, activeTabId)}
            onHeaderTearOff={activeTabId ? () => floatManagedDockHostWindow(hostId, activeTabId) : undefined}
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
      onTabReorder={(sourceWindowId, targetWindowId) =>
        reorderManagedDockHostTabs(currentManagedDockHostId, sourceWindowId, targetWindowId)}
      renderTabPanel={renderManagedWindowDockContent}
      headerActions={buildManagedDockHostHeaderActions(currentManagedDockHostId, managedDockActiveTab)}
      onHeaderTearOff={
        managedDockActiveTab
          ? () => floatManagedDockHostWindow(currentManagedDockHostId, managedDockActiveTab)
          : undefined
      }
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
        {renderAppIcon('dock', 14)}
      </button>
      <button
        type="button"
        className="dock-placement"
        onClick={() => dockManagedWindowToHost(windowId, 'left')}
        title={withTooltip('Dock left')}
        aria-label="Dock left"
      >
        {renderAppIcon('panel-left-open', 14)}
      </button>
      <button
        type="button"
        className="dock-placement"
        onClick={() => dockManagedWindowToHost(windowId, 'right')}
        title={withTooltip('Dock right')}
        aria-label="Dock right"
      >
        {renderAppIcon('panel-right-open', 14)}
      </button>
      <button
        type="button"
        className="dock-placement"
        onClick={() => dockManagedWindowToHost(windowId, 'bottom')}
        title={withTooltip('Dock bottom')}
        aria-label="Dock bottom"
      >
        {renderAppIcon('panel-bottom-open', 14)}
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

  const handleCanvasEdgePointerStart = (
    edgeId: string,
    event: ReactPointerEvent<SVGGElement>,
  ) => {
    if (
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      activeTool !== 'select' ||
      Boolean(pendingConnectionFrom)
    ) {
      setDraggedEdgeId(null)
      return
    }
    setDraggedEdgeId(edgeId)
  }

  const selectionStatusLabel = selectedEdge
    ? `Edge: ${selectedEdge.label || selectedEdge.id}`
    : selectedNodes.length > 1
      ? `${selectedNodes.length} nodes selected`
      : selectedNode
        ? `Node: ${selectedNode.name}`
        : 'Ready'
  const activeToolLabel = resolveActiveToolLabel(activeTool)
  const statusBarItems: StatusBarItem[] = [
    {
      id: 'view',
      label: currentView.name,
      title: currentView.name,
      priority: 'primary',
    },
    {
      id: 'view-kind',
      label: currentViewModeLabel,
    },
    {
      id: 'zoom',
      label: `${Math.round(viewport.zoom * 100)}%`,
      title: 'Current canvas zoom',
    },
    {
      id: 'entities',
      label: `${currentView.nodeIds.length} nodes / ${currentView.edgeIds.length} edges`,
    },
    {
      id: 'selection',
      label: selectionStatusLabel,
      title: selectionStatusLabel,
    },
    ...(activeJourney
      ? [
          {
            id: 'journey',
            label: `Journey: ${activeJourney.name}`,
            title: activeJourney.name,
          } satisfies StatusBarItem,
        ]
      : []),
    {
      id: 'tool',
      label: `Tool: ${activeToolLabel}`,
    },
    {
      id: 'player',
      label: `Player: ${playerModeLabel}`,
    },
  ]
  const statusBarActions: StatusBarAction[] = [
    {
      id: 'palette',
      label: 'Palette',
      icon: renderAppIcon('panel-left-open', 12),
      active: paletteWindowOpen,
      title: withTooltip(paletteWindowOpen ? 'Palette is open' : 'Open palette panel'),
      onClick: () => openManagedDockedWindowFromDockTab('palette'),
    },
    {
      id: 'tool',
      label: activeToolLabel,
      icon: isFreeformShapeTool(activeTool)
        ? renderBasicShapeToolbarIcon(activeTool, 12)
        : activeTool === 'connector'
          ? renderAppIcon('link', 12)
          : renderAppIcon('pointer', 12),
      active: activeTool !== 'select',
      title: withTooltip(activeTool === 'select' ? 'Switch to connector tool' : 'Switch to select tool'),
      onClick: () => setActiveTool(activeTool === 'select' ? 'connector' : 'select'),
    },
    {
      id: 'fit',
      label: 'Fit',
      icon: renderAppIcon('target', 12),
      title: withTooltip('Fit view to canvas'),
      onClick: () => fitCurrentViewToCanvas(),
    },
    {
      id: 'grid',
      label: 'Grid',
      icon: renderAppIcon('grid', 12),
      active: gridEnabled,
      title: withTooltip(gridEnabled ? 'Hide grid' : 'Show grid'),
      onClick: () => setGridEnabled(!gridEnabled),
    },
    {
      id: 'snap',
      label: 'Snap',
      icon: renderAppIcon('magnet', 12),
      active: snapEnabled,
      title: withTooltip(snapEnabled ? 'Disable snap' : 'Enable snap'),
      onClick: () => setSnapEnabled(!snapEnabled),
    },
    {
      id: 'minimap',
      label: 'Minimap',
      icon: renderAppIcon('grid', 12),
      active: uiPreferences.minimapEnabled,
      title: withTooltip(uiPreferences.minimapEnabled ? 'Hide minimap' : 'Show minimap'),
      onClick: () =>
        setUiPreferences((current) => ({
          ...current,
          minimapEnabled: !current.minimapEnabled,
        })),
    },
    {
      id: 'performance',
      label: 'Performance',
      icon: renderAppIcon('sparkles', 12),
      active: uiPreferences.performanceModeEnabled,
      title: withTooltip(
        uiPreferences.performanceModeEnabled ? 'Disable performance mode' : 'Enable performance mode',
      ),
      onClick: () =>
        setUiPreferences((current) => ({
          ...current,
          performanceModeEnabled: !current.performanceModeEnabled,
        })),
    },
    {
      id: 'search',
      label: 'Search',
      icon: renderAppIcon('search', 12),
      title: withTooltip('Open command palette'),
      onClick: () => openCommandPalette(),
    },
    {
      id: 'hide-status',
      label: 'Hide',
      icon: renderAppIcon('panel-bottom-close', 12),
      title: withTooltip('Hide status bar'),
      onClick: () =>
        setUiPreferences((current) => ({
          ...current,
          statusBarEnabled: false,
        })),
    },
  ]

  const mobileDockTabs: DockTab[] = ['palette', 'inspector', 'journeys', 'timeline', 'dsl', 'help', 'preferences']
  const mobileDockTabLabel: Record<DockTab, string> = {
    palette: 'Palette',
    inspector: 'Inspect',
    journeys: 'Journeys',
    timeline: 'Steps',
    dsl: 'Script',
    help: 'Help',
    preferences: 'Prefs',
  }
  const cloudPanelControl = (
    <div ref={topbarCloudShellRef} className="topbar-cloud-shell topbar-cloud-shell-floating">
      {supabaseCloudPanelOpen ? (
        <div className="topbar-cloud-panel" role="dialog" aria-label={`${CLOUD_PROVIDER_LABEL} panel`}>
          <div className="topbar-cloud-panel-header">
            <strong>{CLOUD_PROVIDER_LABEL}</strong>
            <button
              type="button"
              onClick={() => {
                setSupabaseCloudPanelOpen(false)
                setSupabaseCloudScriptPickerOpen(false)
                setSupabaseCloudScriptSearch('')
              }}
            >
              Close
            </button>
          </div>
          <p className="topbar-cloud-status">{supabaseCloudStatus}</p>
          {!supabaseCloudConfigured ? (
            <p className="topbar-cloud-hint">{SUPABASE_PUBLIC_ENV_HINT}</p>
          ) : supabaseCloudUser ? (
            <>
              <p className="topbar-cloud-hint">
                Standard PNG/GIF/MP4 exports now auto-upload here after the local file is generated.
              </p>
              <div className="topbar-cloud-command-grid">
                <section className="topbar-cloud-command-card">
                  <span className="topbar-cloud-command-label">Workspace Snapshot</span>
                  <div className="topbar-cloud-command-buttons">
                    <button
                      type="button"
                      aria-label={`Save workspace snapshot to ${CLOUD_PROVIDER_LABEL}`}
                      disabled={supabaseCloudBusy}
                      onClick={() => {
                        void saveWorkspaceToSupabaseCloud()
                      }}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      aria-label={`Load workspace snapshot from ${CLOUD_PROVIDER_LABEL}`}
                      disabled={supabaseCloudBusy}
                      onClick={() => {
                        void loadWorkspaceFromSupabaseCloud()
                      }}
                    >
                      Load
                    </button>
                  </div>
                </section>
                <section className="topbar-cloud-command-card">
                  <span className="topbar-cloud-command-label">SJV Script</span>
                  <div className="topbar-cloud-command-buttons">
                    <button
                      type="button"
                      aria-label={`Save script to ${CLOUD_PROVIDER_LABEL}`}
                      disabled={supabaseCloudBusy}
                      onClick={() => {
                        void saveScriptToSupabaseCloud()
                      }}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      aria-label={`Load script from ${CLOUD_PROVIDER_LABEL}`}
                      disabled={supabaseCloudBusy}
                      onClick={() => {
                        void loadScriptFromSupabaseCloud()
                      }}
                    >
                      Load
                    </button>
                  </div>
                </section>
              </div>
              {supabaseCloudScriptPickerOpen ? (
                <div className="topbar-cloud-script-picker">
                  <p className="topbar-cloud-section-title">Saved cloud scripts</p>
                  {supabaseCloudScripts.length ? (
                    <label className="topbar-cloud-script-search">
                      <span className="topbar-cloud-script-search-label">Filter scripts</span>
                      <input
                        type="search"
                        value={supabaseCloudScriptSearch}
                        onChange={(event) => setSupabaseCloudScriptSearch(event.target.value)}
                        placeholder="Search by title or workspace id"
                        autoComplete="off"
                      />
                    </label>
                  ) : null}
                  {supabaseCloudScripts.length ? (
                    <p className="topbar-cloud-script-summary">
                      {`Showing ${filteredSupabaseCloudScripts.length} of ${supabaseCloudScripts.length} saved scripts.`}
                    </p>
                  ) : null}
                  {supabaseCloudScripts.length ? (
                    filteredSupabaseCloudScripts.length ? (
                      <div className="topbar-cloud-script-list" aria-label="Saved Supabase SJV Scripts">
                        {filteredSupabaseCloudScripts.map((script) => {
                          const isActiveTarget = activeSupabaseScriptWorkspaceId === script.workspaceId
                          return (
                            <div
                              key={script.workspaceId}
                              className={
                                isActiveTarget
                                  ? 'topbar-cloud-script-row-shell topbar-cloud-script-row-active'
                                  : 'topbar-cloud-script-row-shell'
                              }
                            >
                              <button
                                type="button"
                                className="topbar-cloud-script-row"
                                disabled={supabaseCloudBusy}
                                onClick={() => {
                                  void loadSelectedSupabaseCloudScript(script)
                                }}
                              >
                                <span className="topbar-cloud-script-row-copy">
                                  <span className="topbar-cloud-script-row-chip">
                                    {renderAppIcon('code', 12)}
                                    Script
                                  </span>
                                  <strong>{script.title}</strong>
                                  <span className="topbar-cloud-script-row-meta">
                                    Updated {formatSupabaseCloudScriptUpdatedAt(script.updatedAt)}
                                  </span>
                                </span>
                                {isActiveTarget ? (
                                  <span className="topbar-cloud-script-row-badge">Active save target</span>
                                ) : null}
                              </button>
                              <button
                                type="button"
                                className="topbar-cloud-script-row-delete"
                                aria-label={`Delete ${script.title}`}
                                title={`Delete script from ${CLOUD_PROVIDER_LABEL}`}
                                disabled={supabaseCloudBusy}
                                onClick={() => {
                                  void deleteSupabaseCloudScript(script)
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="topbar-cloud-hint">No saved scripts match this filter.</p>
                    )
                  ) : (
                    <p className="topbar-cloud-hint">No saved cloud scripts yet. Use Save script first.</p>
                  )}
                </div>
              ) : null}
              <div className="topbar-cloud-actions topbar-cloud-actions-secondary">
                <button
                  type="button"
                  disabled={supabaseCloudBusy}
                  onClick={() => openSupabaseGalleryPicker()}
                >
                  Upload local
                </button>
                <button
                  type="button"
                  disabled={supabaseCloudBusy}
                  onClick={() => {
                    void refreshSupabaseCloudLibrary()
                  }}
                >
                  Refresh
                </button>
                <button
                  type="button"
                  disabled={supabaseCloudBusy}
                  onClick={() => openSupabaseGalleryWindow()}
                >
                  Open gallery
                </button>
                <button
                  type="button"
                  disabled={supabaseCloudBusy}
                  onClick={() => {
                    void signOutOfSupabaseCloud()
                  }}
                >
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <div className="topbar-cloud-form">
              <label className="topbar-cloud-field">
                Email
                <input
                  type="email"
                  value={supabaseAuthDraft.email}
                  onChange={(event) =>
                    setSupabaseAuthDraft((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  placeholder="tester@example.com"
                  autoComplete="email"
                />
              </label>
              <label className="topbar-cloud-field">
                Password
                <input
                  type="password"
                  value={supabaseAuthDraft.password}
                  onChange={(event) =>
                    setSupabaseAuthDraft((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  placeholder="Provider password"
                  autoComplete="current-password"
                />
              </label>
              <div className="topbar-cloud-actions topbar-cloud-actions-secondary">
                <button
                  type="button"
                  disabled={supabaseCloudBusy}
                  onClick={() => {
                    void signInToSupabaseCloud()
                  }}
                >
                  {supabaseCloudBusy ? 'Working...' : 'Sign in'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSupabaseCloudPanelOpen(false)
                    setSupabaseCloudScriptPickerOpen(false)
                    setSupabaseCloudScriptSearch('')
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
  const appLogoGlyph = (
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
  )
  const compactInlineTopbar = !presentationMode && !uiPreferences.menuBarVisible
  const topbarToolbarInline = compactInlineTopbar || uiPreferences.toolbarInlineWithBrand

  const commandPaletteItems: CommandPaletteActionItem[] = commandPaletteOpen ? (() => {
    const items: CommandPaletteActionItem[] = [
      {
        id: 'command:fit-view',
        title: 'Fit View to Canvas',
        section: 'Commands',
        subtitle: 'Center the current diagram in the viewport',
        shortcut: 'Shift+1',
        keywords: ['zoom', 'frame', 'overview'],
        run: () => fitCurrentViewToCanvas(),
      },
      {
        id: 'command:auto-arrange',
        title: 'Auto Arrange Current View',
        section: 'Commands',
        subtitle: 'Run the built-in layout engine on this view',
        shortcut: 'Ctrl+Shift+L',
        keywords: ['layout', 'organize', 'dagre'],
        run: () => runAutoArrange(),
      },
      {
        id: 'command:select-tool',
        title: 'Select Tool',
        section: 'Commands',
        shortcut: 'V',
        keywords: ['pointer', 'move'],
        run: () => setActiveTool('select'),
      },
      {
        id: 'command:connector-tool',
        title: 'Connector Tool',
        section: 'Commands',
        shortcut: 'C',
        keywords: ['edge', 'link', 'wire'],
        run: () => setActiveTool('connector'),
      },
      {
        id: 'command:toggle-grid',
        title: gridEnabled ? 'Hide Grid' : 'Show Grid',
        section: 'Commands',
        keywords: ['canvas', 'background'],
        run: () => setGridEnabled(!gridEnabled),
      },
      {
        id: 'command:toggle-snap',
        title: snapEnabled ? 'Disable Snap' : 'Enable Snap',
        section: 'Commands',
        keywords: ['magnet', 'alignment'],
        run: () => setSnapEnabled(!snapEnabled),
      },
      {
        id: 'command:toggle-theme',
        title: theme === 'dark' ? 'Use Light Theme' : 'Use Dark Theme',
        section: 'Commands',
        keywords: ['appearance', 'color'],
        run: () => applyWorkspaceTheme(theme === 'dark' ? 'light' : 'dark'),
      },
      {
        id: 'command:toggle-minimap',
        title: uiPreferences.minimapEnabled ? 'Hide Minimap' : 'Show Minimap',
        section: 'Commands',
        keywords: ['overview', 'map', 'navigation'],
        run: () =>
          setUiPreferences((current) => ({
            ...current,
            minimapEnabled: !current.minimapEnabled,
          })),
      },
      {
        id: 'command:toggle-status-bar',
        title: uiPreferences.statusBarEnabled ? 'Hide Status Bar' : 'Show Status Bar',
        section: 'Commands',
        keywords: ['status', 'bar', 'chrome', 'footer'],
        run: () =>
          setUiPreferences((current) => ({
            ...current,
            statusBarEnabled: !current.statusBarEnabled,
          })),
      },
      {
        id: 'command:toggle-main-menu',
        title: uiPreferences.menuBarVisible ? 'Hide Main Menu' : 'Show Main Menu',
        section: 'Commands',
        keywords: ['menu', 'menubar', 'topbar', 'chrome'],
        run: () =>
          setUiPreferences((current) => ({
            ...current,
            menuBarVisible: !current.menuBarVisible,
          })),
      },
      {
        id: 'command:toggle-inline-toolbar',
        title: uiPreferences.toolbarInlineWithBrand ? 'Stack Toolbar Below Topbar' : 'Place Toolbar Beside App Icon',
        section: 'Commands',
        keywords: ['toolbar', 'compact', 'topbar', 'chrome'],
        run: () =>
          setUiPreferences((current) => ({
            ...current,
            toolbarInlineWithBrand: !current.toolbarInlineWithBrand,
          })),
      },
      {
        id: 'command:toggle-performance-mode',
        title: uiPreferences.performanceModeEnabled ? 'Disable Performance Mode' : 'Enable Performance Mode',
        section: 'Commands',
        keywords: ['motion', 'fast', 'lightweight'],
        run: () =>
          setUiPreferences((current) => ({
            ...current,
            performanceModeEnabled: !current.performanceModeEnabled,
          })),
      },
      {
        id: 'command:focus-mode',
        title: focusMode ? 'Exit Focus Mode' : 'Enter Focus Mode',
        section: 'Commands',
        shortcut: 'F',
        keywords: ['immersive', 'clean canvas'],
        run: () => toggleFocusMode(),
      },
      {
        id: 'command:presentation-mode',
        title: presentationMode ? 'Exit Presentation Mode' : 'Enter Presentation Mode',
        section: 'Commands',
        keywords: ['present', 'export', 'sequence'],
        run: () => togglePresentationMode(),
      },
      {
        id: 'command:open-palette',
        title: 'Open Palette Panel',
        section: 'Windows',
        keywords: ['shapes', 'nodes', 'presets'],
        run: () => openManagedDockedWindowFromDockTab('palette'),
      },
      {
        id: 'command:open-inspector',
        title: 'Open Inspector Panel',
        section: 'Windows',
        keywords: ['properties', 'details'],
        run: () => openManagedDockedWindowFromDockTab('inspector'),
      },
      {
        id: 'command:open-journeys',
        title: 'Open Journeys Panel',
        section: 'Windows',
        keywords: ['flows', 'paths'],
        run: () => openManagedDockedWindowFromDockTab('journeys'),
      },
      {
        id: 'command:open-timeline',
        title: 'Open Timeline Panel',
        section: 'Windows',
        keywords: ['steps', 'player'],
        run: () => openManagedDockedWindowFromDockTab('timeline'),
      },
      {
        id: 'command:open-script',
        title: 'Open SJV Script Panel',
        section: 'Windows',
        keywords: ['code', 'dsl', 'text'],
        run: () => openManagedDockedWindowFromDockTab('dsl'),
      },
      {
        id: 'command:open-help',
        title: 'Open Help Guide',
        section: 'Windows',
        keywords: ['docs', 'guide'],
        run: () => openHelpWindow('guide'),
      },
      {
        id: 'command:open-preferences',
        title: 'Open Preferences',
        section: 'Windows',
        keywords: ['settings', 'appearance'],
        run: () => openPreferencesWindow(),
      },
      {
        id: 'command:open-cloud-panel',
        title: `Open ${CLOUD_PROVIDER_LABEL} Panel`,
        section: 'Windows',
        keywords: ['cloud', 'supabase', 'login', 'sync'],
        run: () => setSupabaseCloudPanelOpen(true),
      },
      {
        id: 'command:save-file',
        title: 'Save File',
        section: 'Files',
        shortcut: 'Ctrl+S',
        keywords: ['disk', 'workspace'],
        run: () => {
          persist()
          void saveWorkspaceFile('reuse')
        },
      },
      {
        id: 'command:open-file',
        title: 'Open File',
        section: 'Files',
        shortcut: 'Ctrl+O',
        keywords: ['import', 'workspace'],
        run: () => {
          void openWorkspaceFilePicker()
        },
      },
      {
        id: 'command:cloud-save-script',
        title: `Save Generated SJV Script to ${CLOUD_PROVIDER_LABEL}`,
        section: 'Files',
        disabled: !supabaseCloudReady || supabaseCloudBusy,
        keywords: ['cloud', 'script'],
        run: () => {
          void saveScriptToSupabaseCloud()
        },
      },
    ]

    for (const option of viewHierarchyOptions) {
      const view = workspace.views[option.viewId]
      if (!view) {
        continue
      }
      items.push({
        id: `view:${view.id}`,
        title: view.name,
        section: 'Views',
        subtitle: `Open ${view.kind} view`,
        keywords: ['view', view.kind],
        run: () => {
          goToView(view.id)
          setTransientStatus(`Opened view: ${view.name}`)
        },
      })
    }

    for (const journey of viewJourneys) {
      items.push({
        id: `journey:${journey.id}`,
        title: journey.name,
        section: 'Journeys',
        subtitle: 'Select and prepare this journey for playback',
        keywords: ['flow', 'timeline', 'player'],
        run: () => {
          setActiveJourney(journey.id)
          activateJourneyPlayback(journey.id)
          setTransientStatus(`Active journey: ${journey.name}`)
        },
      })
      items.push({
        id: `journey-filter:${journey.id}`,
        title: `Filter Journey: ${journey.name}`,
        section: 'Journeys',
        subtitle: 'Focus the canvas on this journey',
        keywords: ['focus', 'scope', 'filter'],
        run: () => applyJourneyFilter(journey.id, { activateJourney: true }),
      })
    }

    for (const view of Object.values(workspace.views)) {
      for (const nodeId of view.nodeIds) {
        const node = workspace.nodes[nodeId]
        if (!node) {
          continue
        }
        items.push({
          id: `node:${view.id}:${node.id}`,
          title: node.name,
          section: 'Nodes',
          subtitle: `Select ${node.kind} in ${view.name}`,
          keywords: ['node', node.kind, node.tech?.label ?? '', node.description ?? ''],
          run: () => focusNodeFromPalette(view.id, node.id),
        })
      }
      for (const edgeId of view.edgeIds) {
        const edge = workspace.edges[edgeId]
        if (!edge) {
          continue
        }
        const fromNode = workspace.nodes[edge.from.nodeId]
        const toNode = workspace.nodes[edge.to.nodeId]
        items.push({
          id: `edge:${view.id}:${edge.id}`,
          title: edge.label || edge.id,
          section: 'Edges',
          subtitle: `Select ${fromNode?.name ?? edge.from.nodeId} -> ${toNode?.name ?? edge.to.nodeId}`,
          keywords: ['edge', 'connection', edge.protocolPresetId],
          run: () => focusEdgeFromPalette(view.id, edge.id),
        })
      }
    }

    return items
  })() : []
  const commandPaletteActionById = new Map(commandPaletteItems.map((item) => [item.id, item]))
  const runCommandPaletteAction = (itemId: string) => {
    const item = commandPaletteActionById.get(itemId)
    if (!item || item.disabled) {
      return
    }
    closeCommandPalette()
    item.run()
  }

  const canvasContextMenuContent = canvasContextMenu ? (
    <div
      className="canvas-context-menu"
      role="menu"
      aria-label="Canvas context menu"
      style={{ left: canvasContextMenu.x, top: canvasContextMenu.y }}
    >
      <div className="canvas-context-menu-section">
        <span className="canvas-context-menu-label">
          {canvasContextMenu.target === 'node'
            ? workspace.nodes[canvasContextMenu.nodeId ?? '']?.name ?? 'Node'
            : canvasContextMenu.target === 'edge'
              ? workspace.edges[canvasContextMenu.edgeId ?? '']?.label || 'Edge'
              : 'Canvas'}
        </span>
      </div>
      {canvasContextMenu.target === 'canvas' ? (
        <div className="canvas-context-menu-section">
          {BASIC_SHAPE_DEFINITIONS.map((shape) => (
            <button
              key={shape.kind}
              type="button"
              role="menuitem"
              onClick={() =>
                runCanvasContextAction(() =>
                  addExperimentalShapeToCanvas(shape.kind, {
                    x: canvasContextMenu.worldX,
                    y: canvasContextMenu.worldY,
                  }),
                )
              }
            >
              {renderBasicShapeToolbarIcon(shape.kind, 14)}
              <span>Add {shape.label}</span>
            </button>
          ))}
        </div>
      ) : null}
      {canvasContextMenu.target !== 'canvas' ? (
        <div className="canvas-context-menu-section">
          {canvasContextMenu.target === 'node' &&
          canvasContextMenu.nodeId &&
          canUseNodeDrilldown(canvasContextMenu.nodeId) ? (
            <button
              type="button"
              role="menuitem"
              onClick={() =>
                runCanvasContextAction(() => {
                  if (canvasContextMenu.nodeId) {
                    return runNodeDrilldownAction(canvasContextMenu.nodeId)
                  }
                  return false
                })
              }
            >
              <BookOpen size={14} />
              <span>{resolveNodeDrilldownActionLabel(canvasContextMenu.nodeId)}</span>
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={() => runCanvasContextAction(() => duplicateCurrentSelection())}
          >
            <Copy size={14} />
            <span>Duplicate</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => runCanvasContextAction(() => deleteCurrentSelection())}
          >
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
        </div>
      ) : null}
      {canvasContextMenu.target === 'edge' && activeJourneyId ? (
        <div className="canvas-context-menu-section">
          <button
            type="button"
            role="menuitem"
            onClick={() =>
              runCanvasContextAction(() => {
                if (canvasContextMenu.edgeId) {
                  addEdgeToJourney(activeJourneyId, canvasContextMenu.edgeId)
                }
              })
            }
          >
            <Workflow size={14} />
            <span>Add to active journey</span>
          </button>
        </div>
      ) : null}
      <div className="canvas-context-menu-section">
        <button type="button" role="menuitem" onClick={() => runCanvasContextAction(() => fitCurrentViewToCanvas())}>
          <Target size={14} />
          <span>Fit view</span>
        </button>
        <button type="button" role="menuitem" onClick={() => runCanvasContextAction(() => runAutoArrange())}>
          <Sparkles size={14} />
          <span>Auto arrange</span>
        </button>
      </div>
    </div>
  ) : null
  const lightThemeNoticeDialog = lightThemeNoticeOpen ? (
    <div className="theme-notice-backdrop" role="presentation">
      <section
        className="theme-notice-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="light-theme-notice-title"
      >
        <div className="theme-notice-copy">
          <strong id="light-theme-notice-title">Light theme is under construction</strong>
          <p>
            You can keep using it, but some shell surfaces and contrast details may still look unfinished.
          </p>
        </div>
        <button type="button" onClick={() => setLightThemeNoticeOpen(false)}>
          Continue
        </button>
      </section>
    </div>
  ) : null
  const confirmationDialogControl = (
    <ConfirmationDialog
      open={confirmationDialog !== null}
      title={confirmationDialog?.title ?? ''}
      message={confirmationDialog?.message ?? ''}
      details={confirmationDialog?.details}
      confirmLabel={confirmationDialog?.confirmLabel}
      cancelLabel={confirmationDialog?.cancelLabel}
      tone={confirmationDialog?.tone}
      onConfirm={() => resolveCurrentConfirmationDialog(true)}
      onCancel={() => resolveCurrentConfirmationDialog(false)}
    />
  )

  if (isSharedSupabaseAssetRoute) {
    return (
      <div className="shared-asset-view">
        <main className="shared-asset-shell">
          <p className="shared-asset-eyebrow">Shared SJV Export</p>
          {sharedSupabaseAssetView ? (
            <>
              <div className="shared-asset-heading">
                <h1>{sharedSupabaseAssetView.title}</h1>
                <span className="shared-asset-type-pill">
                  {sharedSupabaseAssetView.contentType.startsWith('video/') ? 'MP4 / Video' : 'GIF / Image'}
                </span>
              </div>
              <div className="shared-asset-media-frame">
                {sharedSupabaseAssetView.contentType.startsWith('video/') ? (
                  <video
                    src={sharedSupabaseAssetView.signedUrl}
                    controls
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <img
                    src={sharedSupabaseAssetView.signedUrl}
                    alt={sharedSupabaseAssetView.title}
                    loading="eager"
                  />
                )}
              </div>
              <p className="shared-asset-caption">
                This clean viewer exposes only this exported file. It does not reveal the sender&apos;s full cloud library.
              </p>
              <div className="shared-asset-actions">
                <a
                  className="shared-asset-action"
                  href={sharedSupabaseAssetView.signedUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open media file
                </a>
                <a className="shared-asset-action shared-asset-action-primary" href="/">
                  Open Full App
                </a>
              </div>
            </>
          ) : (
            <>
              <div className="shared-asset-heading">
                <h1>Shared export unavailable</h1>
              </div>
              <p className="shared-asset-caption">
                This link is invalid or has already expired. Ask the sender to generate a fresh shared export link.
              </p>
              <div className="shared-asset-actions">
                <a className="shared-asset-action shared-asset-action-primary" href="/">
                  Open Full App
                </a>
              </div>
            </>
          )}
        </main>
      </div>
    )
  }

  if (appShellMode === 'mobile') {
    return (
      <div
        className={`mobile-app app-layout-density-${uiPreferences.density} app-layout-font-${uiPreferences.fontScale} app-chrome-theme-${uiPreferences.chromeThemeId} app-icon-set-${uiPreferences.iconSet} ${
          theme === 'dark' ? 'theme-dark' : 'theme-light'
        } ${uiPreferences.performanceModeEnabled ? 'app-layout-performance' : ''}`}
        style={uiAppearanceStyle}
        onContextMenu={handleAppContextMenu}
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
        <input
          ref={supabaseGalleryFileInputRef}
          type="file"
          accept=".png,.gif,.mp4,image/*,video/*"
          hidden
          onChange={(event) => {
            void onSupabaseGalleryFileInputChange(event)
          }}
        />
        <SplashScreen
          visible={splashVisible}
          versionLabel={APP_VERSION_LABEL}
          copyrightLabel={`Copyright ${APP_COPYRIGHT_LABEL}`}
          onDismiss={() => setSplashVisible(false)}
        />
        <CommandPalette
          key={commandPaletteOpen ? 'command-palette-open' : 'command-palette-closed'}
          open={commandPaletteOpen}
          items={commandPaletteItems}
          query={commandPaletteQuery}
          onQueryChange={setCommandPaletteQuery}
          onRun={runCommandPaletteAction}
          onClose={closeCommandPalette}
        />
        {!presentationMode ? cloudPanelControl : null}
        {canvasContextMenuContent}
        {lightThemeNoticeDialog}
        {confirmationDialogControl}
        <div ref={layoutRef} className="mobile-shell-frame">
          <header ref={topbarRef} className="mobile-topbar">
            <div className="mobile-topbar-row">
              <div className="mobile-brand-copy">
                <strong>{workspace.workspace.name}</strong>
                <span>{breadcrumb.map((viewId) => workspace.views[viewId]?.name ?? viewId).join(' / ')}</span>
              </div>
            </div>
            <div className="mobile-topbar-meta">
              <span className="mobile-meta-pill">{`View ${currentViewModeLabel}`}</span>
              <span className="mobile-meta-pill">{activeToolLabel}</span>
              {playerJourney ? <span className="mobile-meta-pill">{`Journey ${playerJourney.name}`}</span> : null}
            </div>
            <div className="mobile-toolbar" role="toolbar" aria-label="Mobile canvas tools">
              <button
                type="button"
                className="mobile-toolbar-button mobile-toolbar-button-compact"
                onClick={() => {
                  void openWorkspaceFilePicker()
                }}
              >
                Open
              </button>
              <button
                type="button"
                className="mobile-toolbar-button mobile-toolbar-button-compact"
                onClick={() => {
                  void saveWorkspaceFile('reuse')
                }}
              >
                Save
              </button>
              <button
                type="button"
                className={
                  activeTool === 'select'
                    ? 'mobile-toolbar-button mobile-toolbar-button-compact mobile-toolbar-button-active'
                    : 'mobile-toolbar-button mobile-toolbar-button-compact'
                }
                onClick={() => setActiveTool('select')}
              >
                Select
              </button>
              <button
                type="button"
                className={
                  activeTool === 'connector'
                    ? 'mobile-toolbar-button mobile-toolbar-button-compact mobile-toolbar-button-active'
                    : 'mobile-toolbar-button mobile-toolbar-button-compact'
                }
                onClick={() => setActiveTool('connector')}
              >
                Connect
              </button>
              <button
                type="button"
                className="mobile-toolbar-button mobile-toolbar-button-compact"
                onClick={() => openCommandPalette()}
              >
                Search
              </button>
              <button
                type="button"
                className="mobile-toolbar-button mobile-toolbar-button-compact"
                onClick={() => setMobilePanelCollapsed((current) => !current)}
              >
                {mobilePanelCollapsed ? 'Panels' : 'Hide'}
              </button>
            </div>
            {exportError ? <p className="topbar-error">{exportError}</p> : null}
            {!exportError && exportStatus ? <p className="topbar-status">{exportStatus}</p> : null}
          </header>
          <main
            ref={canvasPanelRef}
            className={`canvas-panel mobile-canvas-panel ${
              gridEnabled && !presentationMode ? 'canvas-panel-grid-visible' : 'canvas-panel-grid-hidden'
            } ${presentationMode ? 'canvas-panel-presentation' : ''}`}
          >
            {!presentationMode && canNavigateBack ? (
              <button
                type="button"
                className="canvas-back-arrow"
                onClick={() => navigateBack()}
                aria-label="Back to previous view"
              >
                <Undo2 size={16} />
              </button>
            ) : null}
            {!presentationMode && activeTool === 'connector' ? (
              <p className={canNavigateBack ? 'canvas-hint canvas-hint-with-back' : 'canvas-hint'}>
                {pendingConnectionFrom
                  ? `Select a destination to connect from ${pendingConnectionFrom}${pendingConnectionPortId ? `:${pendingConnectionPortId}` : ''}`
                  : 'Drag from one handle to another to create an edge'}
              </p>
            ) : null}
            {presentationMode && presentationSurface === 'sequence' ? (
              <SequenceDiagramView scene={presentationSequenceScene} theme={theme} />
            ) : (
              <DiagramCanvas
                presentationMode={presentationMode}
                forceGridHidden={presentationMode}
                exportFocusJourneyId={exportFocusJourneyId}
                nodeDepthEffectsEnabled={nodeDepthEffectsActive}
                draggedEdgeId={draggedEdgeId}
                onEdgePointerStart={handleCanvasEdgePointerStart}
              />
            )}
          </main>
          <section
            className={
              mobilePanelCollapsed
                ? 'mobile-panel-shell mobile-panel-shell-collapsed'
                : 'mobile-panel-shell'
            }
          >
            <div className="mobile-panel-tabs" role="tablist" aria-label="Mobile panels">
              {mobileDockTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={mobilePanelTab === tab}
                  aria-label={dockLabelByTab[tab]}
                  className={mobilePanelTab === tab ? 'mobile-panel-tab mobile-panel-tab-active' : 'mobile-panel-tab'}
                  onClick={() => {
                    setMobilePanelTab(tab)
                    setMobilePanelCollapsed(false)
                  }}
                >
                  {mobileDockTabLabel[tab]}
                </button>
              ))}
              <span className="mobile-panel-tabs-spacer" />
              <button
                type="button"
                className="mobile-panel-toggle"
                onClick={() => setMobilePanelCollapsed((current) => !current)}
              >
                {mobilePanelCollapsed ? 'Open' : 'Minimize'}
              </button>
            </div>
            {!mobilePanelCollapsed ? (
              <div className="mobile-panel-body">
                <div className="mobile-panel-heading">
                  <strong>{dockLabelByTab[mobilePanelTab]}</strong>
                  <span>Focused tools for quick touch access</span>
                </div>
                {resolveDockTabContent(mobilePanelTab)}
              </div>
            ) : null}
          </section>
        </div>
        {guidedTutorialStepIndex !== null ? (
          <GuidedTutorialOverlay
            step={guidedTutorialCurrentStep ?? GUIDED_UI_TUTORIAL_STEPS[guidedTutorialStepIndex]}
            stepIndex={guidedTutorialStepIndex}
            totalSteps={GUIDED_UI_TUTORIAL_STEPS.length}
            canAdvance={guidedTutorialCurrentStepCompletion.isComplete}
            requiresAction={guidedTutorialCurrentStepCompletion.requiresAction}
            completionPrompt={guidedTutorialCurrentStepCompletion.prompt}
            onNext={() => nextGuidedTutorialStep()}
            onBack={() => previousGuidedTutorialStep()}
            onSkip={() => closeGuidedTutorial()}
          />
        ) : null}
      </div>
    )
  }

  return (
    <div
      ref={layoutRef}
      className={`app-layout ${focusMode ? 'app-layout-focus' : ''} ${
        presentationMode ? 'app-layout-presentation' : ''
      } app-layout-density-${uiPreferences.density} app-layout-font-${uiPreferences.fontScale} app-chrome-theme-${uiPreferences.chromeThemeId} app-icon-set-${uiPreferences.iconSet} ${
        uiPreferences.menuBarVisible ? 'app-menu-visible' : 'app-menu-hidden'
      } ${
        topbarToolbarInline ? 'app-toolbar-inline' : 'app-toolbar-stacked'
      } ${
        theme === 'dark' ? 'theme-dark' : 'theme-light'
      } ${
        uiPreferences.performanceModeEnabled ? 'app-layout-performance' : ''
      }`}
      style={appLayoutStyle}
      onContextMenu={handleAppContextMenu}
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
      <input
        ref={supabaseGalleryFileInputRef}
        type="file"
        accept=".png,.gif,.mp4,image/*,video/*"
        hidden
        onChange={(event) => {
          void onSupabaseGalleryFileInputChange(event)
        }}
      />
      <SplashScreen
        visible={splashVisible}
        versionLabel={APP_VERSION_LABEL}
        copyrightLabel={`Copyright ${APP_COPYRIGHT_LABEL}`}
        onDismiss={() => setSplashVisible(false)}
      />
      <CommandPalette
        key={commandPaletteOpen ? 'command-palette-open' : 'command-palette-closed'}
        open={commandPaletteOpen}
        items={commandPaletteItems}
        query={commandPaletteQuery}
        onQueryChange={setCommandPaletteQuery}
        onRun={runCommandPaletteAction}
        onClose={closeCommandPalette}
      />
      {!presentationMode ? cloudPanelControl : null}
      {canvasContextMenuContent}
      {lightThemeNoticeDialog}
      {confirmationDialogControl}
      <header ref={topbarRef} className="topbar">
        <div className="topbar-meta">
          <div className="topbar-brand-row">
            {!presentationMode ? (
              <button
                type="button"
                className="app-logo-badge app-logo-button"
                onClick={() =>
                  setUiPreferences((current) => ({
                    ...current,
                    menuBarVisible: !current.menuBarVisible,
                  }))
                }
                title={withTooltip(uiPreferences.menuBarVisible ? 'Hide main menu' : 'Show main menu')}
                aria-label={uiPreferences.menuBarVisible ? 'Hide main menu' : 'Show main menu'}
              >
                {appLogoGlyph}
              </button>
            ) : (
              <div className="app-logo-badge" aria-hidden="true">
                {appLogoGlyph}
              </div>
            )}
            <div className="app-brand-copy">
              <h1>{workspace.workspace.name}</h1>
              <p>{breadcrumb.map((viewId) => workspace.views[viewId]?.name ?? viewId).join(' / ')}</p>
            </div>
          </div>
          {!presentationMode && uiPreferences.menuBarVisible ? (
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
                    {renderDesktopMenuItem(<FilePlus2 size={13} />, 'New File', <kbd>Ctrl+N</kbd>)}
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
                    {renderDesktopMenuItem(<FolderOpen size={13} />, 'Open File...', <kbd>Ctrl+O</kbd>)}
                  </button>
                  {recentWorkspaces.map((entry) => (
                    <button
                      key={`recent-${entry.id}`}
                      type="button"
                      role="menuitem"
                      onClick={() => runDesktopMenuAction(() => openRecentWorkspace(entry))}
                      title={withTooltip(new Date(entry.savedAtIso).toLocaleString())}
                    >
                      {renderDesktopMenuItem(<FolderOpen size={13} />, `Recent: ${entry.name}`)}
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
                    {renderDesktopMenuItem(<Save size={13} />, 'Save File', <kbd>Ctrl+S</kbd>)}
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
                    {renderDesktopMenuItem(<Save size={13} />, 'Save File As...', <kbd>Ctrl+Shift+S</kbd>)}
                  </button>
                  <button type="button" role="menuitem" onClick={() => runDesktopMenuAction(() => persist())}>
                    {renderDesktopMenuItem(<Download size={13} />, 'Save Snapshot')}
                  </button>
                  <button type="button" role="menuitem" onClick={() => runDesktopMenuAction(() => hydrate())}>
                    {renderDesktopMenuItem(<RotateCcw size={13} />, 'Reload Snapshot', <kbd>Ctrl+R</kbd>)}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!supabaseCloudConfigured || !supabaseCloudUser || supabaseCloudBusy}
                    onClick={() =>
                      runDesktopMenuAction(() => {
                        void saveWorkspaceToSupabaseCloud()
                      })
                    }
                  >
                    {renderDesktopMenuItem(
                      <Save size={13} />,
                      supabaseCloudBusy ? 'Cloud Busy...' : `Save to ${CLOUD_PROVIDER_LABEL}`,
                    )}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!supabaseCloudConfigured || !supabaseCloudUser || supabaseCloudBusy}
                    onClick={() =>
                      runDesktopMenuAction(() => {
                        void loadWorkspaceFromSupabaseCloud()
                      })
                    }
                  >
                    {renderDesktopMenuItem(
                      <Download size={13} />,
                      supabaseCloudBusy ? 'Cloud Busy...' : `Load from ${CLOUD_PROVIDER_LABEL}`,
                    )}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!supabaseCloudConfigured || !supabaseCloudUser || supabaseCloudBusy}
                    onClick={() =>
                      runDesktopMenuAction(() => {
                        void saveScriptToSupabaseCloud()
                      })
                    }
                  >
                    {renderDesktopMenuItem(
                      <Code2 size={13} />,
                      supabaseCloudBusy ? 'Cloud Busy...' : `Save Script to ${CLOUD_PROVIDER_LABEL}`,
                    )}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!supabaseCloudConfigured || !supabaseCloudUser || supabaseCloudBusy}
                    onClick={() =>
                      runDesktopMenuAction(() => {
                        void loadScriptFromSupabaseCloud()
                      })
                    }
                  >
                    {renderDesktopMenuItem(
                      <Code2 size={13} />,
                      supabaseCloudBusy ? 'Cloud Busy...' : `Load Script from ${CLOUD_PROVIDER_LABEL}`,
                    )}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!supabaseCloudConfigured || !supabaseCloudUser || supabaseCloudBusy}
                    onClick={() => runDesktopMenuAction(() => openSupabaseGalleryPicker())}
                  >
                    {renderDesktopMenuItem(
                      <FolderOpen size={13} />,
                      supabaseCloudBusy ? 'Cloud Busy...' : `Upload Media to ${CLOUD_PROVIDER_LABEL}`,
                    )}
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
                    {renderDesktopMenuItem(<Image size={13} />, 'Export SVG')}
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
                    {renderDesktopMenuItem(<Image size={13} />, 'Export PNG')}
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
                    {renderDesktopMenuItem(<Download size={13} />, 'Export PDF')}
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
                    {renderDesktopMenuItem(<Image size={13} />, animatedExportRunning ? 'Exporting...' : 'Export GIF')}
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
                    {renderDesktopMenuItem(
                      <Presentation size={13} />,
                      animatedExportRunning ? 'Exporting...' : 'Export MP4',
                    )}
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
                    {renderDesktopMenuItem(
                      <Code2 size={13} />,
                      animatedExportRunning ? 'Exporting...' : 'Export Animated SVG',
                    )}
                  </button>
                  <button type="button" role="menuitem" onClick={() => runDesktopMenuAction(() => resetWorkspace())}>
                    {renderDesktopMenuItem(<RotateCcw size={13} />, 'Reset Workspace')}
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
                    {renderDesktopMenuItem(<Undo2 size={13} />, 'Undo', <kbd>Ctrl+Z</kbd>)}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!canRedo}
                    onClick={() => runDesktopMenuAction(() => redoHistory())}
                  >
                    {renderDesktopMenuItem(<Redo2 size={13} />, 'Redo', <kbd>Ctrl+Shift+Z</kbd>)}
                  </button>
                  <button type="button" role="menuitem" onClick={() => runDesktopMenuAction(() => navigateBack())}>
                    {renderDesktopMenuItem(<PanelLeftOpen size={13} />, 'Back', <kbd>Alt+←</kbd>)}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => setActiveTool('select'))}
                  >
                    {renderDesktopMenuItem(<MousePointer size={13} />, 'Select Tool', <kbd>V</kbd>)}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => setActiveTool('connector'))}
                  >
                    {renderDesktopMenuItem(<Link2 size={13} />, 'Connector Tool', <kbd>C</kbd>)}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!selectedNodes.length && !selectedEdge}
                    onClick={() => runDesktopMenuAction(() => duplicateCurrentSelection())}
                  >
                    {renderDesktopMenuItem(<Copy size={13} />, 'Duplicate Selection', <kbd>Ctrl+D</kbd>)}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!selectedNodes.length && !selectedEdge}
                    onClick={() => runDesktopMenuAction(() => deleteCurrentSelection())}
                  >
                    {renderDesktopMenuItem(<Trash2 size={13} />, 'Delete Selection', <kbd>Del</kbd>)}
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
                    {renderDesktopMenuItem(<ZoomIn size={13} />, 'Zoom In', <kbd>Ctrl+</kbd>)}
                  </button>
                  <button type="button" role="menuitem" onClick={() => runDesktopMenuAction(() => zoomByFactor(0.9))}>
                    {renderDesktopMenuItem(<ZoomOut size={13} />, 'Zoom Out', <kbd>Ctrl-</kbd>)}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => runAutoArrange())}
                  >
                    {renderDesktopMenuItem(<Sparkles size={13} />, 'Auto Arrange', <kbd>Ctrl+Shift+L</kbd>)}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => setGridEnabled(!gridEnabled))}
                  >
                    {renderDesktopMenuItem(<Grid3X3 size={13} />, gridEnabled ? 'Hide Grid' : 'Show Grid')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => setSnapEnabled(!snapEnabled))}
                  >
                    {renderDesktopMenuItem(<Magnet size={13} />, snapEnabled ? 'Disable Snap' : 'Enable Snap')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => applyWorkspaceTheme(theme === 'dark' ? 'light' : 'dark'))}
                  >
                    {renderDesktopMenuItem(
                      theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />,
                      theme === 'dark' ? 'Use Light Theme' : 'Use Dark Theme',
                    )}
                  </button>
                  <button type="button" role="menuitem" onClick={() => runDesktopMenuAction(() => toggleFocusMode())}>
                    {renderDesktopMenuItem(<Target size={13} />, focusMode ? 'Exit Focus Mode' : 'Focus Mode', <kbd>F</kbd>)}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runDesktopMenuAction(() =>
                        setUiPreferences((current) => ({
                          ...current,
                          minimapEnabled: !current.minimapEnabled,
                        })),
                      )
                    }
                  >
                    {renderDesktopMenuItem(
                      <Grid3X3 size={13} />,
                      uiPreferences.minimapEnabled ? 'Hide Minimap' : 'Show Minimap',
                    )}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runDesktopMenuAction(() =>
                        setUiPreferences((current) => ({
                          ...current,
                          statusBarEnabled: !current.statusBarEnabled,
                        })),
                      )
                    }
                  >
                    {renderDesktopMenuItem(
                      uiPreferences.statusBarEnabled ? <PanelBottomClose size={13} /> : <PanelBottomOpen size={13} />,
                      uiPreferences.statusBarEnabled ? 'Hide Status Bar' : 'Show Status Bar',
                    )}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runDesktopMenuAction(() =>
                        setUiPreferences((current) => ({
                          ...current,
                          menuBarVisible: !current.menuBarVisible,
                        })),
                      )
                    }
                  >
                    {renderDesktopMenuItem(
                      <ListOrdered size={13} />,
                      uiPreferences.menuBarVisible ? 'Hide Main Menu' : 'Show Main Menu',
                    )}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runDesktopMenuAction(() =>
                        setUiPreferences((current) => ({
                          ...current,
                          toolbarInlineWithBrand: !current.toolbarInlineWithBrand,
                        })),
                      )
                    }
                  >
                    {renderDesktopMenuItem(
                      <SlidersHorizontal size={13} />,
                      uiPreferences.toolbarInlineWithBrand
                        ? 'Stack Toolbar Below Topbar'
                        : 'Place Toolbar Beside App Icon',
                    )}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => togglePresentationMode())}
                  >
                    {renderDesktopMenuItem(
                      <Presentation size={13} />,
                      presentationMode ? 'Exit Presentation' : 'Presentation Mode',
                    )}
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
                    {renderDesktopMenuItemLabel(<PanelLeftOpen size={13} />, 'Open Palette Panel')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    data-tutorial-id="window-menu-open-inspector-panel"
                    onClick={() =>
                      runDesktopMenuAction(() => {
                        recordGuidedTutorialEvent('window-menu-open-panel:inspector')
                        openManagedDockedWindowFromDockTab('inspector')
                      })
                    }
                  >
                    {renderDesktopMenuItemLabel(<SlidersHorizontal size={13} />, 'Open Inspector Panel')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => openManagedDockedWindowFromDockTab('journeys'))}
                  >
                    {renderDesktopMenuItemLabel(<Workflow size={13} />, 'Open Journeys Panel')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    data-tutorial-id="window-menu-open-timeline-panel"
                    onClick={() =>
                      runDesktopMenuAction(() => {
                        recordGuidedTutorialEvent('window-menu-open-panel:timeline')
                        openManagedDockedWindowFromDockTab('timeline')
                      })
                    }
                  >
                    {renderDesktopMenuItemLabel(<ListOrdered size={13} />, 'Open Timeline Panel')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    data-tutorial-id="window-menu-open-dsl-panel"
                    onClick={() =>
                      runDesktopMenuAction(() => {
                        recordGuidedTutorialEvent('window-menu-open-panel:dsl')
                        openManagedDockedWindowFromDockTab('dsl')
                      })
                    }
                  >
                    {renderDesktopMenuItemLabel(<Code2 size={13} />, 'Open SJV Script Panel')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => openManagedDockedWindowFromDockTab('help'))}
                  >
                    {renderDesktopMenuItemLabel(<CircleHelp size={13} />, 'Open Help Panel')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => openManagedDockedWindowFromDockTab('preferences'))}
                  >
                    {renderDesktopMenuItemLabel(<SlidersHorizontal size={13} />, 'Open Preferences Panel')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => toggleLeftSidebar())}
                  >
                    {renderDesktopMenuItemLabel(
                      paletteWindowOpen ? <PanelLeftClose size={13} /> : <PanelLeftOpen size={13} />,
                      paletteWindowOpen ? 'Hide Palette' : 'Show Palette',
                    )}
                  </button>
                  {legacyDockShellAvailable ? (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => runDesktopMenuAction(() => toggleDockPanel())}
                    >
                      {renderDesktopMenuItemLabel(<Dock size={13} />, dockCollapsed ? 'Show Dock' : 'Hide Dock')}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => toggleWorkbench())}
                  >
                    {renderDesktopMenuItemLabel(
                      drawerCollapsed ? <PanelBottomOpen size={13} /> : <PanelBottomClose size={13} />,
                      drawerCollapsed ? 'Show Workbench' : 'Hide Workbench',
                    )}
                  </button>
                  {legacyDockShellAvailable ? (
                    <>
                      <button type="button" role="menuitem" onClick={() => runDesktopMenuAction(() => moveDockToLeft())}>
                        {renderDesktopMenuItemLabel(<PanelLeftOpen size={13} />, 'Dock Left')}
                      </button>
                      <button type="button" role="menuitem" onClick={() => runDesktopMenuAction(() => moveDockToRight())}>
                        {renderDesktopMenuItemLabel(<PanelRightOpen size={13} />, 'Dock Right')}
                      </button>
                      <button type="button" role="menuitem" onClick={() => runDesktopMenuAction(() => moveDockToBottom())}>
                        {renderDesktopMenuItemLabel(<PanelBottomOpen size={13} />, 'Dock Bottom')}
                      </button>
                      <button type="button" role="menuitem" onClick={() => runDesktopMenuAction(() => moveDockToFloating())}>
                        {renderDesktopMenuItemLabel(<Dock size={13} />, 'Dock Floating')}
                      </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => restoreWindowLayout())}
                  >
                    {renderDesktopMenuItemLabel(<RotateCcw size={13} />, 'Restore Window Layout')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => resetWindowLayout())}
                  >
                    {renderDesktopMenuItemLabel(<Target size={13} />, 'Reset Window Layout')}
                  </button>
                  <button type="button" role="menuitem" onClick={() => runDesktopMenuAction(() => setSplashVisible(true))}>
                    {renderDesktopMenuItemLabel(<Sparkles size={13} />, 'Show Splash')}
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
                    {renderDesktopMenuItem(<Plus size={13} />, 'Create Journey')}
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
                    {renderDesktopMenuItem(<Filter size={13} />, 'Clear Journey Filter')}
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
                          {renderDesktopMenuItem(
                            <Filter size={13} />,
                            <>
                            {journeyFilterId === journey.id ? 'Filtering: ' : 'Filter: '}
                            {journey.name}
                            </>,
                          )}
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
                    {renderDesktopMenuItem(
                      <Target size={13} />,
                      <>
                      Focus: Show{journeyFocusSettings.offscopeRenderMode === 'show' ? ' (active)' : ''}
                      </>,
                    )}
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
                    {renderDesktopMenuItem(
                      <Target size={13} />,
                      <>
                      Focus: Dim{journeyFocusSettings.offscopeRenderMode === 'dim' ? ' (active)' : ''}
                      </>,
                    )}
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
                    {renderDesktopMenuItem(
                      <Target size={13} />,
                      <>
                      Focus: Hide{journeyFocusSettings.offscopeRenderMode === 'hide' ? ' (active)' : ''}
                      </>,
                    )}
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
                    {renderDesktopMenuItem(
                      <Grid3X3 size={13} />,
                      <>
                      Filter Layout: Preserve
                      {journeyFocusSettings.layoutMode === 'preserve' ? ' (active)' : ''}
                      </>,
                    )}
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
                    {renderDesktopMenuItem(
                      <Grid3X3 size={13} />,
                      <>
                      Filter Layout: Reflow
                      {journeyFocusSettings.layoutMode === 'reflow' ? ' (active)' : ''}
                      </>,
                    )}
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
                    {renderDesktopMenuItem(
                      <Sparkles size={13} />,
                      <>
                      Auto-layout: Manual
                      {journeyFocusSettings.autoLayoutMode === 'manual' ? ' (active)' : ''}
                      </>,
                    )}
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
                    {renderDesktopMenuItem(
                      <Sparkles size={13} />,
                      <>
                      Auto-layout: Always
                      {journeyFocusSettings.autoLayoutMode === 'always' ? ' (active)' : ''}
                      </>,
                    )}
                  </button>
                  <button type="button" role="menuitem" onClick={() => runDesktopMenuAction(() => runAutoArrange())}>
                    {renderDesktopMenuItem(<Sparkles size={13} />, 'Apply Layout Now')}
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
                    {renderDesktopMenuItem(<Sparkles size={13} />, 'Animation: Cinematic')}
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
                    {renderDesktopMenuItem(<Sparkles size={13} />, 'Animation: Orb only')}
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
                    {renderDesktopMenuItem(<Sparkles size={13} />, 'Animation: Minimal')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!playerJourney}
                    onClick={() => runDesktopMenuAction(() => prevPlayerStep())}
                  >
                    {renderDesktopMenuItem(<SkipBack size={13} />, 'Player: Previous Step')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!playerJourney}
                    onClick={() => runDesktopMenuAction(() => setPlayerRunning(!playerIsRunning))}
                  >
                    {renderDesktopMenuItem(
                      playerIsRunning ? <Pause size={13} /> : <Play size={13} />,
                      playerIsRunning ? 'Player: Pause' : 'Player: Play',
                    )}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!playerJourney}
                    onClick={() => runDesktopMenuAction(() => stepPlayer())}
                  >
                    {renderDesktopMenuItem(<SkipForward size={13} />, 'Player: Next Step')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={!playerJourney}
                    onClick={() => runDesktopMenuAction(() => resetPlayer())}
                  >
                    {renderDesktopMenuItem(<RotateCcw size={13} />, 'Player: Reset')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => setPlayerLoop(!playerLoop))}
                  >
                    {renderDesktopMenuItem(<RotateCcw size={13} />, playerLoop ? 'Loop: On' : 'Loop: Off')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => setPlayerHighlightNodes(!playerHighlightNodes))}
                  >
                    {renderDesktopMenuItem(
                      <Target size={13} />,
                      playerHighlightNodes ? 'Highlight: On' : 'Highlight: Off',
                    )}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => setPlayerTrailEnabled(!playerTrailEnabled))}
                  >
                    {renderDesktopMenuItem(<Workflow size={13} />, playerTrailEnabled ? 'Trail: On' : 'Trail: Off')}
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
                    {renderDesktopMenuItem(
                      <Sparkles size={13} />,
                      `Load Showcase (${uiPreferences.showcaseLocale.toUpperCase()})`,
                    )}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => loadShowcasePreset('showcase', 'en'))}
                  >
                    {renderDesktopMenuItem(<Sparkles size={13} />, 'Load Showcase (EN)')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => loadShowcasePreset('showcase', 'pt'))}
                  >
                    {renderDesktopMenuItem(<Sparkles size={13} />, 'Load Showcase (PT)')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => loadShowcasePreset('tutorial', 'en'))}
                  >
                    {renderDesktopMenuItem(<BookOpen size={13} />, 'Load Tutorial (EN)')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => loadShowcasePreset('tutorial', 'pt'))}
                  >
                    {renderDesktopMenuItem(<BookOpen size={13} />, 'Load Tutorial (PT)')}
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
                    {renderDesktopMenuItem(<SlidersHorizontal size={13} />, 'Open Preferences')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => setSupabaseCloudPanelOpen(true))}
                  >
                    {renderDesktopMenuItem(<FolderOpen size={13} />, `Open ${CLOUD_PROVIDER_LABEL} Panel`)}
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
                    {renderDesktopMenuItem(
                      <CircleHelp size={13} />,
                      uiPreferences.tooltipsEnabled ? 'Disable Tooltips' : 'Enable Tooltips',
                    )}
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
                    {renderDesktopMenuItem(
                      <Sparkles size={13} />,
                      uiPreferences.splashEnabled ? 'Disable Startup Splash' : 'Enable Startup Splash',
                    )}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runDesktopMenuAction(() =>
                        setUiPreferences((current) => ({
                          ...current,
                          nodeDepthEffectsEnabled: !current.nodeDepthEffectsEnabled,
                        })),
                      )
                    }
                  >
                    {renderDesktopMenuItem(
                      <Sparkles size={13} />,
                      uiPreferences.nodeDepthEffectsEnabled
                        ? 'Disable Node Depth Effects'
                        : 'Enable Node Depth Effects',
                    )}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runDesktopMenuAction(() =>
                        setUiPreferences((current) => ({
                          ...current,
                          minimapEnabled: !current.minimapEnabled,
                        })),
                      )
                    }
                  >
                    {renderDesktopMenuItem(
                      <Grid3X3 size={13} />,
                      uiPreferences.minimapEnabled ? 'Hide Minimap' : 'Show Minimap',
                    )}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runDesktopMenuAction(() =>
                        setUiPreferences((current) => ({
                          ...current,
                          statusBarEnabled: !current.statusBarEnabled,
                        })),
                      )
                    }
                  >
                    {renderDesktopMenuItem(
                      uiPreferences.statusBarEnabled ? <PanelBottomClose size={13} /> : <PanelBottomOpen size={13} />,
                      uiPreferences.statusBarEnabled ? 'Hide Status Bar' : 'Show Status Bar',
                    )}
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
                    {renderDesktopMenuItem(
                      <Languages size={13} />,
                      `Showcase Language: English${uiPreferences.showcaseLocale === 'en' ? ' (active)' : ''}`,
                    )}
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
                    {renderDesktopMenuItem(
                      <Languages size={13} />,
                      `Showcase Language: Portuguese${uiPreferences.showcaseLocale === 'pt' ? ' (active)' : ''}`,
                    )}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runDesktopMenuAction(() =>
                        setUiPreferences((current) => ({ ...current, density: 'comfortable' })),
                      )
                    }
                  >
                    {renderDesktopMenuItem(
                      <Grid3X3 size={13} />,
                      `UI Density: Comfortable${uiPreferences.density === 'comfortable' ? ' (active)' : ''}`,
                    )}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() =>
                      runDesktopMenuAction(() =>
                        setUiPreferences((current) => ({ ...current, density: 'compact' })),
                      )
                    }
                  >
                    {renderDesktopMenuItem(
                      <Grid3X3 size={13} />,
                      `UI Density: Compact${uiPreferences.density === 'compact' ? ' (active)' : ''}`,
                    )}
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
                    {renderDesktopMenuItem(<Sparkles size={13} />, 'Start Guided Tutorial')}
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
                    {renderDesktopMenuItem(<BookOpen size={13} />, 'Open Help Guide')}
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
                    {renderDesktopMenuItem(<Image size={13} />, 'Open Export Gallery')}
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
                    {renderDesktopMenuItem(<Info size={13} />, 'Open About')}
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
                    {renderDesktopMenuItem(<Sparkles size={13} />, 'Show Splash')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => loadShowcasePreset('showcase', 'en'))}
                  >
                    {renderDesktopMenuItem(<Sparkles size={13} />, 'Load Showcase (EN)')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => loadShowcasePreset('showcase', 'pt'))}
                  >
                    {renderDesktopMenuItem(<Sparkles size={13} />, 'Load Showcase (PT)')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => loadShowcasePreset('tutorial', 'en'))}
                  >
                    {renderDesktopMenuItem(<BookOpen size={13} />, 'Load Tutorial (EN)')}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => runDesktopMenuAction(() => loadShowcasePreset('tutorial', 'pt'))}
                  >
                    {renderDesktopMenuItem(<BookOpen size={13} />, 'Load Tutorial (PT)')}
                  </button>
                </div>
              ) : null}
            </div>
            </nav>
          ) : null}
          {!presentationMode ? (
            <div className="topbar-utility-strip">
              <button
                type="button"
                className="command-palette-trigger"
                onClick={() => openCommandPalette()}
                title={withTooltip('Search commands, views, journeys, nodes, and edges')}
                aria-label="Open command palette"
              >
                <Search size={15} />
                <span>Search</span>
                <kbd>Ctrl K</kbd>
              </button>
            </div>
          ) : null}
          {!presentationMode ? (
            <div className="mode-indicators">
              <span className={activeTool !== 'select' ? 'mode-pill mode-pill-active' : 'mode-pill'}>
                {`Mode: ${activeToolLabel}`}
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
              {presentationSurface === 'sequence' ? (
                <>
                  <span className="mode-pill mode-pill-active">Surface: Sequence</span>
                  <span className="mode-pill mode-pill-step-name" title={withTooltip(playerJourney?.name ?? 'Select a journey')}>
                    {playerJourney ? `Journey: ${playerJourney.name}` : 'Journey: select'}
                  </span>
                </>
              ) : (
                <>
                  <span className={playerIsRunning ? 'mode-pill mode-pill-playing' : 'mode-pill'}>
                    Step {playerStepIndex + 1}/{playerJourneyPlaybackLength}
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
                </>
              )}
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
                  if (presentationSurface === 'sequence') {
                    setPlayerJourney(nextJourneyId)
                    setPlayerRunning(false)
                    resetPlayer()
                  } else {
                    activateJourneyPlayback(nextJourneyId)
                  }
                  if (nextJourneyId) {
                    setActiveJourney(nextJourneyId)
                  }
                }}
              >
                <option value="">{presentationSurface === 'sequence' ? 'Sequence: select journey' : 'Player: select journey'}</option>
                {viewJourneys.map((journey) => (
                  <option key={journey.id} value={journey.id}>
                    {journey.name}
                  </option>
                ))}
              </select>
              <select
                className="presentation-select"
                value={presentationSurface}
                onChange={(event) => {
                  const nextSurface = event.target.value as PresentationSurface
                  setPresentationSurface(nextSurface)
                  if (nextSurface === 'sequence') {
                    setPlayerRunning(false)
                  }
                }}
              >
                <option value="journey">Surface: Journey animation</option>
                <option value="sequence">Surface: Sequence diagram</option>
              </select>
              {presentationSurface === 'sequence' ? (
                <>
                  <button
                    type="button"
                    className="presentation-export-button"
                    disabled={!presentationSequenceScene}
                    onClick={() => {
                      void exportFromCanvas('svg')
                    }}
                  >
                    Export Sequence SVG
                  </button>
                  <button
                    type="button"
                    className="presentation-export-button"
                    disabled={!presentationSequenceScene}
                    onClick={() => {
                      void exportFromCanvas('png')
                    }}
                  >
                    Export Sequence PNG
                  </button>
                  <button
                    type="button"
                    className="presentation-export-button"
                    disabled={!presentationSequenceScene}
                    onClick={() => {
                      void exportFromCanvas('pdf')
                    }}
                  >
                    Export Sequence PDF
                  </button>
                </>
              ) : (
                <>
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
                </>
              )}
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
                    className={
                      activeTool === 'select'
                        ? 'tool-button tool-active toolbar-command-button'
                        : 'tool-button toolbar-command-button'
                    }
                    onClick={() => {
                      recordGuidedTutorialEvent('toolbar-mode-click')
                      setActiveTool('select')
                    }}
                    title={withTooltip('Select and move nodes or edges')}
                    aria-label="Select mode"
                  >
                    {renderAppIcon('pointer')}
                    <span className="toolbar-button-label">Select</span>
                    <kbd className="toolbar-button-shortcut">V</kbd>
                  </button>
                  <button
                    type="button"
                    className={
                      activeTool === 'connector'
                        ? 'tool-button tool-active toolbar-command-button'
                        : 'tool-button toolbar-command-button'
                    }
                    onClick={() => {
                      recordGuidedTutorialEvent('toolbar-mode-click')
                      setActiveTool('connector')
                    }}
                    title={withTooltip('Connect nodes by dragging from one port to another')}
                    aria-label="Connector mode"
                  >
                    {renderAppIcon('link')}
                    <span className="toolbar-button-label">Connect</span>
                    <kbd className="toolbar-button-shortcut">C</kbd>
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
                    {paletteWindowOpen ? renderAppIcon('panel-left-close', 15) : renderAppIcon('panel-left-open', 15)}
                  </button>
                  {legacyDockShellAvailable ? (
                    <button
                      type="button"
                      className="icon-toggle-button"
                      onClick={() => toggleDockPanel()}
                      title={withTooltip(dockCollapsed ? 'Show dock panel' : 'Hide dock panel')}
                    >
                      {dockPosition === 'bottom' ? (
                        dockCollapsed ? (
                          renderAppIcon('panel-bottom-open', 15)
                        ) : (
                          renderAppIcon('panel-bottom-close', 15)
                        )
                      ) : dockPosition === 'floating' ? (
                        renderAppIcon('dock', 15)
                      ) : dockPosition === 'left' ? (
                        dockCollapsed ? (
                          renderAppIcon('panel-left-open', 15)
                        ) : (
                          renderAppIcon('panel-left-close', 15)
                        )
                      ) : dockCollapsed ? (
                        renderAppIcon('panel-right-open', 15)
                      ) : (
                        renderAppIcon('panel-right-close', 15)
                      )}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="icon-toggle-button"
                    onClick={() => toggleWorkbench()}
                    title={withTooltip(drawerCollapsed ? 'Show workbench' : 'Hide workbench')}
                  >
                    {drawerCollapsed ? renderAppIcon('panel-bottom-open', 15) : renderAppIcon('panel-bottom-close', 15)}
                  </button>
                  {!immersiveMode ? dockHeaderBar : null}
                </div>
              ) : null}
              {toolbarVisibility.modes ? (
                <div className="toolbar-group">
                  <button
                    type="button"
                    className="focus-toggle-button toolbar-command-button"
                    onClick={() => toggleFocusMode()}
                    title={withTooltip('Toggle focus mode')}
                    aria-label={focusMode ? 'Exit focus mode' : 'Focus mode'}
                  >
                    {renderAppIcon('target')}
                    <span className="toolbar-button-label">{focusMode ? 'Exit focus' : 'Focus'}</span>
                    <kbd className="toolbar-button-shortcut">F</kbd>
                  </button>
                  <button
                    type="button"
                    className="focus-toggle-button toolbar-command-button"
                    onClick={() => togglePresentationMode()}
                    title={withTooltip('Toggle presentation mode')}
                    aria-label={presentationMode ? 'Exit presentation mode' : 'Presentation mode'}
                  >
                    {renderAppIcon('presentation')}
                    <span className="toolbar-button-label">
                      {presentationMode ? 'Exit presentation' : 'Present'}
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
      {!immersiveMode && managedLeftHostVisible ? (
        <div
          className="layout-splitter layout-splitter-managed-left"
          style={{
            left: (leftDockVisible ? leftDockWidth : 0) + managedLeftHostWidth - 3,
            top: topbarHeight,
            bottom: bottomPanelsInset,
          }}
          onPointerDown={(event) => onManagedHostSideSplitterPointerDown('left', event)}
          onPointerMove={onManagedHostSideSplitterPointerMove}
          onPointerUp={stopManagedHostSideResize}
          onPointerCancel={stopManagedHostSideResize}
        />
      ) : null}
      {!immersiveMode && managedRightHostVisible ? (
        <div
          className="layout-splitter layout-splitter-managed-right"
          style={{
            right: (rightDockVisible ? rightDockWidth : 0) + managedRightHostWidth - 3,
            top: topbarHeight,
            bottom: bottomPanelsInset,
          }}
          onPointerDown={(event) => onManagedHostSideSplitterPointerDown('right', event)}
          onPointerMove={onManagedHostSideSplitterPointerMove}
          onPointerUp={stopManagedHostSideResize}
          onPointerCancel={stopManagedHostSideResize}
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
      {!immersiveMode && managedBottomHostVisible ? (
        <div
          className="layout-splitter layout-splitter-managed-bottom"
          style={{ bottom: statusBarHeight + (drawerVisible ? journeyHeight : 0) + managedBottomHostHeight - 3 }}
          onPointerDown={onManagedBottomHostSplitterPointerDown}
          onPointerMove={onManagedBottomHostSplitterPointerMove}
          onPointerUp={stopManagedBottomHostResize}
          onPointerCancel={stopManagedBottomHostResize}
        />
      ) : null}
      {!immersiveMode && drawerVisible ? (
        <div
          className="layout-splitter layout-splitter-journey"
          style={{ bottom: statusBarHeight + journeyHeight - 3 }}
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
        onPointerDownCapture={(event) => {
          if (event.button !== 0) {
            return
          }
          recordGuidedTutorialEvent('canvas-click')
        }}
      >
        {!presentationMode && canNavigateBack ? (
          <button
            type="button"
            className="canvas-back-arrow"
            onClick={() => navigateBack()}
            title={withTooltip('Back to previous view')}
            aria-label="Back to previous view"
          >
            <Undo2 size={16} />
          </button>
        ) : null}
        {!presentationMode && activeTool === 'connector' ? (
          <p className={canNavigateBack ? 'canvas-hint canvas-hint-with-back' : 'canvas-hint'}>
            {pendingConnectionFrom
              ? `Select a destination to connect from ${pendingConnectionFrom}${pendingConnectionPortId ? `:${pendingConnectionPortId}` : ''}`
              : 'Drag from one handle to another to create an edge'}
          </p>
        ) : null}
        {presentationMode && presentationSurface === 'sequence' ? (
          <SequenceDiagramView scene={presentationSequenceScene} theme={theme} />
        ) : (
          <DiagramCanvas
            presentationMode={presentationMode}
            forceGridHidden={presentationMode}
            exportFocusJourneyId={exportFocusJourneyId}
            nodeDepthEffectsEnabled={nodeDepthEffectsActive}
            draggedEdgeId={draggedEdgeId}
            onEdgePointerStart={handleCanvasEdgePointerStart}
          />
        )}
        {!presentationMode ? (
          <aside className="canvas-tools-rail" aria-label="Canvas tools">
            <button
              type="button"
              className={activeTool === 'select' ? 'canvas-tool-button canvas-tool-button-active' : 'canvas-tool-button'}
              onClick={() => setActiveTool('select')}
              title={withTooltip('Select and move')}
              aria-label="Select tool"
            >
              {renderAppIcon('pointer', 16)}
            </button>
            <button
              type="button"
              className={activeTool === 'connector' ? 'canvas-tool-button canvas-tool-button-active' : 'canvas-tool-button'}
              onClick={() => setActiveTool('connector')}
              title={withTooltip('Connect nodes')}
              aria-label="Connector tool"
            >
              {renderAppIcon('link', 16)}
            </button>
            <span className="canvas-tool-divider" aria-hidden="true" />
            {BASIC_SHAPE_DEFINITIONS.map((shape) => (
              <button
                key={shape.kind}
                type="button"
                className={activeTool === shape.kind ? 'canvas-tool-button canvas-tool-button-active' : 'canvas-tool-button'}
                onClick={() => {
                  setActiveTool(shape.kind)
                  setTransientStatus(`Drag on the canvas to draw a ${shape.label.toLowerCase()} shape.`)
                }}
                title={withTooltip(`Draw ${shape.label.toLowerCase()} shape (experimental)`)}
                aria-label={`Draw ${shape.label} shape`}
              >
                {renderBasicShapeToolbarIcon(shape.kind, 16)}
              </button>
            ))}
            <span className="canvas-tool-divider" aria-hidden="true" />
            <button
              type="button"
              className={paletteWindowOpen ? 'canvas-tool-button canvas-tool-button-active' : 'canvas-tool-button'}
              onClick={() => openManagedDockedWindowFromDockTab('palette')}
              title={withTooltip('Open palette')}
              aria-label="Open palette"
            >
              {renderAppIcon('panel-left-open', 16)}
            </button>
            <button
              type="button"
              className="canvas-tool-button"
              onClick={() => openManagedDockedWindowFromDockTab('inspector')}
              title={withTooltip('Open inspector')}
              aria-label="Open inspector"
            >
              {renderAppIcon('sliders', 16)}
            </button>
            <button
              type="button"
              className="canvas-tool-button"
              onClick={() => openManagedDockedWindowFromDockTab('dsl')}
              title={withTooltip('Open SJV Script')}
              aria-label="Open SJV Script"
            >
              {renderAppIcon('code', 16)}
            </button>
            <span className="canvas-tool-divider" aria-hidden="true" />
            <button
              type="button"
              className="canvas-tool-button"
              onClick={() => fitCurrentViewToCanvas()}
              title={withTooltip('Fit view')}
              aria-label="Fit view"
            >
              {renderAppIcon('target', 16)}
            </button>
            <button
              type="button"
              className={gridEnabled ? 'canvas-tool-button canvas-tool-button-active' : 'canvas-tool-button'}
              onClick={() => setGridEnabled(!gridEnabled)}
              title={withTooltip(gridEnabled ? 'Hide grid' : 'Show grid')}
              aria-label={gridEnabled ? 'Hide grid' : 'Show grid'}
            >
              {renderAppIcon('grid', 16)}
            </button>
            <button
              type="button"
              className={snapEnabled ? 'canvas-tool-button canvas-tool-button-active' : 'canvas-tool-button'}
              onClick={() => setSnapEnabled(!snapEnabled)}
              title={withTooltip(snapEnabled ? 'Disable snap' : 'Enable snap')}
              aria-label={snapEnabled ? 'Disable snap' : 'Enable snap'}
            >
              {renderAppIcon('magnet', 16)}
            </button>
            <span className="canvas-tool-divider" aria-hidden="true" />
            <button
              type="button"
              className="canvas-tool-button"
              onClick={() => openCommandPalette()}
              title={withTooltip('Search commands')}
              aria-label="Search commands"
            >
              {renderAppIcon('search', 16)}
            </button>
          </aside>
        ) : null}
        {!presentationMode && uiPreferences.minimapEnabled && minimapModel ? (
          <aside className="canvas-minimap" aria-label="Canvas minimap">
            <div className="canvas-minimap-header">
              <span>Overview</span>
              <span className="canvas-minimap-actions">
                <button type="button" onClick={() => fitCurrentViewToCanvas()}>
                  Fit
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setUiPreferences((current) => ({
                      ...current,
                      minimapEnabled: false,
                    }))
                  }
                  aria-label="Hide minimap"
                  title={withTooltip('Hide minimap')}
                >
                  {renderAppIcon('close', 11)}
                </button>
              </span>
            </div>
            <svg
              className="canvas-minimap-svg"
              viewBox={`0 0 ${DEFAULT_MINIMAP_SIZE.width} ${DEFAULT_MINIMAP_SIZE.height}`}
              onPointerDown={onMinimapPointerDown}
              role="img"
              aria-label="Diagram overview minimap"
            >
              <rect
                className="canvas-minimap-bg"
                x={0}
                y={0}
                width={DEFAULT_MINIMAP_SIZE.width}
                height={DEFAULT_MINIMAP_SIZE.height}
                rx={10}
              />
              {minimapModel.nodes.map((node) => (
                <rect
                  key={node.id}
                  className={
                    node.kind === 'boundary'
                      ? 'canvas-minimap-node canvas-minimap-node-boundary'
                      : 'canvas-minimap-node'
                  }
                  x={node.x}
                  y={node.y}
                  width={node.width}
                  height={node.height}
                  rx={node.kind === 'note' ? 1.5 : 3}
                />
              ))}
              <rect
                className="canvas-minimap-viewport"
                x={minimapModel.viewport.x}
                y={minimapModel.viewport.y}
                width={minimapModel.viewport.width}
                height={minimapModel.viewport.height}
                rx={4}
              />
            </svg>
          </aside>
        ) : null}
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
            {legacyDockShellAvailable && dockPosition === 'bottom' ? (
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
          ) : legacyDockShellAvailable && dockPosition === 'bottom' ? (
            dockCollapsed ? <p>Dock is hidden. Use the topbar toggle to reopen it.</p> : dockPanel
          ) : (
            <p>Dock is in side mode.</p>
          )}
        </section>
      ) : null}
      {statusBarVisible ? (
        <StatusBar items={statusBarItems} actions={statusBarActions} />
      ) : null}
      {guidedTutorialStepIndex !== null ? (
        <GuidedTutorialOverlay
          step={guidedTutorialCurrentStep ?? GUIDED_UI_TUTORIAL_STEPS[guidedTutorialStepIndex]}
          stepIndex={guidedTutorialStepIndex}
          totalSteps={GUIDED_UI_TUTORIAL_STEPS.length}
          canAdvance={guidedTutorialCurrentStepCompletion.isComplete}
          requiresAction={guidedTutorialCurrentStepCompletion.requiresAction}
          completionPrompt={guidedTutorialCurrentStepCompletion.prompt}
          onNext={() => nextGuidedTutorialStep()}
          onBack={() => previousGuidedTutorialStep()}
          onSkip={() => closeGuidedTutorial()}
        />
      ) : null}
    </div>
  )
}

export default App
