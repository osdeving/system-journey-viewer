import { describe, expect, it } from 'vitest'
import { resolveJourneyEdgeClassName } from './journeyEdgeClassName'

describe('resolveJourneyEdgeClassName', () => {
  it('keeps dashed flow animation for non-player edges', () => {
    expect(resolveJourneyEdgeClassName({ isSelected: false, isPlayerEdge: false })).toBe(
      'edge edge-flowing',
    )
  })

  it('adds selection and player classes without removing flowing dash', () => {
    expect(resolveJourneyEdgeClassName({ isSelected: true, isPlayerEdge: true })).toBe(
      'edge edge-selected edge-player-active edge-flowing',
    )
  })
})
