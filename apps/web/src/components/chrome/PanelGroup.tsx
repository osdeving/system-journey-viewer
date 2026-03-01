/**
 * Purpose: Provide a reusable collapsible panel group shell for dock, drawer, and mobile tab content.
 */

import { useState } from 'react'
import type { ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

type PanelGroupProps = {
  title: string
  defaultExpanded?: boolean
  className?: string
  bodyClassName?: string
  actions?: ReactNode
  children: ReactNode
}

export const PanelGroup = ({
  title,
  defaultExpanded = true,
  className,
  bodyClassName,
  actions,
  children,
}: PanelGroupProps) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <section
      className={[
        'panel-group',
        isExpanded ? 'panel-group-expanded' : 'panel-group-collapsed',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="panel-group-header">
        <button
          type="button"
          className="panel-group-toggle"
          onClick={() => setIsExpanded((current) => !current)}
          aria-expanded={isExpanded}
        >
          <span className="panel-group-toggle-icon" aria-hidden="true">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          <span className="panel-group-title">{title}</span>
        </button>
        {actions ? (
          <div
            className="panel-group-actions"
            onClick={(event) => {
              event.stopPropagation()
            }}
          >
            {actions}
          </div>
        ) : null}
      </div>
      {isExpanded ? (
        <div className={bodyClassName ? `panel-group-body ${bodyClassName}` : 'panel-group-body'}>{children}</div>
      ) : null}
    </section>
  )
}
