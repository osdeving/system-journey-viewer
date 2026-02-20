import { describe, expect, it } from 'vitest'
import { createDefaultWorkspace } from './defaultWorkspace'
import { workspaceSchema } from './schema'

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

  it('defaults theme to light when missing', () => {
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
      expect(parsed.data.settings.theme).toBe('light')
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
})
