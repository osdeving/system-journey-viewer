/**
 * Purpose: Organize Supabase cloud scripts and media into typed sections for the in-app cloud library UI.
 */

import type {
  SupabaseCloudScriptSummary,
  SupabaseGalleryAsset,
} from './workspaceCloudStore'

export type SupabaseCloudLibraryItem =
  | {
      kind: 'script'
      id: string
      title: string
      script: SupabaseCloudScriptSummary
    }
  | {
      kind: 'asset'
      id: string
      title: string
      assetKind: SupabaseCloudLibraryAssetKind
      asset: SupabaseGalleryAsset
    }

export type SupabaseCloudLibraryAssetKind = 'video' | 'image' | 'media'

export type SupabaseCloudLibrarySection = {
  id: 'scripts' | 'videos' | 'images' | 'media'
  title: string
  items: SupabaseCloudLibraryItem[]
}

const resolveSupabaseGalleryAssetKind = (
  asset: SupabaseGalleryAsset,
): SupabaseCloudLibraryAssetKind => {
  if (asset.contentType.startsWith('video/')) {
    return 'video'
  }
  if (asset.contentType.startsWith('image/')) {
    return 'image'
  }
  return 'media'
}

export const buildSupabaseCloudLibrarySections = (
  scripts: SupabaseCloudScriptSummary[],
  assets: SupabaseGalleryAsset[],
): SupabaseCloudLibrarySection[] => {
  const sections: SupabaseCloudLibrarySection[] = []

  if (scripts.length) {
    sections.push({
      id: 'scripts',
      title: 'Scripts',
      items: scripts.map((script) => ({
        kind: 'script',
        id: script.workspaceId,
        title: script.title,
        script,
      })),
    })
  }

  const assetBuckets: Record<'videos' | 'images' | 'media', SupabaseCloudLibraryItem[]> = {
    videos: [],
    images: [],
    media: [],
  }

  assets.forEach((asset) => {
    const assetKind = resolveSupabaseGalleryAssetKind(asset)
    const item: SupabaseCloudLibraryItem = {
      kind: 'asset',
      id: asset.id,
      title: asset.title,
      assetKind,
      asset,
    }

    if (assetKind === 'video') {
      assetBuckets.videos.push(item)
      return
    }
    if (assetKind === 'image') {
      assetBuckets.images.push(item)
      return
    }
    assetBuckets.media.push(item)
  })

  if (assetBuckets.videos.length) {
    sections.push({
      id: 'videos',
      title: 'Videos',
      items: assetBuckets.videos,
    })
  }

  if (assetBuckets.images.length) {
    sections.push({
      id: 'images',
      title: 'Images',
      items: assetBuckets.images,
    })
  }

  if (assetBuckets.media.length) {
    sections.push({
      id: 'media',
      title: 'Media',
      items: assetBuckets.media,
    })
  }

  return sections
}
