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
    expect(appCss).toContain('.dock-panel')
    expect(appCss).toContain('.dock-tab-strip')
    expect(appCss).toContain('.dock-tab')
    expect(appCss).toContain('.dock-placement')
    expect(appCss).toContain('.journey-side-player')
    expect(appCss).toContain('.journey-list-sidebar')
    expect(appCss).toContain('.journey-timeline-toolbar')
    expect(appCss).toContain('.dsl-monaco-editor')
    expect(appCss).toContain('.dsl-panel-maximized .dsl-monaco-editor')
    expect(appCss).toContain('.dsl-codex-instruction')
    expect(appCss).toContain('.dsl-codex-status')
  })

  it('includes flow animation for player feedback', () => {
    expect(appCss).toContain('.edge-flowing')
    expect(appCss).toContain('@keyframes edge-flow-dash')
    expect(appCss).not.toContain('.node-group-impact')
    expect(appCss).not.toContain('@keyframes node-impact-shake')
  })

  it('uses seamless dashed animation settings for edge flow', () => {
    expect(appCss).toMatch(/\.edge-flowing\s*\{[^}]*stroke-dasharray:\s*6 6;[^}]*\}/s)
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
  })

  it('includes desktop menu and advanced canvas interaction styles', () => {
    expect(appCss).toContain('.desktop-menu-bar')
    expect(appCss).toContain('.desktop-menu-trigger')
    expect(appCss).toContain('.desktop-menu-open')
    expect(appCss).toContain('.app-logo-badge')
    expect(appCss).toContain('.desktop-menu-list')
    expect(appCss).toContain('.node-border-hitarea')
    expect(appCss).toContain('.edge-anchor-handle')
    expect(appCss).toContain('.edge-anchor-handle-active')
  })

  it('applies the imported dark palette and arrow styling tokens', () => {
    expect(appCss).toContain('--sjv-canvas-bg')
    expect(appCss).toContain('--sjv-edge-player')
    expect(appCss).toContain('.edge-arrow-head')
    expect(appCss).toContain('.theme-dark .canvas-panel::before')
  })
})
