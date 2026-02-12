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
    expect(appCss).toContain('.layout-splitter-left')
    expect(appCss).toContain('.layout-splitter-journey')
  })

  it('styles drawer tabs and dsl maximize layout', () => {
    expect(appCss).toContain('.drawer-tabs')
    expect(appCss).toContain('.drawer-tab')
    expect(appCss).toContain('.drawer-maximize-button')
    expect(appCss).toContain('.journey-drawer-dsl .dsl-panel')
    expect(appCss).toContain('.dsl-panel-maximized textarea')
  })

  it('includes flow and impact animations for player feedback', () => {
    expect(appCss).toContain('.edge-flowing')
    expect(appCss).toContain('@keyframes edge-flow-dash')
    expect(appCss).toContain('.node-group-impact')
    expect(appCss).toContain('@keyframes node-impact-shake')
  })

  it('contains visual styles for node shapes and color palette', () => {
    expect(appCss).toContain('.node-shape-detail')
    expect(appCss).toContain('.node-connector-icon')
    expect(appCss).toContain('.node-connector-female')
    expect(appCss).toContain('.node-connector-male')
    expect(appCss).toContain('.node-color-presets')
    expect(appCss).toContain('.node-color-chip')
  })
})
