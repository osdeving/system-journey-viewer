/**
 * Purpose: Verify bundled default showcase gallery scripts and animation assets are valid.
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { liteToFullWorkspace } from '../dsl-lite/convert'
import { parseLiteDsl } from '../dsl-lite/parser'
import {
  DEFAULT_SHOWCASE_ANIMATIONS,
  DEFAULT_SHOWCASE_LIBRARY_SECTIONS,
  DEFAULT_SHOWCASE_SCRIPTS,
} from './defaultShowcaseGallery'

describe('default showcase gallery', () => {
  it('provides three scripts and three animated exports grouped for the gallery', () => {
    expect(DEFAULT_SHOWCASE_SCRIPTS).toHaveLength(3)
    expect(DEFAULT_SHOWCASE_ANIMATIONS).toHaveLength(3)
    expect(DEFAULT_SHOWCASE_LIBRARY_SECTIONS.map((section) => section.id)).toEqual([
      'sample-scripts',
      'sample-animations',
    ])
  })

  it('keeps every bundled script parseable with journeys and ui-layout metadata', () => {
    for (const sample of DEFAULT_SHOWCASE_SCRIPTS) {
      const ast = parseLiteDsl(sample.script)
      const workspace = liteToFullWorkspace(ast)
      const journeys = Object.values(workspace.journeys)

      expect(workspace.workspace.name).toBe(sample.title)
      expect(Object.keys(workspace.views).length).toBeGreaterThanOrEqual(2)
      expect(journeys.length).toBeGreaterThanOrEqual(3)
      expect(journeys.every((journey) => journey.steps.length > 0)).toBe(true)
      expect(sample.script).toContain('metadata ui-layout')
      expect(sample.script).toContain('drilldown')
    }
  })

  it('references existing animated SVG assets with motion content', () => {
    for (const sample of DEFAULT_SHOWCASE_ANIMATIONS) {
      const relativePath = sample.href.replace(/^\//, '')
      const absolutePath = resolve(process.cwd(), 'public', relativePath)
      const svg = readFileSync(absolutePath, 'utf8')

      expect(existsSync(absolutePath)).toBe(true)
      expect(sample.contentType).toBe('image/svg+xml')
      expect(svg).toContain('<animateMotion')
      expect(svg).toContain('repeatCount="indefinite"')
    }
  })
})
