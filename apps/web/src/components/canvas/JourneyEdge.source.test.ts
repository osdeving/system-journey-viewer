/// <reference types="node" />
/**
 * Purpose: Verify JourneyEdge source regressions for hit-area affordances.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const journeyEdgeSource = readFileSync(resolve(process.cwd(), 'src/components/canvas/JourneyEdge.tsx'), 'utf8')

describe('JourneyEdge source regressions', () => {
  it('renders an invisible hit-area path before the visible edge path', () => {
    expect(journeyEdgeSource).toContain('className="edge-hitarea"')
    expect(journeyEdgeSource).toContain('aria-hidden="true"')
    expect(journeyEdgeSource).toContain('markerEnd="url(#edge-arrow)"')
  })
})
