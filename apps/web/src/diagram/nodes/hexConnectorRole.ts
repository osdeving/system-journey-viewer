/**
 * Purpose: Provide pure helpers for node shapes and connector semantics in the diagram layer.
 */

import type { NodeKind } from '../../model/types'

export type HexConnectorRole = 'female' | 'male' | null

export const resolveHexConnectorRole = (
  nodeKind: NodeKind,
): HexConnectorRole => {
  if (nodeKind === 'port-in' || nodeKind === 'port-out') {
    return 'female'
  }
  if (nodeKind === 'adapter-in' || nodeKind === 'adapter-out') {
    return 'male'
  }
  return null
}
