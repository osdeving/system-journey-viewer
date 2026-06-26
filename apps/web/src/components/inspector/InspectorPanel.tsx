/**
 * Purpose: Render reusable node and edge inspector forms from explicit editor callbacks.
 */

import { PanelGroup } from '../chrome/PanelGroup'
import type { EdgeModel, NodeModel } from '../../model/types'

export interface InspectorProtocolOption {
  id: string
  label: string
}

export interface InspectorPanelProps {
  selectedNode: NodeModel | null
  selectedEdge: EdgeModel | null
  selectedNodeCount: number
  selectedNodePresetLabel: string
  theme: 'light' | 'dark'
  nodeColorPresets: string[]
  nodeTextColorPresets: string[]
  protocolOptions: InspectorProtocolOption[]
  activeJourneyId: string | null
  getTooltip: (label: string) => string | undefined
  onNodeNameChange: (nodeId: string, value: string) => void
  onNodeTechChange: (nodeId: string, value: string) => void
  onNodeColorChange: (nodeId: string, value: string) => void
  onNodeTextColorChange: (nodeId: string, value: string) => void
  onEdgeLabelChange: (edgeId: string, value: string) => void
  onEdgeProtocolChange: (edgeId: string, protocolPresetId: string) => void
  onEdgeLabelPositionChange: (edgeId: string, value: number) => void
  onEdgeLabelSideChange: (edgeId: string, value: 'left' | 'right') => void
  onEdgeLabelAngleChange: (edgeId: string, value: number) => void
  onDuplicateSelection: () => void
  onDeleteSelection: () => void
  onAddEdgeToActiveJourney: (edgeId: string) => void
}

