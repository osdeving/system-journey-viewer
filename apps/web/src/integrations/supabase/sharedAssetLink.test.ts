/**
 * Purpose: Verify isolated Supabase shared-asset links stay scoped to a single export item.
 */

import { describe, expect, it } from 'vitest'
import {
  buildSharedSupabaseAssetViewerUrl,
  isSupabaseGalleryAssetShareable,
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

    expect(resolveSharedSupabaseAssetViewFromLocation(parsed)).toEqual({
      title: 'Orders Journey MP4',
      fileName: 'orders.mp4',
      contentType: 'video/mp4',
      signedUrl: 'https://project.supabase.co/storage/v1/object/sign/gallery/user-1/orders.mp4?token=abc123',
    })
  })

  it('rejects invalid payloads or non-share routes', () => {
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
