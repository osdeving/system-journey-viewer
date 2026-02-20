import { describe, expect, it } from 'vitest'
import { createDefaultWorkspace } from '../model/defaultWorkspace'
import { fullWorkspaceToLiteDsl } from './convert'
import { resolveDslPanelText } from './sync'

describe('resolveDslPanelText', () => {
  it('keeps current text when sync is disabled', () => {
    const workspace = createDefaultWorkspace()
    const currentText = 'workspace "Draft" {\n}\n'

    const resolved = resolveDslPanelText(workspace, currentText, false)

    expect(resolved).toBe(currentText)
  })

  it('returns workspace DSL when sync is enabled', () => {
    const workspace = createDefaultWorkspace()
    const expectedDsl = fullWorkspaceToLiteDsl(workspace)

    const resolved = resolveDslPanelText(workspace, 'old content', true)

    expect(resolved).toBe(expectedDsl)
  })
})
