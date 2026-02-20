import { curveToSvgPath } from '../components/edgePresentation'
import { STEP_ARRIVAL_HOLD_MS } from '../components/playerStepTimeline'
import { resolveEdgeCurve } from '../engine/edgeCurve'
import type { JourneyModel, WorkspaceModel } from '../model/types'
import { GIFEncoder, applyPalette, quantize } from 'gifenc'

const DEFAULT_FRAME_RATE_GIF = 16
const DEFAULT_FRAME_RATE_VIDEO = 24
const DEFAULT_BASE_REFRESH_INTERVAL_MS = 120
const DEFAULT_TAIL_PADDING_MS = 320
const DEFAULT_GIF_PALETTE_SAMPLE_FRAMES = 12
const DEFAULT_EXPORT_SPEED_MULTIPLIER = 1.6
const MIN_TRAVEL_DURATION_MS = 120
const SVG_NS = 'http://www.w3.org/2000/svg'
const XLINK_NS = 'http://www.w3.org/1999/xlink'

const INLINE_STYLE_PROPERTIES = [
  'fill',
  'stroke',
  'stroke-width',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-linecap',
  'stroke-linejoin',
  'opacity',
  'filter',
  'font',
  'font-size',
  'font-family',
  'font-weight',
  'letter-spacing',
  'text-anchor',
  'dominant-baseline',
  'paint-order',
  'visibility',
  'display',
  'mix-blend-mode',
] as const

type CompositionRenderer = {
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D
  width: number
  height: number
  themeMode: CanvasThemeMode
  fallbackColor: string
  baseImage: HTMLImageElement | null
}

type JourneyCurveStep = {
  edgeId: string
  path: string
}

type JourneyLoopTimeline = {
  totalDurationMs: number
  keyTimes: number[]
  keyPoints: number[]
}

type VideoExtension = 'mp4' | 'webm'
type CanvasThemeMode = 'light' | 'dark'

export interface VideoMimeSelection {
  extension: VideoExtension
  mimeType: string
}

interface ResolveVideoMimeTypeOptions {
  preferredExtension?: VideoExtension
  allowFallback?: boolean
}

interface CaptureFrameLoopOptions {
  durationMs: number
  fps: number
  renderer: CompositionRenderer
  svg: SVGSVGElement
  trailCanvas: HTMLCanvasElement
  resolveBaseKey: () => string
  onFrameCapture: () => void
  baseRefreshIntervalMs?: number
}

export interface ExportAnimatedGifOptions {
  svg: SVGSVGElement
  trailCanvas: HTMLCanvasElement
  canvasPanel?: HTMLElement | null
  durationMs: number
  resolveBaseKey: () => string
  filenameBase?: string
  fps?: number
}

export interface ExportAnimatedVideoOptions {
  svg: SVGSVGElement
  trailCanvas: HTMLCanvasElement
  canvasPanel?: HTMLElement | null
  durationMs: number
  resolveBaseKey: () => string
  filenameBase?: string
  fps?: number
  preferredExtension?: VideoExtension
  allowFallback?: boolean
}

export interface ExportAnimatedSvgOptions {
  svg: SVGSVGElement
  workspace: WorkspaceModel
  journey: JourneyModel
  playerSpeedMs: number
  filenameBase?: string
}

export const resolveJourneyAnimationDurationMs = (
  stepCount: number,
  speedMs: number,
  tailPaddingMs = DEFAULT_TAIL_PADDING_MS,
): number => {
  const steps = Math.max(0, stepCount)
  const stepDurationMs = Math.max(MIN_TRAVEL_DURATION_MS, speedMs) + STEP_ARRIVAL_HOLD_MS
  return Math.max(stepDurationMs, steps * stepDurationMs + Math.max(0, tailPaddingMs))
}

export const resolveExportPlaybackSpeedMs = (
  speedMs: number,
  multiplier = DEFAULT_EXPORT_SPEED_MULTIPLIER,
): number => {
  const safeSpeed = Math.max(MIN_TRAVEL_DURATION_MS, Math.round(speedMs))
  const safeMultiplier =
    Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1
  return Math.max(MIN_TRAVEL_DURATION_MS, Math.round(safeSpeed * safeMultiplier))
}

