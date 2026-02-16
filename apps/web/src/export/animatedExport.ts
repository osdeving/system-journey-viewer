import { curveToSvgPath } from '../components/edgePresentation'
import { STEP_ARRIVAL_HOLD_MS } from '../components/playerStepTimeline'
import { nearestPortId, nodeCenter, portWorldPosition } from '../engine/geometry'
import type { EdgeModel, JourneyModel, NodeModel, WorkspaceModel } from '../model/types'
import { GIFEncoder, applyPalette, quantize } from 'gifenc'

const DEFAULT_FRAME_RATE_GIF = 16
const DEFAULT_FRAME_RATE_VIDEO = 24
const DEFAULT_BASE_REFRESH_INTERVAL_MS = 120
const DEFAULT_TAIL_PADDING_MS = 320
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
  backgroundColor: string
  baseImage: HTMLImageElement | null
}

type JourneyCurveStep = {
  edgeId: string
  path: string
}

type VideoExtension = 'mp4' | 'webm'

export interface VideoMimeSelection {
  extension: VideoExtension
  mimeType: string
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

export const resolveVideoMimeType = (
  isSupported: (mimeType: string) => boolean,
): VideoMimeSelection | null => {
  const orderedCandidates: VideoMimeSelection[] = [
    { extension: 'mp4', mimeType: 'video/mp4;codecs=h264' },
    { extension: 'mp4', mimeType: 'video/mp4' },
    { extension: 'webm', mimeType: 'video/webm;codecs=vp9' },
    { extension: 'webm', mimeType: 'video/webm;codecs=vp8' },
    { extension: 'webm', mimeType: 'video/webm' },
  ]
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

const serializeStyledSvg = (
  svg: SVGSVGElement,
): { xml: string; width: number; height: number } => {
  const clone = cloneSvgWithInlineStyles(svg)
  const { width, height } = resolveSvgDimensions(svg)
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

const resolvePanelBackgroundColor = (
  canvasPanel?: HTMLElement | null,
): string => {
  if (!canvasPanel) {
    return '#0f172a'
  }
  const computed = window.getComputedStyle(canvasPanel)
  const color = computed.backgroundColor?.trim()
  if (!color || color === 'rgba(0, 0, 0, 0)' || color === 'transparent') {
    return '#0f172a'
  }
  return color
}

const createCompositionRenderer = (
  svg: SVGSVGElement,
  canvasPanel?: HTMLElement | null,
): CompositionRenderer => {
  const { width, height } = resolveSvgDimensions(svg)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Falha ao criar contexto para export animado.')
  }
  return {
    canvas,
    context,
    width,
    height,
    backgroundColor: resolvePanelBackgroundColor(canvasPanel),
    baseImage: null,
  }
}

const refreshRendererBaseImage = async (
  renderer: CompositionRenderer,
  svg: SVGSVGElement,
): Promise<void> => {
  const { xml, width, height } = serializeStyledSvg(svg)
  renderer.baseImage = await svgXmlToImage(xml, width, height)
}

const drawCompositionFrame = (
  renderer: CompositionRenderer,
  trailCanvas: HTMLCanvasElement,
): void => {
  const { context, width, height, backgroundColor, baseImage } = renderer
  context.clearRect(0, 0, width, height)
  context.fillStyle = backgroundColor
  context.fillRect(0, 0, width, height)
  if (baseImage) {
    context.drawImage(baseImage, 0, 0, width, height)
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
    const curve = resolveCurveFromEdge(edge, workspace.nodes)
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

const resolveCurveFromEdge = (
  edge: EdgeModel,
  nodes: Record<string, NodeModel>,
): {
  start: { x: number; y: number }
  control1: { x: number; y: number }
  control2: { x: number; y: number }
  end: { x: number; y: number }
} | null => {
  const from = nodes[edge.from.nodeId]
  const to = nodes[edge.to.nodeId]
  if (!from || !to) {
    return null
  }

  const fromPortId = edge.from.portId ?? nearestPortId(from, nodeCenter(to))
  const toPortId = edge.to.portId ?? nearestPortId(to, nodeCenter(from))
  const start = portWorldPosition(from, fromPortId)
  const end = portWorldPosition(to, toPortId)
  const middleX = (start.x + end.x) / 2
  return {
    start,
    control1: { x: middleX, y: start.y },
    control2: { x: middleX, y: end.y },
    end,
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
  const renderer = createCompositionRenderer(svg, canvasPanel)
  const gif = GIFEncoder()
  const frameDelayMs = Math.max(20, Math.round(1000 / Math.max(1, fps)))

  await captureFramesLoop({
    durationMs,
    fps,
    renderer,
    svg,
    trailCanvas,
    resolveBaseKey,
    onFrameCapture: () => {
      const imageData = renderer.context.getImageData(0, 0, renderer.width, renderer.height)
      const palette = quantize(imageData.data, 256, { format: 'rgb565' })
      const index = applyPalette(imageData.data, palette, 'rgb565')
      gif.writeFrame(index, renderer.width, renderer.height, {
        palette,
        delay: frameDelayMs,
        repeat: 0,
      })
    },
  })

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
}: ExportAnimatedVideoOptions): Promise<VideoMimeSelection> => {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('Seu navegador não suporta export de vídeo via MediaRecorder.')
  }
  const mime = resolveVideoMimeType((candidate) => MediaRecorder.isTypeSupported(candidate))
  if (!mime) {
    throw new Error('Navegador sem suporte para codecs de vídeo compatíveis (MP4/WebM).')
  }

  const renderer = createCompositionRenderer(svg, canvasPanel)
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
      reject(event.error ?? new Error('Falha ao gravar vídeo.'))
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
  const curves = resolveJourneyStepCurves(workspace, journey)
  if (!curves.length) {
    throw new Error('A jornada selecionada não possui passos válidos para SVG animado.')
  }

  const clone = cloneSvgWithInlineStyles(svg)
  const { width, height } = resolveSvgDimensions(svg)
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
@keyframes edge-flow-dash {
  from { stroke-dashoffset: 0; }
  to { stroke-dashoffset: -12; }
}
.export-journey-step {
  fill: none;
  stroke: ${journey.colorKey};
  stroke-width: 2.8;
  stroke-dasharray: 6 6;
  animation: edge-flow-dash 0.9s linear infinite;
  opacity: 0.92;
}
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

  for (const [index, curve] of curves.entries()) {
    const path = document.createElementNS(SVG_NS, 'path')
    path.setAttribute('id', `export-journey-path-${index}`)
    path.setAttribute('d', curve.path)
    path.setAttribute('class', 'export-journey-step')
    overlay.appendChild(path)
  }

  const stepDurationMs = Math.max(MIN_TRAVEL_DURATION_MS, playerSpeedMs) + STEP_ARRIVAL_HOLD_MS
  const halo = document.createElementNS(SVG_NS, 'circle')
  halo.setAttribute('r', '11')
  halo.setAttribute('class', 'export-journey-halo')
  const orb = document.createElementNS(SVG_NS, 'circle')
  orb.setAttribute('r', '6.2')
  orb.setAttribute('class', 'export-journey-orb')

  for (let index = 0; index < curves.length; index += 1) {
    const begin =
      index === 0
        ? `0s;export-journey-motion-${curves.length - 1}.end+0.18s`
        : `export-journey-motion-${index - 1}.end`

    const orbMotion = document.createElementNS(SVG_NS, 'animateMotion')
    orbMotion.setAttribute('id', `export-journey-motion-${index}`)
    orbMotion.setAttribute('begin', begin)
    orbMotion.setAttribute('dur', `${stepDurationMs}ms`)
    orbMotion.setAttribute('fill', 'freeze')
    orbMotion.setAttribute('path', curves[index].path)
    orb.appendChild(orbMotion)

    const haloMotion = document.createElementNS(SVG_NS, 'animateMotion')
    haloMotion.setAttribute('begin', begin)
    haloMotion.setAttribute('dur', `${stepDurationMs}ms`)
    haloMotion.setAttribute('fill', 'freeze')
    haloMotion.setAttribute('path', curves[index].path)
    halo.appendChild(haloMotion)
  }

  const pulse = document.createElementNS(SVG_NS, 'animate')
  pulse.setAttribute('attributeName', 'r')
  pulse.setAttribute('values', '9.4;12;9.4')
  pulse.setAttribute('dur', '520ms')
  pulse.setAttribute('repeatCount', 'indefinite')
  halo.appendChild(pulse)

  overlay.appendChild(halo)
  overlay.appendChild(orb)
  clone.appendChild(overlay)

  const xml = new XMLSerializer().serializeToString(clone)
  const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
  downloadBlob(blob, `${resolveFilenameBase(filenameBase)}-animated.svg`)
}
