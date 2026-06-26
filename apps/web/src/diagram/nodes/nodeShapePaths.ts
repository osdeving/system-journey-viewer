/**
 * Purpose: Provide pure helpers for node shapes and connector semantics in the diagram layer.
 */

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

export type DbCylinderShape = {
  capRy: number
  shellPath: string
  topFrontArcPath: string
  bottomBackArcPath: string
}

export const resolveDbCylinderShape = (
  width: number,
  height: number,
): DbCylinderShape => {
  const capRy = clamp(height * 0.16, 9, Math.max(9, height * 0.28))
  const safeWidth = Math.max(width, 1)
  const safeHeight = Math.max(height, capRy * 2 + 2)
  const rx = safeWidth / 2
  const bottomY = safeHeight - capRy

  return {
    capRy,
    shellPath: `M 0 ${capRy} A ${rx} ${capRy} 0 0 1 ${safeWidth} ${capRy} V ${bottomY} A ${rx} ${capRy} 0 0 1 0 ${bottomY} Z`,
    topFrontArcPath: `M 0 ${capRy} A ${rx} ${capRy} 0 0 0 ${safeWidth} ${capRy}`,
    bottomBackArcPath: `M 0 ${bottomY} A ${rx} ${capRy} 0 0 1 ${safeWidth} ${bottomY}`,
  }
}

export type QueueCylinderShape = {
  capRx: number
  capRy: number
  shellPath: string
  frontCapPath: string
  rearInnerArcPath: string
}

export type HexagonShape = {
  shellPath: string
}

export const resolveQueueCylinderShape = (
  width: number,
  height: number,
): QueueCylinderShape => {
  const safeWidth = Math.max(width, 1)
  const safeHeight = Math.max(height, 1)
  const capRy = safeHeight / 2
  const capRxMax = Math.max(6, safeWidth / 2 - 1)
  const capRxMin = Math.min(10, capRxMax)
  const capRx = clamp(safeHeight * 0.36, capRxMin, capRxMax)
  const rightCenterX = safeWidth - capRx

  return {
    capRx,
    capRy,
    shellPath: `M ${capRx} 0 H ${rightCenterX} A ${capRx} ${capRy} 0 0 1 ${rightCenterX} ${safeHeight} H ${capRx} A ${capRx} ${capRy} 0 0 1 ${capRx} 0 Z`,
    frontCapPath: `M ${rightCenterX} 0 A ${capRx} ${capRy} 0 0 1 ${rightCenterX} ${safeHeight} A ${capRx} ${capRy} 0 0 1 ${rightCenterX} 0`,
    rearInnerArcPath: `M ${capRx} 0 A ${capRx} ${capRy} 0 0 1 ${capRx} ${safeHeight}`,
  }
}

export const resolveHexagonShape = (
  width: number,
  height: number,
  inset = 0,
): HexagonShape => {
  const safeWidth = Math.max(1, width)
  const safeHeight = Math.max(1, height)
  const clampedInset = clamp(inset, 0, Math.min(safeWidth, safeHeight) / 2 - 0.5)
  const leftX = clampedInset
  const rightX = safeWidth - clampedInset
  const topY = clampedInset
  const bottomY = safeHeight - clampedInset
  const centerY = (topY + bottomY) / 2
  const horizontalInset = clamp(
    (rightX - leftX) * 0.25,
    6,
    Math.max(6, (rightX - leftX) / 2 - 0.5),
  )
  const leftInnerX = leftX + horizontalInset
  const rightInnerX = rightX - horizontalInset

  return {
    shellPath: `M ${leftInnerX} ${topY} L ${rightInnerX} ${topY} L ${rightX} ${centerY} L ${rightInnerX} ${bottomY} L ${leftInnerX} ${bottomY} L ${leftX} ${centerY} Z`,
  }
}
