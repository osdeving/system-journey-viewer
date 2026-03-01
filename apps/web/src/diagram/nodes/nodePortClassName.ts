/**
 * Purpose: Provide a pure helper for node port affordance classes in the canvas.
 */

interface ResolveNodePortClassNameOptions {
  isHovered: boolean
  isConnectionTarget: boolean
}

export const resolveNodePortClassName = ({
  isHovered,
  isConnectionTarget,
}: ResolveNodePortClassNameOptions): string =>
  [
    'node-port',
    isHovered ? 'node-port-hover' : '',
    isConnectionTarget ? 'node-port-highlight' : '',
  ]
    .filter(Boolean)
    .join(' ')
