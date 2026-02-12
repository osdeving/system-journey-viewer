export type TrailPoint = { x: number; y: number }

export const buildTrailPoints = (
  previousPoint: TrailPoint | null,
  nextPoint: TrailPoint,
  spacing: number,
): TrailPoint[] => {
  const safeSpacing = Math.max(0.25, spacing)
  if (!previousPoint) {
    return [nextPoint]
  }

  const dx = nextPoint.x - previousPoint.x
  const dy = nextPoint.y - previousPoint.y
  const distance = Math.hypot(dx, dy)
  if (distance < safeSpacing) {
    return []
  }

  const points: TrailPoint[] = []
  const segments = Math.floor(distance / safeSpacing)
  for (let index = 1; index <= segments; index += 1) {
    const ratio = (index * safeSpacing) / distance
    points.push({
      x: previousPoint.x + dx * ratio,
      y: previousPoint.y + dy * ratio,
    })
  }
  return points
}
