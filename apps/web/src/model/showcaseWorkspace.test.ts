/**
 * Purpose: Verify showcase Workspace behavior with regression-focused unit tests.
 */

import { describe, expect, it } from 'vitest'
import { createShowcaseWorkspace } from './showcaseWorkspace'

describe('createShowcaseWorkspace', () => {
  it('creates english showcase by default', () => {
    const workspace = createShowcaseWorkspace()
    const parallelJourney = workspace.journeys.j_c_parallel_threads
    const staggeredParallelJourney = workspace.journeys.j_c_parallel_staggered

    expect(workspace.workspace.id).toBe('workspace-showcase-en')
    expect(workspace.workspace.name).toBe('Orders Platform Showcase')
    expect(workspace.nodes.n_worker.drilldownRef).toBe('v_components_worker')
    expect(workspace.views.v_components_worker).toBeDefined()
    expect(workspace.views.v_hex_worker).toBeDefined()
    expect(workspace.journeys.j_worker_comp_1.name).toContain('Fulfillment')
    expect(parallelJourney?.name).toBe('Parallel Journey Threads Demo')
    expect(workspace.views.v_container.journeyIds).toContain('j_c_parallel_threads')
    expect(workspace.views.v_container.journeyIds).toContain('j_c_parallel_staggered')
    expect(staggeredParallelJourney?.name).toBe('Parallel Threads with Staggered Start')
    expect(parallelJourney?.steps).toHaveLength(13)
    expect(parallelJourney?.steps[4]?.threads).toHaveLength(2)
    expect(parallelJourney?.steps[4]?.threads?.[0]?.steps.map((step) => step.edgeId)).toEqual([
      'e_c_6',
      'e_c_7',
      'e_c_8',
      'e_c_6',
      'e_c_7',
      'e_c_8',
    ])
    expect(parallelJourney?.steps[4]?.threads?.[1]?.steps.map((step) => step.edgeId)).toEqual([
      'e_c_10',
      'e_c_11',
      'e_c_10',
      'e_c_11',
      'e_c_10',
      'e_c_11',
    ])
    expect(parallelJourney?.steps.slice(-2).map((step) => step.edgeId)).toEqual(['e_c_10', 'e_c_11'])
    expect(staggeredParallelJourney?.steps[3]?.threads?.[0]?.id).toBe('t_projection')
    expect(staggeredParallelJourney?.steps[6]?.threads?.[0]?.id).toBe('t_read_probe_late')
  })

  it('translates showcase text to portuguese', () => {
    const workspace = createShowcaseWorkspace('pt', 'showcase')

    expect(workspace.workspace.id).toBe('workspace-showcase-pt')
    expect(workspace.workspace.name).toBe('Plataforma de Pedidos - Showcase')
    expect(workspace.views.v_container.name).toBe('Visao de Containers')
    expect(workspace.journeys.j_c_1.name).toBe('Criacao de Pedido (Sync + Evento)')
    expect(workspace.journeys.j_c_parallel_threads.name).toBe('Demo de Jornadas Paralelas (Threads)')
    expect(workspace.journeys.j_c_parallel_staggered.name).toBe('Threads Paralelas com Inicio Escalonado')
    expect(workspace.nodes.n_note_gateway.name).toContain('Contrato do gateway')
  })

  it('creates guided tutorial variants in both locales', () => {
    const tutorialEn = createShowcaseWorkspace('en', 'tutorial')
    const tutorialPt = createShowcaseWorkspace('pt', 'tutorial')

    expect(tutorialEn.workspace.id).toBe('workspace-tutorial-en')
    expect(tutorialEn.workspace.name).toBe('Orders Platform - Guided Tutorial')
    expect(tutorialEn.nodes.n_note_tutorial.name).toContain('Step-by-step')

    expect(tutorialPt.workspace.id).toBe('workspace-tutorial-pt')
    expect(tutorialPt.workspace.name).toBe('Plataforma de Pedidos - Tutorial Guiado')
    expect(tutorialPt.nodes.n_note_tutorial.name).toContain('Passo a passo')
  })
})
