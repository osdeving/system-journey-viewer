/**
 * Purpose: Verify edge Label Wheel behavior with regression-focused unit tests.
 */

import { describe, expect, it } from 'vitest'
import {
  EDGE_LABEL_GLOBAL_ROTATION_STEP_DEG,
  EDGE_LABEL_ROTATION_STEP_DEG,
  resolveNextGlobalEdgeLabelRotationAngle,
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

  it('snaps selected labels to global 90 degree axes before rotating to the next axis', () => {
    expect(EDGE_LABEL_GLOBAL_ROTATION_STEP_DEG).toBe(90)
    expect(resolveNextGlobalEdgeLabelRotationAngle(8, 0)).toBe(-8)
    expect(resolveNextGlobalEdgeLabelRotationAngle(8, -8)).toBe(82)
    expect(resolveNextGlobalEdgeLabelRotationAngle(8, 82, -1)).toBe(-8)
  })

  it('keeps the stored label angle relative to the current edge base angle', () => {
    expect(resolveNextGlobalEdgeLabelRotationAngle(-76, 0)).toBe(-14)
    expect(resolveNextGlobalEdgeLabelRotationAngle(170, 0)).toBe(10)
  })
})
