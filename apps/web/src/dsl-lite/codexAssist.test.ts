import { afterEach, describe, expect, it, vi } from 'vitest'
import { extractDslFromCodexResponse, requestCodexDslAssist } from './codexAssist'

const originalFetch = globalThis.fetch

describe('extractDslFromCodexResponse', () => {
  it('extracts script from sjv fenced block', () => {
    const extracted = extractDslFromCodexResponse(
      'Summary\n```sjv\nworkspace "Orders" {\n  view v_main container {\n    container api "API"\n  }\n}\n```',
    )
    expect(extracted).toBe('workspace "Orders" {\n  view v_main container {\n    container api "API"\n  }\n}')
  })

  it('falls back to generic fenced block when it looks like a script', () => {
    const extracted = extractDslFromCodexResponse(
      '```text\nworkspace "Billing" {\n  view v_main container {\n    container api "API"\n  }\n}\n```',
    )
    expect(extracted).toBe('workspace "Billing" {\n  view v_main container {\n    container api "API"\n  }\n}')
  })

  it('accepts plain script responses', () => {
    const extracted = extractDslFromCodexResponse(
      'workspace "Auth" {\n  view v_main container {\n    container api "API"\n  }\n}',
    )
    expect(extracted).toBe('workspace "Auth" {\n  view v_main container {\n    container api "API"\n  }\n}')
  })
})

describe('requestCodexDslAssist', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('posts payload and returns normalized response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        threadId: 'thr_abc',
        finalResponse: '```sjv\nworkspace "Orders" {\n  view v_main container {\n    container api "API"\n  }\n}\n```',
      }),
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const result = await requestCodexDslAssist({
      dslText: 'workspace "Orders" {}',
      instruction: 'Add a queue and connect API to it',
      threadId: null,
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/codex/dsl-assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dslText: 'workspace "Orders" {}',
        instruction: 'Add a queue and connect API to it',
        threadId: null,
      }),
    })
    expect(result.threadId).toBe('thr_abc')
    expect(result.finalResponse).toContain('workspace "Orders" {')
  })

  it('throws gateway error message when request fails', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Authentication failed' }),
    }) as unknown as typeof fetch

    await expect(
      requestCodexDslAssist({
        dslText: 'workspace "Orders" {}',
        instruction: 'Rewrite labels',
      }),
    ).rejects.toThrow('Authentication failed')
  })
})
