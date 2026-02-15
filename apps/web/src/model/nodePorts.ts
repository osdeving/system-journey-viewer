import type { NodeBounds, PortModel, WorkspaceModel } from './types'

const HORIZONTAL_SPACING = 88
const VERTICAL_SPACING = 76

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value))

const uniqueSorted = (values: number[]): number[] =>
  Array.from(
    new Set(
      values
        .map((value) => clamp(value, 0, 1))
        .map((value) => Number(value.toFixed(4))),
    ),
  ).sort((left, right) => left - right)

const distributedRatios = (size: number, spacing: number): number[] => {
  const count = Math.max(3, Math.floor(size / spacing) + 1)
  if (count <= 2) {
    return [0, 1]
  }
  const values: number[] = []
  for (let index = 0; index < count; index += 1) {
    values.push(index / (count - 1))
  }
  values.push(0.5)
  return uniqueSorted(values)
}

const buildTopPorts = (positions: number[]): PortModel[] =>
  positions.map((x, index) => ({
    id: Math.abs(x - 0.5) < 0.0001 ? 'north' : `north_${index + 1}`,
    x,
    y: 0,
  }))

const buildBottomPorts = (positions: number[]): PortModel[] =>
  positions.map((x, index) => ({
    id: Math.abs(x - 0.5) < 0.0001 ? 'south' : `south_${index + 1}`,
    x,
    y: 1,
  }))

const buildSidePorts = (
  positions: number[],
  side: 'east' | 'west',
): PortModel[] =>
  positions
    .filter((y) => y > 0 && y < 1)
    .map((y, index) => ({
      id: Math.abs(y - 0.5) < 0.0001 ? side : `${side}_${index + 1}`,
      x: side === 'east' ? 1 : 0,
      y,
    }))

export const resolveNodePorts = (bounds: Pick<NodeBounds, 'w' | 'h'>): PortModel[] => {
  const width = Math.max(80, bounds.w)
  const height = Math.max(80, bounds.h)
  const horizontalPositions = distributedRatios(width, HORIZONTAL_SPACING)
  const verticalPositions = distributedRatios(height, VERTICAL_SPACING)

  return [
    ...buildTopPorts(horizontalPositions),
    ...buildBottomPorts(horizontalPositions),
    ...buildSidePorts(verticalPositions, 'west'),
    ...buildSidePorts(verticalPositions, 'east'),
  ]
}

export const normalizeWorkspaceNodePorts = (workspace: WorkspaceModel): WorkspaceModel => {
  for (const node of Object.values(workspace.nodes)) {
    node.ports = resolveNodePorts(node.bounds)
  }
  return workspace
}
