/// <reference types="node" />
/**
 * Purpose: Verify DiagramCanvas source regressions for canvas orchestration and extracted node rendering hooks.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const diagramCanvasSource = readFileSync(resolve(process.cwd(), 'src/components/canvas/DiagramCanvas.tsx'), 'utf8')
const diagramNodeSource = readFileSync(resolve(process.cwd(), 'src/components/canvas/DiagramNode.tsx'), 'utf8')

describe('DiagramCanvas source regressions', () => {
  it('supports a drilldown hit-area for boundary nodes that own child views', () => {
    expect(diagramCanvasSource).toContain('onCreateDrilldown={createDrilldownForNode}')
    expect(diagramNodeSource).toContain('node.kind === \'boundary\' && node.drilldownRef')
    expect(diagramNodeSource).toContain('className="node-drilldown-hitarea"')
  })

  it('supports toggling node depth effects from props', () => {
    expect(diagramCanvasSource).toContain('nodeDepthEffectsEnabled?: boolean')
    expect(diagramCanvasSource).toContain('nodeDepthEffectsEnabled = true')
    expect(diagramCanvasSource).toContain('diagram-canvas diagram-canvas-depth-off')
    expect(diagramNodeSource).toContain('node-depth-fill')
    expect(diagramNodeSource).toContain('node-depth-rim')
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
    expect(diagramCanvasSource).toContain('hoveredPortKey={hoveredPortKey}')
    expect(diagramNodeSource).toContain('onPointerEnter={() => onPortPointerEnter(node.id, port.id)}')
    expect(diagramNodeSource).toContain('resolveNodePortClassName({')
    expect(diagramNodeSource).toContain("'node-port-affordance node-port-affordance-active'")
  })

  it('supports touch pinch zoom and highlights the edge being dragged into journeys', () => {
    expect(diagramCanvasSource).toContain('draggedEdgeId?: string | null')
    expect(diagramCanvasSource).toContain('resolveViewportAfterPinch({')
    expect(diagramCanvasSource).toContain('onTouchStart={onTouchStart}')
    expect(diagramCanvasSource).toContain('onTouchMove={onTouchMove}')
    expect(diagramCanvasSource).toContain('isDraggingToJourney={draggedEdgeId === edge.id}')
  })

  it('supports Alt-drag marquee multi-select and live alignment guides while dragging nodes', () => {
    expect(diagramCanvasSource).toContain('const startMarqueeSelection = (')
    expect(diagramCanvasSource).toContain('resolveMarqueeSelectionRect(')
    expect(diagramCanvasSource).toContain('resolveNodeIdsIntersectingMarquee(')
    expect(diagramCanvasSource).toContain('const [marqueeSelectionRect, setMarqueeSelectionRect] = useState<NodeBounds | null>(null)')
    expect(diagramCanvasSource).toContain('const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([])')
    expect(diagramCanvasSource).toContain('snapBoundsWithGuides(')
    expect(diagramCanvasSource).toContain('className="canvas-alignment-guide"')
    expect(diagramCanvasSource).toContain('className="canvas-selection-marquee"')
  })

  it('opens node and edge text editing through long-press label gestures', () => {
    expect(diagramCanvasSource).toContain('onEdgeLabelLongPress={startEdgeLabelInlineEdit}')
    expect(diagramCanvasSource).toContain('sanitizeInlineTextEditValue(inlineTextEdit.value')
    expect(diagramNodeSource).toContain('onLongPress=')
    expect(diagramNodeSource).toContain('onPressMoveStart={presentationMode ? undefined : (event) => onNodePointerDown(event, node, \'move\')}')
    expect(diagramNodeSource).not.toContain('onDoubleClick={(event) => {\n          onStartInlineEdit')
  })

  it('selects inline editor text only when a new edit target opens', () => {
    expect(diagramCanvasSource).toContain('const inlineTextEditFocusKey = inlineTextEdit')
    expect(diagramCanvasSource).toContain('const inlineTextEditFocusIsMultiline = inlineTextEdit?.multiline ?? false')
    expect(diagramCanvasSource).toContain('}, [inlineTextEditFocusIsMultiline, inlineTextEditFocusKey])')
    expect(diagramCanvasSource).not.toContain('}, [inlineTextEdit])')
  })

  it('supports drag-drawn experimental freeform shape tools', () => {
    expect(diagramCanvasSource).toContain('isFreeformShapeTool(activeTool)')
    expect(diagramCanvasSource).toContain('freeformShapeDrawingRef')
    expect(diagramCanvasSource).toContain('resolveFreeformShapeBounds(')
    expect(diagramCanvasSource).toContain('hasDraggedFreeformShape(')
    expect(diagramCanvasSource).toContain('addBasicShape(')
    expect(diagramCanvasSource).toContain('className="freeform-shape-preview"')
  })
})
