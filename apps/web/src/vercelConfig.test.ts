/// <reference types="node" />
/**
 * Purpose: Verify the app-local Vercel SPA rewrite config stays colocated with the deployed web root.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const vercelConfigSource = readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8')

describe('app-local Vercel config', () => {
  it('keeps a SPA fallback rewrite for direct deep links such as shared exports', () => {
    expect(vercelConfigSource).toContain('"rewrites"')
    expect(vercelConfigSource).toContain('"source": "/(.*)"')
    expect(vercelConfigSource).toContain('"destination": "/index.html"')
  })
})
