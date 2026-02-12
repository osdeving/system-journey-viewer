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
    expect(updated.playerIsRunning).toBe(false)
    expect(updated.playerJourneyId).toBe('j_comp_1')
  })
})
