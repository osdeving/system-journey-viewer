import { createServer } from 'node:http'
import { Codex } from '@openai/codex-sdk'
import { buildDslAssistPrompt, parseDslAssistRequest } from './dslAssist.js'

const PORT = Number(process.env.CODEX_GATEWAY_PORT ?? 8787)
const MAX_BODY_BYTES = 1_000_000
const ALLOWED_METHODS = 'GET,POST,OPTIONS'
const ALLOWED_HEADERS = 'Content-Type'

const parseBooleanEnv = (value) => {
  if (value === undefined) {
    return undefined
  }
  return value === 'true'
}

const threadOptions = {
  model: process.env.CODEX_MODEL || undefined,
  sandboxMode: process.env.CODEX_SANDBOX_MODE || undefined,
  approvalPolicy: process.env.CODEX_APPROVAL_POLICY || undefined,
  workingDirectory: process.env.CODEX_WORKDIR || undefined,
  skipGitRepoCheck: parseBooleanEnv(process.env.CODEX_SKIP_GIT_REPO_CHECK),
  networkAccessEnabled: parseBooleanEnv(process.env.CODEX_NETWORK_ACCESS_ENABLED),
}

const codex = new Codex({
  apiKey: process.env.CODEX_API_KEY || process.env.OPENAI_API_KEY || undefined,
  baseUrl: process.env.OPENAI_BASE_URL || undefined,
})

const writeJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': ALLOWED_METHODS,
    'Access-Control-Allow-Headers': ALLOWED_HEADERS,
  })
  res.end(JSON.stringify(payload))
}

const readJsonBody = async (req) =>
  new Promise((resolve, reject) => {
    let body = ''
    let bytes = 0
    req.setEncoding('utf8')

    req.on('data', (chunk) => {
      bytes += Buffer.byteLength(chunk, 'utf8')
      if (bytes > MAX_BODY_BYTES) {
        reject(new Error('Payload excede limite de 1MB.'))
        req.destroy()
        return
      }
      body += chunk
    })

    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch {
        reject(new Error('Payload JSON inválido.'))
      }
    })
    req.on('error', (error) => reject(error))
  })

const handleDslAssist = async (req, res) => {
  const payload = await readJsonBody(req)
  const { dslText, instruction, threadId } = parseDslAssistRequest(payload)
  const thread = threadId
    ? codex.resumeThread(threadId, threadOptions)
    : codex.startThread(threadOptions)
  const turn = await thread.run(buildDslAssistPrompt({ instruction, dslText }))

  writeJson(res, 200, {
    threadId: thread.id,
    finalResponse: turn.finalResponse,
    usage: turn.usage,
  })
}

const server = createServer(async (req, res) => {
  if (!req.url || !req.method) {
    writeJson(res, 400, { error: 'Requisição inválida.' })
    return
  }
  if (req.method === 'OPTIONS') {
    writeJson(res, 204, {})
    return
  }

  const url = new URL(req.url, 'http://localhost')

  try {
    if (req.method === 'GET' && url.pathname === '/healthz') {
      writeJson(res, 200, { status: 'ok' })
      return
    }
    if (req.method === 'POST' && url.pathname === '/api/codex/dsl-assist') {
      await handleDslAssist(req, res)
      return
    }
    writeJson(res, 404, { error: 'Rota não encontrada.' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha interna no gateway Codex.'
    writeJson(res, 400, { error: message })
  }
})

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[codex-gateway] listening on http://localhost:${PORT}`)
})
