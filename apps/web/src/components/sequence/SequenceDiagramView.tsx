/**
 * Purpose: Render an inferred sequence-diagram scene as a branded static SVG surface inside presentation mode.
 */

import { useId, useMemo, type ReactElement } from 'react'
import { CanvasText } from '../canvas/CanvasText'
import {
  resolveSequenceActivationRowSlice,
  resolveSequenceActivationSegments,
} from '../../sequence/activationBars'
import type {
  SequenceDiagramScene,
  SequenceMessage,
  SequenceParallelRow,
  SequenceParticipant,
  SequenceSceneRow,
} from '../../sequence/types'

type SequenceDiagramViewProps = {
  scene: SequenceDiagramScene | null
  theme: 'light' | 'dark'
}

type Palette = {
  pageBackground: string
  panelBackground: string
  panelBorder: string
  titleColor: string
  subtitleColor: string
  lifelineColor: string
  rowStripe: string
  sectionNeutralFill: string
  sectionNeutralBorder: string
  sectionParallelFill: string
  sectionParallelBorder: string
  noteTextColor: string
  metaPillFill: string
  metaPillText: string
}

type LayoutParticipant = SequenceParticipant & {
  centerX: number
  headerX: number
  headerY: number
  headerWidth: number
  headerHeight: number
}

type LayoutRow =
  | {
      kind: 'section'
      row: Extract<SequenceSceneRow, { kind: 'section' }>
      y: number
      height: number
    }
  | {
      kind: 'note'
      row: Extract<SequenceSceneRow, { kind: 'note' }>
      y: number
      height: number
      wrappedText: string
      lineCount: number
      boxX: number
      boxWidth: number
    }
  | {
      kind: 'message'
      row: Extract<SequenceSceneRow, { kind: 'message' }>
      y: number
      height: number
      wrappedLabel: string
      labelLineCount: number
    }
  | {
      kind: 'parallel'
      row: Extract<SequenceSceneRow, { kind: 'parallel' }>
      y: number
      height: number
      branches: Array<{
        message: SequenceMessage
        y: number
        height: number
        wrappedLabel: string
        labelLineCount: number
      }>
    }

type SequenceDiagramLayout = {
  width: number
  height: number
  contentLeft: number
  contentRight: number
  contentWidth: number
  titleY: number
  subtitleY: number | null
  participantHeaderY: number
  lifelineStartY: number
  lifelineEndY: number
  participants: LayoutParticipant[]
  rows: LayoutRow[]
}

type LayoutMessagePlacement = {
  message: SequenceMessage
  y: number
  height: number
}

const ACTIVATION_BAR_WIDTH = 12
const ACTIVATION_ROW_BLEED = 8

const clampByte = (value: number): number => Math.max(0, Math.min(255, Math.round(value)))

const parseHexColor = (value: string): { r: number; g: number; b: number } | null => {
  const match = value.trim().match(/^#([0-9a-f]{6})$/i)
  if (!match) {
    return null
  }
  const hex = match[1]
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  }
}

const toHexColor = ({ r, g, b }: { r: number; g: number; b: number }): string =>
  `#${clampByte(r).toString(16).padStart(2, '0')}${clampByte(g).toString(16).padStart(2, '0')}${clampByte(b)
    .toString(16)
    .padStart(2, '0')}`

const mixHexColors = (left: string, right: string, ratio: number): string => {
  const l = parseHexColor(left)
  const r = parseHexColor(right)
  if (!l || !r) {
    return left
  }
  const t = Math.max(0, Math.min(1, ratio))
  return toHexColor({
    r: l.r * (1 - t) + r.r * t,
    g: l.g * (1 - t) + r.g * t,
    b: l.b * (1 - t) + r.b * t,
  })
}

const estimateTextWidth = (text: string, fontSize = 13): number =>
  text.length * fontSize * 0.58

const wrapTextLine = (line: string, maxChars: number): string[] => {
  const trimmed = line.trim()
  if (!trimmed) {
    return ['']
  }
  if (trimmed.length <= maxChars) {
    return [trimmed]
  }

  const words = trimmed.split(/\s+/)
  const wrapped: string[] = []
  let current = ''
  for (const word of words) {
    if (!current) {
      current = word
      continue
    }
    const candidate = `${current} ${word}`
    if (candidate.length <= maxChars) {
      current = candidate
      continue
    }
    wrapped.push(current)
    if (word.length <= maxChars) {
      current = word
      continue
    }
    let remaining = word
    while (remaining.length > maxChars) {
      wrapped.push(`${remaining.slice(0, maxChars - 1)}-`)
      remaining = remaining.slice(maxChars - 1)
    }
    current = remaining
  }
  if (current) {
    wrapped.push(current)
  }
  return wrapped
}

