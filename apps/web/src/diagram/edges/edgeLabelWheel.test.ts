/**
 * Purpose: Verify edge Label Wheel behavior with regression-focused unit tests.
 */

import { describe, expect, it } from 'vitest'
import {
  EDGE_LABEL_ROTATION_STEP_DEG,
  resolveNextEdgeLabelRotationAngle,
} from './edgeLabelWheel'

describe('edgeLabelWheel', () => {
  it('rotates faster using the default step', () => {
    expect(EDGE_LABEL_ROTATION_STEP_DEG).toBe(6)
    expect(resolveNextEdgeLabelRotationAngle(0, -120)).toBe(6)
    expect(resolveNextEdgeLabelRotationAngle(0, 120)).toBe(-6)
  })

  it('keeps angle unchanged when there is no wheel movement', () => {
    expect(resolveNextEdgeLabelRotationAngle(14, 0)).toBe(14)
  })

  it('supports custom step override', () => {
    expect(resolveNextEdgeLabelRotationAngle(10, -80, 12)).toBe(22)
    expect(resolveNextEdgeLabelRotationAngle(10, 80, 4)).toBe(6)
  })
})