export const resolveVideoMimeType = (
  isSupported: (mimeType: string) => boolean,
  options: ResolveVideoMimeTypeOptions = {},
): VideoMimeSelection | null => {
  const preferredExtension = options.preferredExtension ?? 'mp4'
  const allowFallback = options.allowFallback ?? true
  const mp4Candidates: VideoMimeSelection[] = [
    { extension: 'mp4', mimeType: 'video/mp4;codecs=avc1.42E01E' },
    { extension: 'mp4', mimeType: 'video/mp4;codecs=avc1.4D401F' },
    { extension: 'mp4', mimeType: 'video/mp4;codecs=avc1' },
    { extension: 'mp4', mimeType: 'video/mp4;codecs=h264' },
    { extension: 'mp4', mimeType: 'video/mp4' },
  ]
  const webmCandidates: VideoMimeSelection[] = [
    { extension: 'webm', mimeType: 'video/webm;codecs=vp8' },
    { extension: 'webm', mimeType: 'video/webm;codecs=vp9' },
    { extension: 'webm', mimeType: 'video/webm' },
  ]
  const preferredCandidates = preferredExtension === 'webm' ? webmCandidates : mp4Candidates
  const fallbackCandidates = preferredExtension === 'webm' ? mp4Candidates : webmCandidates
  const orderedCandidates = allowFallback
    ? [...preferredCandidates, ...fallbackCandidates]
    : preferredCandidates
  return orderedCandidates.find((candidate) => isSupported(candidate.mimeType)) ?? null
}

const waitNextFrame = (): Promise<number> =>
  new Promise((resolve) => {
    window.requestAnimationFrame((timestamp) => resolve(timestamp))
  })

const resolveSvgDimensions = (
  svg: SVGSVGElement,
): { width: number; height: number } => {
  const rect = svg.getBoundingClientRect()
  const widthAttr = Number(svg.getAttribute('width') ?? 0)
  const heightAttr = Number(svg.getAttribute('height') ?? 0)
  const width = Math.max(1, Math.round(rect.width) || widthAttr || 1200)
  const height = Math.max(1, Math.round(rect.height) || heightAttr || 700)
  return { width, height }
}

const resolveCompositionDimensions = (
  svg: SVGSVGElement,
  trailCanvas: HTMLCanvasElement,
): { width: number; height: number } => {
  const svgDimensions = resolveSvgDimensions(svg)
  const trailWidth = Math.max(0, Math.round(trailCanvas.clientWidth))
  const trailHeight = Math.max(0, Math.round(trailCanvas.clientHeight))
  if (trailWidth > 0 && trailHeight > 0) {
    return {
      width: trailWidth,
      height: trailHeight,
    }
  }
  return svgDimensions
}

const cloneSvgWithInlineStyles = (svg: SVGSVGElement): SVGSVGElement => {
  const clone = svg.cloneNode(true) as SVGSVGElement
  const sourceElements = [svg, ...Array.from(svg.querySelectorAll('*'))]
  const cloneElements = [clone, ...Array.from(clone.querySelectorAll('*'))]
  const limit = Math.min(sourceElements.length, cloneElements.length)

  for (let index = 0; index < limit; index += 1) {
    const source = sourceElements[index]
    const target = cloneElements[index]
    if (!(target instanceof SVGElement)) {
      continue
    }
    const computed = window.getComputedStyle(source)
    for (const property of INLINE_STYLE_PROPERTIES) {
      const value = computed.getPropertyValue(property)
      if (!value) {
        continue
      }
      target.style.setProperty(property, value)
    }
  }

  return clone
}

const resolveThemeMode = (
  svg: SVGSVGElement,
  canvasPanel?: HTMLElement | null,
): CanvasThemeMode => {
  if (canvasPanel?.closest('.theme-dark')) {
    return 'dark'
  }
  if (svg.closest('.theme-dark')) {
    return 'dark'
  }
  if (document.querySelector('.theme-dark')) {
    return 'dark'
  }
  return 'light'
}

