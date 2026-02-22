/**
 * Purpose: Provide journey-specific logic for focus, playback labels, and timeline behavior.
 */

export const journeyColorPalette = [
  '#2563eb',
  '#16a34a',
  '#dc2626',
  '#9333ea',
  '#ea580c',
  '#0891b2',
]

export const journeyColorByIndex = (index: number): string =>
  journeyColorPalette[index % journeyColorPalette.length]
