import { cpSync, existsSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

const sourceDir = resolve('apps/web/dist')
const targetDir = resolve('dist')

if (!existsSync(sourceDir)) {
  throw new Error(`Missing build output: ${sourceDir}`)
}

rmSync(targetDir, { recursive: true, force: true })
cpSync(sourceDir, targetDir, { recursive: true })

// eslint-disable-next-line no-console
console.log(`Copied ${sourceDir} -> ${targetDir}`)
