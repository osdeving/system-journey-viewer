import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const baseUrl = process.env.DEMO_URL ?? 'http://127.0.0.1:4173'
const captureDir = resolve('docs/.capture-video')
const targetWebm = resolve('docs/readme-live-demo.webm')
const targetMp4 = resolve('docs/readme-live-demo.mp4')
const targetGif = resolve('docs/readme-live-demo.gif')
const palettePng = resolve('docs/.palette-readme.png')

const ensureDir = (path) => {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true })
  }
}

const runOrThrow = (command, args) => {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
  })
  if (result.status !== 0) {
    throw new Error(`Command failed (${command} ${args.join(' ')})`)
  }
}

const encodeAssets = () => {
  runOrThrow('ffmpeg', [
    '-y',
    '-i',
    targetWebm,
    '-movflags',
    '+faststart',
    '-pix_fmt',
    'yuv420p',
    targetMp4,
  ])
  runOrThrow('ffmpeg', [
    '-y',
    '-i',
    targetWebm,
    '-vf',
    'fps=14,scale=1280:-1:flags=lanczos,palettegen',
    palettePng,
  ])
  runOrThrow('ffmpeg', [
    '-y',
    '-i',
    targetWebm,
    '-i',
    palettePng,
    '-lavfi',
    'fps=14,scale=1280:-1:flags=lanczos[x];[x][1:v]paletteuse',
    '-loop',
    '0',
    targetGif,
  ])
}

const loadChromium = async () => {
  try {
    const playwright = await import('playwright')
    return playwright.chromium
  } catch (error) {
    throw new Error(
      'Missing dependency "playwright". Install it with "npm install --no-save playwright" and run again.',
      { cause: error },
    )
  }
}

const capture = async () => {
  const chromium = await loadChromium()
  ensureDir(captureDir)

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-dev-shm-usage'],
  })
  const context = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    recordVideo: {
      dir: captureDir,
      size: { width: 1600, height: 900 },
    },
  })
  const page = await context.newPage()

  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.waitForTimeout(900)

  await page.getByRole('button', { name: 'Insert' }).click()
  await page.getByRole('menuitem', { name: /Load Showcase/i }).click()
  await page.waitForTimeout(1200)

  await page.getByRole('button', { name: /Presentation mode/i }).click()
  await page.waitForTimeout(700)

  const journeySelect = page.locator('.presentation-toolbar .presentation-select').first()
  await journeySelect.selectOption({ index: 1 })
  await page.waitForTimeout(300)

  await page.getByRole('button', { name: /Iniciar player|Pausar player/i }).first().click()

  await page.waitForTimeout(11_500)

  const video = page.video()
  await context.close()
  await browser.close()

  const sourcePath = await video?.path()
  if (!sourcePath) {
    throw new Error('Playwright did not produce a capture video file.')
  }
  renameSync(sourcePath, targetWebm)
  encodeAssets()
  rmSync(captureDir, { recursive: true, force: true })
  rmSync(palettePng, { force: true })
  // eslint-disable-next-line no-console
  console.log(`Captured: ${targetWebm}`)
  // eslint-disable-next-line no-console
  console.log(`Encoded: ${targetMp4}`)
  // eslint-disable-next-line no-console
  console.log(`Encoded: ${targetGif}`)
}

capture().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error)
  process.exitCode = 1
})
