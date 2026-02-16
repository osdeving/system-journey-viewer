import { describe, expect, it } from 'vitest'
import {
  resolveJourneyAnimationDurationMs,
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
})
