export type EdgeCurvePath = {
  start: { x: number; y: number }
  control1: { x: number; y: number }
  control2: { x: number; y: number }
  end: { x: number; y: number }
}

const BADGE_OFFSET_FROM_START_PX = 30
const MIN_BADGE_PROGRESS = 0.06
const MAX_BADGE_PROGRESS = 0.2

export const cubicPointAt = (
  curve: EdgeCurvePath,
  progress: number,
): { x: number; y: number } => {
  const p = Math.max(0, Math.min(1, progress))
  const inverse = 1 - p
  const x =
    inverse ** 3 * curve.start.x +
    3 * inverse ** 2 * p * curve.control1.x +
    3 * inverse * p ** 2 * curve.control2.x +
    p ** 3 * curve.end.x
  const y =
    inverse ** 3 * curve.start.y +
    3 * inverse ** 2 * p * curve.control1.y +
    3 * inverse * p ** 2 * curve.control2.y +
    p ** 3 * curve.end.y
  return { x, y }
}

export const curveToSvgPath = (curve: EdgeCurvePath): string =>
  `M ${curve.start.x} ${curve.start.y} C ${curve.control1.x} ${curve.control1.y}, ${curve.control2.x} ${curve.control2.y}, ${curve.end.x} ${curve.end.y}`

export const estimateCurveLength = (
  curve: EdgeCurvePath,
  segments = 24,
): number => {
  const safeSegments = Math.max(4, segments)
  let previous = cubicPointAt(curve, 0)
  let length = 0
  for (let index = 1; index <= safeSegments; index += 1) {
    const point = cubicPointAt(curve, index / safeSegments)
    length += Math.hypot(point.x - previous.x, point.y - previous.y)
    previous = point
  }
  return length
}

export const resolveEdgeStepBadgeProgress = (
  curve: EdgeCurvePath,
): number => {
  const curveLength = Math.max(1, estimateCurveLength(curve))
  const offsetProgress = BADGE_OFFSET_FROM_START_PX / curveLength
  return Math.max(
    MIN_BADGE_PROGRESS,
    Math.min(MAX_BADGE_PROGRESS, offsetProgress),
  )
}

export const composeEdgeDisplayLabel = (
  edgeLabel: string,
  protocolLabel?: string,
): string => {
  const normalizedProtocol = protocolLabel?.trim()
  if (!normalizedProtocol) {
    return edgeLabel
  }
  return `${edgeLabel} (${normalizedProtocol.toLowerCase()})`
}
