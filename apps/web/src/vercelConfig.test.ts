/// <reference types="node" />
/**
 * Purpose: Verify the app-local Vercel SPA rewrite config stays colocated with the deployed web root.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const appVercelConfigSource = readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8')
const rootVercelConfigSource = readFileSync(resolve(process.cwd(), '..', '..', 'vercel.json'), 'utf8')

describe('app-local Vercel config', () => {
  it('keeps a local SPA fallback rewrite plus local dist output when apps/web is the project root', () => {
    expect(appVercelConfigSource).toContain('"outputDirectory": "dist"')
    expect(appVercelConfigSource).toContain('"rewrites"')
    expect(appVercelConfigSource).toContain('"source": "/(.*)"')
    expect(appVercelConfigSource).toContain('"destination": "/index.html"')
  })

  it('keeps the repo-root config pointed at the web workspace output for monorepo deployments', () => {
    expect(rootVercelConfigSource).toContain('"outputDirectory": "apps/web/dist"')
    expect(rootVercelConfigSource).toContain('"buildCommand": "npm run build"')
  })
})
