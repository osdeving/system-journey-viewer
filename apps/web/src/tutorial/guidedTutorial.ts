/**
 * Purpose: Define the guided UI tutorial steps and reusable spotlight/card positioning helpers.
 */

export type GuidedTutorialRect = {
  x: number
  y: number
  width: number
  height: number
}

export type GuidedTutorialTarget =
  | {
      kind: 'selector'
      selector: string
      padding?: number
    }
  | {
      kind: 'selectors'
      selectors: string[]
      padding?: number
    }

export type GuidedTutorialPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center'

export type GuidedTutorialStepSetupAction =
  | 'none'
  | 'openPaletteLeft'
  | 'openInspectorRight'
  | 'openDslBottom'
  | 'openHelpFloating'

export type GuidedTutorialStepCompletionRule =
  | {
      kind: 'desktopMenuOpen'
      menuId: string
      prompt: string
    }
  | {
      kind: 'event'
      eventId: string
      prompt: string
    }

export type GuidedTutorialStep = {
  id: string
  title: string
  body: string
  placement: GuidedTutorialPlacement
  target?: GuidedTutorialTarget
  setupAction?: GuidedTutorialStepSetupAction
  completionRule?: GuidedTutorialStepCompletionRule
  missingTargetHint?: string
}

export type GuidedTutorialCompletionContext = {
  openDesktopMenuId: string | null
  eventCounts: Record<string, number>
  eventBaselineByStepId: Record<string, number>
}

export type GuidedTutorialCompletionStatus = {
  requiresAction: boolean
  isComplete: boolean
  prompt: string | null
}

export type GuidedTutorialCardLayout = {
  top: number
  left: number
  maxWidth: number
}

export type GuidedTutorialBackdropPane = {
  top: number
  left: number
  width: number
  height: number
}

type ResolveCardLayoutInput = {
  targetRect: GuidedTutorialRect | null
  placement: GuidedTutorialPlacement
  viewportWidth: number
  viewportHeight: number
}

const TUTORIAL_MARGIN = 16
const TUTORIAL_CARD_WIDTH = 360
const TUTORIAL_CARD_HEIGHT_ESTIMATE = 248
const TUTORIAL_CARD_GAP = 14

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const normalizeRect = (
  rect: GuidedTutorialRect,
  viewportWidth: number,
  viewportHeight: number,
): GuidedTutorialRect | null => {
  const x = clamp(rect.x, 0, viewportWidth)
  const y = clamp(rect.y, 0, viewportHeight)
  const maxWidth = Math.max(0, viewportWidth - x)
  const maxHeight = Math.max(0, viewportHeight - y)
  const width = clamp(rect.width, 0, maxWidth)
  const height = clamp(rect.height, 0, maxHeight)
  if (width <= 0 || height <= 0) {
    return null
  }
  return { x, y, width, height }
}

export const clampGuidedTutorialStepIndex = (candidate: number, totalSteps: number): number => {
  if (totalSteps <= 0) {
    return 0
  }
  return clamp(candidate, 0, totalSteps - 1)
}

export const resolveGuidedTutorialTargetRect = (
  target: GuidedTutorialTarget | undefined,
  doc: Document,
  viewportWidth: number,
  viewportHeight: number,
): GuidedTutorialRect | null => {
  if (!target) {
    return null
  }
  const selectors = target.kind === 'selector' ? [target.selector] : target.selectors
  const padding = Math.max(0, target.padding ?? 6)
  const rects: GuidedTutorialRect[] = []
  for (const selector of selectors) {
    const element = doc.querySelector<HTMLElement>(selector)
    if (!element) {
      continue
    }
    const bounds = element.getBoundingClientRect()
    if (bounds.width <= 0 || bounds.height <= 0) {
      continue
    }
    rects.push({
      x: bounds.left - padding,
      y: bounds.top - padding,
      width: bounds.width + padding * 2,
      height: bounds.height + padding * 2,
    })
  }
  if (!rects.length) {
    return null
  }
  const minX = Math.min(...rects.map((rect) => rect.x))
  const minY = Math.min(...rects.map((rect) => rect.y))
  const maxX = Math.max(...rects.map((rect) => rect.x + rect.width))
  const maxY = Math.max(...rects.map((rect) => rect.y + rect.height))
  return normalizeRect(
    {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    },
    viewportWidth,
    viewportHeight,
  )
}