const wrapMultilineText = (value: string, maxChars: number): string =>
  value
    .split('\n')
    .flatMap((line) => wrapTextLine(line, maxChars))
    .join('\n')

const countTextLines = (value: string): number => Math.max(1, value.split('\n').length)

const resolvePalette = (theme: 'light' | 'dark'): Palette =>
  theme === 'dark'
    ? {
        pageBackground: '#0b1220',
        panelBackground: '#111827',
        panelBorder: '#334155',
        titleColor: '#f8fafc',
        subtitleColor: '#cbd5e1',
        lifelineColor: '#64748b',
        rowStripe: '#0f172a',
        sectionNeutralFill: '#0f1f2f',
        sectionNeutralBorder: '#334155',
        sectionParallelFill: '#0b2744',
        sectionParallelBorder: '#2563eb',
        noteTextColor: '#f8fafc',
        metaPillFill: '#1e293b',
        metaPillText: '#dbeafe',
      }
    : {
        pageBackground: '#eef2ff',
        panelBackground: '#ffffff',
        panelBorder: '#cbd5e1',
        titleColor: '#0f172a',
        subtitleColor: '#475569',
        lifelineColor: '#94a3b8',
        rowStripe: '#f8fafc',
        sectionNeutralFill: '#f8fafc',
        sectionNeutralBorder: '#cbd5e1',
        sectionParallelFill: '#eff6ff',
        sectionParallelBorder: '#60a5fa',
        noteTextColor: '#1f2937',
        metaPillFill: '#e0f2fe',
        metaPillText: '#0c4a6e',
      }

const resolveParticipantShapeLabel = (kind: SequenceParticipant['kind']): string => {
  if (kind === 'actor') {
    return 'Actor'
  }
  if (kind === 'database') {
    return 'DB'
  }
  if (kind === 'queue') {
    return 'Queue'
  }
  if (kind === 'gateway') {
    return 'Gateway'
  }
  if (kind === 'security') {
    return 'Security'
  }
  return 'Participant'
}

const resolveMessageLabel = (message: SequenceMessage): string =>
  message.protocol ? `${message.label}\n[${message.protocol}]` : message.label

const resolveMessageRowHeight = (message: SequenceMessage): { wrappedLabel: string; lineCount: number; height: number } => {
  const wrappedLabel = wrapMultilineText(resolveMessageLabel(message), 34)
  const lineCount = countTextLines(wrappedLabel)
  return {
    wrappedLabel,
    lineCount,
    height: 54 + Math.max(0, lineCount - 1) * 14,
  }
}

const resolveParallelBranchHeight = (
  message: SequenceMessage,
): { wrappedLabel: string; lineCount: number; height: number } => {
  const wrappedLabel = wrapMultilineText(resolveMessageLabel(message), 30)
  const lineCount = countTextLines(wrappedLabel)
  return {
    wrappedLabel,
    lineCount,
    height: 48 + Math.max(0, lineCount - 1) * 14,
  }
}

