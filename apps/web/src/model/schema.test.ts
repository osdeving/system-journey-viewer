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
})
