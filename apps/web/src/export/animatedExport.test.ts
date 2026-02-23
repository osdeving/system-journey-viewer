/**
 * Purpose: Verify animated Export behavior with regression-focused unit tests.
 */

import { describe, expect, it } from 'vitest'
import {
  resolveAnimatedExportRasterOutputDimensions,
  resolveExportPlaybackSpeedMs,
  resolveGifPaletteSampleIndices,
  resolveJourneyAnimatedSvgLanes,
  resolveJourneyAnimationDurationMs,
  resolveJourneyLoopTimeline,
  resolveVideoMimeType,
} from './animatedExport'
import type { JourneyModel } from '../model/types'

describe('animated export helpers', () => {
  it('computes journey duration with step speed and arrival hold', () => {
    expect(resolveJourneyAnimationDurationMs(0, 900)).toBe(990)
    expect(resolveJourneyAnimationDurationMs(3, 900)).toBe(3290)
    expect(resolveJourneyAnimationDurationMs(2, 80)).toBe(740)
  })

  it('slows down exported playback speed with safe multiplier', () => {
    expect(resolveExportPlaybackSpeedMs(900)).toBe(1440)
    expect(resolveExportPlaybackSpeedMs(80)).toBe(192)
    expect(resolveExportPlaybackSpeedMs(600, 0)).toBe(600)
  })

  it('prefers mp4 when supported', () => {
    const resolved = resolveVideoMimeType((mime) => mime.includes('mp4'))
    expect(resolved).toEqual({
      extension: 'mp4',
      mimeType: 'video/mp4;codecs=avc1.42E01E',
    })
  })

  it('falls back to webm when mp4 is unavailable', () => {
    const resolved = resolveVideoMimeType((mime) => mime.startsWith('video/webm'))
    expect(resolved).toEqual({
      extension: 'webm',
      mimeType: 'video/webm;codecs=vp8',
    })
  })

  it('returns null for strict mp4 request when only webm is supported', () => {
    const resolved = resolveVideoMimeType((mime) => mime.startsWith('video/webm'), {
      preferredExtension: 'mp4',
      allowFallback: false,
    })
    expect(resolved).toBeNull()
  })

  it('allows webm fallback for preferred mp4 when fallback is enabled', () => {
    const resolved = resolveVideoMimeType((mime) => mime.startsWith('video/webm'), {
      preferredExtension: 'mp4',
      allowFallback: true,
    })
    expect(resolved).toEqual({
      extension: 'webm',
      mimeType: 'video/webm;codecs=vp8',
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

  it('normalizes raster animated export dimensions into a target box while preserving aspect ratio', () => {
    expect(resolveAnimatedExportRasterOutputDimensions(1600, 900)).toEqual({ width: 1280, height: 720 })
    expect(resolveAnimatedExportRasterOutputDimensions(3000, 1500)).toEqual({ width: 1280, height: 640 })
    expect(resolveAnimatedExportRasterOutputDimensions(900, 600)).toEqual({ width: 1080, height: 720 })
    expect(resolveAnimatedExportRasterOutputDimensions(900, 600, { width: 1920, height: 1080 })).toEqual({
      width: 1620,
      height: 1080,
    })
  })

  it('resolves animated svg lanes for threaded journeys with per-lane shapes and tick order', () => {
    const journey: JourneyModel = {
      id: 'j_parallel',
      name: 'Parallel',
      colorKey: '#2563eb',
      steps: [
        { n: 1, edgeId: 'e_1' },
        {
          n: 2,
          edgeId: 'e_2',
          threads: [
            {
              id: 't_projection',
              steps: [
                { n: 1, edgeId: 'e_t1_1' },
                { n: 2, edgeId: 'e_t1_2' },
              ],
            },
            {
              id: 't_probe',
              steps: [{ n: 1, edgeId: 'e_t2_1' }],
            },
          ],
        },
        { n: 3, edgeId: 'e_3' },
      ],
      player: {
        loop: true,
        speedMs: 900,
        pauseOnStep: false,
      },
    }
    const edgePaths = new Map<string, string>([
      ['e_1', 'M0 0 L10 0'],
      ['e_2', 'M10 0 L20 0'],
      ['e_3', 'M20 0 L30 0'],
      ['e_t1_1', 'M20 0 L20 10'],
      ['e_t1_2', 'M20 10 L20 20'],
      ['e_t2_1', 'M20 0 L30 10'],
    ])

    const lanes = resolveJourneyAnimatedSvgLanes(journey, edgePaths)

    expect(lanes.map((lane) => ({ laneId: lane.laneId, shape: lane.shape }))).toEqual([
      { laneId: 'main', shape: 'orb' },
      { laneId: 'thread:t_projection', shape: 'square' },
      { laneId: 'thread:t_probe', shape: 'triangle' },
    ])
    expect(lanes[0]?.steps.map((step) => step.tickIndex)).toEqual([0, 1, 2])
    expect(lanes[1]?.steps.map((step) => step.tickIndex)).toEqual([2, 3])
    expect(lanes[2]?.steps.map((step) => step.tickIndex)).toEqual([2])
  })
})