const isHexColor = (value?: string): boolean =>
  Boolean(value && /^#[0-9a-f]{6}$/i.test(value.trim()))

export const InspectorPanel = ({
  selectedNode,
  selectedEdge,
  selectedNodeCount,
  selectedNodePresetLabel,
  theme,
  nodeColorPresets,
  nodeTextColorPresets,
  protocolOptions,
  activeJourneyId,
  getTooltip,
  onNodeNameChange,
  onNodeTechChange,
  onNodeColorChange,
  onNodeTextColorChange,
  onEdgeLabelChange,
  onEdgeProtocolChange,
  onEdgeLabelPositionChange,
  onEdgeLabelSideChange,
  onEdgeLabelAngleChange,
  onDuplicateSelection,
  onDeleteSelection,
  onAddEdgeToActiveJourney,
}: InspectorPanelProps) => {
  const fallbackTextColor = theme === 'dark' ? '#f8fafc' : '#0f172a'

  return (
    <div className="dock-content-section">
      <h2>Inspector</h2>
      {!selectedNode && !selectedEdge ? <p>Select a node or edge on the canvas.</p> : null}
      {selectedNodeCount > 1 ? (
        <p>
          {selectedNodeCount} selected components (current focus:{' '}
          {selectedNode?.name ?? 'n/a'}).
        </p>
      ) : null}
      {selectedNode ? (
        <PanelGroup title="Node details">
          <div className="inspector-form">
            <label htmlFor="node-id">ID</label>
            <input id="node-id" value={selectedNode.id} disabled />
            <label htmlFor="node-kind">Type</label>
            <input id="node-kind" value={selectedNode.kind} disabled />
            <label htmlFor="node-name">Name</label>
            {selectedNode.kind === 'note' ? (
              <textarea
                id="node-name"
                data-tutorial-id="inspector-node-name"
                rows={4}
                value={selectedNode.name}
                onChange={(event) => onNodeNameChange(selectedNode.id, event.target.value)}
              />
            ) : (
              <input
                id="node-name"
                data-tutorial-id="inspector-node-name"
                value={selectedNode.name}
                onChange={(event) => onNodeNameChange(selectedNode.id, event.target.value)}
              />
            )}
            <label htmlFor="node-preset">Preset</label>
            <input id="node-preset" value={selectedNodePresetLabel} disabled />
            <label htmlFor="node-tech">Technology</label>
            <input
              id="node-tech"
              value={selectedNode.tech?.label ?? ''}
              onChange={(event) => onNodeTechChange(selectedNode.id, event.target.value)}
            />
            {selectedNode.kind !== 'boundary' ? (
              <>
                <label htmlFor="node-color">Node color</label>
                <input
                  id="node-color"
                  type="color"
                  value={
                    isHexColor(selectedNode.style?.fillColor)
                      ? selectedNode.style?.fillColor ?? '#2563eb'
                      : '#2563eb'
                  }
                  onChange={(event) => onNodeColorChange(selectedNode.id, event.target.value)}
                />
                <label>
                  Suggested palette ({theme === 'dark' ? 'Tailwind dark' : 'Tailwind light'})
                </label>
                <div className="node-color-presets">
                  {nodeColorPresets.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={
                        selectedNode.style?.fillColor === color
                          ? 'node-color-chip node-color-chip-active'
                          : 'node-color-chip'
                      }
                      style={{ background: color }}
                      title={getTooltip(color)}
                      onClick={() => onNodeColorChange(selectedNode.id, color)}
                    />
                  ))}
                </div>
              </>
            ) : null}
            <label htmlFor="node-text-color">Text color</label>
            <input
              id="node-text-color"
              type="color"
              value={
                isHexColor(selectedNode.style?.textColor)
                  ? selectedNode.style?.textColor ?? fallbackTextColor
                  : fallbackTextColor
              }
              onChange={(event) => onNodeTextColorChange(selectedNode.id, event.target.value)}
            />
            <label>Text palette</label>
            <div className="node-color-presets">
              {nodeTextColorPresets.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={
                    selectedNode.style?.textColor === color
                      ? 'node-color-chip node-color-chip-active'
                      : 'node-color-chip'
                  }
                  style={{ background: color }}
                  title={getTooltip(color)}
                  onClick={() => onNodeTextColorChange(selectedNode.id, color)}
                />
              ))}
            </div>
            <div className="inspector-actions">
              <button type="button" onClick={onDuplicateSelection}>
                Duplicate
              </button>
              <button type="button" onClick={onDeleteSelection}>
                Delete
              </button>
            </div>
          </div>
        </PanelGroup>
      ) : null}
      {selectedEdge ? (
        <PanelGroup title="Edge details">
          <div className="inspector-form">
            <label htmlFor="edge-id">ID</label>
            <input id="edge-id" value={selectedEdge.id} disabled />
            <label htmlFor="edge-label">Label</label>
            <input
              id="edge-label"
              data-tutorial-id="inspector-edge-label"
              value={selectedEdge.label}
              onChange={(event) => onEdgeLabelChange(selectedEdge.id, event.target.value)}
            />
            <label htmlFor="edge-protocol">Protocol</label>
            <select
              id="edge-protocol"
              data-tutorial-id="inspector-edge-protocol"
              value={selectedEdge.protocolPresetId}
              onChange={(event) =>
                onEdgeProtocolChange(selectedEdge.id, event.target.value)
              }
            >
              {protocolOptions.map((protocol) => (
                <option key={protocol.id} value={protocol.id}>
                  {protocol.label}
                </option>
              ))}
            </select>
            <label htmlFor="edge-label-position">Label Position</label>
            <input
              id="edge-label-position"
              type="range"
              min={0.08}
              max={0.92}
              step={0.01}
              value={selectedEdge.style.labelPosition ?? 0.5}
              onChange={(event) =>
                onEdgeLabelPositionChange(selectedEdge.id, Number(event.target.value))
              }
            />
            <span className="edge-label-position-value">
              {Math.round((selectedEdge.style.labelPosition ?? 0.5) * 100)}%
            </span>
            <label htmlFor="edge-label-side">Label Side</label>
            <select
              id="edge-label-side"
              value={selectedEdge.style.labelSide ?? 'left'}
              onChange={(event) =>
                onEdgeLabelSideChange(
                  selectedEdge.id,
                  event.target.value as 'left' | 'right',
                )
              }
            >
              <option value="left">Left / Top</option>
              <option value="right">Right / Bottom</option>
            </select>
            <label htmlFor="edge-label-angle">Label Rotation</label>
            <input
              id="edge-label-angle"
              type="range"
              min={-180}
              max={180}
              step={1}
              value={selectedEdge.style.labelAngle ?? 0}
              onChange={(event) =>
                onEdgeLabelAngleChange(selectedEdge.id, Number(event.target.value))
              }
            />
            <span className="edge-label-position-value">
              {Math.round(selectedEdge.style.labelAngle ?? 0)}°
            </span>
            <div className="inspector-actions">
              <button type="button" onClick={onDuplicateSelection}>
                Duplicate
              </button>
              <button type="button" onClick={onDeleteSelection}>
                Delete
              </button>
            </div>
            <button
              type="button"
              onClick={() => onAddEdgeToActiveJourney(selectedEdge.id)}
              disabled={!activeJourneyId}
            >
              Add to Active Journey
            </button>
          </div>
        </PanelGroup>
      ) : null}
    </div>
  )
}
