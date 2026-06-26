/**
 * Purpose: Define app-wide icon set identifiers and validation helpers.
 */

export type AppIconSetId = 'lucide' | 'lucideFine' | 'lucideCompact'

export type AppIconSetOption = {
  id: AppIconSetId
  label: string
  description: string
}

export const APP_ICON_SET_OPTIONS: AppIconSetOption[] = [
  {
    id: 'lucide',
    label: 'Lucide Product',
    description: 'Balanced product icons with a consistent 24px grid.',
  },
  {
    id: 'lucideFine',
    label: 'Lucide Fine',
    description: 'Lighter strokes for dense IDE chrome.',
  },
  {
    id: 'lucideCompact',
    label: 'Lucide Compact',
    description: 'Slightly heavier strokes for small tool rails and status items.',
  },
]

const APP_ICON_SET_IDS = new Set(APP_ICON_SET_OPTIONS.map((option) => option.id))

export const isAppIconSetId = (value: unknown): value is AppIconSetId =>
  typeof value === 'string' && APP_ICON_SET_IDS.has(value as AppIconSetId)

export const resolveAppIconStrokeWidth = (iconSet: AppIconSetId): number => {
  if (iconSet === 'lucideFine') {
    return 1.65
  }
  if (iconSet === 'lucideCompact') {
    return 2.35
  }
  return 2
}
