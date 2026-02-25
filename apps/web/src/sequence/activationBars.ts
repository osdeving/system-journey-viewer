/**
 * Purpose: Infer merged participant activation-bar spans from rendered sequence message placements.
 */

export interface SequenceActivationMessagePlacement {
  fromParticipantId: string
  toParticipantId: string
  y: number
  height: number
}

export interface SequenceActivationSegment {
  participantId: string
  startY: number
  endY: number
}

export interface SequenceActivationRowSlice {
  y: number
  height: number
}

export type ResolveSequenceActivationSegmentsOptions = {
  topInset?: number
  bottomInset?: number
  minHeight?: number
  mergeGap?: number
}

const clampNonNegative = (value: number): number => (Number.isFinite(value) ? Math.max(0, value) : 0)

export const resolveSequenceActivationRowSlice = (
  segment: Pick<SequenceActivationSegment, 'startY' | 'endY'>,
  rowY: number,
  rowHeight: number,
  options?: { topBleed?: number; bottomBleed?: number },
): SequenceActivationRowSlice | null => {
  const clipTop = clampNonNegative(rowY - (options?.topBleed ?? 0))
  const clipBottom = clampNonNegative(rowY + rowHeight + (options?.bottomBleed ?? 0))
  const startY = Math.max(segment.startY, clipTop)
  const endY = Math.min(segment.endY, clipBottom)
  if (endY <= startY) {
    return null
  }
  return {
    y: startY,
    height: endY - startY,
  }
}

export const resolveSequenceActivationSegments = (
  placements: SequenceActivationMessagePlacement[],
  options?: ResolveSequenceActivationSegmentsOptions,
): SequenceActivationSegment[] => {
  if (!placements.length) {
    return []
  }

  const topInset = options?.topInset ?? 14
  const bottomInset = options?.bottomInset ?? 8
  const minHeight = options?.minHeight ?? 18
  const mergeGap = options?.mergeGap ?? 26

  const intervalsByParticipant = new Map<string, Array<{ startY: number; endY: number }>>()

  const pushInterval = (participantId: string, startY: number, endY: number): void => {
    const bucket = intervalsByParticipant.get(participantId) ?? []
    bucket.push({ startY, endY })
    intervalsByParticipant.set(participantId, bucket)
  }

  for (const placement of placements) {
    const rowY = clampNonNegative(placement.y)
    const rowHeight = clampNonNegative(placement.height)
    if (rowHeight <= 0) {
      continue
    }
    const startY = rowY + topInset
    const endY = Math.max(startY + minHeight, rowY + Math.max(0, rowHeight - bottomInset))
    pushInterval(placement.fromParticipantId, startY, endY)
    if (placement.toParticipantId !== placement.fromParticipantId) {
      pushInterval(placement.toParticipantId, startY, endY)
    }
  }

  const segments: SequenceActivationSegment[] = []

  for (const [participantId, intervals] of intervalsByParticipant.entries()) {
    const sorted = intervals
      .slice()
      .sort((left, right) => left.startY - right.startY || left.endY - right.endY)

    let current = sorted[0]
    if (!current) {
      continue
    }

    for (let index = 1; index < sorted.length; index += 1) {
      const next = sorted[index]
      if (!next) {
        continue
      }
      if (next.startY <= current.endY + mergeGap) {
        current = {
          startY: current.startY,
          endY: Math.max(current.endY, next.endY),
        }
        continue
      }
      segments.push({ participantId, startY: current.startY, endY: current.endY })
      current = next
    }

    segments.push({ participantId, startY: current.startY, endY: current.endY })
  }

  return segments.sort(
    (left, right) =>
      left.participantId.localeCompare(right.participantId) ||
      left.startY - right.startY ||
      left.endY - right.endY,
  )
}
