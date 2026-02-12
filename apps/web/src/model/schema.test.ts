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
    }
  })

  it('accepts optional node fill color style', () => {
    const workspace = createDefaultWorkspace()
    const parsed = workspaceSchema.safeParse({
      ...workspace,
      nodes: {
        ...workspace.nodes,
        n_api: {
          ...workspace.nodes.n_api,
          style: {
            fillColor: '#22c55e',
          },
        },
      },
    })

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.nodes.n_api.style?.fillColor).toBe('#22c55e')
    }
  })
})