const resolveThemeBaseColor = (mode: CanvasThemeMode): string =>
  mode === 'dark' ? '#0b0f14' : '#eef2ff'

const resolveThemeLinearStops = (
  mode: CanvasThemeMode,
): { start: string; end: string } => {
  if (mode === 'dark') {
    return {
      start: 'rgba(17,24,36,0.92)',
      end: 'rgba(11,15,20,0.96)',
    }
  }
  return {
    start: 'rgba(255,255,255,0.88)',
    end: 'rgba(238,242,255,0.92)',
  }
}

const removeGridArtifacts = (svg: SVGSVGElement): void => {
  svg.querySelectorAll('pattern[id="grid-pattern"]').forEach((node) => {
    node.remove()
  })
  svg.querySelectorAll('[fill*="grid-pattern"]').forEach((node) => {
    node.remove()
  })
}

const ensureSvgDefs = (svg: SVGSVGElement): SVGDefsElement => {
  const existing = svg.querySelector('defs')
  if (existing instanceof SVGDefsElement) {
    return existing
  }
  const created = document.createElementNS(SVG_NS, 'defs')
  svg.insertBefore(created, svg.firstChild)
  return created
}

const createGradientStop = (
  offset: string,
  color: string,
): SVGStopElement => {
  const stop = document.createElementNS(SVG_NS, 'stop')
  stop.setAttribute('offset', offset)
  stop.setAttribute('stop-color', color)
  return stop
}

const prependThemeBackground = (
  svg: SVGSVGElement,
  width: number,
  height: number,
  mode: CanvasThemeMode,
): void => {
  const defs = ensureSvgDefs(svg)
  const suffix = mode === 'dark' ? 'dark' : 'light'
  const linearId = `export-bg-linear-${suffix}`
  const radialPrimaryId = `export-bg-radial-primary-${suffix}`
  const radialSecondaryId = `export-bg-radial-secondary-${suffix}`

  const linear = document.createElementNS(SVG_NS, 'linearGradient')
  linear.setAttribute('id', linearId)
  linear.setAttribute('x1', '0%')
  linear.setAttribute('y1', '0%')
  linear.setAttribute('x2', '0%')
  linear.setAttribute('y2', '100%')
  const linearStops = resolveThemeLinearStops(mode)
  linear.appendChild(createGradientStop('0%', linearStops.start))
  linear.appendChild(createGradientStop('100%', linearStops.end))

  const primaryRadial = document.createElementNS(SVG_NS, 'radialGradient')
  primaryRadial.setAttribute('id', radialPrimaryId)
  primaryRadial.setAttribute('cx', mode === 'dark' ? '8%' : '-10%')
  primaryRadial.setAttribute('cy', mode === 'dark' ? '-18%' : '-30%')
  primaryRadial.setAttribute('r', mode === 'dark' ? '70%' : '68%')
  primaryRadial.appendChild(
    createGradientStop(
      '0%',
      mode === 'dark' ? 'rgba(72,166,255,0.16)' : 'rgba(59,130,246,0.18)',
    ),
  )
  primaryRadial.appendChild(createGradientStop('100%', 'rgba(0,0,0,0)'))

  const secondaryRadial = document.createElementNS(SVG_NS, 'radialGradient')
  secondaryRadial.setAttribute('id', radialSecondaryId)
  secondaryRadial.setAttribute('cx', mode === 'dark' ? '108%' : '115%')
  secondaryRadial.setAttribute('cy', mode === 'dark' ? '-4%' : '-10%')
  secondaryRadial.setAttribute('r', mode === 'dark' ? '66%' : '64%')
  secondaryRadial.appendChild(
    createGradientStop(
      '0%',
      mode === 'dark' ? 'rgba(51,209,160,0.14)' : 'rgba(16,185,129,0.16)',
    ),
  )
  secondaryRadial.appendChild(createGradientStop('100%', 'rgba(0,0,0,0)'))

  defs.appendChild(linear)
  defs.appendChild(primaryRadial)
  defs.appendChild(secondaryRadial)

  const group = document.createElementNS(SVG_NS, 'g')
  group.setAttribute('data-export-background', 'true')
  group.setAttribute('pointer-events', 'none')

  const base = document.createElementNS(SVG_NS, 'rect')
  base.setAttribute('x', '0')
  base.setAttribute('y', '0')
  base.setAttribute('width', `${width}`)
  base.setAttribute('height', `${height}`)
  base.setAttribute('fill', resolveThemeBaseColor(mode))
  group.appendChild(base)

  const linearLayer = document.createElementNS(SVG_NS, 'rect')
  linearLayer.setAttribute('x', '0')
  linearLayer.setAttribute('y', '0')
  linearLayer.setAttribute('width', `${width}`)
  linearLayer.setAttribute('height', `${height}`)
  linearLayer.setAttribute('fill', `url(#${linearId})`)
  group.appendChild(linearLayer)

  const radialPrimaryLayer = document.createElementNS(SVG_NS, 'rect')
  radialPrimaryLayer.setAttribute('x', '0')
  radialPrimaryLayer.setAttribute('y', '0')
  radialPrimaryLayer.setAttribute('width', `${width}`)
  radialPrimaryLayer.setAttribute('height', `${height}`)
  radialPrimaryLayer.setAttribute('fill', `url(#${radialPrimaryId})`)
  group.appendChild(radialPrimaryLayer)

  const radialSecondaryLayer = document.createElementNS(SVG_NS, 'rect')
  radialSecondaryLayer.setAttribute('x', '0')
  radialSecondaryLayer.setAttribute('y', '0')
  radialSecondaryLayer.setAttribute('width', `${width}`)
  radialSecondaryLayer.setAttribute('height', `${height}`)
  radialSecondaryLayer.setAttribute('fill', `url(#${radialSecondaryId})`)
  group.appendChild(radialSecondaryLayer)

  const firstElementAfterDefs =
    defs.nextElementSibling instanceof SVGElement ? defs.nextElementSibling : null
  svg.insertBefore(group, firstElementAfterDefs)
}

