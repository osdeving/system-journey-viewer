/// <reference types="node" />
/**
 * Purpose: Verify App behavior with regression-focused unit tests.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')
const windowUiConfigSource = readFileSync(resolve(process.cwd(), 'src/windowing/windowUiConfig.ts'), 'utf8')

describe('App source regressions', () => {
  it('starts with dock and workbench hidden by default', () => {
    expect(appSource).toContain('const createDefaultWindowLayoutBootstrap = (topbarHeight: number): WindowLayoutBootstrap => ({')
    expect(appSource).toContain('dockCollapsed: true')
    expect(appSource).toContain('drawerCollapsed: true')
    expect(appSource).toContain('const [dockCollapsed, setDockCollapsed] = useState(windowLayoutBootstrap.dockCollapsed)')
    expect(appSource).toContain('const [drawerCollapsed, setDrawerCollapsed] = useState(windowLayoutBootstrap.drawerCollapsed)')
  })

  it('persists UI density and applies a root density class', () => {
    expect(appSource).toContain("type UiDensity = 'comfortable' | 'compact'")
    expect(appSource).toContain("density: 'compact'")
    expect(appSource).toContain("parsed.density === 'compact' || parsed.density === 'comfortable'")
    expect(appSource).toContain('UI density')
    expect(appSource).toContain('UI Density: Compact')
    expect(appSource).toContain('app-layout-density-${uiPreferences.density}')
  })

  it('persists and wires a node depth-effects preference into the canvas renderer', () => {
    expect(appSource).toContain('nodeDepthEffectsEnabled: true')
    expect(appSource).toContain('parsed.nodeDepthEffectsEnabled ?? DEFAULT_UI_PREFERENCES.nodeDepthEffectsEnabled')
    expect(appSource).toContain('Enable node depth effects (3D look)')
    expect(appSource).toContain('Disable Node Depth Effects')
    expect(appSource).toContain('nodeDepthEffectsEnabled={uiPreferences.nodeDepthEffectsEnabled}')
  })

  it('includes manual Supabase auth plus workspace, script, and gallery actions', () => {
    expect(appSource).toContain("supabaseCloudConfigured")
    expect(appSource).toContain('Open Supabase cloud panel')
    expect(appSource).toContain('Use the top-right cloud badge for quick sign-in, gallery access, and direct exports.')
    expect(appSource).toContain('Open gallery')
    expect(appSource).toContain('Upload local')
    expect(appSource).toContain('Export PNG to Gallery')
    expect(appSource).toContain('Export GIF to Gallery')
    expect(appSource).toContain('Export MP4 to Gallery')
    expect(appSource).toContain('Sign In to Supabase')
    expect(appSource).toContain('Save Workspace to Cloud')
    expect(appSource).toContain('Load Workspace from Cloud')
    expect(appSource).toContain('Save Generated SJV Script')
    expect(appSource).toContain('Load Latest SJV Script')
    expect(appSource).toContain('Upload File to Gallery')
    expect(appSource).toContain('Refresh Gallery List')
    expect(appSource).toContain('Save to Supabase Cloud')
    expect(appSource).toContain('Load from Supabase Cloud')
    expect(appSource).toContain('Save Script to Supabase Cloud')
    expect(appSource).toContain('Load Script from Supabase Cloud')
    expect(appSource).toContain('Upload Media to Supabase Gallery')
    expect(appSource).toContain('Export PNG to Supabase Gallery')
    expect(appSource).toContain('Export GIF to Supabase Gallery')
    expect(appSource).toContain('Export MP4 to Supabase Gallery')
  })

  it('keeps SJV Script panel free of Codex action buttons', () => {
    expect(appSource).not.toContain('Refine with Codex')
    expect(appSource).not.toContain('Clear Codex context')
    expect(appSource).not.toContain('requestCodexDslAssist')
  })

  it('renders Preferences using the reusable floating window component', () => {
    expect(appSource).toContain("import { FloatingWindow } from './components/windowing/FloatingWindow'")
    expect(appSource).toContain('<FloatingWindow')
    expect(appSource).toContain('MANAGED_WINDOW_FLOATING_UI_CONFIG[windowId]')
    expect(windowUiConfigSource).toContain("title: 'Preferences'")
    expect(windowUiConfigSource).toContain("className: 'preferences-window'")
  })

  it('renders managed docked windows through the reusable DockHost component', () => {
    expect(appSource).toContain("import { DockHost } from './components/windowing/DockHost'")
    expect(appSource).toContain('<DockHost')
    expect(appSource).toContain('renderManagedDockHostInDockPanel')
    expect(appSource).toContain('setManagedHostActiveTab')
  })

  it('renders floating managed windows through a shared loop and content mapper', () => {
    expect(appSource).toContain('MANAGED_WINDOW_IDS.filter')
    expect(appSource).toContain('floatingManagedWindows.map')
    expect(appSource).toContain('renderManagedWindowFloatingContent')
    expect(windowUiConfigSource).toContain("title: 'Palette'")
    expect(windowUiConfigSource).toContain("title: 'Journey Timeline'")
    expect(windowUiConfigSource).toContain("title: 'SJV Script'")
  })

  it('provides view menu actions to restore and reset managed window layout', () => {
    expect(appSource).toContain('const restoreWindowLayout = useCallback')
    expect(appSource).toContain('const resetWindowLayout = useCallback')
    expect(appSource).toContain('MANAGED_WINDOWS_LAYOUT_STORAGE_KEY')
    expect(appSource).toContain('Restore Window Layout')
    expect(appSource).toContain('Reset Window Layout')
  })

  it('includes a dedicated Window desktop menu for panel and layout actions', () => {
    expect(appSource).toContain("type DesktopMenuId = 'file' | 'edit' | 'view' | 'window'")
    expect(appSource).toContain("const DESKTOP_MENU_ORDER: DesktopMenuId[] = ['file', 'edit', 'view', 'window'")
    expect(appSource).toContain("aria-controls=\"desktop-menu-window\"")
    expect(appSource).toContain('aria-label="Window menu"')
    expect(appSource).toContain('Open Timeline Panel')
    expect(appSource).toContain('Open SJV Script Panel')
    expect(appSource).toContain('Open Preferences Panel')
    expect(appSource).toContain('Show Splash')
  })

  it('keeps Insert focused on showcase/tutorial content instead of window shortcuts', () => {
    expect(appSource).toContain('aria-label="Insert menu"')
    expect(appSource).toContain('Load Showcase (EN)')
    expect(appSource).toContain('Load Tutorial (PT)')
    expect(appSource).not.toContain('Open Journey Timeline')
    expect(appSource).not.toContain('Open SJV Script Editor')
    expect(appSource).not.toContain('Open Dock Panel')
  })

  it('includes a guided UI tutorial overlay and stable target hooks', () => {
    expect(appSource).toContain("import { SplashScreen } from './components/chrome/SplashScreen'")
    expect(appSource).toContain("import { GuidedTutorialOverlay } from './components/tutorial/GuidedTutorialOverlay'")
    expect(appSource).toContain('GUIDED_UI_TUTORIAL_STEPS')
    expect(appSource).toContain('resolveGuidedTutorialStepCompletion')
    expect(appSource).toContain('recordGuidedTutorialEvent')
    expect(appSource).toContain("'panel-shortcut-click'")
    expect(appSource).toContain("'toolbar-mode-click'")
    expect(appSource).toContain("'canvas-click'")
    expect(appSource).toContain("'window-menu-open-panel:inspector'")
    expect(appSource).toContain("'window-menu-open-panel:timeline'")
    expect(appSource).toContain("'window-menu-open-panel:dsl'")
    expect(appSource).toContain("'node-select'")
    expect(appSource).toContain("'edge-select'")
    expect(appSource).toContain("'inspector-node-name-edit'")
    expect(appSource).toContain("'inspector-edge-label-edit'")
    expect(appSource).toContain("'inspector-edge-protocol-edit'")
    expect(appSource).toContain("'dsl-sync-toggle'")
    expect(appSource).toContain('Start Guided Tutorial')
    expect(appSource).toContain('data-tutorial-id="main-menu-bar"')
    expect(appSource).toContain('data-tutorial-id="menu-window-trigger"')
    expect(appSource).toContain('data-tutorial-id="window-menu-open-inspector-panel"')
    expect(appSource).toContain('data-tutorial-id="window-menu-open-timeline-panel"')
    expect(appSource).toContain('data-tutorial-id="window-menu-open-dsl-panel"')
    expect(appSource).toContain('data-tutorial-id="inspector-node-name"')
    expect(appSource).toContain('data-tutorial-id="inspector-edge-label"')
    expect(appSource).toContain('data-tutorial-id="inspector-edge-protocol"')
    expect(appSource).toContain('data-tutorial-id="dsl-sync-toggle"')
    expect(appSource).toContain('data-tutorial-id="topbar-toolbar"')
    expect(appSource).toContain('data-tutorial-id="canvas-panel"')
    expect(appSource).toContain('data-tutorial-id="managed-host-bottom"')
    expect(appSource).toContain('<GuidedTutorialOverlay')
  })

  it('sanitizes help markdown comments before rendering the Guide tab', () => {
    expect(appSource).toContain('const SANITIZED_HELP_GUIDE_MARKDOWN = helpGuideMarkdown.replace(/<!--[\\s\\S]*?-->/g, \'\').trimStart()')
    expect(appSource).toContain('<ReactMarkdown>{SANITIZED_HELP_GUIDE_MARKDOWN}</ReactMarkdown>')
  })

  it('supports a presentation sequence-diagram surface with static export actions', () => {
    expect(appSource).toContain("type PresentationSurface = 'journey' | 'sequence'")
    expect(appSource).toContain("const [presentationSurface, setPresentationSurface] = useState<PresentationSurface>('journey')")
    expect(appSource).toContain("import { SequenceDiagramView } from './components/sequence/SequenceDiagramView'")
    expect(appSource).toContain("value={presentationSurface}")
    expect(appSource).toContain('Surface: Sequence diagram')
    expect(appSource).toContain('Export Sequence SVG')
    expect(appSource).toContain('Export Sequence PNG')
    expect(appSource).toContain('Export Sequence PDF')
    expect(appSource).toContain('<SequenceDiagramView scene={presentationSequenceScene} theme={theme} />')
    expect(appSource).toContain("document.querySelector(sequenceModeActive ? '.sequence-diagram-svg' : '.diagram-canvas')")
  })

  it('renders managed window hosts in dedicated left/right/bottom layout regions', () => {
    expect(appSource).toContain('managedLeftHostVisible')
    expect(appSource).toContain('managedRightHostVisible')
    expect(appSource).toContain('managedBottomHostVisible')
    expect(appSource).toContain("renderManagedDockHostPanel('left')")
    expect(appSource).toContain("renderManagedDockHostPanel('right')")
    expect(appSource).toContain("renderManagedDockHostPanel('bottom')")
    expect(appSource).toContain("'left managedLeft main managedRight right'")
    expect(appSource).toContain("'managedBottom managedBottom managedBottom managedBottom managedBottom'")
    expect(appSource).toContain('managedLeftHostWidth')
    expect(appSource).toContain('managedRightHostWidth')
    expect(appSource).toContain('managedBottomHostHeight')
    expect(appSource).toContain('layout-splitter-managed-left')
    expect(appSource).toContain('layout-splitter-managed-right')
    expect(appSource).toContain('layout-splitter-managed-bottom')
  })
})
