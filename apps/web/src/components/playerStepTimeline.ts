const MIN_TRAVEL_DURATION_MS = 120
export const STEP_ARRIVAL_HOLD_MS = 40

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value))

export const resolveTravelProgress = (elapsedMs: number, speedMs: number): number => {
  const durationMs = Math.max(MIN_TRAVEL_DURATION_MS, speedMs)
  return clamp01(elapsedMs / durationMs)
}

export interface ArrivalAdvanceInput {
  travelProgress: number
  nowMs: number
  arrivalStartedAtMs: number | null
  alreadyAdvanced: boolean
  holdMs?: number
}

export interface ArrivalAdvanceResult {
  arrivalStartedAtMs: number | null
  shouldAdvance: boolean
}

export const resolveArrivalAdvance = ({
  travelProgress,
  nowMs,
  arrivalStartedAtMs,
  alreadyAdvanced,
  holdMs = STEP_ARRIVAL_HOLD_MS,
}: ArrivalAdvanceInput): ArrivalAdvanceResult => {
  if (travelProgress < 1) {
    return {
      arrivalStartedAtMs: null,
      shouldAdvance: false,
    }
  }

  const startedAt = arrivalStartedAtMs ?? nowMs
  if (alreadyAdvanced) {
    return {
      arrivalStartedAtMs: startedAt,
      shouldAdvance: false,
    }
  }

  return {
    arrivalStartedAtMs: startedAt,
    shouldAdvance: nowMs - startedAt >= holdMs,
  }
}