const serializeStyledSvg = (
  svg: SVGSVGElement,
  themeMode: CanvasThemeMode,
  dimensions?: { width: number; height: number },
): { xml: string; width: number; height: number } => {
  const clone = cloneSvgWithInlineStyles(svg)
  const { width, height } = dimensions ?? resolveSvgDimensions(svg)
  removeGridArtifacts(clone)
  prependThemeBackground(clone, width, height, themeMode)
  clone.setAttribute('width', `${width}`)
  clone.setAttribute('height', `${height}`)
  clone.setAttribute('xmlns', SVG_NS)
  clone.setAttribute('xmlns:xlink', XLINK_NS)
  const xml = new XMLSerializer().serializeToString(clone)
  return { xml, width, height }
}

const svgXmlToImage = async (
  xml: string,
  width: number,
  height: number,
): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const image = new Image(width, height)
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = (event) => {
      URL.revokeObjectURL(url)
      reject(event)
    }
    image.src = url
  })

const createCompositionRenderer = (
  svg: SVGSVGElement,
  trailCanvas: HTMLCanvasElement,
  canvasPanel?: HTMLElement | null,
): CompositionRenderer => {
  const { width, height } = resolveCompositionDimensions(svg, trailCanvas)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Failed to create canvas context for animated export.')
  }
  const themeMode = resolveThemeMode(svg, canvasPanel)
  return {
    canvas,
    context,
    width,
    height,
    themeMode,
    fallbackColor: resolveThemeBaseColor(themeMode),
    baseImage: null,
  }
}

const refreshRendererBaseImage = async (
  renderer: CompositionRenderer,
  svg: SVGSVGElement,
): Promise<void> => {
  const { xml, width, height } = serializeStyledSvg(svg, renderer.themeMode, {
    width: renderer.width,
    height: renderer.height,
  })
  renderer.baseImage = await svgXmlToImage(xml, width, height)
}