export const resolveGuidedTutorialCardLayout = ({
  targetRect,
  placement,
  viewportWidth,
  viewportHeight,
}: ResolveCardLayoutInput): GuidedTutorialCardLayout => {
  const maxWidth = Math.max(280, Math.min(TUTORIAL_CARD_WIDTH, viewportWidth - TUTORIAL_MARGIN * 2))
  const minLeft = TUTORIAL_MARGIN
  const maxLeft = Math.max(minLeft, viewportWidth - maxWidth - TUTORIAL_MARGIN)

  if (!targetRect || placement === 'center') {
    return {
      top: clamp(
        Math.round((viewportHeight - TUTORIAL_CARD_HEIGHT_ESTIMATE) / 2),
        TUTORIAL_MARGIN,
        Math.max(TUTORIAL_MARGIN, viewportHeight - TUTORIAL_CARD_HEIGHT_ESTIMATE - TUTORIAL_MARGIN),
      ),
      left: clamp(
        Math.round((viewportWidth - maxWidth) / 2),
        minLeft,
        maxLeft,
      ),
      maxWidth,
    }
  }

  const targetCenterX = targetRect.x + targetRect.width / 2
  const targetCenterY = targetRect.y + targetRect.height / 2
  let left = targetCenterX - maxWidth / 2
  let top = targetRect.y + targetRect.height + TUTORIAL_CARD_GAP

  if (placement === 'top') {
    top = targetRect.y - TUTORIAL_CARD_HEIGHT_ESTIMATE - TUTORIAL_CARD_GAP
  }

  if (placement === 'left') {
    left = targetRect.x - maxWidth - TUTORIAL_CARD_GAP
    top = targetCenterY - TUTORIAL_CARD_HEIGHT_ESTIMATE / 2
  }

  if (placement === 'right') {
    left = targetRect.x + targetRect.width + TUTORIAL_CARD_GAP
    top = targetCenterY - TUTORIAL_CARD_HEIGHT_ESTIMATE / 2
  }

  if (placement === 'bottom') {
    top = targetRect.y + targetRect.height + TUTORIAL_CARD_GAP
  }

  if (top + TUTORIAL_CARD_HEIGHT_ESTIMATE + TUTORIAL_MARGIN > viewportHeight) {
    top = Math.max(
      TUTORIAL_MARGIN,
      targetRect.y - TUTORIAL_CARD_HEIGHT_ESTIMATE - TUTORIAL_CARD_GAP,
    )
  }
  if (top < TUTORIAL_MARGIN) {
    top = TUTORIAL_MARGIN
  }

  return {
    top: Math.round(top),
    left: Math.round(clamp(left, minLeft, maxLeft)),
    maxWidth,
  }
}

export const resolveGuidedTutorialBackdropPanes = (
  targetRect: GuidedTutorialRect | null,
  viewportWidth: number,
  viewportHeight: number,
): GuidedTutorialBackdropPane[] => {
  if (!targetRect) {
    return [
      {
        top: 0,
        left: 0,
        width: viewportWidth,
        height: viewportHeight,
      },
    ]
  }

  const left = clamp(Math.round(targetRect.x), 0, viewportWidth)
  const top = clamp(Math.round(targetRect.y), 0, viewportHeight)
  const right = clamp(Math.round(targetRect.x + targetRect.width), 0, viewportWidth)
  const bottom = clamp(Math.round(targetRect.y + targetRect.height), 0, viewportHeight)

  const panes: GuidedTutorialBackdropPane[] = [
    { top: 0, left: 0, width: viewportWidth, height: top },
    { top, left: 0, width: left, height: Math.max(0, bottom - top) },
    { top, left: right, width: Math.max(0, viewportWidth - right), height: Math.max(0, bottom - top) },
    { top: bottom, left: 0, width: viewportWidth, height: Math.max(0, viewportHeight - bottom) },
  ]

  return panes.filter((pane) => pane.width > 0 && pane.height > 0)
}

export const resolveGuidedTutorialStepCompletion = (
  step: GuidedTutorialStep,
  context: GuidedTutorialCompletionContext,
): GuidedTutorialCompletionStatus => {
  const rule = step.completionRule
  if (!rule) {
    return {
      requiresAction: false,
      isComplete: true,
      prompt: null,
    }
  }

  if (rule.kind === 'desktopMenuOpen') {
    return {
      requiresAction: true,
      isComplete: context.openDesktopMenuId === rule.menuId,
      prompt: rule.prompt,
    }
  }

  const currentCount = context.eventCounts[rule.eventId] ?? 0
  const baselineCount = context.eventBaselineByStepId[step.id] ?? 0
  return {
    requiresAction: true,
    isComplete: currentCount > baselineCount,
    prompt: rule.prompt,
  }
}

