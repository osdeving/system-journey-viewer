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
    expect(appSource).toContain('Open Preferences Panel')
    expect(appSource).toContain('Show Splash')
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
  })
})
