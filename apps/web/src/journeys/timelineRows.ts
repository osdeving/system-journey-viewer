/**
 * Purpose: Build timeline rows for journey playback, including top-level parallel thread lanes grouped by tick.
 */

import type { JourneyModel } from '../model/types'
import { resolveJourneyPlaybackTicks } from './playbackPlan'

export type JourneyTimelineRow = {
  key: string
  tickIndex: number
  tickStepCount: number
  showTickBadge: boolean
  laneKind: 'main' | 'thread'
  threadId?: string
  laneStepNumber: number
  edgeId: string
  accentColor: string
}

const clampByte = (value: number): number => Math.max(0, Math.min(255, Math.round(value)))

const parseHexColor = (value: string): { r: number; g: number; b: number } | null => {
  const trimmed = value.trim()
  const match = trimmed.match(/^#([0-9a-f]{6})$/i)
  if (!match) {
    return null
  }
  const hex = match[1]
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  }
}

const toHexColor = ({ r, g, b }: { r: number; g: number; b: number }): string =>
  `#${clampByte(r).toString(16).padStart(2, '0')}${clampByte(g).toString(16).padStart(2, '0')}${clampByte(b)
    .toString(16)
    .padStart(2, '0')}`

const mixRgb = (
  left: { r: number; g: number; b: number },
  right: { r: number; g: number; b: number },
  ratio: number,
): { r: number; g: number; b: number } => {
  const t = Math.max(0, Math.min(1, ratio))
  return {
    r: left.r * (1 - t) + right.r * t,
    g: left.g * (1 - t) + right.g * t,
    b: left.b * (1 - t) + right.b * t,
  }
}

export const deriveThreadTimelineColor = (baseColor: string, threadOrder: number): string => {
  const parsed = parseHexColor(baseColor)
  if (!parsed) {
    return baseColor
  }
  const palette = [
    { r: 56, g: 189, b: 248 }, // sky-400
    { r: 168, g: 85, b: 247 }, // purple-500
    { r: 34, g: 197, b: 94 }, // green-500
    { r: 245, g: 158, b: 11 }, // amber-500
    { r: 244, g: 63, b: 94 }, // rose-500
  ]
  const target = palette[Math.max(0, threadOrder) % palette.length]
  const ratio = 0.52 + ((threadOrder % 2) * 0.08)
  return toHexColor(mixRgb(parsed, target, ratio))
}

export const resolveJourneyTimelineRows = (
  journey: JourneyModel | undefined,
): JourneyTimelineRow[] => {
  if (!journey) {
    return []
  }

  const ticks = resolveJourneyPlaybackTicks(journey)
  const threadOrderById = new Map<string, number>()
  let nextThreadOrder = 0

  const rows: JourneyTimelineRow[] = []
  for (const tick of ticks) {
    tick.steps.forEach((step, stepIndex) => {
      const isThread = step.laneKind === 'thread'
      const threadId = isThread ? step.threadId : undefined
      let threadOrder = -1
      if (threadId) {
        threadOrder = threadOrderById.get(threadId) ?? nextThreadOrder
        if (!threadOrderById.has(threadId)) {
          threadOrderById.set(threadId, threadOrder)
          nextThreadOrder += 1
        }
      }

      rows.push({
        key: `${tick.index}:${step.laneId}:${step.edgeId}`,
        tickIndex: tick.index,
        tickStepCount: tick.steps.length,
        showTickBadge: stepIndex === 0,
        laneKind: step.laneKind,
        threadId,
        laneStepNumber: step.n,
        edgeId: step.edgeId,
        accentColor: isThread ? deriveThreadTimelineColor(journey.colorKey, threadOrder) : journey.colorKey,
      })
    })
  }

  return rows
}
