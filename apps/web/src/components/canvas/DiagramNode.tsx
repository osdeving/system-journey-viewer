/**
 * Purpose: Render a reusable SVG diagram node with shape, text, ports, and node-local affordances.
 */

import type {
  PointerEvent as ReactPointerEvent,
} from 'react'
import { iconForKey } from '../../presets/iconPipeline'
import type { EditorActiveTool, NodeModel, ViewKind } from '../../model/types'
import { isExperimentalShapeKind } from '../../model/experimentalShapes'
import { clampNodeTechIconPlacement } from '../../diagram/nodes/nodeTechIconLayout'
import { resolveHexConnectorRole } from '../../diagram/nodes/hexConnectorRole'
import { resolveNodePortClassName } from '../../diagram/nodes/nodePortClassName'
import {
  resolveDbCylinderShape,
  resolveDiamondShape,
  resolveHexagonShape,
  resolveQueueCylinderShape,
  resolveTriangleShape,
} from '../../diagram/nodes/nodeShapePaths'
import {
  resolveNodeLabelLayout,
  resolveStickyNoteShape,
  truncateCanvasMultilineText,
  truncateCanvasText,
  type NodeLabelLayout,
} from '../../diagram/nodes/nodeLabelLayout'
import { TechIconGlyphContent } from '../../icons/TechIconGlyph'
import { Text } from '../text/Text'

export type DiagramNodeConnectionTarget = {
  nodeId: string
  portId: string
}

export type DiagramNodeInlineEditMode = 'node-name' | 'node-tech'
export type DiagramNodeTechIconResizeHandle = 'nw' | 'ne' | 'sw' | 'se'

export interface DiagramNodeProps {
  node: NodeModel
  viewKind: ViewKind
  presentationMode: boolean
  activeTool: EditorActiveTool
  isConnectorMode: boolean
  pendingConnectionFrom: string | null
  hoveredConnectionTarget: DiagramNodeConnectionTarget | null
  hoveredPortKey: string | null
  isSelected: boolean
  activeNodeIconEditId: string | null
  isPlayerHighlighted: boolean
  isDimmedByJourney: boolean
  nodeDepthEffectsEnabled: boolean
  onNodePointerDown: (
    event: ReactPointerEvent<SVGElement>,
    node: NodeModel,
    mode: 'move',
  ) => void
  onNodePointerMove: (event: ReactPointerEvent<SVGGElement>) => void
  onNodePointerUp: (event: ReactPointerEvent<SVGGElement>) => void
  onNodePointerLeave: () => void
  onNodeTechIconPointerDown: (
    event: ReactPointerEvent<SVGElement>,
    node: NodeModel,
  ) => void
  onNodeTechIconResizePointerDown: (
    event: ReactPointerEvent<SVGRectElement>,
    node: NodeModel,
    handle: DiagramNodeTechIconResizeHandle,
  ) => void
  onCreateDrilldown: (nodeId: string) => void
  onOpenDrilldown: (nodeId: string) => void
  onNodeBorderPointerDown: (
    event: ReactPointerEvent<SVGElement>,
    node: NodeModel,
  ) => void
  onNodeBorderPointerMove: (
    event: ReactPointerEvent<SVGElement>,
    node: NodeModel,
  ) => void
  onNodeBorderPointerLeave: () => void
  onStartInlineEdit: (
    event: ReactPointerEvent<SVGTextElement>,
    node: NodeModel,
    mode: DiagramNodeInlineEditMode,
    layout: NodeLabelLayout,
  ) => void
  onPortPointerEnter: (nodeId: string, portId: string) => void
  onPortPointerLeave: (nodeId: string, portId: string) => void
  onPortPointerDown: (
    event: ReactPointerEvent<SVGCircleElement>,
    node: NodeModel,
    portId: string,
  ) => void
}

