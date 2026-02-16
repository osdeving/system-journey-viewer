import { describe, expect, it } from 'vitest'
import {
  resolveGifPaletteSampleIndices,
  resolveJourneyAnimationDurationMs,
  resolveJourneyLoopTimeline,
  resolveVideoMimeType,
} from './animatedExport'

describe('animated export helpers', () => {
  it('computes journey duration with step speed and arrival hold', () => {
    expect(resolveJourneyAnimationDurationMs(0, 900)).toBe(940)
    expect(resolveJourneyAnimationDurationMs(3, 900)).toBe(3140)
    expect(resolveJourneyAnimationDurationMs(2, 80)).toBe(640)
  })

  it('prefers mp4 when supported', () => {
    const resolved = resolveVideoMimeType((mime) => mime.includes('mp4'))
    expect(resolved).toEqual({
      extension: 'mp4',
      mimeType: 'video/mp4;codecs=h264',
    })
  })

  it('falls back to webm when mp4 is unavailable', () => {
    const resolved = resolveVideoMimeType((mime) => mime.startsWith('video/webm'))
    expect(resolved).toEqual({
      extension: 'webm',
      mimeType: 'video/webm;codecs=vp9',
    })
  })

  it('returns null when no compatible codec is supported', () => {
    const resolved = resolveVideoMimeType(() => false)
    expect(resolved).toBeNull()
  })

  it('samples gif palette frames across timeline including first and last frame', () => {
    expect(resolveGifPaletteSampleIndices(0)).toEqual([])
    expect(resolveGifPaletteSampleIndices(4, 6)).toEqual([0, 1, 2, 3])
    expect(resolveGifPaletteSampleIndices(9, 4)).toEqual([0, 3, 5, 8])
  })

  it('builds journey timeline with per-step travel and hold segments', () => {
    const timeline = resolveJourneyLoopTimeline([120, 180], 600, 40)
    expect(timeline.totalDurationMs).toBe(1280)
    expect(timeline.keyTimes).toEqual([0, 0.46875, 0.5, 0.96875, 1])
    expect(timeline.keyPoints).toEqual([0, 0.4, 0.4, 1, 1])
  })
})
