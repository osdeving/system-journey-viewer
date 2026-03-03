/**
 * Purpose: Format Supabase cloud script metadata for the in-app script picker UI.
 */

export const formatSupabaseCloudScriptUpdatedAt = (updatedAt: string): string => {
  const timestamp = Date.parse(updatedAt)
  if (Number.isNaN(timestamp)) {
    return updatedAt
  }
  return new Date(timestamp).toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC')
}
