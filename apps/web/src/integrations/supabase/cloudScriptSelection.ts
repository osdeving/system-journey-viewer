/**
 * Purpose: Format Supabase cloud script metadata for the in-app script picker UI.
 */

import type { SupabaseCloudScriptSummary } from './workspaceCloudStore'

export const formatSupabaseCloudScriptUpdatedAt = (updatedAt: string): string => {
  const timestamp = Date.parse(updatedAt)
  if (Number.isNaN(timestamp)) {
    return updatedAt
  }
  return new Date(timestamp).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC')
}

const normalizeSupabaseCloudScriptSearch = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, ' ')

export const filterSupabaseCloudScripts = (
  scripts: SupabaseCloudScriptSummary[],
  search: string,
): SupabaseCloudScriptSummary[] => {
  const normalizedSearch = normalizeSupabaseCloudScriptSearch(search)
  if (!normalizedSearch) {
    return scripts
  }

  return scripts.filter((script) => {
    const searchableText = `${script.title} ${script.workspaceId}`.toLowerCase()
    return searchableText.includes(normalizedSearch)
  })
}
