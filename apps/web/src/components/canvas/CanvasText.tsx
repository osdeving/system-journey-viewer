/**
 * Purpose: Provide React canvas rendering components for nodes, edges, labels, and interactive diagram visuals.
 */

import type { ReactNode, SVGProps } from 'react'

type CanvasTextProps = SVGProps<SVGTextElement> & {
  x: number
  y: number
  lineHeightEm?: number
}

const resolveMultiline = (children: ReactNode): string[] | null => {
  if (typeof children !== 'string' && typeof children !== 'number') {
    return null
  }
  const lines = String(children).split('\n')
  return lines.length > 1 ? lines : null
}

export const CanvasText = ({
  x,
  y,
  lineHeightEm = 1.18,
  children,
  ...rest
}: CanvasTextProps) => {
  const lines = resolveMultiline(children)
  if (!lines) {
    return (
      <text x={x} y={y} {...rest}>
        {children}
      </text>
    )
  }
  return (
    <text x={x} y={y} {...rest}>
      {lines.map((line, index) => (
        <tspan
          key={`${index}:${line}`}
          x={x}
          dy={index === 0 ? 0 : `${lineHeightEm}em`}
        >
          {line || '\u200b'}
        </tspan>
      ))}
    </text>
  )
}
