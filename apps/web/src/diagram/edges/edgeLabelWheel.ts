/**
 * Purpose: Provide pure helpers for edge geometry, badges, labels, and presentation styling in the diagram layer.
 */

export const EDGE_LABEL_ROTATION_STEP_DEG = 6
export const EDGE_LABEL_GLOBAL_ROTATION_STEP_DEG = 90
const EDGE_LABEL_GLOBAL_ALIGNMENT_EPSILON_DEG = 0.5

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

const normalizeAngleDeg = (angleDeg: number): number => {
  const normalized = ((((angleDeg + 180) % 360) + 360) % 360) - 180
  return normalized === -180 ? 180 : normalized
}

export const resolveNextGlobalEdgeLabelRotationAngle = (
  baseAngleDeg: number,
  currentAngleDeg: number,
  direction: 1 | -1 = 1,
): number => {
  const currentGlobalAngle = normalizeAngleDeg(baseAngleDeg + currentAngleDeg)
  const nearestGlobalQuarter = normalizeAngleDeg(
    Math.round(currentGlobalAngle / EDGE_LABEL_GLOBAL_ROTATION_STEP_DEG) *
      EDGE_LABEL_GLOBAL_ROTATION_STEP_DEG,
  )
  const distanceFromQuarter = Math.abs(
    normalizeAngleDeg(currentGlobalAngle - nearestGlobalQuarter),
  )
  const targetGlobalAngle =
    distanceFromQuarter > EDGE_LABEL_GLOBAL_ALIGNMENT_EPSILON_DEG
      ? nearestGlobalQuarter
      : normalizeAngleDeg(
          nearestGlobalQuarter + EDGE_LABEL_GLOBAL_ROTATION_STEP_DEG * direction,
        )

  return normalizeAngleDeg(targetGlobalAngle - baseAngleDeg)
}
