/**
 * Purpose: Verify showcase Workspace behavior with regression-focused unit tests.
 */

import { describe, expect, it } from 'vitest'
import { createShowcaseWorkspace } from './showcaseWorkspace'

describe('createShowcaseWorkspace', () => {
  it('creates english showcase by default', () => {
    const workspace = createShowcaseWorkspace()

    expect(workspace.workspace.id).toBe('workspace-showcase-en')
    expect(workspace.workspace.name).toBe('Orders Platform Showcase')
    expect(workspace.nodes.n_worker.drilldownRef).toBe('v_components_worker')
    expect(workspace.views.v_components_worker).toBeDefined()
    expect(workspace.views.v_hex_worker).toBeDefined()
    expect(workspace.journeys.j_worker_comp_1.name).toContain('Fulfillment')
  })

  it('translates showcase text to portuguese', () => {
    const workspace = createShowcaseWorkspace('pt', 'showcase')

    expect(workspace.workspace.id).toBe('workspace-showcase-pt')
    expect(workspace.workspace.name).toBe('Plataforma de Pedidos - Showcase')
    expect(workspace.views.v_container.name).toBe('Visao de Containers')
    expect(workspace.journeys.j_c_1.name).toBe('Criacao de Pedido (Sync + Evento)')
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
