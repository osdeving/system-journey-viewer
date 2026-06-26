/**
 * Purpose: Render the app-wide status bar with VS Code-style metrics and quick actions.
 */

import type { ReactNode } from 'react'
import { Text } from '../text/Text'

export type StatusBarItem = {
  id: string
  label: string
  title?: string
  icon?: ReactNode
  priority?: 'primary' | 'secondary'
}

export type StatusBarAction = {
  id: string
  label: string
  icon: ReactNode
  title?: string
  active?: boolean
  disabled?: boolean
  ariaLabel?: string
  onClick: () => void
}

export type StatusBarProps = {
  items: StatusBarItem[]
  actions: StatusBarAction[]
  ariaLabel?: string
}

export const StatusBar = ({
  items,
  actions,
  ariaLabel = 'Application status bar',
}: StatusBarProps) => (
  <footer className="app-status-bar" aria-label={ariaLabel}>
    <div className="app-status-bar-section app-status-bar-section-left">
      {items.map((item) => (
        <span
          key={item.id}
          className={[
            'app-status-bar-item',
            item.priority === 'primary' ? 'app-status-bar-item-primary' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          title={item.title}
        >
          {item.icon ? <span className="app-status-bar-icon" aria-hidden="true">{item.icon}</span> : null}
          <Text truncate tone="inverse" size="xs" weight="semibold">
            {item.label}
          </Text>
        </span>
      ))}
    </div>
    <div className="app-status-bar-section app-status-bar-section-right">
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          className={action.active ? 'app-status-bar-button app-status-bar-button-active' : 'app-status-bar-button'}
          onClick={action.onClick}
          disabled={action.disabled}
          aria-label={action.ariaLabel ?? action.label}
          aria-pressed={typeof action.active === 'boolean' ? action.active : undefined}
          title={action.title}
        >
          {action.icon}
          <Text as="span" tone="inverse" size="xs" weight="semibold">
            {action.label}
          </Text>
        </button>
      ))}
    </div>
  </footer>
)
