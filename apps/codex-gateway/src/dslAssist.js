const MAX_FIELD_LENGTH = 60_000
const DEFAULT_INSTRUCTION =
  'Refine this DSL LITE while preserving behavior and improving clarity, naming, and consistency.'

const isObject = (value) => typeof value === 'object' && value !== null

const normalizeStringField = (value, fieldName) => {
  if (typeof value !== 'string') {
    throw new Error(`Campo "${fieldName}" deve ser string.`)
  }
  const normalized = value.trim()
  if (!normalized) {
    throw new Error(`Campo "${fieldName}" não pode ser vazio.`)
  }
  if (normalized.length > MAX_FIELD_LENGTH) {
    throw new Error(`Campo "${fieldName}" excede o limite de ${MAX_FIELD_LENGTH} caracteres.`)
  }
  return normalized
}

export const parseDslAssistRequest = (payload) => {
  if (!isObject(payload)) {
    throw new Error('Payload JSON inválido.')
  }
  const dslText = normalizeStringField(payload.dslText, 'dslText')
  const instruction =
    typeof payload.instruction === 'string' && payload.instruction.trim()
      ? normalizeStringField(payload.instruction, 'instruction')
      : DEFAULT_INSTRUCTION

  let threadId = null
  if ('threadId' in payload && payload.threadId !== null && payload.threadId !== undefined) {
    threadId = normalizeStringField(payload.threadId, 'threadId')
  }

  return { dslText, instruction, threadId }
}

export const buildDslAssistPrompt = ({ instruction, dslText }) => `
You are helping with a DSL editor called "System Journey Viewer".

Task:
- Apply the user request to the current DSL.
- Preserve semantic behavior unless the user explicitly asks to change behavior.
- Keep the DSL valid and complete.

User request:
${instruction}

Return format (strict):
1. First line: short summary in plain text.
2. Then a single fenced block with language tag \`dsl\` containing the full updated DSL.
3. Do not omit any required section from the DSL.

Current DSL:
\`\`\`dsl
${dslText}
\`\`\`
`.trim()
