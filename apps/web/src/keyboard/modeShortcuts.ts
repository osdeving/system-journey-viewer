/**
 * Purpose: Define keyboard shortcut mappings and mode resolution helpers.
 */

export type ModeShortcutAction = 'toggle-focus' | 'exit-immersive'

export const resolveModeShortcutAction = (
  key: string,
  options: { focusMode: boolean; presentationMode: boolean },
): ModeShortcutAction | null => {
  const normalizedKey = key.toLowerCase()
  if (normalizedKey === 'f') {
    return 'toggle-focus'
  }
  if (normalizedKey === 'escape' && (options.focusMode || options.presentationMode)) {
    return 'exit-immersive'
  }
  return null
}
