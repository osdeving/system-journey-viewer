const MAX_FIELD_LENGTH = 60_000
const DEFAULT_INSTRUCTION =
  'Refine this SJV Script while preserving behavior and improving clarity, naming, and consistency.'

const isObject = (value) => typeof value === 'object' && value !== null

const normalizeStringField = (value, fieldName) => {
  if (typeof value !== 'string') {
    throw new Error(`Field "${fieldName}" must be a string.`)
  }
  const normalized = value.trim()
  if (!normalized) {
    throw new Error(`Field "${fieldName}" cannot be empty.`)
  }
  if (normalized.length > MAX_FIELD_LENGTH) {
    throw new Error(`Field "${fieldName}" exceeds the ${MAX_FIELD_LENGTH} character limit.`)
  }
  return normalized
}

export const parseDslAssistRequest = (payload) => {
  if (!isObject(payload)) {
    throw new Error('Invalid JSON payload.')
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
You are helping with a text editor called "System Journey Viewer" that uses SJV Script.

Task:
- Apply the user request to the current SJV Script.
- Preserve semantic behavior unless the user explicitly asks to change behavior.
- Keep the script valid and complete.
- Preserve hierarchy links when present:
  - node-level \`drilldown <viewId>\`
  - view-level \`parent <viewId> via <alias>\`
- Preserve boundary grouping when present:
  - \`boundary ... contains alias1,alias2,...\`
- Multi-view workspace is allowed and expected in a single SJV Script file.

User request:
${instruction}

Return format (strict):
1. First line: short summary in plain text.
2. Then a single fenced block with language tag \`sjv\` containing the full updated SJV Script.
3. Do not omit any required section from the SJV Script.

Current SJV Script:
\`\`\`sjv
${dslText}
\`\`\`
`.trim()
