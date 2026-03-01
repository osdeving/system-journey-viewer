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

  it('supports parallel playback marker shapes and multi-lane animation tracks', () => {
    expect(diagramCanvasSource).toContain("type PlayerMarkerShape = 'orb' | 'square' | 'triangle'")
    expect(diagramCanvasSource).toContain('resolvePlayerMarkerShape')
    expect(diagramCanvasSource).toContain('currentPlayerLaneVisuals')
    expect(diagramCanvasSource).toContain('playerMarkerPositionsRef')
    expect(diagramCanvasSource).toContain('drawPlayerMarker(')
  })

  it('supports direct port-drag connection affordance in select mode with explicit port hover state', () => {
    expect(diagramCanvasSource).toContain('const [hoveredPortKey, setHoveredPortKey] = useState<string | null>(null)')
    expect(diagramCanvasSource).toContain("const canStartConnectionFromPort = activeTool === 'select' || isConnectorMode")
    expect(diagramCanvasSource).toContain('onPointerEnter={() => onPortPointerEnter(node.id, port.id)}')
    expect(diagramCanvasSource).toContain('resolveNodePortClassName({')
    expect(diagramCanvasSource).toContain("'node-port-affordance node-port-affordance-active'")
  })

  it('supports touch pinch zoom and highlights the edge being dragged into journeys', () => {
    expect(diagramCanvasSource).toContain('draggedEdgeId?: string | null')
    expect(diagramCanvasSource).toContain('resolveViewportAfterPinch({')
    expect(diagramCanvasSource).toContain('onTouchStart={onTouchStart}')
    expect(diagramCanvasSource).toContain('onTouchMove={onTouchMove}')
    expect(diagramCanvasSource).toContain('isDraggingToJourney={draggedEdgeId === edge.id}')
  })
})