const drawCompositionFrame = (
  renderer: CompositionRenderer,
  trailCanvas: HTMLCanvasElement,
): void => {
  const { context, width, height, fallbackColor, baseImage } = renderer
  context.clearRect(0, 0, width, height)
  if (baseImage) {
    context.drawImage(baseImage, 0, 0, width, height)
  } else {
    context.fillStyle = fallbackColor
    context.fillRect(0, 0, width, height)
  }
  context.save()
  context.globalCompositeOperation = 'screen'
  context.drawImage(trailCanvas, 0, 0, width, height)
  context.restore()
}

const captureFramesLoop = async ({
  durationMs,
  fps,
  renderer,
  svg,
  trailCanvas,
  resolveBaseKey,
  onFrameCapture,
  baseRefreshIntervalMs = DEFAULT_BASE_REFRESH_INTERVAL_MS,
}: CaptureFrameLoopOptions): Promise<void> => {
  await refreshRendererBaseImage(renderer, svg)
  let lastBaseKey = resolveBaseKey()
  let lastBaseRefreshAt = performance.now()
  const frameIntervalMs = 1000 / Math.max(1, fps)
  let nextCaptureAt = 0
  const startAt = await waitNextFrame()

  while (true) {
    const now = await waitNextFrame()
    const elapsed = now - startAt
    const key = resolveBaseKey()
    const shouldRefreshBase =
      key !== lastBaseKey || now - lastBaseRefreshAt >= baseRefreshIntervalMs
    if (shouldRefreshBase) {
      await refreshRendererBaseImage(renderer, svg)
      lastBaseKey = key
      lastBaseRefreshAt = now
    }

    drawCompositionFrame(renderer, trailCanvas)
    if (elapsed >= nextCaptureAt) {
      onFrameCapture()
      nextCaptureAt += frameIntervalMs
    }
    if (elapsed >= durationMs) {
      break
    }
  }
}

export const resolveGifPaletteSampleIndices = (
  frameCount: number,
  maxSamples = DEFAULT_GIF_PALETTE_SAMPLE_FRAMES,
): number[] => {
  const safeFrameCount = Math.max(0, Math.floor(frameCount))
  const safeMaxSamples = Math.max(1, Math.floor(maxSamples))
  if (safeFrameCount === 0) {
    return []
  }
  if (safeFrameCount <= safeMaxSamples) {
    return Array.from({ length: safeFrameCount }, (_, index) => index)
  }
  if (safeMaxSamples === 1) {
    return [0]
  }
  const distributed = Array.from({ length: safeMaxSamples }, (_, sampleIndex) =>
    Math.round((sampleIndex * (safeFrameCount - 1)) / (safeMaxSamples - 1)),
  )
  const unique = Array.from(new Set(distributed)).sort((left, right) => left - right)
  if (unique.length >= safeMaxSamples) {
    return unique.slice(0, safeMaxSamples)
  }
  for (let index = 0; index < safeFrameCount && unique.length < safeMaxSamples; index += 1) {
    if (!unique.includes(index)) {
      unique.push(index)
    }
  }
  return unique.sort((left, right) => left - right)
}

const buildGifPaletteInput = (
  frames: Uint8Array[],
  maxSamples = DEFAULT_GIF_PALETTE_SAMPLE_FRAMES,
): Uint8Array => {
  if (!frames.length) {
    return new Uint8Array()
  }
  const indices = resolveGifPaletteSampleIndices(frames.length, maxSamples)
  if (!indices.length) {
    return new Uint8Array(frames[0])
  }
  const frameByteLength = frames[0].byteLength
  const sampled = new Uint8Array(frameByteLength * indices.length)
  for (let sampleIndex = 0; sampleIndex < indices.length; sampleIndex += 1) {
    sampled.set(frames[indices[sampleIndex]], sampleIndex * frameByteLength)
  }
  return sampled
}

