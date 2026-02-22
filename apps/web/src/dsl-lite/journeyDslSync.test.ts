/**
 * Purpose: Verify journey Dsl Sync behavior with regression-focused unit tests.
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { liteToFullWorkspace, fullWorkspaceToLiteDsl } from './convert'
import { parseLiteDsl } from './parser'
import { useEditorStore } from '../store/useEditorStore'

describe('journey and drilldown DSL sync', () => {
  beforeEach(() => {
    useEditorStore.getState().resetWorkspace()
    useEditorStore.getState().goToView('v_container')
  })

  it('keeps journey step ordering after drag-style reordering', () => {
    const state = useEditorStore.getState()
    const journeyId = state.createJourney('Drag Built Journey')

    state.addEdgeToJourney(journeyId, 'e_c_11')
    state.addEdgeToJourney(journeyId, 'e_c_10')
    state.reorderJourneyStep(journeyId, 'e_c_10', 'e_c_11')

    const workspace = useEditorStore.getState().workspace
    const dsl = fullWorkspaceToLiteDsl(workspace)
    const roundtrip = liteToFullWorkspace(parseLiteDsl(dsl))
    const journey = Object.values(roundtrip.journeys).find(
      (candidate) => candidate.name === 'Drag Built Journey',
    )

    expect(journey).toBeDefined()
    const sortedSteps = journey
      ? journey.steps.slice().sort((left, right) => left.n - right.n)
      : []
    const stepLabels = sortedSteps.map((step) => roundtrip.edges[step.edgeId]?.label ?? '')

    expect(sortedSteps.map((step) => step.n)).toEqual([1, 2])
    expect(stepLabels).toEqual(['GET /orders/{id}', 'select order'])
  })

  it('keeps ctrl+alt drilldown creation synchronized with DSL roundtrip', () => {
    const state = useEditorStore.getState()
    state.createDrilldownForNode('n_kafka')

    const workspace = useEditorStore.getState().workspace
    const dsl = fullWorkspaceToLiteDsl(workspace)
    const roundtrip = liteToFullWorkspace(parseLiteDsl(dsl))
    const kafkaNode = Object.values(roundtrip.nodes).find(
      (node) => node.name === 'Kafka',
    )

    expect(kafkaNode).toBeDefined()
    expect(kafkaNode?.kind).toBe('boundary')
    expect(kafkaNode?.drilldownRef).toBeTruthy()
    const detailViewId = kafkaNode?.drilldownRef ?? ''
    const detailView = roundtrip.views[detailViewId]
    expect(detailView).toBeDefined()
    expect(detailView?.nodeIds.length).toBeGreaterThan(0)
    const boundaryCount = detailView
      ? detailView.nodeIds.filter((nodeId) => roundtrip.nodes[nodeId]?.kind === 'boundary').length
      : 0
    expect(boundaryCount).toBeGreaterThan(0)
  })
})
