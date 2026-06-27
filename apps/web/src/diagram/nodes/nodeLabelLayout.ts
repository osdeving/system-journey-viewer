/**
 * Purpose: Provide pure text and label layout helpers for diagram node rendering.
 */

import type { NodeModel } from '../../model/types'

export type NodeLabelLayout = {
  titleX: number
  titleY: number
  subtitleX: number
  subtitleY: number
  textAnchor: 'start' | 'middle'
  maxTitleWidth: number
  maxSubtitleWidth: number
}

export type StickyNoteShape = {
  shellPath: string
  foldPath: string
}

export const estimateCanvasTextWidth = (text: string, fontSize: number): number =>
  Math.max(fontSize, text.trim().length * fontSize * 0.56)

export const truncateCanvasText = (
  value: string,
  maxWidth: number,
  fontSize: number,
): string => {
  const normalized = value.trim()
  if (!normalized) {
    return ''
  }
  if (estimateCanvasTextWidth(normalized, fontSize) <= maxWidth) {
    return normalized
  }
  let nextValue = normalized
  while (
    nextValue.length > 4 &&
    estimateCanvasTextWidth(`${nextValue}\u2026`, fontSize) > maxWidth
  ) {
    nextValue = nextValue.slice(0, -1)
  }
  return `${nextValue}\u2026`
}

export const truncateCanvasMultilineText = (
  value: string,
  maxWidth: number,
  fontSize: number,
  maxLines: number,
): string => {
  const lines = value.replace(/\r/g, '').split('\n')
  if (!lines.length) {
    return ''
  }
  const limited = lines.slice(0, Math.max(1, maxLines)).map((line) => truncateCanvasText(line, maxWidth, fontSize))
  if (lines.length > limited.length) {
    const lastIndex = limited.length - 1
    let lastLine = limited[lastIndex]
    while (lastLine.length > 1 && estimateCanvasTextWidth(`${lastLine}\u2026`, fontSize) > maxWidth) {
      lastLine = lastLine.slice(0, -1)
    }
    limited[lastIndex] = `${lastLine}\u2026`
  }
  return limited.join('\n')
}

export const resolveStickyNoteShape = (
  width: number,
  height: number,
): StickyNoteShape => {
  const foldSize = Math.max(14, Math.min(24, Math.round(Math.min(width, height) * 0.2)))
  return {
    shellPath: `M 0 0 H ${width - foldSize} L ${width} ${foldSize} V ${height} H 0 Z`,
    foldPath: `M ${width - foldSize} 0 L ${width - foldSize} ${foldSize} L ${width} ${foldSize} Z`,
  }
}

export const resolveNodeLabelLayout = (
  node: Pick<NodeModel, 'kind' | 'bounds'>,
  shouldRenderHexagon: boolean,
): NodeLabelLayout => {
  if (shouldRenderHexagon) {
    return {
      titleX: node.bounds.w / 2,
      titleY: 32,
      subtitleX: node.bounds.w / 2,
      subtitleY: 53,
      textAnchor: 'middle',
      maxTitleWidth: Math.max(72, node.bounds.w * 0.58),
      maxSubtitleWidth: Math.max(64, node.bounds.w * 0.62),
    }
  }
  return {
    titleX: 16,
    titleY: 34,
    subtitleX: 16,
    subtitleY: 56,
    textAnchor: 'start',
    maxTitleWidth: Math.max(84, node.bounds.w - 30),
    maxSubtitleWidth: Math.max(70, node.bounds.w - 30),
  }
}
