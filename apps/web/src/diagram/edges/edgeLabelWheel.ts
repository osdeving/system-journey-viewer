/**
 * Purpose: Provide pure helpers for edge geometry, badges, labels, and presentation styling in the diagram layer.
 */

export const EDGE_LABEL_ROTATION_STEP_DEG = 6

export const resolveNextEdgeLabelRotationAngle = (
  currentAngle: number,
  deltaY: number,
  stepDeg = EDGE_LABEL_ROTATION_STEP_DEG,
): number => {
  if (deltaY === 0) {
    return currentAngle
  }
  return deltaY < 0 ? currentAngle + stepDeg : currentAngle - stepDeg
}