export const resolveJourneyLoopTimeline = (
  stepLengths: number[],
  travelDurationMs: number,
  holdDurationMs = STEP_ARRIVAL_HOLD_MS,
): JourneyLoopTimeline => {
  const normalizedLengths =
    stepLengths.length > 0
      ? stepLengths.map((length) =>
          Number.isFinite(length) && length > 0 ? length : 1,
        )
      : [1]
  const safeTravelDurationMs = Math.max(MIN_TRAVEL_DURATION_MS, Math.round(travelDurationMs))
  const safeHoldDurationMs = Math.max(0, Math.round(holdDurationMs))
  const stepDurationMs = safeTravelDurationMs + safeHoldDurationMs
  const totalDurationMs = Math.max(stepDurationMs, normalizedLengths.length * stepDurationMs)
  const totalLength = Math.max(
    1,
    normalizedLengths.reduce((accumulator, length) => accumulator + length, 0),
  )
  const keyTimes: number[] = [0]
  const keyPoints: number[] = [0]
  let elapsedMs = 0
  let lengthProgress = 0

  for (const length of normalizedLengths) {
    lengthProgress += length
    elapsedMs += safeTravelDurationMs
    keyTimes.push(Number((Math.min(1, elapsedMs / totalDurationMs)).toFixed(6)))
    keyPoints.push(Number((Math.min(1, lengthProgress / totalLength)).toFixed(6)))
    if (safeHoldDurationMs > 0) {
      elapsedMs += safeHoldDurationMs
      keyTimes.push(Number((Math.min(1, elapsedMs / totalDurationMs)).toFixed(6)))
      keyPoints.push(Number((Math.min(1, lengthProgress / totalLength)).toFixed(6)))
    }
  }

  keyTimes[keyTimes.length - 1] = 1
  keyPoints[keyPoints.length - 1] = 1
  return {
    totalDurationMs,
    keyTimes,
    keyPoints,
  }
}

const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

