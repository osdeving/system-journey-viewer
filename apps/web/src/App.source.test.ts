/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8')

describe('App source regressions', () => {
  it('starts with dock and workbench hidden by default', () => {
    expect(appSource).toContain('const [dockCollapsed, setDockCollapsed] = useState(true)')
    expect(appSource).toContain('const [drawerCollapsed, setDrawerCollapsed] = useState(true)')
  })

  it('keeps SJV Script panel free of Codex action buttons', () => {
    expect(appSource).not.toContain('Refine with Codex')
    expect(appSource).not.toContain('Clear Codex context')
    expect(appSource).not.toContain('requestCodexDslAssist')
  })

  it('renders Preferences using the reusable floating window component', () => {
    expect(appSource).toContain("import { FloatingWindow } from './components/FloatingWindow'")
    expect(appSource).toContain('<FloatingWindow')
    expect(appSource).toContain('className="preferences-window"')
  })
})
