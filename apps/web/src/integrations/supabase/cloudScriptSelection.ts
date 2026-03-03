/**
 * Purpose: Build and validate prompt-based selection for loading saved Supabase SJV Scripts.
 */

import type { SupabaseCloudScriptSummary } from './workspaceCloudStore'

const formatUpdatedAt = (updatedAt: string): string => {
  const timestamp = Date.parse(updatedAt)
  if (Number.isNaN(timestamp)) {
    return updatedAt
  }
  return new Date(timestamp).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC')
}

export const buildSupabaseCloudScriptSelectionPrompt = (
  scripts: SupabaseCloudScriptSummary[],
): string =>
  [
    'Choose a Supabase SJV Script to load. Enter the script number:',
    ...scripts.map(
      (script, index) =>
        `${index + 1}. ${script.title} (updated ${formatUpdatedAt(script.updatedAt)})`,
    ),
  ].join('\n')

export const resolveSupabaseCloudScriptSelection = (
  scripts: SupabaseCloudScriptSummary[],
  selection: string | null | undefined,
): SupabaseCloudScriptSummary | null => {
  if (selection == null) {
    return null
  }

  const normalizedSelection = selection.trim()
  if (!normalizedSelection) {
    throw new Error('Enter a script number.')
  }
  if (!/^\d+$/.test(normalizedSelection)) {
    throw new Error('Choose a valid script number from the list.')
  }

  const numericSelection = Number.parseInt(normalizedSelection, 10)
  if (!Number.isInteger(numericSelection) || numericSelection < 1 || numericSelection > scripts.length) {
    throw new Error('Choose a valid script number from the list.')
  }

  return scripts[numericSelection - 1]
}
