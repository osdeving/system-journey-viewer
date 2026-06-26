/**
 * Purpose: Render centralized chrome and preset icons using the selected icon set profile.
 */

import type { ComponentProps } from 'react'
import type { LucideIcon } from 'lucide-react'
import { resolveAppIconStrokeWidth, type AppIconSetId } from './iconSets'
import {
  APP_ICON_COMPONENTS,
  PRESET_ICON_COMPONENTS,
  type AppIconId,
} from './iconRegistryData'

export type AppIconProps = Omit<ComponentProps<LucideIcon>, 'ref'> & {
  id: AppIconId
  iconSet?: AppIconSetId
}

export const AppIcon = ({
  id,
  iconSet = 'lucide',
  size = 14,
  strokeWidth,
  absoluteStrokeWidth,
  ...props
}: AppIconProps) => {
  const Icon = APP_ICON_COMPONENTS[id]
  return (
    <Icon
      aria-hidden="true"
      focusable="false"
      size={size}
      strokeWidth={strokeWidth ?? resolveAppIconStrokeWidth(iconSet)}
      absoluteStrokeWidth={absoluteStrokeWidth ?? iconSet === 'lucideCompact'}
      {...props}
    />
  )
}

export type PresetIconProps = Omit<ComponentProps<LucideIcon>, 'ref'> & {
  iconKey?: string
  iconSet?: AppIconSetId
}

export const PresetIcon = ({
  iconKey,
  iconSet = 'lucide',
  size = 16,
  strokeWidth,
  absoluteStrokeWidth,
  ...props
}: PresetIconProps) => {
  const Icon = PRESET_ICON_COMPONENTS[iconKey as keyof typeof PRESET_ICON_COMPONENTS] ?? PRESET_ICON_COMPONENTS.component
  return (
    <Icon
      aria-hidden="true"
      focusable="false"
      size={size}
      strokeWidth={strokeWidth ?? resolveAppIconStrokeWidth(iconSet)}
      absoluteStrokeWidth={absoluteStrokeWidth ?? iconSet === 'lucideCompact'}
      {...props}
    />
  )
}
