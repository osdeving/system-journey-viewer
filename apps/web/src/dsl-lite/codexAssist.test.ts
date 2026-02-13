import { afterEach, describe, expect, it, vi } from 'vitest'
import { extractDslFromCodexResponse, requestCodexDslAssist } from './codexAssist'

const originalFetch = globalThis.fetch

describe('extractDslFromCodexResponse', () => {
  it('extracts DSL from dsl fenced block', () => {
    const extracted = extractDslFromCodexResponse(
      'Resumo\n```dsl\nworkspace "Orders" {\n  view "Container" {}\n}\n```',
    )
    expect(extracted).toBe('workspace "Orders" {\n  view "Container" {}\n}')
  })

  it('falls back to generic fenced block when it looks like DSL', () => {
    const extracted = extractDslFromCodexResponse(
      '```text\nworkspace "Billing" {\n  view "Container" {}\n}\n```',
    )
    expect(extracted).toBe('workspace "Billing" {\n  view "Container" {}\n}')
  })

  it('accepts plain DSL responses', () => {
    const extracted = extractDslFromCodexResponse('workspace "Auth" {\n  view "Container" {}\n}')
    expect(extracted).toBe('workspace "Auth" {\n  view "Container" {}\n}')
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
        finalResponse: '```dsl\nworkspace "Orders" {}\n```',
      }),
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const result = await requestCodexDslAssist({
      dslText: 'workspace "Orders" {}',
      instruction: 'Adicionar fila de eventos',
      threadId: null,
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/codex/dsl-assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dslText: 'workspace "Orders" {}',
        instruction: 'Adicionar fila de eventos',
        threadId: null,
      }),
    })
    expect(result.threadId).toBe('thr_abc')
    expect(result.finalResponse).toContain('workspace "Orders" {}')
  })

  it('throws gateway error message when request fails', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Falha de autenticação' }),
    }) as unknown as typeof fetch

    await expect(
      requestCodexDslAssist({
        dslText: 'workspace "Orders" {}',
        instruction: 'Reescrever nomes',
      }),
    ).rejects.toThrow('Falha de autenticação')
  })
})
