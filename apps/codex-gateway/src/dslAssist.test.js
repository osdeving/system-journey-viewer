import test from 'node:test'
import assert from 'node:assert/strict'
import { buildDslAssistPrompt, parseDslAssistRequest } from './dslAssist.js'

test('parseDslAssistRequest validates dsl and applies default instruction', () => {
  const parsed = parseDslAssistRequest({
    dslText: 'workspace "Payments" { view "Container" container {}}',
  })

  assert.equal(parsed.dslText, 'workspace "Payments" { view "Container" container {}}')
  assert.equal(parsed.threadId, null)
  assert.match(parsed.instruction, /Refine this SJV Script/)
})

test('parseDslAssistRequest keeps non-empty instruction and thread id', () => {
  const parsed = parseDslAssistRequest({
    dslText: 'workspace "Orders" {}',
    instruction: 'Add async edge to billing',
    threadId: 'thr_123',
  })

  assert.equal(parsed.instruction, 'Add async edge to billing')
  assert.equal(parsed.threadId, 'thr_123')
})

test('parseDslAssistRequest rejects invalid payload', () => {
  assert.throws(() => parseDslAssistRequest(null), /Invalid JSON payload/)
  assert.throws(() => parseDslAssistRequest({ dslText: '   ' }), /dslText/)
  assert.throws(
    () => parseDslAssistRequest({ dslText: 'workspace "A" {}', threadId: '' }),
    /threadId/,
  )
})

test('buildDslAssistPrompt includes instruction and fenced sjv block', () => {
  const prompt = buildDslAssistPrompt({
    instruction: 'Include OAuth2 authentication',
    dslText: 'workspace "Auth" {}',
  })

  assert.match(prompt, /Include OAuth2 authentication/)
  assert.match(prompt, /```sjv/)
  assert.match(prompt, /workspace "Auth" \{\}/)
  assert.match(prompt, /Return format \(strict\)/)
})