const resolveLayout = (scene: SequenceDiagramScene): SequenceDiagramLayout => {
  const outerMarginX = 36
  const outerMarginY = 28
  const contentLeft = outerMarginX + 14
  const participantHeaderY = outerMarginY + (scene.subtitle ? 56 : 42)
  const participantHeaderHeight = 52
  const lifelineStartY = participantHeaderY + participantHeaderHeight + 10
  const rowStartY = lifelineStartY + 14
  const contentRightPadding = 14
  const footerPadding = 24

  const maxLabelWidth = Math.max(
    156,
    ...scene.participants.map((participant) => estimateTextWidth(participant.name, 13) + 34),
  )
  const participantWidth = Math.min(250, Math.max(156, Math.ceil(maxLabelWidth / 2) * 2))
  const laneGap = scene.participants.length >= 5 ? 44 : scene.participants.length >= 3 ? 56 : 72

  const participants: LayoutParticipant[] = scene.participants.map((participant, index) => {
    const headerX = contentLeft + index * (participantWidth + laneGap)
    return {
      ...participant,
      centerX: headerX + participantWidth / 2,
      headerX,
      headerY: participantHeaderY,
      headerWidth: participantWidth,
      headerHeight: participantHeaderHeight,
    }
  })

  const contentRight =
    (participants[participants.length - 1]?.headerX ?? contentLeft) + participantWidth + contentRightPadding
  const contentWidth = contentRight - contentLeft

  const participantById = new Map(participants.map((participant) => [participant.id, participant]))

  const rows: LayoutRow[] = []
  let cursorY = rowStartY

  scene.rows.forEach((row, index) => {
    if (row.kind === 'section') {
      const height = 34
      rows.push({ kind: 'section', row, y: cursorY, height })
      cursorY += height + 8
      return
    }

    if (row.kind === 'note') {
      const wrappedText = wrapMultilineText(row.text, row.targetParticipantIds.length ? 28 : 74)
      const lineCount = countTextLines(wrappedText)
      const height = 38 + Math.max(0, lineCount - 1) * 15
      const targets = row.targetParticipantIds
        .map((participantId) => participantById.get(participantId))
        .filter((participant): participant is LayoutParticipant => !!participant)
      let boxX = contentLeft
      let boxWidth = contentWidth
      if (targets.length === 1) {
        const target = targets[0]
        boxWidth = Math.min(contentWidth, Math.max(240, target.headerWidth + 12))
        boxX = Math.max(contentLeft, Math.min(contentRight - boxWidth, target.centerX - boxWidth / 2))
      } else if (targets.length > 1) {
        const minX = Math.min(...targets.map((target) => target.centerX))
        const maxX = Math.max(...targets.map((target) => target.centerX))
        boxWidth = Math.min(contentWidth, Math.max(300, maxX - minX + participantWidth))
        boxX = Math.max(contentLeft, Math.min(contentRight - boxWidth, (minX + maxX) / 2 - boxWidth / 2))
      }
      rows.push({ kind: 'note', row, y: cursorY, height, wrappedText, lineCount, boxX, boxWidth })
      cursorY += height + 10
      return
    }

    if (row.kind === 'message') {
      const messageLayout = resolveMessageRowHeight(row.message)
      rows.push({
        kind: 'message',
        row,
        y: cursorY,
        height: messageLayout.height,
        wrappedLabel: messageLayout.wrappedLabel,
        labelLineCount: messageLayout.lineCount,
      })
      cursorY += messageLayout.height + 8
      return
    }

    const branches = row.branches.map((branch) => {
      const branchLayout = resolveParallelBranchHeight(branch)
      return {
        message: branch,
        y: 0,
        height: branchLayout.height,
        wrappedLabel: branchLayout.wrappedLabel,
        labelLineCount: branchLayout.lineCount,
      }
    })
    let branchCursorY = cursorY + 34
    const positionedBranches = branches.map((branch) => {
      const positioned = { ...branch, y: branchCursorY }
      branchCursorY += branch.height + 6
      return positioned
    })
    const height = 34 + positionedBranches.reduce((sum, branch) => sum + branch.height, 0) + Math.max(0, positionedBranches.length - 1) * 6 + 10
    rows.push({
      kind: 'parallel',
      row: row as SequenceParallelRow,
      y: cursorY,
      height,
      branches: positionedBranches,
    })
    cursorY += height + 10
    if (index < scene.rows.length - 1) {
      cursorY += 2
    }
  })

  const height = cursorY + footerPadding
  const width = contentRight + outerMarginX

  return {
    width,
    height,
    contentLeft,
    contentRight,
    contentWidth,
    titleY: outerMarginY + 14,
    subtitleY: scene.subtitle ? outerMarginY + 34 : null,
    participantHeaderY,
    lifelineStartY,
    lifelineEndY: height - outerMarginY,
    participants,
    rows,
  }
}

const collectLayoutMessagePlacements = (rows: LayoutRow[]): LayoutMessagePlacement[] => {
  const placements: LayoutMessagePlacement[] = []
  for (const row of rows) {
    if (row.kind === 'message') {
      placements.push({
        message: row.row.message,
        y: row.y,
        height: row.height,
      })
      continue
    }
    if (row.kind !== 'parallel') {
      continue
    }
    for (const branch of row.branches) {
      placements.push({
        message: branch.message,
        y: branch.y,
        height: branch.height,
      })
    }
  }
  return placements
}

