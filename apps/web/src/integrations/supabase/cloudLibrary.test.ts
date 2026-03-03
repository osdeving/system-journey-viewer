/**
 * Purpose: Verify Supabase cloud library sections are grouped by content type for the UI.
 */

import { describe, expect, it } from 'vitest'
import { buildSupabaseCloudLibrarySections } from './cloudLibrary'

describe('buildSupabaseCloudLibrarySections', () => {
  it('groups scripts before videos and images while preserving item order inside each section', () => {
    const sections = buildSupabaseCloudLibrarySections(
      [
        {
          workspaceId: 'orders',
          title: 'Orders Script',
          updatedAt: '2026-03-02T12:00:00.000Z',
        },
      ],
      [
        {
          id: 'asset-video',
          title: 'Orders Journey MP4',
          fileName: 'orders.mp4',
          storagePath: 'user-1/asset-video/orders.mp4',
          contentType: 'video/mp4',
          sizeBytes: 1024,
          createdAt: '2026-03-02T12:00:00.000Z',
        },
        {
          id: 'asset-image',
          title: 'Orders Journey PNG',
          fileName: 'orders.png',
          storagePath: 'user-1/asset-image/orders.png',
          contentType: 'image/png',
          sizeBytes: 512,
          createdAt: '2026-03-02T11:00:00.000Z',
        },
      ],
    )

    expect(sections.map((section) => section.id)).toEqual(['scripts', 'videos', 'images'])
    expect(sections[0]?.items[0]).toMatchObject({
      kind: 'script',
      title: 'Orders Script',
    })
    expect(sections[1]?.items[0]).toMatchObject({
      kind: 'asset',
      assetKind: 'video',
      title: 'Orders Journey MP4',
    })
    expect(sections[2]?.items[0]).toMatchObject({
      kind: 'asset',
      assetKind: 'image',
      title: 'Orders Journey PNG',
    })
  })

  it('falls back to a generic media section for unsupported content types', () => {
    const sections = buildSupabaseCloudLibrarySections([], [
      {
        id: 'asset-generic',
        title: 'Unknown Asset',
        fileName: 'unknown.bin',
        storagePath: 'user-1/asset-generic/unknown.bin',
        contentType: 'application/octet-stream',
        sizeBytes: 128,
        createdAt: '2026-03-02T10:00:00.000Z',
      },
    ])

    expect(sections).toHaveLength(1)
    expect(sections[0]).toMatchObject({
      id: 'media',
      title: 'Media',
    })
    expect(sections[0]?.items[0]).toMatchObject({
      kind: 'asset',
      assetKind: 'media',
    })
  })

  it('returns no sections when the cloud library is empty', () => {
    expect(buildSupabaseCloudLibrarySections([], [])).toEqual([])
  })
})
