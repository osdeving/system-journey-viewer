/**
 * Purpose: Verify isolated Supabase shared-asset links stay scoped to a single export item.
 */

import { describe, expect, it } from 'vitest'
import {
  buildSharedSupabaseAssetViewerUrl,
  isSupabaseGalleryAssetShareable,
  isSharedSupabaseAssetViewerLocation,
  resolveSharedSupabaseAssetViewFromLocation,
} from './sharedAssetLink'

describe('shared Supabase asset links', () => {
  it('marks only mp4/video and gif assets as shareable', () => {
    expect(
      isSupabaseGalleryAssetShareable({
        contentType: 'video/mp4',
        fileName: 'demo.mp4',
      }),
    ).toBe(true)
    expect(
      isSupabaseGalleryAssetShareable({
        contentType: 'image/gif',
        fileName: 'demo.gif',
      }),
    ).toBe(true)
    expect(
      isSupabaseGalleryAssetShareable({
        contentType: 'image/png',
        fileName: 'demo.png',
      }),
    ).toBe(false)
  })

  it('round-trips a single shared asset through the /share route payload', () => {
    const sharedUrl = buildSharedSupabaseAssetViewerUrl('https://sjv.example.com', {
      title: 'Orders Journey MP4',
      fileName: 'orders.mp4',
      contentType: 'video/mp4',
      signedUrl: 'https://project.supabase.co/storage/v1/object/sign/gallery/user-1/orders.mp4?token=abc123',
    })
    const parsed = new URL(sharedUrl)

    expect(parsed.pathname).toBe('/')
    expect(parsed.searchParams.has('sharedAsset')).toBe(true)
    expect(resolveSharedSupabaseAssetViewFromLocation(parsed)).toEqual({
      title: 'Orders Journey MP4',
      fileName: 'orders.mp4',
      contentType: 'video/mp4',
      signedUrl: 'https://project.supabase.co/storage/v1/object/sign/gallery/user-1/orders.mp4?token=abc123',
    })
  })

  it('keeps legacy /share?asset links readable and flags both legacy and new viewer locations', () => {
    const legacyLocation = {
      pathname: '/share',
      search:
        '?asset=%7B%22title%22%3A%22Orders%20Journey%20MP4%22%2C%22fileName%22%3A%22orders.mp4%22%2C%22contentType%22%3A%22video%2Fmp4%22%2C%22signedUrl%22%3A%22https%3A%2F%2Fexample.test%2Forders.mp4%22%7D',
    }

    expect(isSharedSupabaseAssetViewerLocation(legacyLocation)).toBe(true)
    expect(
      isSharedSupabaseAssetViewerLocation({
        pathname: '/',
        search: legacyLocation.search,
      }),
    ).toBe(true)
    expect(resolveSharedSupabaseAssetViewFromLocation(legacyLocation)).toEqual({
      title: 'Orders Journey MP4',
      fileName: 'orders.mp4',
      contentType: 'video/mp4',
      signedUrl: 'https://example.test/orders.mp4',
    })
  })

  it('rejects invalid payloads or non-share routes', () => {
    expect(
      isSharedSupabaseAssetViewerLocation({
        pathname: '/',
        search: '',
      }),
    ).toBe(false)
    expect(
      resolveSharedSupabaseAssetViewFromLocation({
        pathname: '/',
        search: '?asset={}',
      }),
    ).toBeNull()
    expect(
      resolveSharedSupabaseAssetViewFromLocation({
        pathname: '/share',
        search: '?asset=not-json',
      }),
    ).toBeNull()
  })
})