export const GUIDED_UI_TUTORIAL_STEPS: GuidedTutorialStep[] = [
  {
    id: 'welcome',
    title: 'Guided UI Tutorial',
    body:
      'This tour explains the desktop-style shell, where windows live, and how to work with the canvas. Use Next, Back, or Skip at any time.',
    placement: 'center',
  },
  {
    id: 'menu-bar',
    title: 'Main Menu Bar',
    body:
      'File/Edit/View/Journey/Insert/Settings/Help/Window are the primary commands. Use Window for panel management and layout actions.',
    placement: 'bottom',
    target: { kind: 'selector', selector: '[data-tutorial-id="main-menu-bar"]', padding: 8 },
  },
  {
    id: 'window-menu',
    title: 'Window Menu',
    body:
      'The Window menu is the entry point to open panels, move the dock shell, restore/reset window layout, and replay the splash screen.',
    placement: 'bottom',
    target: {
      kind: 'selectors',
      selectors: ['[data-tutorial-id="menu-window-trigger"]', '#desktop-menu-window'],
      padding: 8,
    },
    completionRule: {
      kind: 'desktopMenuOpen',
      menuId: 'window',
      prompt: 'Click the Window menu to continue.',
    },
  },
  {
    id: 'window-open-inspector-panel',
    title: 'Open Inspector from Window Menu',
    body:
      'Use the Window menu to open panels. Click "Open Inspector Panel" now to continue.',
    placement: 'right',
    target: {
      kind: 'selectors',
      selectors: ['#desktop-menu-window', '[data-tutorial-id="window-menu-open-inspector-panel"]'],
      padding: 6,
    },
    completionRule: {
      kind: 'event',
      eventId: 'window-menu-open-panel:inspector',
      prompt: 'Click "Open Inspector Panel" in the Window menu to continue.',
    },
    missingTargetHint:
      'Open the Window menu to reveal this action.',
  },
  {
    id: 'toolbar',
    title: 'Toolbar',
    body:
      'The toolbar gives quick access to view selection, editing modes, panel toggles, and presentation/focus controls. It stays compact and scrolls horizontally on small screens.',
    placement: 'bottom',
    target: { kind: 'selector', selector: '[data-tutorial-id="topbar-toolbar"]', padding: 8 },
  },
  {
    id: 'editing-mode',
    title: 'Editing Modes',
    body:
      'Use Select to move/edit and Connector to create edges. Try clicking either mode button now to continue.',
    placement: 'bottom',
    target: { kind: 'selector', selector: '[data-tutorial-id="toolbar-editing-group"]', padding: 8 },
    completionRule: {
      kind: 'event',
      eventId: 'toolbar-mode-click',
      prompt: 'Click Select or Connector in the toolbar to continue.',
    },
    missingTargetHint:
      'The Editing toolbar section may be hidden in Preferences. Re-enable it or skip this step.',
  },
  {
    id: 'panel-shortcuts',
    title: 'Panel Shortcuts',
    body:
      'These shortcuts open managed windows (Palette, Inspector, Journeys, Timeline, SJV Script, Help) and let you reorder the shortcut strip by dragging.',
    placement: 'bottom',
    target: { kind: 'selector', selector: '[data-tutorial-id="panel-shortcuts-strip"]', padding: 8 },
    completionRule: {
      kind: 'event',
      eventId: 'panel-shortcut-click',
      prompt: 'Click any panel shortcut button in this strip to continue.',
    },
    missingTargetHint:
      'The panel shortcut strip may be hidden if the Panels toolbar section is disabled in Preferences.',
  },
  {
    id: 'canvas',
    title: 'Canvas',
    body:
      'The canvas is where you place nodes, connect edges, and play journeys. Click the canvas once, then continue. Double-click nodes with drilldown to navigate deeper views.',
    placement: 'top',
    target: { kind: 'selector', selector: '[data-tutorial-id="canvas-panel"]', padding: 8 },
    completionRule: {
      kind: 'event',
      eventId: 'canvas-click',
      prompt: 'Click once on the canvas to continue.',
    },
  },
  {
    id: 'palette',
    title: 'Palette Window',
    body:
      'Palette is a managed window. It can live docked on the left/right/bottom or float independently. Drag items from the palette onto the canvas.',
    placement: 'right',
    setupAction: 'openPaletteLeft',
    target: { kind: 'selector', selector: '[data-tutorial-id="managed-host-left"]', padding: 8 },
  },
  {
    id: 'inspector',
    title: 'Inspector Window',
    body:
      'Inspector edits node and edge properties such as names, colors, text colors, labels, protocols, and journey assignments.',
    placement: 'left',
    setupAction: 'openInspectorRight',
    target: { kind: 'selector', selector: '[data-tutorial-id="managed-host-right"]', padding: 8 },
  },
  {
    id: 'select-node',
    title: 'Select a Node',
    body:
      'Click any node on the canvas. The Inspector panel will show its properties when a node is selected.',
    placement: 'top',
    target: { kind: 'selector', selector: '[data-tutorial-id="canvas-panel"]', padding: 8 },
    completionRule: {
      kind: 'event',
      eventId: 'node-select',
      prompt: 'Click a node on the canvas to continue.',
    },
  },
  {
    id: 'edit-node-name',
    title: 'Edit the Node Name',
    body:
      'With a node selected, edit its name in the Inspector. This demonstrates live property editing.',
    placement: 'left',
    target: { kind: 'selector', selector: '[data-tutorial-id="inspector-node-name"]', padding: 6 },
    completionRule: {
      kind: 'event',
      eventId: 'inspector-node-name-edit',
      prompt: 'Change the selected node name in the Inspector to continue.',
    },
    missingTargetHint:
      'Select a node first and make sure the Inspector panel is open to reveal the Name field.',
  },
  {
    id: 'window-open-sjv-script-panel',
    title: 'Open SJV Script from Window Menu',
    body:
      'Open the Window menu again and click "Open SJV Script Panel". This is the main text-based workflow panel for import/export and live sync.',
    placement: 'right',
    target: {
      kind: 'selectors',
      selectors: ['#desktop-menu-window', '[data-tutorial-id="window-menu-open-dsl-panel"]'],
      padding: 6,
    },
    completionRule: {
      kind: 'event',
      eventId: 'window-menu-open-panel:dsl',
      prompt: 'Open Window > Open SJV Script Panel to continue.',
    },
    missingTargetHint:
      'Open the Window menu to reveal the SJV Script panel action.',
  },
  {
    id: 'sjv-script',
    title: 'SJV Script Window',
    body:
      'SJV Script supports export/import and live sync. When Sync is enabled, valid edits are applied to the current view immediately.',
    placement: 'top',
    setupAction: 'openDslBottom',
    target: { kind: 'selector', selector: '[data-tutorial-id="managed-host-bottom"]', padding: 8 },
  },
  {
    id: 'sjv-script-sync',
    title: 'Live Sync Toggle',
    body:
      'Enable Sync in the SJV Script panel. Valid changes in the script are applied to the view in real time while sync is on.',
    placement: 'top',
    target: { kind: 'selector', selector: '[data-tutorial-id="dsl-sync-toggle"]', padding: 6 },
    completionRule: {
      kind: 'event',
      eventId: 'dsl-sync-toggle',
      prompt: 'Toggle the Sync checkbox in the SJV Script panel to continue.',
    },
    missingTargetHint:
      'Open the SJV Script panel (Window > Open SJV Script Panel) to reveal the Sync toggle.',
  },
  {
    id: 'help-window',
    title: 'Help Window',
    body:
      'Help is also a managed window. Open it (from Help menu or a panel shortcut) and notice it can dock or float using the same window frame controls.',
    placement: 'right',
    completionRule: {
      kind: 'event',
      eventId: 'open-window:help',
      prompt: 'Open the Help window (for example from the Help menu) to continue.',
    },
    target: { kind: 'selector', selector: '.floating-window.help-window', padding: 8 },
    missingTargetHint:
      'Open the Help window to reveal this target. You can use Help > Open Help Guide or a panel shortcut.',
  },
  {
    id: 'finish',
    title: 'You are ready',
    body:
      'Next, try loading the tutorial workspace from Insert or Help, then edit nodes in Inspector and observe live changes in the canvas or SJV Script sync flow.',
    placement: 'center',
  },
]
