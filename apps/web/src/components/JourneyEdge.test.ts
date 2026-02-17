import { describe, expect, it } from 'vitest'
import { resolveJourneyEdgeClassName } from './journeyEdgeClassName'

describe('resolveJourneyEdgeClassName', () => {
  it('keeps dashed style without animation for non-context edges', () => {
    expect(
      resolveJourneyEdgeClassName({
        isSelected: false,
        isPlayerEdge: false,
        isFlowAnimated: false,
        isDimmed: false,
      }),
    ).toBe(
      'edge edge-flowing',
    )
  })

  it('adds animation when edge is active in current context', () => {
    expect(
      resolveJourneyEdgeClassName({
        isSelected: true,
        isPlayerEdge: true,
        isFlowAnimated: true,
        isDimmed: false,
      }),
    ).toBe('edge edge-selected edge-player-active edge-flowing edge-flowing-animated')
  })

  it('applies dimmed class for off-scope edges in journey focus mode', () => {
    expect(
      resolveJourneyEdgeClassName({
        isSelected: false,
        isPlayerEdge: false,
        isFlowAnimated: false,
        isDimmed: true,
      }),
    ).toBe('edge edge-dimmed edge-flowing')
  })
})
