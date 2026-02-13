import test from 'node:test'
import assert from 'node:assert/strict'
import { buildDslAssistPrompt, parseDslAssistRequest } from './dslAssist.js'

test('parseDslAssistRequest validates dsl and applies default instruction', () => {
  const parsed = parseDslAssistRequest({
    dslText: 'workspace "Payments" { view "Container" container {}}',
  })

  assert.equal(parsed.dslText, 'workspace "Payments" { view "Container" container {}}')
  assert.equal(parsed.threadId, null)
  assert.match(parsed.instruction, /Refine this DSL LITE/)
})

test('parseDslAssistRequest keeps non-empty instruction and thread id', () => {
  const parsed = parseDslAssistRequest({
    dslText: 'workspace "Orders" {}',
    instruction: 'Adicionar edge assíncrona para billing',
    threadId: 'thr_123',
  })

  assert.equal(parsed.instruction, 'Adicionar edge assíncrona para billing')
  assert.equal(parsed.threadId, 'thr_123')
})

test('parseDslAssistRequest rejects invalid payload', () => {
  assert.throws(() => parseDslAssistRequest(null), /Payload JSON inválido/)
  assert.throws(() => parseDslAssistRequest({ dslText: '   ' }), /dslText/)
  assert.throws(
    () => parseDslAssistRequest({ dslText: 'workspace "A" {}', threadId: '' }),
    /threadId/,
  )
})

test('buildDslAssistPrompt includes instruction and fenced dsl block', () => {
  const prompt = buildDslAssistPrompt({
    instruction: 'Incluir autenticação OAuth2',
    dslText: 'workspace "Auth" {}',
  })

  assert.match(prompt, /Incluir autenticação OAuth2/)
  assert.match(prompt, /```dsl/)
  assert.match(prompt, /workspace "Auth" \{\}/)
  assert.match(prompt, /Return format \(strict\)/)
})