export const DiagramNode = ({
  node,
  viewKind,
  presentationMode,
  activeTool,
  isConnectorMode,
  pendingConnectionFrom,
  hoveredConnectionTarget,
  hoveredPortKey,
  isSelected,
  activeNodeIconEditId,
  isPlayerHighlighted,
  isDimmedByJourney,
  nodeDepthEffectsEnabled,
  onNodePointerDown,
  onNodePointerMove,
  onNodePointerUp,
  onNodePointerLeave,
  onNodeTechIconPointerDown,
  onNodeTechIconResizePointerDown,
  onCreateDrilldown,
  onOpenDrilldown,
  onNodeBorderPointerDown,
  onNodeBorderPointerMove,
  onNodeBorderPointerLeave,
  onStartInlineEdit,
  onPortPointerEnter,
  onPortPointerLeave,
  onPortPointerDown,
}: DiagramNodeProps) => {
  const isBasicShape = isExperimentalShapeKind(node.kind)
  const isPendingConnection = node.id === pendingConnectionFrom
  const isConnectionTarget =
    hoveredConnectionTarget?.nodeId === node.id && Boolean(pendingConnectionFrom)
  const nodeClassName = [
    'node',
    isBasicShape ? 'node-basic-shape' : '',
    isBasicShape ? `node-basic-shape-${node.kind.replace('shape-', '')}` : '',
    node.kind === 'boundary' ? 'node-boundary' : '',
    node.kind === 'note' ? 'node-note' : '',
    isPendingConnection ? 'node-pending' : '',
    isConnectionTarget ? 'node-connection-target' : '',
    isSelected ? 'node-selected' : '',
    node.drilldownRef ? 'node-drilldown' : '',
    isPlayerHighlighted ? 'node-player-highlight' : '',
    isDimmedByJourney ? 'node-journey-dimmed' : '',
  ]
    .filter(Boolean)
    .join(' ')
  const nodeFillColor =
    node.kind === 'boundary' ? undefined : node.style?.fillColor
  const nodeTextColor = node.style?.textColor
  const dbShape = resolveDbCylinderShape(node.bounds.w, node.bounds.h)
  const queueShape = resolveQueueCylinderShape(node.bounds.w, node.bounds.h)
  const shouldRenderHexagon =
    node.kind === 'gateway' ||
    node.kind === 'security' ||
    node.kind === 'load-balancer'
  const hexagonShape = shouldRenderHexagon
    ? resolveHexagonShape(node.bounds.w, node.bounds.h)
    : null
  const hexagonBorderShape = shouldRenderHexagon
    ? resolveHexagonShape(node.bounds.w, node.bounds.h, 2.5)
    : null
  const triangleShape =
    node.kind === 'shape-triangle'
      ? resolveTriangleShape(node.bounds.w, node.bounds.h)
      : null
  const diamondShape =
    node.kind === 'shape-diamond'
      ? resolveDiamondShape(node.bounds.w, node.bounds.h)
      : null
  const stickyNoteShape =
    node.kind === 'note'
      ? resolveStickyNoteShape(node.bounds.w, node.bounds.h)
      : null
  const connectorRole = viewKind === 'hex' ? resolveHexConnectorRole(node.kind) : null
  const connectorIconX = node.bounds.w - 34
  const connectorIconY = 12
  const drilldownBadgeX = node.bounds.w - (connectorRole ? 56 : 26)
  const drilldownBadgeY = 8
  const nodeDepthEffectsActive =
    nodeDepthEffectsEnabled && node.kind !== 'note' && node.kind !== 'boundary' && !isBasicShape
  const labelLayout =
    node.kind === 'note'
      ? {
          titleX: 15,
          titleY: 38,
          subtitleX: 15,
          subtitleY: 38,
          textAnchor: 'start' as const,
          maxTitleWidth: Math.max(84, node.bounds.w - 30),
          maxSubtitleWidth: Math.max(84, node.bounds.w - 30),
        }
      : resolveNodeLabelLayout(node, shouldRenderHexagon)
  const nodeTitleText =
    node.kind === 'note'
      ? truncateCanvasMultilineText(
          node.name,
          labelLayout.maxTitleWidth,
          13,
          Math.max(2, Math.floor((node.bounds.h - 46) / 17)),
        )
      : truncateCanvasText(node.name, labelLayout.maxTitleWidth, 14)
  const nodeSubtitleText =
    node.kind === 'note' || isBasicShape
      ? ''
      : truncateCanvasText(node.tech?.label ?? node.kind, labelLayout.maxSubtitleWidth, 12)
  const nodeTechIcon =
    node.uiIcon && node.kind !== 'note' && !isBasicShape
      ? clampNodeTechIconPlacement(node.bounds, node.uiIcon)
      : null
  const isNodeTechIconEditing = Boolean(nodeTechIcon && activeNodeIconEditId === node.id)
  const nodeTitlePrefix = nodeTechIcon ? '' : `${iconForKey(node.tech?.iconKey)} `
  const nodeTechIconHandleSize = nodeTechIcon
    ? Math.max(5, Math.min(8, nodeTechIcon.size * 0.28))
    : 0
  const nodeTechIconHandleOffset = nodeTechIconHandleSize / 2

  return (
    <g
      className="node-group"
      data-node-id={node.id}
      transform={`translate(${node.bounds.x}, ${node.bounds.y})`}
      onPointerDown={(event) => onNodePointerDown(event, node, 'move')}
      onPointerMove={onNodePointerMove}
      onPointerUp={onNodePointerUp}
      onPointerLeave={onNodePointerLeave}
      onDoubleClick={(event) => {
        const modifiersPressed = (event.ctrlKey || event.metaKey) && event.altKey
        if (!presentationMode && modifiersPressed && node.kind !== 'note' && !isBasicShape) {
          onCreateDrilldown(node.id)
          return
        }
        if (node.drilldownRef) {
          onOpenDrilldown(node.id)
        }
      }}
    >
      {node.kind === 'shape-circle' ? (
        <ellipse
          cx={node.bounds.w / 2}
          cy={node.bounds.h / 2}
          rx={node.bounds.w / 2}
          ry={node.bounds.h / 2}
          className={nodeClassName}
          style={nodeFillColor ? { fill: nodeFillColor } : undefined}
        />
      ) : triangleShape ? (
        <path
          d={triangleShape.shellPath}
          className={nodeClassName}
          style={nodeFillColor ? { fill: nodeFillColor } : undefined}
        />
      ) : diamondShape ? (
        <path
          d={diamondShape.shellPath}
          className={nodeClassName}
          style={nodeFillColor ? { fill: nodeFillColor } : undefined}
        />
      ) : node.kind === 'note' && stickyNoteShape ? (
        <g>
          <path
            d={stickyNoteShape.shellPath}
            className={nodeClassName}
            style={nodeFillColor ? { fill: nodeFillColor } : undefined}
          />
          <path d={stickyNoteShape.foldPath} className="node-note-fold" />
          <g className="node-note-pin" aria-hidden="true">
            <circle
              cx={node.bounds.w / 2}
              cy={13}
              r={6}
              className="node-note-pin-head"
            />
            <path
              d={`M ${node.bounds.w / 2} 19 L ${node.bounds.w / 2 + 1.5} 30`}
              className="node-note-pin-needle"
            />
            <circle
              cx={node.bounds.w / 2 + 1.5}
              cy={30}
              r={1.5}
              className="node-note-pin-tip"
            />
          </g>
        </g>
      ) : node.kind === 'db' ? (
        <g>
          <path
            d={dbShape.shellPath}
            className={nodeClassName}
            style={nodeFillColor ? { fill: nodeFillColor } : undefined}
          />
          {nodeDepthEffectsActive ? (
            <>
              <path d={dbShape.shellPath} className="node-depth-fill node-depth-layer" />
              <path d={dbShape.shellPath} className="node-depth-sheen node-depth-layer" />
            </>
          ) : null}
          <path
            d={dbShape.topFrontArcPath}
            className="node-shape-detail"
          />
          {nodeDepthEffectsActive ? (
            <path d={dbShape.topFrontArcPath} className="node-depth-rim node-depth-layer" />
          ) : null}
        </g>
      ) : node.kind === 'queue' ? (
        <g>
          <path
            d={queueShape.shellPath}
            className={nodeClassName}
            style={nodeFillColor ? { fill: nodeFillColor } : undefined}
          />
          {nodeDepthEffectsActive ? (
            <>
              <path d={queueShape.shellPath} className="node-depth-fill node-depth-layer" />
              <path d={queueShape.shellPath} className="node-depth-sheen node-depth-layer" />
            </>
          ) : null}
          <path d={queueShape.frontCapPath} className="node-shape-detail" />
          {nodeDepthEffectsActive ? (
            <path d={queueShape.frontCapPath} className="node-depth-rim node-depth-layer" />
          ) : null}
        </g>
      ) : hexagonShape ? (
        <g>
          <path
            d={hexagonShape.shellPath}
            className={nodeClassName}
            style={nodeFillColor ? { fill: nodeFillColor } : undefined}
          />
          {nodeDepthEffectsActive ? (
            <>
              <path d={hexagonShape.shellPath} className="node-depth-fill node-depth-layer" />
              <path d={hexagonShape.shellPath} className="node-depth-sheen node-depth-layer" />
              <path d={hexagonShape.shellPath} className="node-depth-outline node-depth-layer" />
            </>
          ) : null}
        </g>
      ) : (
        <g>
          <rect
            x={0}
            y={0}
            width={node.bounds.w}
            height={node.bounds.h}
            rx={12}
            className={nodeClassName}
            style={nodeFillColor ? { fill: nodeFillColor } : undefined}
          />
          {nodeDepthEffectsActive ? (
            <>
              <rect
                x={0}
                y={0}
                width={node.bounds.w}
                height={node.bounds.h}
                rx={12}
                className="node-depth-fill node-depth-layer"
              />
              <rect
                x={0}
                y={0}
                width={node.bounds.w}
                height={node.bounds.h}
                rx={12}
                className="node-depth-sheen node-depth-layer"
              />
              <path
                d={`M 10 10 H ${Math.max(10, node.bounds.w - 10)}`}
                className="node-depth-rim node-depth-layer"
              />
            </>
          ) : null}
        </g>
      )}
      {node.kind === 'boundary' && node.drilldownRef ? (
        <rect
          className="node-drilldown-hitarea"
          x={0}
          y={0}
          width={node.bounds.w}
          height={node.bounds.h}
          rx={12}
        />
      ) : null}
      {!presentationMode && activeTool === 'select' && !isConnectorMode ? (
        hexagonBorderShape ? (
          <path
            className="node-border-hitarea"
            d={hexagonBorderShape.shellPath}
            onPointerDown={(event) => onNodeBorderPointerDown(event, node)}
            onPointerMove={(event) => onNodeBorderPointerMove(event, node)}
            onPointerLeave={onNodeBorderPointerLeave}
          />
        ) : (
          <rect
            className="node-border-hitarea"
            x={0}
            y={0}
            width={node.bounds.w}
            height={node.bounds.h}
            rx={12}
            onPointerDown={(event) => onNodeBorderPointerDown(event, node)}
            onPointerMove={(event) => onNodeBorderPointerMove(event, node)}
            onPointerLeave={onNodeBorderPointerLeave}
          />
        )
      ) : null}
      {node.drilldownRef && node.kind !== 'note' && !isBasicShape ? (
        <g className="node-drilldown-badge" aria-hidden="true">
          <rect
            x={drilldownBadgeX}
            y={drilldownBadgeY}
            width={16}
            height={16}
            rx={3}
            className="node-drilldown-badge-shell"
          />
          <path
            d={`M ${drilldownBadgeX + 5} ${drilldownBadgeY + 11} L ${drilldownBadgeX + 11} ${
              drilldownBadgeY + 5
            } M ${drilldownBadgeX + 8} ${drilldownBadgeY + 5} H ${
              drilldownBadgeX + 11
            } V ${drilldownBadgeY + 8}`}
            className="node-drilldown-badge-glyph"
          />
        </g>
      ) : null}
      {connectorRole === 'female' ? (
        <g className="node-connector-icon node-connector-female">
          <rect
            x={connectorIconX + 2}
            y={connectorIconY + 3}
            width={16}
            height={10}
            rx={3}
            className="node-connector-shell"
          />
          <circle
            cx={connectorIconX + 8}
            cy={connectorIconY + 8}
            r={1.2}
            className="node-connector-dot"
          />
          <circle
            cx={connectorIconX + 12}
            cy={connectorIconY + 8}
            r={1.2}
            className="node-connector-dot"
          />
          <path
            d={`M ${connectorIconX + 10} ${connectorIconY + 13} V ${
              connectorIconY + 16
            }`}
            className="node-connector-line"
          />
        </g>
      ) : null}
      {connectorRole === 'male' ? (
        <g className="node-connector-icon node-connector-male">
          <rect
            x={connectorIconX + 4}
            y={connectorIconY + 5}
            width={12}
            height={8}
            rx={2}
            className="node-connector-shell"
          />
          <path
            d={`M ${connectorIconX + 7} ${connectorIconY + 5} V ${
              connectorIconY + 2
            } M ${connectorIconX + 13} ${connectorIconY + 5} V ${
              connectorIconY + 2
            } M ${connectorIconX + 10} ${connectorIconY + 13} V ${
              connectorIconY + 16
            }`}
            className="node-connector-line"
          />
        </g>
      ) : null}
      {nodeTechIcon ? (
        <g
          className={
            isNodeTechIconEditing
              ? 'node-tech-icon node-tech-icon-editing'
              : 'node-tech-icon'
          }
          onPointerDown={(event) => onNodeTechIconPointerDown(event, node)}
        >
          <g
            role="img"
            aria-label={node.tech?.label ?? 'Technology icon'}
            className="node-tech-icon-glyph"
            transform={`translate(${nodeTechIcon.x}, ${nodeTechIcon.y}) scale(${nodeTechIcon.size / 24})`}
            onPointerDownCapture={(event) => onNodeTechIconPointerDown(event, node)}
          >
            <TechIconGlyphContent iconId={node.uiIcon?.iconId ?? ''} title={node.tech?.label ?? 'Technology icon'} />
          </g>
          {isNodeTechIconEditing ? (
            <>
              <rect
                x={nodeTechIcon.x - 3}
                y={nodeTechIcon.y - 3}
                width={nodeTechIcon.size + 6}
                height={nodeTechIcon.size + 6}
                rx={4}
                className="node-tech-icon-edit-frame"
              />
              {(['nw', 'ne', 'sw', 'se'] as const).map((handle) => {
                const handleX = handle.includes('w')
                  ? nodeTechIcon.x - nodeTechIconHandleOffset
                  : nodeTechIcon.x + nodeTechIcon.size - nodeTechIconHandleOffset
                const handleY = handle.includes('n')
                  ? nodeTechIcon.y - nodeTechIconHandleOffset
                  : nodeTechIcon.y + nodeTechIcon.size - nodeTechIconHandleOffset
                return (
                  <rect
                    key={handle}
                    x={handleX}
                    y={handleY}
                    width={nodeTechIconHandleSize}
                    height={nodeTechIconHandleSize}
                    rx={2}
                    className={`node-tech-icon-resize node-tech-icon-resize-${handle}`}
                    onPointerDown={(event) => onNodeTechIconResizePointerDown(event, node, handle)}
                  />
                )
              })}
            </>
          ) : null}
        </g>
      ) : null}
      <Text.Svg
        x={labelLayout.titleX}
        y={labelLayout.titleY}
        className={[
          'node-title',
          node.kind === 'note' ? 'node-note-title' : '',
          shouldRenderHexagon ? 'node-title-hex' : '',
          !presentationMode ? 'canvas-text-editable' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        textAnchor={labelLayout.textAnchor}
        style={nodeTextColor ? { fill: nodeTextColor } : undefined}
        onLongPress={
          presentationMode
            ? undefined
            : (event) => {
                onStartInlineEdit(event, node, 'node-name', labelLayout)
              }
        }
        onPressMoveStart={presentationMode ? undefined : (event) => onNodePointerDown(event, node, 'move')}
      >
        {node.kind === 'note' || isBasicShape ? nodeTitleText : `${nodeTitlePrefix}${nodeTitleText}`}
      </Text.Svg>
      {nodeSubtitleText ? (
        <Text.Svg
          x={labelLayout.subtitleX}
          y={labelLayout.subtitleY}
          className={[
            'node-subtitle',
            shouldRenderHexagon ? 'node-subtitle-hex' : '',
            !presentationMode ? 'canvas-text-editable' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          textAnchor={labelLayout.textAnchor}
          style={nodeTextColor ? { fill: nodeTextColor } : undefined}
          onLongPress={
            presentationMode
              ? undefined
              : (event) => {
                  onStartInlineEdit(event, node, 'node-tech', labelLayout)
                }
          }
          onPressMoveStart={presentationMode ? undefined : (event) => onNodePointerDown(event, node, 'move')}
        >
          {nodeSubtitleText}
        </Text.Svg>
      ) : null}
      {!presentationMode
        ? node.ports.map((port) => {
            const isHoveredPort = hoveredPortKey === `${node.id}:${port.id}`
            const isConnectionTargetPort =
              hoveredConnectionTarget?.nodeId === node.id &&
              hoveredConnectionTarget.portId === port.id
            const cx = node.bounds.w * port.x
            const cy = node.bounds.h * port.y
            return (
              <g key={port.id}>
                {isHoveredPort || isConnectionTargetPort ? (
                  <circle
                    className={
                      isConnectionTargetPort
                        ? 'node-port-affordance node-port-affordance-active'
                        : 'node-port-affordance'
                    }
                    cx={cx}
                    cy={cy}
                    r={9}
                    aria-hidden="true"
                  />
                ) : null}
                <circle
                  className={resolveNodePortClassName({
                    isHovered: isHoveredPort,
                    isConnectionTarget: isConnectionTargetPort,
                  })}
                  cx={cx}
                  cy={cy}
                  r={4}
                  onPointerEnter={() => onPortPointerEnter(node.id, port.id)}
                  onPointerLeave={() => onPortPointerLeave(node.id, port.id)}
                  onPointerDown={(event) => onPortPointerDown(event, node, port.id)}
                />
              </g>
            )
          })
        : null}
    </g>
  )
}
