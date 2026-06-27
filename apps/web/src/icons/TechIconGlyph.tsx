/**
 * Purpose: Render technology icon catalog entries as reusable SVG glyphs in chrome and canvas surfaces.
 */

import type { SVGProps } from 'react'
import { resolveTechIconDefinition } from './techIconCatalog'

type TechIconGlyphProps = Omit<SVGProps<SVGSVGElement>, 'children'> & {
  iconId: string
  size?: number
  title?: string
}

type TechIconGlyphContentProps = {
  iconId: string
  title?: string
}

export const TechIconGlyphContent = ({ iconId, title }: TechIconGlyphContentProps) => {
  const icon = resolveTechIconDefinition(iconId)
  if (!icon) {
    return null
  }
  const resolvedTitle = title ?? icon.label

  return (
    <>
      {resolvedTitle ? <title>{resolvedTitle}</title> : null}
      {icon.glyph.type === 'simple' ? (
        <path d={icon.glyph.path} fill={icon.glyph.fill} />
      ) : icon.glyph.type === 'badge' ? (
        <>
          <path
            d="M12 1.7 21.2 7v10L12 22.3 2.8 17V7z"
            fill={icon.glyph.fill}
            stroke={icon.glyph.stroke}
            strokeWidth={1}
          />
          <text
            x={12}
            y={12.8}
            fill={icon.glyph.textColor}
            fontSize={7.3}
            fontWeight={800}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {icon.glyph.label}
          </text>
        </>
      ) : (
        icon.glyph.paths.map((path, index) => (
          <path
            key={`${icon.id}-${index}`}
            d={path.d}
            fill={path.fill ?? 'none'}
            stroke={path.stroke}
            strokeWidth={path.strokeWidth}
            strokeLinecap={path.strokeLinecap}
            strokeLinejoin={path.strokeLinejoin}
          />
        ))
      )}
    </>
  )
}

export const TechIconGlyph = ({
  iconId,
  size = 24,
  title,
  width,
  height,
  ...props
}: TechIconGlyphProps) => {
  const icon = resolveTechIconDefinition(iconId)
  if (!icon) {
    return null
  }
  const resolvedTitle = title ?? icon.label
  const svgWidth = width ?? size
  const svgHeight = height ?? size

  return (
    <svg
      viewBox="0 0 24 24"
      width={svgWidth}
      height={svgHeight}
      role={resolvedTitle ? 'img' : undefined}
      aria-label={resolvedTitle}
      focusable="false"
      {...props}
    >
      <TechIconGlyphContent iconId={iconId} title={resolvedTitle} />
    </svg>
  )
}