const ParticipantHeader = ({
  participant,
}: {
  participant: LayoutParticipant
}) => {
  const kindLabel = resolveParticipantShapeLabel(participant.kind)
  return (
    <g>
      <rect
        x={participant.headerX}
        y={participant.headerY}
        width={participant.headerWidth}
        height={participant.headerHeight}
        rx={12}
        fill={participant.fillColor}
        stroke={participant.borderColor}
        strokeWidth={1.5}
      />
      <rect
        x={participant.headerX + 10}
        y={participant.headerY + 9}
        width={Math.min(participant.headerWidth - 20, Math.max(54, kindLabel.length * 7.4 + 20))}
        height={16}
        rx={8}
        fill={mixHexColors(participant.fillColor, participant.borderColor, 0.24)}
        opacity={0.92}
      />
      <text
        x={participant.headerX + 20}
        y={participant.headerY + 20.5}
        fill={participant.textColor}
        fontSize={9}
        fontWeight={700}
        dominantBaseline="middle"
      >
        {kindLabel.toUpperCase()}
      </text>
      <CanvasText
        x={participant.centerX}
        y={participant.headerY + 36}
        fill={participant.textColor}
        fontSize={13}
        fontWeight={700}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {wrapMultilineText(participant.name, 22)}
      </CanvasText>
    </g>
  )
}

const renderTickPill = (
  x: number,
  y: number,
  label: string,
  palette: Palette,
): ReactElement => {
  const width = Math.max(56, estimateTextWidth(label, 10) + 18)
  return (
    <g>
      <rect x={x} y={y - 10} width={width} height={20} rx={10} fill={palette.metaPillFill} opacity={0.95} />
      <text x={x + width / 2} y={y} fill={palette.metaPillText} fontSize={10} fontWeight={700} textAnchor="middle" dominantBaseline="middle">
        {label}
      </text>
    </g>
  )
}

const renderMessageGlyph = (
  message: SequenceMessage,
  wrappedLabel: string,
  labelLineCount: number,
  y: number,
  participants: Map<string, LayoutParticipant>,
  markerIds: { sync: string; async: string },
  theme: 'light' | 'dark',
): ReactElement | null => {
  const from = participants.get(message.fromParticipantId)
  const to = participants.get(message.toParticipantId)
  if (!from || !to) {
    return null
  }

  const arrowY = y + 30
  const labelY = y + 12
  const labelWidth = Math.min(
    260,
    Math.max(120, estimateTextWidth(wrappedLabel.split('\n').reduce((max, line) => (line.length > max.length ? line : max), ''), 11) + 22),
  )
  const labelCenterX = message.isSelfMessage
    ? from.centerX + 46
    : (from.centerX + to.centerX) / 2
  const labelBoxX = Math.max(24, labelCenterX - labelWidth / 2)
  const labelBoxHeight = 18 + Math.max(0, labelLineCount - 1) * 13
  const labelBoxFill = mixHexColors(message.accentColor, theme === 'dark' ? '#0f172a' : '#ffffff', theme === 'dark' ? 0.45 : 0.84)
  const labelBoxBorder = mixHexColors(message.accentColor, theme === 'dark' ? '#e2e8f0' : '#0f172a', theme === 'dark' ? 0.12 : 0.06)
  const markerEnd = `url(#${message.arrowStyle === 'async' ? markerIds.async : markerIds.sync})`
  const strokeDasharray = message.arrowStyle === 'async' ? '6 5' : undefined
  const fromActivationInset = from.kind === 'actor' ? 0 : ACTIVATION_BAR_WIDTH / 2
  const toActivationInset = to.kind === 'actor' ? 0 : ACTIVATION_BAR_WIDTH / 2

  const resolveArrowX = (sourceX: number, targetX: number, sourceInset: number, targetInset: number) => {
    if (sourceX < targetX) {
      return {
        x1: sourceX + sourceInset,
        x2: targetX - targetInset,
      }
    }
    if (sourceX > targetX) {
      return {
        x1: sourceX - sourceInset,
        x2: targetX + targetInset,
      }
    }
    return { x1: sourceX, x2: targetX }
  }

  const arrowXs = resolveArrowX(from.centerX, to.centerX, fromActivationInset, toActivationInset)
  const selfBaseX = from.centerX + fromActivationInset

  return (
    <g>
      <rect
        x={labelBoxX}
        y={labelY - 8}
        width={labelWidth}
        height={labelBoxHeight}
        rx={8}
        fill={labelBoxFill}
        stroke={labelBoxBorder}
        strokeWidth={1}
      />
      <CanvasText
        x={labelCenterX}
        y={labelY}
        fill={theme === 'dark' ? '#f8fafc' : '#0f172a'}
        fontSize={11}
        fontWeight={600}
        textAnchor="middle"
        dominantBaseline="middle"
        lineHeightEm={1.12}
      >
        {wrappedLabel}
      </CanvasText>

      {!message.isSelfMessage ? (
        <line
          x1={arrowXs.x1}
          y1={arrowY}
          x2={arrowXs.x2}
          y2={arrowY}
          stroke={message.accentColor}
          strokeWidth={2}
          strokeDasharray={strokeDasharray}
          markerEnd={markerEnd}
          strokeLinecap="round"
        />
      ) : (
        <path
          d={`M ${selfBaseX} ${arrowY} C ${selfBaseX + 40} ${arrowY}, ${selfBaseX + 40} ${arrowY + 24}, ${selfBaseX} ${
            arrowY + 24
          }`}
          fill="none"
          stroke={message.accentColor}
          strokeWidth={2}
          strokeDasharray={strokeDasharray}
          markerEnd={markerEnd}
          strokeLinecap="round"
        />
      )}
    </g>
  )
}

