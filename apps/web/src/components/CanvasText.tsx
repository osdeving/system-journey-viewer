import type { SVGProps } from 'react'

type CanvasTextProps = SVGProps<SVGTextElement> & {
  x: number
  y: number
}

export const CanvasText = ({ x, y, children, ...rest }: CanvasTextProps) => (
  <text x={x} y={y} {...rest}>
    {children}
  </text>
)
