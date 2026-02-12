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
})
