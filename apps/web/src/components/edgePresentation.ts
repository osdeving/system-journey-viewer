export type EdgeCurvePath = {
  start: { x: number; y: number }
  control1: { x: number; y: number }
  control2: { x: number; y: number }
  end: { x: number; y: number }
}

export type EdgeLabelSide = 'left' | 'right'

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

export const cubicTangentAt = (
  curve: EdgeCurvePath,
  progress: number,
): { x: number; y: number } => {
  const p = Math.max(0, Math.min(1, progress))
  const inverse = 1 - p
  const x =
    3 * inverse ** 2 * (curve.control1.x - curve.start.x) +
    6 * inverse * p * (curve.control2.x - curve.control1.x) +
    3 * p ** 2 * (curve.end.x - curve.control2.x)
  const y =
    3 * inverse ** 2 * (curve.control1.y - curve.start.y) +
    6 * inverse * p * (curve.control2.y - curve.control1.y) +
    3 * p ** 2 * (curve.end.y - curve.control2.y)
  return { x, y }
}

const normalizeVector = (vector: { x: number; y: number }): { x: number; y: number } => {
  const length = Math.hypot(vector.x, vector.y)
  if (length <= 0.0001) {
    return { x: 1, y: 0 }
  }
  return {
    x: vector.x / length,
    y: vector.y / length,
  }
}

const resolveReadableDirection = (
  tangent: { x: number; y: number },
): { direction: { x: number; y: number }; angleDeg: number; isVertical: boolean } => {
  const normalized = normalizeVector(tangent)
  const isVertical = Math.abs(normalized.y) > Math.abs(normalized.x) * 1.18
  if (isVertical) {
    // Keep vertical labels readable from bottom to top.
    return {
      direction: { x: 0, y: -1 },
      angleDeg: -90,
      isVertical: true,
    }
  }

  const readable =
    normalized.x < 0
      ? {
          x: -normalized.x,
          y: -normalized.y,
        }
      : normalized
  return {
    direction: readable,
    angleDeg: (Math.atan2(readable.y, readable.x) * 180) / Math.PI,
    isVertical: false,
  }
}

export const resolveEdgeLabelPlacement = (
  curve: EdgeCurvePath,
  progress: number,
  side: EdgeLabelSide = 'left',
  offset = 14,
): { point: { x: number; y: number }; angleDeg: number; isVertical: boolean } => {
  const p = Math.max(0.08, Math.min(0.92, progress))
  const anchor = cubicPointAt(curve, p)
  const tangent = cubicTangentAt(curve, p)
  const readable = resolveReadableDirection(tangent)

  let leftOffset: { x: number; y: number }
  if (readable.isVertical) {
    leftOffset = { x: -1, y: 0 }
  } else if (Math.abs(readable.direction.x) >= Math.abs(readable.direction.y)) {
    leftOffset = { x: 0, y: -1 }
  } else {
    leftOffset = normalizeVector({
      x: -readable.direction.y,
      y: readable.direction.x,
    })
  }

  const sideFactor = side === 'left' ? 1 : -1
  const offsetVector = {
    x: leftOffset.x * sideFactor * offset,
    y: leftOffset.y * sideFactor * offset,
  }

  return {
    point: {
      x: anchor.x + offsetVector.x,
      y: anchor.y + offsetVector.y,
    },
    angleDeg: readable.angleDeg,
    isVertical: readable.isVertical,
  }
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
