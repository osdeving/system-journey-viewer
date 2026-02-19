import { beforeEach, describe, expect, it } from 'vitest'
import { useEditorStore } from './useEditorStore'

describe('useEditorStore', () => {
  beforeEach(() => {
    useEditorStore.getState().resetWorkspace()
    useEditorStore.getState().setActiveTool('select')
  })

  it('adds a node in current view', () => {
    const state = useEditorStore.getState()
    const beforeCount = state.workspace.views[state.currentViewId].nodeIds.length

    const nodeId = state.addNode('container', 40, 60)
    const after = useEditorStore.getState()
    const afterCount = after.workspace.views[after.currentViewId].nodeIds.length

    expect(afterCount).toBe(beforeCount + 1)
    expect(after.workspace.nodes[nodeId]).toBeDefined()
    expect(after.selectedNodeId).toBe(nodeId)
    expect(after.selectedNodeIds).toEqual([nodeId])
  })

  it('supports additive multi-selection with toggle behavior', () => {
    const state = useEditorStore.getState()

    state.selectNode('n_api')
    state.selectNode('n_kafka', { additive: true })
    let updated = useEditorStore.getState()
    expect(updated.selectedNodeIds).toEqual(['n_api', 'n_kafka'])
    expect(updated.selectedNodeId).toBe('n_kafka')

    state.selectNode('n_api', { additive: true })
    updated = useEditorStore.getState()
    expect(updated.selectedNodeIds).toEqual(['n_kafka'])
    expect(updated.selectedNodeId).toBe('n_kafka')
  })

  it('updates node fill color from inspector action', () => {
    const state = useEditorStore.getState()

    state.setNodeColor('n_api', '#22c55e')
    const updated = useEditorStore.getState()

    expect(updated.workspace.nodes.n_api.style?.fillColor).toBe('#22c55e')
  })

  it('connects nodes when connector tool is active', () => {
    const state = useEditorStore.getState()
    const beforeEdges = new Set(state.workspace.views[state.currentViewId].edgeIds)
    state.beginConnection('n_api')
    state.connectPendingTo('n_kafka')
    const updated = useEditorStore.getState()
    const edgeId = updated.workspace.views[updated.currentViewId].edgeIds.find(
      (candidate) => !beforeEdges.has(candidate),
    )

    expect(edgeId).toBeDefined()
    expect(edgeId ? updated.workspace.edges[edgeId].from.nodeId : '').toBe('n_api')
    expect(edgeId ? updated.workspace.edges[edgeId].to.nodeId : '').toBe('n_kafka')
    expect(edgeId ? updated.workspace.edges[edgeId].from.portId : '').toBeTruthy()
    expect(edgeId ? updated.workspace.edges[edgeId].to.portId : '').toBeTruthy()
  })

  it('connects explicit ports when source and target handles are informed', () => {
    const state = useEditorStore.getState()
    const beforeEdges = new Set(state.workspace.views[state.currentViewId].edgeIds)

    state.beginConnection('n_api', 'south')
    state.connectPendingTo('n_kafka', 'north')
    const updated = useEditorStore.getState()
    const edgeId = updated.workspace.views[updated.currentViewId].edgeIds.find(
      (candidate) => !beforeEdges.has(candidate),
    )

    expect(edgeId).toBeDefined()
    expect(edgeId ? updated.workspace.edges[edgeId].from.portId : '').toBe('south')
    expect(edgeId ? updated.workspace.edges[edgeId].to.portId : '').toBe('north')
  })

  it('keeps the active tool unchanged when starting a pending connection', () => {
    const state = useEditorStore.getState()
    state.setActiveTool('select')

    state.beginConnection('n_api', 'east')
    const updated = useEditorStore.getState()

    expect(updated.activeTool).toBe('select')
    expect(updated.pendingConnectionFrom).toBe('n_api')
    expect(updated.pendingConnectionPortId).toBe('east')
  })

  it('reconnects selected edge endpoint to another node and port', () => {
    const state = useEditorStore.getState()
    const edgeId = state.workspace.views.v_container.edgeIds[0]

    state.reconnectEdgeEndpoint(edgeId, 'to', 'n_kafka', 'south')
    const updated = useEditorStore.getState()

    expect(updated.workspace.edges[edgeId].to.nodeId).toBe('n_kafka')
    expect(updated.workspace.edges[edgeId].to.portId).toBe('south')
    expect(updated.selectedEdgeId).toBe(edgeId)
    expect(updated.selectedNodeIds).toHaveLength(0)
  })

  it('recomputes dynamic ports when node is resized', () => {
    const state = useEditorStore.getState()
    const beforePorts = state.workspace.nodes.n_api.ports.length

    state.setNodeBounds('n_api', { ...state.workspace.nodes.n_api.bounds, w: 480, h: 280 })
    const updated = useEditorStore.getState()

    expect(updated.workspace.nodes.n_api.ports.length).toBeGreaterThan(beforePorts)
  })

  it('cancels pending connector state', () => {
    const state = useEditorStore.getState()

    state.beginConnection('n_api', 'east')
    state.cancelPendingConnection()
    const updated = useEditorStore.getState()

    expect(updated.pendingConnectionFrom).toBeNull()
    expect(updated.pendingConnectionPortId).toBeNull()
  })

  it('removes selected node and disconnects linked journey steps', () => {
    const state = useEditorStore.getState()
    const view = state.workspace.views[state.currentViewId]
    const nodeId = 'n_api'
    const connectedEdgeIds = view.edgeIds.filter((edgeId) => {
      const edge = state.workspace.edges[edgeId]
      return edge ? edge.from.nodeId === nodeId || edge.to.nodeId === nodeId : false
    })

    expect(connectedEdgeIds.length).toBeGreaterThan(0)
    state.selectNode(nodeId)
    state.removeNode(nodeId)
    const updated = useEditorStore.getState()
    const updatedView = updated.workspace.views[updated.currentViewId]

    expect(updated.selectedNodeId).toBeNull()
    expect(updated.selectedNodeIds).toEqual([])
    expect(updated.workspace.nodes[nodeId]).toBeUndefined()
    expect(updatedView.nodeIds.includes(nodeId)).toBe(false)
    connectedEdgeIds.forEach((edgeId) => {
      expect(updated.workspace.edges[edgeId]).toBeUndefined()
      expect(updatedView.edgeIds.includes(edgeId)).toBe(false)
      updatedView.journeyIds.forEach((journeyId) => {
        const journey = updated.workspace.journeys[journeyId]
        expect(journey.steps.some((step) => step.edgeId === edgeId)).toBe(false)
      })
    })
  })

  it('removes a selected edge and renormalizes affected journey numbering', () => {
    const state = useEditorStore.getState()
    const journeyId = state.createJourney('Edge Removal')
    state.addEdgeToJourney(journeyId, 'e_c_1')
    state.addEdgeToJourney(journeyId, 'e_c_10')
    state.selectEdge('e_c_1')

    state.removeEdge('e_c_1')
    const updated = useEditorStore.getState()
    const journey = updated.workspace.journeys[journeyId]
    const sorted = journey.steps.slice().sort((left, right) => left.n - right.n)

    expect(updated.workspace.edges.e_c_1).toBeUndefined()
    expect(updated.workspace.views.v_container.edgeIds.includes('e_c_1')).toBe(false)
    expect(updated.selectedEdgeId).toBeNull()
    expect(sorted).toEqual([{ n: 1, edgeId: 'e_c_10' }])
  })

  it('duplicates selected edge and keeps source/target endpoints', () => {
    const state = useEditorStore.getState()
    const beforeEdgeCount = state.workspace.views.v_container.edgeIds.length
    state.selectEdge('e_c_10')

    const result = state.duplicateSelection()
    const updated = useEditorStore.getState()
    const afterEdgeCount = updated.workspace.views.v_container.edgeIds.length

    expect(result.edgeId).toBeTruthy()
    expect(afterEdgeCount).toBe(beforeEdgeCount + 1)
    expect(result.edgeId ? updated.workspace.edges[result.edgeId] : undefined).toMatchObject({
      from: updated.workspace.edges.e_c_10.from,
      to: updated.workspace.edges.e_c_10.to,
      label: updated.workspace.edges.e_c_10.label,
    })
    expect(updated.selectedEdgeId).toBe(result.edgeId)
  })

  it('duplicates selected nodes and edges between them', () => {
    const state = useEditorStore.getState()
    const beforeNodes = state.workspace.views.v_container.nodeIds.length
    const beforeEdges = state.workspace.views.v_container.edgeIds.length
    state.selectNode('n_frontend')
    state.selectNode('n_gateway', { additive: true })

    const result = state.duplicateSelection({ dx: 30, dy: 30 })
    const updated = useEditorStore.getState()

    expect(result.nodeIds.length).toBe(2)
    expect(updated.workspace.views.v_container.nodeIds.length).toBe(beforeNodes + 2)
    expect(updated.workspace.views.v_container.edgeIds.length).toBeGreaterThan(beforeEdges)
    expect(updated.selectedNodeIds).toEqual(result.nodeIds)
    expect(updated.selectedEdgeId).toBeNull()
  })

  it('updates edge label position with clamped range', () => {
    const state = useEditorStore.getState()
    state.setEdgeLabelPosition('e_c_1', -3)
    let updated = useEditorStore.getState()
    expect(updated.workspace.edges.e_c_1.style.labelPosition).toBeCloseTo(0.08, 5)

    state.setEdgeLabelPosition('e_c_1', 2)
    updated = useEditorStore.getState()
    expect(updated.workspace.edges.e_c_1.style.labelPosition).toBeCloseTo(0.92, 5)
  })

  it('updates edge label side with normalized value', () => {
    const state = useEditorStore.getState()
    state.setEdgeLabelSide('e_c_1', 'right')
    let updated = useEditorStore.getState()
    expect(updated.workspace.edges.e_c_1.style.labelSide).toBe('right')

    state.setEdgeLabelSide('e_c_1', 'left')
    updated = useEditorStore.getState()
    expect(updated.workspace.edges.e_c_1.style.labelSide).toBe('left')
  })

  it('updates edge label font size with clamped range', () => {
    const state = useEditorStore.getState()
    state.setEdgeLabelFontSize('e_c_1', 99)
    let updated = useEditorStore.getState()
    expect(updated.workspace.edges.e_c_1.style.labelFontSize).toBe(28)

    state.setEdgeLabelFontSize('e_c_1', 2)
    updated = useEditorStore.getState()
    expect(updated.workspace.edges.e_c_1.style.labelFontSize).toBe(9)
  })

  it('updates edge label rotation with clamped range', () => {
    const state = useEditorStore.getState()
    state.setEdgeLabelAngle('e_c_1', 360)
    let updated = useEditorStore.getState()
    expect(updated.workspace.edges.e_c_1.style.labelAngle).toBe(180)

    state.setEdgeLabelAngle('e_c_1', -420)
    updated = useEditorStore.getState()
    expect(updated.workspace.edges.e_c_1.style.labelAngle).toBe(-180)
  })

  it('updates journey focus rendering/layout settings', () => {
    const state = useEditorStore.getState()
    state.setJourneyFocusSettings({
      offscopeRenderMode: 'hide',
      layoutMode: 'reflow',
      autoLayoutMode: 'always',
    })

    const updated = useEditorStore.getState()
    expect(updated.workspace.settings.journeyFocus).toEqual({
      offscopeRenderMode: 'hide',
      layoutMode: 'reflow',
      autoLayoutMode: 'always',
    })
  })

  it('auto-arranges current view with best-effort spacing and label updates', () => {
    const state = useEditorStore.getState()
    state.setNodeBounds('n_frontend', {
      ...state.workspace.nodes.n_frontend.bounds,
      x: 120,
      y: 120,
      w: 120,
      h: 80,
    })
    state.setNodeBounds('n_gateway', {
      ...state.workspace.nodes.n_gateway.bounds,
      x: 140,
      y: 130,
      w: 110,
      h: 80,
    })
    state.setNodeBounds('n_api', {
      ...state.workspace.nodes.n_api.bounds,
      x: 155,
      y: 136,
      w: 140,
      h: 84,
    })
    state.setEdgeLabelPosition('e_c_1', 0.5)

    state.autoArrangeCurrentView()
    const updated = useEditorStore.getState()
    const frontendBounds = updated.workspace.nodes.n_frontend.bounds
    const gatewayBounds = updated.workspace.nodes.n_gateway.bounds
    const overlapX = Math.max(
      0,
      Math.min(
        frontendBounds.x + frontendBounds.w,
        gatewayBounds.x + gatewayBounds.w,
      ) - Math.max(frontendBounds.x, gatewayBounds.x),
    )
    const overlapY = Math.max(
      0,
      Math.min(
        frontendBounds.y + frontendBounds.h,
        gatewayBounds.y + gatewayBounds.h,
      ) - Math.max(frontendBounds.y, gatewayBounds.y),
    )

    expect(overlapX * overlapY).toBe(0)
    expect(updated.workspace.nodes.n_frontend.bounds.w).toBeGreaterThanOrEqual(120)
    expect(updated.workspace.edges.e_c_1.style.labelPosition ?? 0).toBeGreaterThanOrEqual(0.08)
    expect(updated.workspace.edges.e_c_1.style.labelPosition ?? 1).toBeLessThanOrEqual(0.92)
  })

  it('supports scoped auto-arrange without moving out-of-scope nodes', () => {
    const state = useEditorStore.getState()
    const dbBefore = { ...state.workspace.nodes.n_db.bounds }
    const frontendBefore = { ...state.workspace.nodes.n_frontend.bounds }

    state.autoArrangeCurrentView({
      nodeIds: ['n_frontend', 'n_gateway'],
      edgeIds: ['e_c_1'],
    })
    const updated = useEditorStore.getState()

    expect(updated.workspace.nodes.n_db.bounds).toEqual(dbBefore)
    expect(updated.workspace.nodes.n_frontend.bounds.x).not.toBe(frontendBefore.x)
  })

  it('allows one edge in multiple journeys with independent numbering', () => {
    const state = useEditorStore.getState()
    const beforeEdges = new Set(state.workspace.views.v_container.edgeIds)
    state.beginConnection('n_api')
    state.connectPendingTo('n_kafka')
    const edgeId =
      useEditorStore
        .getState()
        .workspace.views.v_container.edgeIds.find((candidate) => !beforeEdges.has(candidate)) ??
      'e_c_5'

    const firstJourneyId = state.createJourney('Fluxo A')
    const secondJourneyId = state.createJourney('Fluxo B')
    state.addEdgeToJourney(firstJourneyId, edgeId)
    state.addEdgeToJourney(secondJourneyId, edgeId)
    state.addEdgeToJourney(firstJourneyId, edgeId)
    const updated = useEditorStore.getState()

    expect(updated.workspace.journeys[firstJourneyId].steps).toHaveLength(1)
    expect(updated.workspace.journeys[secondJourneyId].steps).toHaveLength(1)
    expect(updated.workspace.journeys[firstJourneyId].steps[0].n).toBe(1)
    expect(updated.workspace.journeys[secondJourneyId].steps[0].n).toBe(1)
  })

  it('reorders journeys in current view', () => {
    const state = useEditorStore.getState()
    const before = [...state.workspace.views.v_container.journeyIds]
    expect(before.length).toBeGreaterThanOrEqual(2)

    state.reorderJourneyInCurrentView(before[0], before[1])
    const updated = useEditorStore.getState()
    const after = updated.workspace.views.v_container.journeyIds

    expect(after[0]).toBe(before[1])
    expect(after[1]).toBe(before[0])
  })

  it('reorders journey steps and normalizes numbering', () => {
    const state = useEditorStore.getState()
    const journeyId = state.createJourney('Step Order')
    state.addEdgeToJourney(journeyId, 'e_c_10')
    state.addEdgeToJourney(journeyId, 'e_c_1')
    state.addEdgeToJourney(journeyId, 'e_c_11')

    state.reorderJourneyStep(journeyId, 'e_c_11', 'e_c_10')
    const reordered = useEditorStore.getState().workspace.journeys[journeyId].steps
      .slice()
      .sort((left, right) => left.n - right.n)

    expect(reordered.map((step) => step.edgeId)).toEqual(['e_c_11', 'e_c_10', 'e_c_1'])
    expect(reordered.map((step) => step.n)).toEqual([1, 2, 3])
  })

  it('creates drilldown view with boundary root and opens it', () => {
    const state = useEditorStore.getState()
    expect(state.workspace.nodes.n_worker.drilldownRef).toBeUndefined()

    const createdViewId = state.createDrilldownForNode('n_worker')
    const updated = useEditorStore.getState()

    expect(createdViewId).toBeTruthy()
    expect(updated.workspace.nodes.n_worker.drilldownRef).toBe(createdViewId)
    expect(updated.workspace.nodes.n_worker.kind).toBe('boundary')
    expect(updated.currentViewId).toBe(createdViewId)
    const createdView = createdViewId ? updated.workspace.views[createdViewId] : undefined
    expect(createdView).toBeDefined()
    expect(createdView?.kind).toBe('component')
    expect(createdView?.nodeIds.length).toBe(1)
    const rootNodeId = createdView?.nodeIds[0]
    expect(rootNodeId ? updated.workspace.nodes[rootNodeId].kind : '').toBe('boundary')
  })

  it('stops player and emits confetti when journey reaches end', () => {
    const state = useEditorStore.getState()
    const beforeEdges = new Set(state.workspace.views.v_container.edgeIds)
    state.beginConnection('n_api')
    state.connectPendingTo('n_kafka')
    const edgeId =
      useEditorStore
        .getState()
        .workspace.views.v_container.edgeIds.find((candidate) => !beforeEdges.has(candidate)) ??
      'e_c_5'
    const journeyId = state.createJourney('Fluxo Player')
    state.addEdgeToJourney(journeyId, edgeId)
    state.setPlayerJourney(journeyId)
    state.setPlayerLoop(false)
    state.setPlayerRunning(true)
    const before = useEditorStore.getState().playerConfettiNonce

    state.stepPlayer()
    const updated = useEditorStore.getState()

    expect(updated.playerIsRunning).toBe(false)
    expect(updated.playerConfettiNonce).toBe(before + 1)
    expect(updated.playerConfettiNodeId).toBe('n_kafka')
  })

  it('emits confetti on each loop completion and keeps running', () => {
    const state = useEditorStore.getState()
    const beforeEdges = new Set(state.workspace.views.v_container.edgeIds)
    state.beginConnection('n_api')
    state.connectPendingTo('n_kafka')
    const edgeId =
      useEditorStore
        .getState()
        .workspace.views.v_container.edgeIds.find((candidate) => !beforeEdges.has(candidate)) ??
      'e_c_5'
    const journeyId = state.createJourney('Fluxo Loop')
    state.addEdgeToJourney(journeyId, edgeId)
    state.setPlayerJourney(journeyId)
    state.setPlayerLoop(true)
    state.setPlayerRunning(true)
    const before = useEditorStore.getState().playerConfettiNonce

    state.stepPlayer()
    const updated = useEditorStore.getState()

    expect(updated.playerIsRunning).toBe(true)
    expect(updated.playerStepIndex).toBe(0)
    expect(updated.playerConfettiNonce).toBe(before + 1)
    expect(updated.playerConfettiNodeId).toBe('n_kafka')
  })

  it('moves player backwards and wraps to the last step when loop is on', () => {
    const state = useEditorStore.getState()
    const journeyId = 'j_c_1'
    state.setPlayerJourney(journeyId)
    state.setPlayerLoop(false)
    state.stepPlayer()
    state.stepPlayer()
    let updated = useEditorStore.getState()
    expect(updated.playerStepIndex).toBe(2)

    state.prevPlayerStep()
    updated = useEditorStore.getState()
    expect(updated.playerStepIndex).toBe(1)

    state.resetPlayer()
    state.setPlayerLoop(true)
    state.prevPlayerStep()
    updated = useEditorStore.getState()
    expect(updated.playerStepIndex).toBe(updated.workspace.journeys[journeyId].steps.length - 1)
    expect(updated.playerIsRunning).toBe(false)
  })

  it('allows enabling and disabling player trail rendering', () => {
    const state = useEditorStore.getState()
    expect(state.playerTrailEnabled).toBe(false)

    state.setPlayerTrailEnabled(true)
    let updated = useEditorStore.getState()
    expect(updated.playerTrailEnabled).toBe(true)

    state.setPlayerTrailEnabled(false)
    updated = useEditorStore.getState()
    expect(updated.playerTrailEnabled).toBe(false)
  })

  it('supports theme toggle and showcase reload', () => {
    const state = useEditorStore.getState()
    state.setTheme('dark')
    let updated = useEditorStore.getState()
    expect(updated.workspace.settings.theme).toBe('dark')

    state.loadShowcaseWorkspace()
    updated = useEditorStore.getState()
    expect(updated.workspace.workspace.name).toBe('Orders Platform Showcase')
    expect(updated.workspace.views.v_container.journeyIds.length).toBeGreaterThanOrEqual(3)
    expect(updated.activeJourneyId).toBe('j_c_1')
  })

  it('supports drilldown navigation with breadcrumb history', () => {
    const state = useEditorStore.getState()
    state.setPlayerJourney('j_c_1')
    state.setPlayerRunning(true)

    state.openDrilldown('n_api')
    let updated = useEditorStore.getState()
    expect(updated.currentViewId).toBe('v_components_api')
    expect(updated.viewHistory).toEqual(['v_container'])
    expect(updated.playerIsRunning).toBe(false)
    expect(updated.playerJourneyId).toBe('j_comp_1')
    expect(updated.playerStepIndex).toBe(0)

    updated.openDrilldown('n_comp_app')
    updated = useEditorStore.getState()
    expect(updated.currentViewId).toBe('v_hex_api')
    expect(updated.viewHistory).toEqual(['v_container', 'v_components_api'])
    expect(updated.playerJourneyId).toBe('j_hex_1')
    expect(updated.playerIsRunning).toBe(false)

    updated.navigateBack()
    updated = useEditorStore.getState()
    expect(updated.currentViewId).toBe('v_components_api')
    expect(updated.playerJourneyId).toBe('j_comp_1')

    updated.navigateBack()
    updated = useEditorStore.getState()
    expect(updated.currentViewId).toBe('v_container')
    expect(updated.viewHistory).toHaveLength(0)
    expect(updated.playerJourneyId).toBe('j_c_1')
    expect(updated.playerIsRunning).toBe(false)
  })

  it('stops running player when switching views directly', () => {
    const state = useEditorStore.getState()
    state.setPlayerJourney('j_c_2')
    state.setPlayerRunning(true)

    state.goToView('v_components_api')
    const updated = useEditorStore.getState()

    expect(updated.currentViewId).toBe('v_components_api')
    expect(updated.viewHistory).toEqual(['v_container'])
    expect(updated.playerIsRunning).toBe(false)
    expect(updated.playerJourneyId).toBe('j_comp_1')
  })

  it('restores compatible history path when replacing workspace on deep view', () => {
    const state = useEditorStore.getState()
    const sourceWorkspace = structuredClone(state.workspace)

    state.replaceWorkspace(sourceWorkspace, 'v_hex_api')
    const updated = useEditorStore.getState()

    expect(updated.currentViewId).toBe('v_hex_api')
    expect(updated.viewHistory).toEqual(['v_container', 'v_components_api'])
  })
})
