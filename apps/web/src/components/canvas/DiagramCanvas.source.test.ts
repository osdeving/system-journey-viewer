/// <reference types="node" />
/**
 * Purpose: Verify DiagramCanvas source regressions for drilldown hit-area and depth-effect rendering hooks.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const diagramCanvasSource = readFileSync(resolve(process.cwd(), 'src/components/canvas/DiagramCanvas.tsx'), 'utf8')

describe('DiagramCanvas source regressions', () => {
  it('supports a drilldown hit-area for boundary nodes so newly-created drilldown parents remain double-clickable', () => {
    expect(diagramCanvasSource).toContain('node.kind === \'boundary\' && node.drilldownRef')
    expect(diagramCanvasSource).toContain('className="node-drilldown-hitarea"')
  })

  it('supports toggling node depth effects from props', () => {
    expect(diagramCanvasSource).toContain('nodeDepthEffectsEnabled?: boolean')
    expect(diagramCanvasSource).toContain('nodeDepthEffectsEnabled = true')
    expect(diagramCanvasSource).toContain('diagram-canvas diagram-canvas-depth-off')
    expect(diagramCanvasSource).toContain('node-depth-fill')
    expect(diagramCanvasSource).toContain('node-depth-rim')
  })
})
