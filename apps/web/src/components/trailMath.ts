export type TrailPoint = { x: number; y: number }
type TrailAlphaParticle = { alpha: number }

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

export const trimArrayStartInPlace = <T>(items: T[], maxItems: number): void => {
  const safeMax = Math.max(0, Math.floor(maxItems))
  const overflow = items.length - safeMax
  if (overflow > 0) {
    items.splice(0, overflow)
  }
}

export const compactPositiveAlphaInPlace = <T extends TrailAlphaParticle>(
  items: T[],
): void => {
  let writeIndex = 0
  for (let readIndex = 0; readIndex < items.length; readIndex += 1) {
    const particle = items[readIndex]
    if (particle.alpha > 0) {
      items[writeIndex] = particle
      writeIndex += 1
    }
  }
  items.length = writeIndex
}