export const SequenceDiagramView = ({ scene, theme }: SequenceDiagramViewProps) => {
  const markerBaseId = useId().replace(/[^a-zA-Z0-9_-]/g, '_')
  const palette = useMemo(() => resolvePalette(theme), [theme])
  const layout = useMemo(() => (scene ? resolveLayout(scene) : null), [scene])
  const participantsById = useMemo(
    () => new Map((layout?.participants ?? []).map((participant) => [participant.id, participant])),
    [layout],
  )
  const activationSegments = useMemo(() => {
    if (!layout) {
      return []
    }
    const placements = collectLayoutMessagePlacements(layout.rows)
    const rawSegments = resolveSequenceActivationSegments(
      placements.map((placement) => ({
        fromParticipantId: placement.message.fromParticipantId,
        toParticipantId: placement.message.toParticipantId,
        y: placement.y,
        height: placement.height,
      })),
      { mergeGap: 34 },
    )
    return rawSegments.filter((segment) => participantsById.get(segment.participantId)?.kind !== 'actor')
  }, [layout, participantsById])

  if (!scene || !layout) {
    return (
      <div className="sequence-diagram-surface">
        <div className="sequence-diagram-empty">
          <h3>Sequence Diagram Preview</h3>
          <p>Select a journey in Presentation mode to render an inferred sequence diagram.</p>
        </div>
      </div>
    )
  }

  const markerIds = {
    sync: `${markerBaseId}_arrow_sync`,
    async: `${markerBaseId}_arrow_async`,
  }

  const renderActivationBarsForRow = (rowY: number, rowHeight: number): ReactElement[] =>
    activationSegments.flatMap((segment) => {
      const participant = participantsById.get(segment.participantId)
      if (!participant) {
        return []
      }
      const slice = resolveSequenceActivationRowSlice(segment, rowY, rowHeight, {
        topBleed: ACTIVATION_ROW_BLEED,
        bottomBleed: ACTIVATION_ROW_BLEED,
      })
      if (!slice) {
        return []
      }
      const fill = mixHexColors(
        participant.fillColor,
        palette.panelBackground,
        theme === 'dark' ? 0.28 : 0.58,
      )
      const stroke = mixHexColors(
        participant.borderColor,
        theme === 'dark' ? '#e2e8f0' : '#0f172a',
        theme === 'dark' ? 0.18 : 0.1,
      )
      return [
        <rect
          key={`activation:${segment.participantId}:${rowY}:${slice.y}:${slice.height}`}
          x={participant.centerX - ACTIVATION_BAR_WIDTH / 2}
          y={slice.y}
          width={ACTIVATION_BAR_WIDTH}
          height={Math.max(1, slice.height)}
          rx={5}
          fill={fill}
          stroke={stroke}
          strokeWidth={1}
          opacity={0.94}
        />,
      ]
    })

  return (
    <div className="sequence-diagram-surface">
      <div className="sequence-diagram-scroll">
        <svg
          className="sequence-diagram-svg"
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          role="img"
          aria-label={`Sequence diagram preview for ${scene.meta.journeyName}`}
        >
          <defs>
            <marker
              id={markerIds.sync}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
            </marker>
            <marker
              id={markerIds.async}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="8"
              markerHeight="8"
              orient="auto-start-reverse"
            >
              <path d="M 1 1 L 9 5 L 1 9" fill="none" stroke="context-stroke" strokeWidth="1.8" />
            </marker>
          </defs>

          <rect x={0} y={0} width={layout.width} height={layout.height} fill={palette.pageBackground} />
          <rect
            x={12}
            y={12}
            width={layout.width - 24}
            height={layout.height - 24}
            rx={18}
            fill={palette.panelBackground}
            stroke={palette.panelBorder}
            strokeWidth={1.2}
          />

          <text x={28} y={layout.titleY} fill={palette.titleColor} fontSize={20} fontWeight={800}>
            {scene.title}
          </text>
          {scene.subtitle ? (
            <text x={28} y={layout.subtitleY ?? layout.titleY + 16} fill={palette.subtitleColor} fontSize={11} fontWeight={600}>
              {scene.subtitle}
            </text>
          ) : null}

          {layout.participants.map((participant) => (
            <ParticipantHeader key={participant.id} participant={participant} />
          ))}

          {layout.participants.map((participant) => (
            <line
              key={`lifeline:${participant.id}`}
              x1={participant.centerX}
              y1={layout.lifelineStartY}
              x2={participant.centerX}
              y2={layout.lifelineEndY}
              stroke={palette.lifelineColor}
              strokeDasharray="7 7"
              strokeWidth={1.3}
              opacity={0.92}
            />
          ))}

          {layout.rows.map((rowLayout, rowIndex) => {
            if (rowLayout.kind === 'section') {
              const fill = rowLayout.row.tone === 'parallel' ? palette.sectionParallelFill : palette.sectionNeutralFill
              const stroke = rowLayout.row.tone === 'parallel' ? palette.sectionParallelBorder : palette.sectionNeutralBorder
              return (
                <g key={rowLayout.row.id}>
                  <rect
                    x={layout.contentLeft}
                    y={rowLayout.y}
                    width={layout.contentWidth}
                    height={rowLayout.height}
                    rx={12}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={1.1}
                    opacity={0.96}
                  />
                  {renderActivationBarsForRow(rowLayout.y, rowLayout.height)}
                  <text
                    x={layout.contentLeft + 14}
                    y={rowLayout.y + rowLayout.height / 2}
                    fill={palette.titleColor}
                    fontSize={11}
                    fontWeight={800}
                    dominantBaseline="middle"
                  >
                    {rowLayout.row.label}
                  </text>
                </g>
              )
            }

            if (rowLayout.kind === 'note') {
              const noteFill = mixHexColors(rowLayout.row.backgroundColor, palette.panelBackground, theme === 'dark' ? 0.12 : 0.08)
              const noteBorder = mixHexColors(rowLayout.row.borderColor, palette.panelBorder, 0.35)
              return (
                <g key={rowLayout.row.id}>
                  <rect
                    x={rowLayout.boxX}
                    y={rowLayout.y}
                    width={rowLayout.boxWidth}
                    height={rowLayout.height}
                    rx={10}
                    fill={noteFill}
                    stroke={noteBorder}
                    strokeWidth={1.2}
                    opacity={0.97}
                  />
                  {renderActivationBarsForRow(rowLayout.y, rowLayout.height)}
                  {rowLayout.row.label ? (
                    <text
                      x={rowLayout.boxX + 12}
                      y={rowLayout.y + 13}
                      fill={palette.noteTextColor}
                      fontSize={9}
                      fontWeight={800}
                      opacity={0.82}
                    >
                      {rowLayout.row.label.toUpperCase()}
                    </text>
                  ) : null}
                  <CanvasText
                    x={rowLayout.boxX + 12}
                    y={rowLayout.y + (rowLayout.row.label ? 28 : 18)}
                    fill={palette.noteTextColor}
                    fontSize={11}
                    fontWeight={600}
                    dominantBaseline="hanging"
                    lineHeightEm={1.18}
                  >
                    {rowLayout.wrappedText}
                  </CanvasText>
                </g>
              )
            }

            if (rowLayout.kind === 'message') {
              const stripeFill = rowIndex % 2 === 0 ? palette.rowStripe : palette.panelBackground
              return (
                <g key={rowLayout.row.id}>
                  <rect
                    x={layout.contentLeft}
                    y={rowLayout.y}
                    width={layout.contentWidth}
                    height={rowLayout.height}
                    rx={12}
                    fill={stripeFill}
                    opacity={0.84}
                  />
                  {renderActivationBarsForRow(rowLayout.y, rowLayout.height)}
                  {renderTickPill(layout.contentLeft + 8, rowLayout.y + rowLayout.height - 14, rowLayout.row.tickLabel, palette)}
                  {renderTickPill(
                    layout.contentLeft + 76,
                    rowLayout.y + rowLayout.height - 14,
                    rowLayout.row.message.laneLabel,
                    {
                      ...palette,
                      metaPillFill: mixHexColors(rowLayout.row.message.accentColor, palette.panelBackground, theme === 'dark' ? 0.4 : 0.78),
                      metaPillText: theme === 'dark' ? '#f8fafc' : '#0f172a',
                    },
                  )}
                  <g style={{ color: rowLayout.row.message.accentColor }}>
                      {renderMessageGlyph(
                        rowLayout.row.message,
                        rowLayout.wrappedLabel,
                        rowLayout.labelLineCount,
                        rowLayout.y,
                        participantsById,
                        markerIds,
                        theme,
                    )}
                  </g>
                </g>
              )
            }

            const groupFill = mixHexColors(
              rowLayout.branches[0]?.message.accentColor ?? palette.sectionParallelFill,
              palette.panelBackground,
              theme === 'dark' ? 0.78 : 0.9,
            )
            const groupBorder = mixHexColors(
              rowLayout.branches[0]?.message.accentColor ?? palette.sectionParallelBorder,
              palette.panelBorder,
              theme === 'dark' ? 0.2 : 0.12,
            )
            return (
              <g key={rowLayout.row.id}>
                <rect
                  x={layout.contentLeft}
                  y={rowLayout.y}
                  width={layout.contentWidth}
                  height={rowLayout.height}
                  rx={14}
                  fill={groupFill}
                  stroke={groupBorder}
                  strokeWidth={1.25}
                />
                {rowLayout.branches.map((branch) => (
                  <rect
                    key={`branch-bg:${branch.message.id}`}
                    x={layout.contentLeft + 8}
                    y={branch.y}
                    width={layout.contentWidth - 16}
                    height={branch.height}
                    rx={10}
                    fill={mixHexColors(branch.message.accentColor, palette.panelBackground, theme === 'dark' ? 0.84 : 0.92)}
                    opacity={0.97}
                  />
                ))}
                {renderActivationBarsForRow(rowLayout.y, rowLayout.height)}
                <text
                  x={layout.contentLeft + 12}
                  y={rowLayout.y + 16}
                  fill={palette.titleColor}
                  fontSize={11}
                  fontWeight={800}
                >
                  {`${rowLayout.row.tickLabel} · ${rowLayout.row.label}`}
                </text>

                {rowLayout.branches.map((branch) => (
                  <g key={branch.message.id}>
                    {renderTickPill(
                      layout.contentLeft + 16,
                      branch.y + branch.height - 13,
                      branch.message.laneLabel,
                      {
                        ...palette,
                        metaPillFill: mixHexColors(branch.message.accentColor, palette.panelBackground, theme === 'dark' ? 0.52 : 0.72),
                        metaPillText: theme === 'dark' ? '#f8fafc' : '#0f172a',
                      },
                    )}
                    <g style={{ color: branch.message.accentColor }}>
                      {renderMessageGlyph(
                        branch.message,
                        branch.wrappedLabel,
                        branch.labelLineCount,
                        branch.y,
                        participantsById,
                        markerIds,
                        theme,
                      )}
                    </g>
                  </g>
                ))}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