const resolveFilenameBase = (raw?: string): string => {
  const normalized = (raw ?? 'journey').trim().toLowerCase()
  const collapsed = normalized
    .replace(/[^a-z0-9\-_\s]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return collapsed || 'journey'
}

const resolveJourneyStepCurves = (
  workspace: WorkspaceModel,
  journey: JourneyModel,
): JourneyCurveStep[] => {
  const sortedSteps = journey.steps.slice().sort((left, right) => left.n - right.n)
  const resolved: JourneyCurveStep[] = []
  for (const step of sortedSteps) {
    const edge = workspace.edges[step.edgeId]
    if (!edge) {
      continue
    }
    const curve = resolveEdgeCurve(edge, workspace.nodes)
    if (!curve) {
      continue
    }
    resolved.push({
      edgeId: edge.id,
      path: curveToSvgPath(curve),
    })
  }
  return resolved
}

const resolveJourneyStepPathsFromRenderedSvg = (
  svg: SVGSVGElement,
  journey: JourneyModel,
): JourneyCurveStep[] => {
  const pathsByEdgeId = new Map<string, string>()
  svg.querySelectorAll('path[id$="_path"]').forEach((pathNode) => {
    const id = pathNode.getAttribute('id')
    const pathData = pathNode.getAttribute('d')
    if (!id || !pathData || !id.endsWith('_path')) {
      return
    }
    const edgeId = id.slice(0, -5)
    if (!edgeId) {
      return
    }
    pathsByEdgeId.set(edgeId, pathData)
  })

  const sortedSteps = journey.steps.slice().sort((left, right) => left.n - right.n)
  const resolved: JourneyCurveStep[] = []
  for (const step of sortedSteps) {
    const pathData = pathsByEdgeId.get(step.edgeId)
    if (!pathData) {
      continue
    }
    resolved.push({
      edgeId: step.edgeId,
      path: pathData,
    })
  }
  return resolved
}

const resolveSvgPathLength = (pathData: string): number => {
  const path = document.createElementNS(SVG_NS, 'path')
  path.setAttribute('d', pathData)
  try {
    const length = path.getTotalLength()
    return Number.isFinite(length) && length > 0 ? length : 1
  } catch {
    return 1
  }
}

export const exportAnimatedJourneyGif = async ({
  svg,
  trailCanvas,
  canvasPanel,
  durationMs,
  resolveBaseKey,
  filenameBase,
  fps = DEFAULT_FRAME_RATE_GIF,
}: ExportAnimatedGifOptions): Promise<void> => {
  const renderer = createCompositionRenderer(svg, trailCanvas, canvasPanel)
  const frameDelayMs = Math.max(20, Math.round(1000 / Math.max(1, fps)))
  const rgbaFrames: Uint8Array[] = []

  await captureFramesLoop({
    durationMs,
    fps,
    renderer,
    svg,
    trailCanvas,
    resolveBaseKey,
    onFrameCapture: () => {
      const imageData = renderer.context.getImageData(0, 0, renderer.width, renderer.height)
      rgbaFrames.push(new Uint8Array(imageData.data))
    },
  })

  if (!rgbaFrames.length) {
    throw new Error('Failed to capture frames for animated GIF export.')
  }

  const paletteInput = buildGifPaletteInput(rgbaFrames)
  const palette = quantize(paletteInput, 256, { format: 'rgb565' })
  const gif = GIFEncoder({ auto: false })
  gif.writeHeader()

  for (let index = 0; index < rgbaFrames.length; index += 1) {
    const frame = rgbaFrames[index]
    const colorIndex = applyPalette(frame, palette, 'rgb565')
    gif.writeFrame(colorIndex, renderer.width, renderer.height, {
      palette,
      delay: frameDelayMs,
      first: index === 0,
      repeat: index === 0 ? 0 : undefined,
    })
  }

  if (rgbaFrames.length > 1) {
    const loopFrame = applyPalette(rgbaFrames[0], palette, 'rgb565')
    gif.writeFrame(loopFrame, renderer.width, renderer.height, {
      palette,
      delay: frameDelayMs,
    })
  }

  gif.finish()
  const output = gif.bytesView()
  const outputBuffer = new ArrayBuffer(output.byteLength)
  new Uint8Array(outputBuffer).set(output)
  const blob = new Blob([outputBuffer], { type: 'image/gif' })
  downloadBlob(blob, `${resolveFilenameBase(filenameBase)}.gif`)
}

export const exportAnimatedJourneyVideo = async ({
  svg,
  trailCanvas,
  canvasPanel,
  durationMs,
  resolveBaseKey,
  filenameBase,
  fps = DEFAULT_FRAME_RATE_VIDEO,
  preferredExtension = 'mp4',
  allowFallback = true,
}: ExportAnimatedVideoOptions): Promise<VideoMimeSelection> => {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('Your browser does not support video export via MediaRecorder.')
  }
  const mime = resolveVideoMimeType(
    (candidate) => MediaRecorder.isTypeSupported(candidate),
    { preferredExtension, allowFallback },
  )
  if (!mime) {
    if (preferredExtension === 'mp4') {
      throw new Error(
        'This browser does not support MP4/H.264 recording. For mobile-compatible video, export in Safari/Edge or use GIF.',
      )
    }
    throw new Error('Browser has no supported compatible video codecs (MP4/WebM).')
  }

  const renderer = createCompositionRenderer(svg, trailCanvas, canvasPanel)
  const stream = renderer.canvas.captureStream(Math.max(1, fps))
  const chunks: BlobPart[] = []
  const recorder = new MediaRecorder(stream, {
    mimeType: mime.mimeType,
    videoBitsPerSecond: 8_000_000,
  })

  const stopPromise = new Promise<void>((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data)
      }
    }
    recorder.onerror = (event) => {
      reject(event.error ?? new Error('Failed to record video.'))
    }
    recorder.onstop = () => resolve()
  })

  recorder.start(150)
  await captureFramesLoop({
    durationMs,
    fps,
    renderer,
    svg,
    trailCanvas,
    resolveBaseKey,
    onFrameCapture: () => {
      // No-op: recording stream consumes frames from renderer canvas.
    },
  })
  recorder.stop()
  await stopPromise
  stream.getTracks().forEach((track) => track.stop())

  const blob = new Blob(chunks, { type: mime.mimeType })
  downloadBlob(blob, `${resolveFilenameBase(filenameBase)}.${mime.extension}`)
  return mime
}

