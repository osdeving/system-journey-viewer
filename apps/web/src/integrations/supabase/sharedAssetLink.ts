/**
 * Purpose: Build and parse isolated one-asset share links for private Supabase gallery exports.
 */

import type { SupabaseGalleryAsset } from './workspaceCloudStore'

export type SharedSupabaseAssetView = {
  title: string
  fileName: string
  contentType: string
  signedUrl: string
}

type SharedSupabaseAssetPayload = SharedSupabaseAssetView

const SHARED_ASSET_ROUTE_PATH = '/share'
const SHARED_ASSET_QUERY_KEY = 'asset'

const isRecordLike = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const isSharedSupabaseAssetPayload = (
  value: unknown,
): value is SharedSupabaseAssetPayload =>
  isRecordLike(value) &&
  isNonEmptyString(value.title) &&
  isNonEmptyString(value.fileName) &&
  isNonEmptyString(value.contentType) &&
  isNonEmptyString(value.signedUrl)

export const isSupabaseGalleryAssetShareable = (
  asset: Pick<SupabaseGalleryAsset, 'contentType' | 'fileName'>,
): boolean => {
  if (asset.contentType.startsWith('video/')) {
    return true
  }
  return (
    asset.contentType === 'image/gif' ||
    asset.fileName.trim().toLowerCase().endsWith('.gif')
  )
}

export const buildSharedSupabaseAssetViewerUrl = (
  origin: string,
  asset: SharedSupabaseAssetPayload,
): string => {
  const url = new URL(SHARED_ASSET_ROUTE_PATH, origin)
  url.searchParams.set(
    SHARED_ASSET_QUERY_KEY,
    JSON.stringify({
      title: asset.title.trim(),
      fileName: asset.fileName.trim(),
      contentType: asset.contentType.trim(),
      signedUrl: asset.signedUrl.trim(),
    }),
  )
  return url.toString()
}

export const resolveSharedSupabaseAssetViewFromLocation = (
  location: Pick<Location, 'pathname' | 'search'>,
): SharedSupabaseAssetView | null => {
  if (
    location.pathname !== SHARED_ASSET_ROUTE_PATH &&
    location.pathname !== `${SHARED_ASSET_ROUTE_PATH}/`
  ) {
    return null
  }

  const rawPayload = new URLSearchParams(location.search).get(SHARED_ASSET_QUERY_KEY)
  if (!rawPayload) {
    return null
  }

  try {
    const parsed = JSON.parse(rawPayload) as unknown
    if (!isSharedSupabaseAssetPayload(parsed)) {
      return null
    }
    return {
      title: parsed.title.trim(),
      fileName: parsed.fileName.trim(),
      contentType: parsed.contentType.trim(),
      signedUrl: parsed.signedUrl.trim(),
    }
  } catch {
    return null
  }
}
