/**
 * Purpose: Verify node port affordance class resolution for hover and connection states.
 */

import { describe, expect, it } from 'vitest'
import { resolveNodePortClassName } from './nodePortClassName'

describe('resolveNodePortClassName', () => {
  it('keeps the base port class when idle', () => {
    expect(
      resolveNodePortClassName({
        isHovered: false,
        isConnectionTarget: false,
      }),
    ).toBe('node-port')
  })

  it('adds a hover affordance class when the pointer is exactly over the port', () => {
    expect(
      resolveNodePortClassName({
        isHovered: true,
        isConnectionTarget: false,
      }),
    ).toBe('node-port node-port-hover')
  })

  it('prioritizes the connection-target highlight while preserving hover affordance classes', () => {
    expect(
      resolveNodePortClassName({
        isHovered: true,
        isConnectionTarget: true,
      }),
    ).toBe('node-port node-port-hover node-port-highlight')
  })
})
