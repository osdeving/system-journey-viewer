const CODEX_DSL_ENDPOINT = '/api/codex/dsl-assist'

export type CodexDslAssistPayload = {
  dslText: string
  instruction: string
  threadId?: string | null
}

type CodexGatewaySuccess = {
  threadId: string | null
  finalResponse: string
}

type CodexGatewayError = {
  error?: string
}

const extractFromFencedBlock = (text: string, regex: RegExp): string | null => {
  const match = text.match(regex)
  if (!match) {
    return null
  }
  const block = match[1]?.trim()
  return block ? block : null
}

export const extractDslFromCodexResponse = (responseText: string): string | null => {
  const dslBlock = extractFromFencedBlock(responseText, /```(?:sjv|sjv-script|dsl)\s*([\s\S]*?)```/i)
  if (dslBlock) {
    return dslBlock
  }
  const genericBlock = extractFromFencedBlock(responseText, /```[a-zA-Z0-9_-]*\s*([\s\S]*?)```/)
  if (genericBlock && /workspace\s+"[^"]+"/i.test(genericBlock)) {
    return genericBlock
  }
  const trimmed = responseText.trim()
  if (/^workspace\s+"[^"]+"/i.test(trimmed)) {
    return trimmed
  }
  return null
}

export const requestCodexDslAssist = async ({
  dslText,
  instruction,
  threadId,
}: CodexDslAssistPayload): Promise<CodexGatewaySuccess> => {
  const response = await fetch(CODEX_DSL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dslText,
      instruction,
      threadId: threadId ?? null,
    }),
  })

  let payload: CodexGatewaySuccess | CodexGatewayError | null = null
  try {
    payload = (await response.json()) as CodexGatewaySuccess | CodexGatewayError
  } catch {
    payload = null
  }

  if (!response.ok) {
    throw new Error(
      payload && 'error' in payload
        ? payload.error || 'Codex gateway request failed.'
        : 'Codex gateway request failed.',
    )
  }
  if (!payload || !('finalResponse' in payload) || typeof payload.finalResponse !== 'string') {
    throw new Error('Invalid response from Codex gateway.')
  }

  return {
    threadId: payload.threadId ?? null,
    finalResponse: payload.finalResponse,
  }
}
