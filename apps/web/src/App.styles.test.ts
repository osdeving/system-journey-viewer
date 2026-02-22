/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const appCss = readFileSync(resolve(process.cwd(), 'src/App.css'), 'utf8')

describe('App boundary styles', () => {
  it('uses boundary border as the only pointer hit-area', () => {
    expect(appCss).toMatch(/\.node-boundary\s*\{[^}]*fill:\s*none;[^}]*pointer-events:\s*stroke;[^}]*\}/s)
    expect(appCss).toMatch(/\.theme-dark\s+\.node-boundary\s*\{[^}]*fill:\s*none;[^}]*\}/s)
  })

  it('styles mode pills and splitters for visual mode indication and resizing', () => {
    expect(appCss).toContain('.mode-pill')
    expect(appCss).toContain('.mode-pill-active')
    expect(appCss).toContain('.mode-pill-playing')
    expect(appCss).toContain('.topbar-status')
    expect(appCss).toContain('.app-layout-focus')
    expect(appCss).toContain('.app-layout-presentation')
    expect(appCss).toContain('.focus-toggle-button')
    expect(appCss).toContain('.icon-toggle-button')
    expect(appCss).toContain('.layout-splitter-left')
    expect(appCss).toContain('.layout-splitter-journey')
  })

  it('styles drawer tabs, dock panel and monaco dsl layout', () => {
    expect(appCss).toContain('.drawer-tabs')
    expect(appCss).toContain('.drawer-tab')
    expect(appCss).toContain('.drawer-maximize-button')
    expect(appCss).toContain('.journey-drawer-dsl .dsl-panel')
    expect(appCss).toContain('.journey-drawer-dock')
    expect(appCss).toContain('.dock-panel')
    expect(appCss).toContain('.dock-tab-body-dsl')
    expect(appCss).toContain('.dock-tab-strip')
    expect(appCss).toContain('.dock-tab')
    expect(appCss).toContain('.dock-tab-icon')
    expect(appCss).toContain('.dock-host')
    expect(appCss).toContain('.dock-host-strip')
    expect(appCss).toContain('.dock-host-tab')
    expect(appCss).toContain('.dock-host-body')
    expect(appCss).toContain('.managed-host-sidebar')
    expect(appCss).toContain('.managed-host-sidebar-left')
    expect(appCss).toContain('.managed-host-sidebar-right')
    expect(appCss).toContain('.managed-host-bottom')
    expect(appCss).toContain('.dock-panel-managed')
    expect(appCss).toContain('.dock-placement')
    expect(appCss).toContain('.journey-side-player')
    expect(appCss).toContain('.journey-side-group')
    expect(appCss).toContain('.journey-list-sidebar')
    expect(appCss).toContain('.journey-timeline-toolbar')
    expect(appCss).toContain('.journey-item-edge-drop-target')
    expect(appCss).toContain('.inspector-actions')
    expect(appCss).toContain('.edge-label-position-value')
    expect(appCss).toContain('.dsl-monaco-editor')
    expect(appCss).toContain('.dsl-panel-maximized .dsl-monaco-editor')
    expect(appCss).toContain('.dsl-status-message')
    expect(appCss).toContain('.floating-window')
    expect(appCss).toContain('.floating-window-close')
    expect(appCss).toContain('.floating-window-body-dock')
    expect(appCss).toContain('.floating-window-body-dsl')
  })

  it('includes flow animation for player feedback', () => {
    expect(appCss).toContain('.edge-flowing')
    expect(appCss).toContain('.edge-flowing-animated')
    expect(appCss).toContain('@keyframes edge-flow-dash')
    expect(appCss).not.toContain('.node-group-impact')
    expect(appCss).not.toContain('@keyframes node-impact-shake')
  })

  it('uses seamless dashed animation settings for edge flow', () => {
    expect(appCss).toMatch(/\.edge-flowing\s*\{[^}]*stroke-dasharray:\s*6 6;[^}]*\}/s)
    expect(appCss).toMatch(/\.edge-flowing-animated\s*\{[^}]*animation:\s*edge-flow-dash\s+0.9s\s+linear\s+infinite;[^}]*\}/s)
    expect(appCss).toContain('stroke-dashoffset: -12;')
  })

  it('contains visual styles for node shapes and color palette', () => {
    expect(appCss).toContain('.node-shape-detail')
    expect(appCss).toContain('.node-connector-icon')
    expect(appCss).toContain('.node-connector-female')
    expect(appCss).toContain('.node-connector-male')
    expect(appCss).toContain('.node-color-presets')
    expect(appCss).toContain('.node-color-chip')
    expect(appCss).toContain('.journey-drag-handle')
    expect(appCss).toContain('.node-journey-dimmed')
    expect(appCss).toContain('.edge-dimmed')
    expect(appCss).toContain('.edge-label-dimmed')
  })

  it('includes desktop menu and advanced canvas interaction styles', () => {
    expect(appCss).toMatch(/\.topbar\s*\{[^}]*overflow:\s*visible;[^}]*\}/s)
    expect(appCss).toMatch(/\.topbar-meta\s*\{[^}]*grid-template-columns:\s*auto minmax\(0,\s*1fr\);[^}]*\}/s)
    expect(appCss).toMatch(/\.app-brand-copy\s*\{[^}]*display:\s*none;[^}]*\}/s)
    expect(appCss).toMatch(/\.mode-indicators\s*\{[^}]*display:\s*none;[^}]*\}/s)
    expect(appCss).toContain('.desktop-menu-bar')
    expect(appCss).toMatch(
      /\.desktop-menu-bar\s*\{[^}]*flex-wrap:\s*wrap;[^}]*flex:\s*1 1 auto;[^}]*overflow:\s*visible;[^}]*\}/s,
    )
    expect(appCss).toMatch(
      /\.topbar-actions\s*\{[^}]*flex-wrap:\s*nowrap;[^}]*overflow-x:\s*auto;[^}]*overflow-y:\s*hidden;[^}]*\}/s,
    )
    expect(appCss).toContain('.toolbar-icon-button')
    expect(appCss).toMatch(
      /\.app-layout-presentation\s+\.topbar\s*\{[^}]*grid-template-columns:\s*auto minmax\(0,\s*1fr\);[^}]*\}/s,
    )
    expect(appCss).toMatch(
      /\.app-layout-presentation\s+\.topbar-actions\s*\{[^}]*grid-column:\s*2;[^}]*grid-row:\s*1;[^}]*flex-wrap:\s*nowrap;[^}]*overflow-x:\s*auto;[^}]*\}/s,
    )
    expect(appCss).toContain('.desktop-menu-trigger')
    expect(appCss).toContain('.desktop-menu-open')
    expect(appCss).toContain('.app-logo-badge')
    expect(appCss).toContain('.desktop-menu-list')
    expect(appCss).toContain('.node-border-hitarea')
    expect(appCss).toContain('.node-connection-target')
    expect(appCss).toContain('.node-port-highlight')
    expect(appCss).toContain('.edge-anchor-handle')
    expect(appCss).toContain('.edge-anchor-handle-active')
    expect(appCss).toContain('.edge-label-draggable')
    expect(appCss).toContain('.edge-label-vertical')
    expect(appCss).toContain('.edge-selected-indicator')
  })

  it('applies the imported dark palette and arrow styling tokens', () => {
    expect(appCss).toContain('--sjv-canvas-bg')
    expect(appCss).toContain('--sjv-edge-player')
    expect(appCss).toContain('.edge-arrow-head')
    expect(appCss).toContain('.theme-dark .canvas-panel::before')
  })
})
