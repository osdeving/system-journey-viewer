/**
 * Purpose: Implement export pipelines and format-specific rendering helpers.
 */

import { jsPDF } from 'jspdf'

const defaultDimension = 1200

const getSvgDimensions = (svg: SVGSVGElement): { width: number; height: number } => {
  const rect = svg.getBoundingClientRect()
  const widthAttr = Number(svg.getAttribute('width') ?? 0)
  const heightAttr = Number(svg.getAttribute('height') ?? 0)
  const width = Math.round(rect.width) || widthAttr || defaultDimension
  const height = Math.round(rect.height) || heightAttr || defaultDimension
  return { width, height }
}

const buildSvgString = (svg: SVGSVGElement): { xml: string; width: number; height: number } => {
  const clone = svg.cloneNode(true) as SVGSVGElement
  const { width, height } = getSvgDimensions(svg)
  clone.setAttribute('width', `${width}`)
  clone.setAttribute('height', `${height}`)
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
  const xml = new XMLSerializer().serializeToString(clone)
  return { xml, width, height }
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
    image.onerror = (error) => {
      URL.revokeObjectURL(url)
      reject(error)
    }
    image.src = url
  })

const toPngBlob = async (svg: SVGSVGElement): Promise<Blob> => {
  const { xml, width, height } = buildSvgString(svg)
  const image = await svgXmlToImage(xml, width, height)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Failed to export PNG: canvas context unavailable.')
  }
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to generate PNG.'))
        return
      }
      resolve(blob)
    }, 'image/png')
  })
}

export const serializeCanvasSvg = (svg: SVGSVGElement): string => buildSvgString(svg).xml

export const exportSvg = (svg: SVGSVGElement, filename = 'diagram.svg'): void => {
  const xml = serializeCanvasSvg(svg)
  const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' })
  downloadBlob(blob, filename)
}

export const exportPng = async (
  svg: SVGSVGElement,
  filename = 'diagram.png',
): Promise<void> => {
  const blob = await toPngBlob(svg)
  downloadBlob(blob, filename)
}

export const exportPdf = async (
  svg: SVGSVGElement,
  filename = 'diagram.pdf',
): Promise<void> => {
  const blob = await toPngBlob(svg)
  const imageUrl = URL.createObjectURL(blob)
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const candidate = new Image()
    candidate.onload = () => resolve(candidate)
    candidate.onerror = (error) => reject(error)
    candidate.src = imageUrl
  })
  const orientation = image.width >= image.height ? 'landscape' : 'portrait'
  const pdf = new jsPDF({
    orientation,
    unit: 'px',
    format: [image.width, image.height],
  })
  pdf.addImage(image, 'PNG', 0, 0, image.width, image.height)
  pdf.save(filename)
  URL.revokeObjectURL(imageUrl)
}
