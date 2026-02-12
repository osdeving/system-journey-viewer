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
})
