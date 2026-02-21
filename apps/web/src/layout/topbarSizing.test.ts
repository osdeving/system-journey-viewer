import { describe, expect, it } from 'vitest'
import { resolveTopbarHeight } from './topbarSizing'

describe('resolveTopbarHeight', () => {
  it('uses the scroll height when content exceeds rendered bounds', () => {
    expect(
      resolveTopbarHeight({
        minHeight: 108,
        renderedHeight: 108,
        scrollHeight: 172,
      }),
    ).toBe(172)
  })

  it('uses rendered height when it is the largest value', () => {
    expect(
      resolveTopbarHeight({
        minHeight: 108,
        renderedHeight: 140.1,
        scrollHeight: 138.6,
      }),
    ).toBe(141)
  })

  it('never returns less than the configured minimum height', () => {
    expect(
      resolveTopbarHeight({
        minHeight: 108,
        renderedHeight: 88,
        scrollHeight: 96,
      }),
    ).toBe(108)
  })

  it('guards against invalid metrics', () => {
    expect(
      resolveTopbarHeight({
        minHeight: 108,
        renderedHeight: Number.NaN,
        scrollHeight: Number.POSITIVE_INFINITY,
      }),
    ).toBe(108)
  })
})
