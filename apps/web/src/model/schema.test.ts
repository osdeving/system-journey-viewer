/**
 * Purpose: Verify schema behavior with regression-focused unit tests.
 */

import { describe, expect, it } from 'vitest'
import { createDefaultWorkspace } from './defaultWorkspace'
import { editorSnapshotSchema, workspaceSchema } from './schema'

describe('workspaceSchema', () => {
  it('accepts default workspace payload', () => {
    const workspace = createDefaultWorkspace()
    const parsed = workspaceSchema.safeParse(workspace)

    expect(parsed.success).toBe(true)
  })

  it('rejects invalid schema version', () => {
    const workspace = createDefaultWorkspace()
    const parsed = workspaceSchema.safeParse({
      ...workspace,
      schemaVersion: '0.9',
    })

    expect(parsed.success).toBe(false)
  })

  it('defaults theme to dark when missing', () => {
    const workspace = createDefaultWorkspace()
    const parsed = workspaceSchema.safeParse({
      ...workspace,
      settings: {
        grid: workspace.settings.grid,
        snap: workspace.settings.snap,
      },
    })

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.settings.theme).toBe('dark')
      expect(parsed.data.settings.journeyFocus).toEqual({
        offscopeRenderMode: 'hide',
        layoutMode: 'preserve',
        autoLayoutMode: 'manual',
      })
    }
  })

  it('accepts optional node style colors', () => {
    const workspace = createDefaultWorkspace()
    const parsed = workspaceSchema.safeParse({
      ...workspace,
      nodes: {
        ...workspace.nodes,
        n_api: {
          ...workspace.nodes.n_api,
          style: {
            fillColor: '#22c55e',
            textColor: '#f8fafc',
          },
        },
      },
    })

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.nodes.n_api.style?.fillColor).toBe('#22c55e')
      expect(parsed.data.nodes.n_api.style?.textColor).toBe('#f8fafc')
    }
  })

  it('accepts optional UI-only node technology icons in workspace snapshots', () => {
    const workspace = createDefaultWorkspace()
    const parsed = workspaceSchema.safeParse({
      ...workspace,
      nodes: {
        ...workspace.nodes,
        n_api: {
          ...workspace.nodes.n_api,
          uiIcon: {
            iconId: 'spring-boot',
            x: 86,
            y: 34,
            size: 24,
          },
        },
      },
    })

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.nodes.n_api.uiIcon).toEqual({
        iconId: 'spring-boot',
        x: 86,
        y: 34,
        size: 24,
      })
    }
  })

  it('accepts experimental basic shape nodes in workspace snapshots', () => {
    const workspace = createDefaultWorkspace()
    const parsed = workspaceSchema.safeParse({
      ...workspace,
      nodes: {
        ...workspace.nodes,
        n_shape_test: {
          id: 'n_shape_test',
          presetId: 'shape-diamond',
          kind: 'shape-diamond',
          name: 'Loose Diamond',
          tags: ['experimental-shape'],
          bounds: { x: 10, y: 20, w: 136, h: 136 },
          ports: [],
          children: [],
        },
      },
    })

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.nodes.n_shape_test.kind).toBe('shape-diamond')
    }
  })

  it('accepts experimental shape tools in editor snapshots', () => {
    const workspace = createDefaultWorkspace()
    const parsed = editorSnapshotSchema.safeParse({
      workspace,
      currentViewId: 'v_container',
      viewport: { x: 0, y: 0, zoom: 1 },
      activeTool: 'shape-triangle',
    })

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.activeTool).toBe('shape-triangle')
    }
  })

  it('accepts optional edge label side style', () => {
    const workspace = createDefaultWorkspace()
    const parsed = workspaceSchema.safeParse({
      ...workspace,
      edges: {
        ...workspace.edges,
        e_c_1: {
          ...workspace.edges.e_c_1,
          style: {
            ...workspace.edges.e_c_1.style,
            labelSide: 'right',
          },
        },
      },
    })

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.edges.e_c_1.style.labelSide).toBe('right')
    }
  })

  it('accepts optional edge label font size style', () => {
    const workspace = createDefaultWorkspace()
    const parsed = workspaceSchema.safeParse({
      ...workspace,
      edges: {
        ...workspace.edges,
        e_c_1: {
          ...workspace.edges.e_c_1,
          style: {
            ...workspace.edges.e_c_1.style,
            labelFontSize: 16,
          },
        },
      },
    })

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.edges.e_c_1.style.labelFontSize).toBe(16)
    }
  })

  it('accepts optional edge label rotation style', () => {
    const workspace = createDefaultWorkspace()
    const parsed = workspaceSchema.safeParse({
      ...workspace,
      edges: {
        ...workspace.edges,
        e_c_1: {
          ...workspace.edges.e_c_1,
          style: {
            ...workspace.edges.e_c_1.style,
            labelAngle: -24,
          },
        },
      },
    })

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.edges.e_c_1.style.labelAngle).toBe(-24)
    }
  })

  it('accepts note attachment node references', () => {
    const workspace = createDefaultWorkspace()
    const parsed = workspaceSchema.safeParse({
      ...workspace,
      nodes: {
        ...workspace.nodes,
        n_note_test: {
          id: 'n_note_test',
          presetId: 'note',
          kind: 'note',
          name: 'Note',
          tags: [],
          bounds: { x: 10, y: 20, w: 220, h: 100 },
          ports: [],
          children: [],
          noteTargetNodeId: 'n_api',
        },
      },
    })

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.nodes.n_note_test.noteTargetNodeId).toBe('n_api')
    }
  })
})