export const exportAnimatedJourneySvg = ({
  svg,
  workspace,
  journey,
  playerSpeedMs,
  filenameBase,
}: ExportAnimatedSvgOptions): void => {
  const clone = cloneSvgWithInlineStyles(svg)
  const renderedCurves = resolveJourneyStepPathsFromRenderedSvg(clone, journey)
  const curves =
    renderedCurves.length > 0 ? renderedCurves : resolveJourneyStepCurves(workspace, journey)
  if (!curves.length) {
    throw new Error('The selected journey has no valid steps for animated SVG export.')
  }

  const { width, height } = resolveSvgDimensions(svg)
  const themeMode = resolveThemeMode(svg)
  removeGridArtifacts(clone)
  prependThemeBackground(clone, width, height, themeMode)
  clone.setAttribute('width', `${width}`)
  clone.setAttribute('height', `${height}`)
  clone.setAttribute('xmlns', SVG_NS)
  clone.setAttribute('xmlns:xlink', XLINK_NS)

  const defs = clone.querySelector('defs') ?? document.createElementNS(SVG_NS, 'defs')
  if (!defs.parentElement) {
    clone.insertBefore(defs, clone.firstChild)
  }

  const style = document.createElementNS(SVG_NS, 'style')
  style.textContent = `
.export-journey-orb {
  fill: ${journey.colorKey};
  filter: drop-shadow(0 0 8px ${journey.colorKey});
}
.export-journey-halo {
  fill: ${journey.colorKey};
  opacity: 0.28;
}
  `
  defs.appendChild(style)

  const overlay = document.createElementNS(SVG_NS, 'g')
  overlay.setAttribute('pointer-events', 'none')

  const travelDurationMs = Math.max(MIN_TRAVEL_DURATION_MS, playerSpeedMs)
  const timeline = resolveJourneyLoopTimeline(
    curves.map((curve) => resolveSvgPathLength(curve.path)),
    travelDurationMs,
  )
  const motionPath = curves.map((curve) => curve.path).join(' ')
  const keyTimes = timeline.keyTimes.join(';')
  const keyPoints = timeline.keyPoints.map((value) => value.toFixed(6)).join(';')
  const halo = document.createElementNS(SVG_NS, 'circle')
  halo.setAttribute('r', '11')
  halo.setAttribute('class', 'export-journey-halo')
  const orb = document.createElementNS(SVG_NS, 'circle')
  orb.setAttribute('r', '6.2')
  orb.setAttribute('class', 'export-journey-orb')

  const orbMotion = document.createElementNS(SVG_NS, 'animateMotion')
  orbMotion.setAttribute('dur', `${timeline.totalDurationMs}ms`)
  orbMotion.setAttribute('repeatCount', 'indefinite')
  orbMotion.setAttribute('calcMode', 'linear')
  orbMotion.setAttribute('path', motionPath)
  orbMotion.setAttribute('keyTimes', keyTimes)
  orbMotion.setAttribute('keyPoints', keyPoints)
  orb.appendChild(orbMotion)

  const haloMotion = document.createElementNS(SVG_NS, 'animateMotion')
  haloMotion.setAttribute('dur', `${timeline.totalDurationMs}ms`)
  haloMotion.setAttribute('repeatCount', 'indefinite')
  haloMotion.setAttribute('calcMode', 'linear')
  haloMotion.setAttribute('path', motionPath)
  haloMotion.setAttribute('keyTimes', keyTimes)
  haloMotion.setAttribute('keyPoints', keyPoints)
  halo.appendChild(haloMotion)

  const pulse = document.createElementNS(SVG_NS, 'animate')
  pulse.setAttribute('attributeName', 'r')
  pulse.setAttribute('values', '9.4;12;9.4')
  pulse.setAttribute('dur', '520ms')
  pulse.setAttribute('repeatCount', 'indefinite')
  halo.appendChild(pulse)

  overlay.appendChild(halo)
  overlay.appendChild(orb)
  const worldLayer = clone.querySelector('g[transform]')
  if (worldLayer instanceof SVGGElement) {
    worldLayer.appendChild(overlay)
  } else {
    clone.appendChild(overlay)
  }

  const xml = new XMLSerializer().serializeToString(clone)
  const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
  downloadBlob(blob, `${resolveFilenameBase(filenameBase)}-animated.svg`)
}
