/**
 * Purpose: Define core workspace types and built-in workspace/example data used by the editor.
 */

import { createDefaultWorkspace } from './defaultWorkspace'
import type { WorkspaceModel } from './types'

export type ShowcaseLocale = 'en' | 'pt'
export type ShowcaseMode = 'showcase' | 'tutorial'

const cloneWorkspace = (workspace: WorkspaceModel): WorkspaceModel => {
  if (typeof structuredClone === 'function') {
    return structuredClone(workspace)
  }
  return JSON.parse(JSON.stringify(workspace)) as WorkspaceModel
}

const PARALLEL_SHOWCASE_JOURNEY_ID = 'j_c_parallel_threads'
const STAGGERED_PARALLEL_SHOWCASE_JOURNEY_ID = 'j_c_parallel_staggered'

const injectParallelThreadShowcaseJourney = (workspace: WorkspaceModel, locale: ShowcaseLocale): void => {
  const containerView = workspace.views.v_container
  if (!containerView) {
    return
  }

  workspace.journeys[PARALLEL_SHOWCASE_JOURNEY_ID] = {
    id: PARALLEL_SHOWCASE_JOURNEY_ID,
    name:
      locale === 'pt'
        ? 'Demo de Jornadas Paralelas (Threads)'
        : 'Parallel Journey Threads Demo',
    colorKey: '#0ea5e9',
    steps: [
      { n: 1, edgeId: 'e_c_1' },
      { n: 2, edgeId: 'e_c_2' },
      { n: 3, edgeId: 'e_c_3' },
      { n: 4, edgeId: 'e_c_4' },
      {
        n: 5,
        edgeId: 'e_c_5',
        threads: [
          {
            id: 't_projection',
            steps: [
              { n: 1, edgeId: 'e_c_6' },
              { n: 2, edgeId: 'e_c_7' },
              { n: 3, edgeId: 'e_c_8' },
              { n: 4, edgeId: 'e_c_6' },
              { n: 5, edgeId: 'e_c_7' },
              { n: 6, edgeId: 'e_c_8' },
            ],
          },
          {
            id: 't_read_probe',
            steps: [
              { n: 1, edgeId: 'e_c_10' },
              { n: 2, edgeId: 'e_c_11' },
              { n: 3, edgeId: 'e_c_10' },
              { n: 4, edgeId: 'e_c_11' },
              { n: 5, edgeId: 'e_c_10' },
              { n: 6, edgeId: 'e_c_11' },
            ],
          },
        ],
      },
      { n: 6, edgeId: 'e_c_9' },
      { n: 7, edgeId: 'e_c_10' },
      { n: 8, edgeId: 'e_c_11' },
      { n: 9, edgeId: 'e_c_9' },
      { n: 10, edgeId: 'e_c_10' },
      { n: 11, edgeId: 'e_c_11' },
      { n: 12, edgeId: 'e_c_10' },
      { n: 13, edgeId: 'e_c_11' },
    ],
    player: { loop: true, speedMs: 1800, pauseOnStep: false },
  }

  workspace.journeys[STAGGERED_PARALLEL_SHOWCASE_JOURNEY_ID] = {
    id: STAGGERED_PARALLEL_SHOWCASE_JOURNEY_ID,
    name:
      locale === 'pt'
        ? 'Threads Paralelas com Inicio Escalonado'
        : 'Parallel Threads with Staggered Start',
    colorKey: '#f97316',
    steps: [
      { n: 1, edgeId: 'e_c_1' },
      { n: 2, edgeId: 'e_c_2' },
      { n: 3, edgeId: 'e_c_3' },
      {
        n: 4,
        edgeId: 'e_c_4',
        threads: [
          {
            id: 't_projection',
            steps: [
              { n: 1, edgeId: 'e_c_6' },
              { n: 2, edgeId: 'e_c_7' },
              { n: 3, edgeId: 'e_c_8' },
              { n: 4, edgeId: 'e_c_7' },
            ],
          },
        ],
      },
      { n: 5, edgeId: 'e_c_5' },
      { n: 6, edgeId: 'e_c_9' },
      {
        n: 7,
        edgeId: 'e_c_10',
        threads: [
          {
            id: 't_read_probe_late',
            steps: [
              { n: 1, edgeId: 'e_c_11' },
              { n: 2, edgeId: 'e_c_10' },
              { n: 3, edgeId: 'e_c_11' },
            ],
          },
        ],
      },
      { n: 8, edgeId: 'e_c_11' },
      { n: 9, edgeId: 'e_c_9' },
      { n: 10, edgeId: 'e_c_10' },
      { n: 11, edgeId: 'e_c_11' },
    ],
    player: { loop: true, speedMs: 1800, pauseOnStep: false },
  }

  if (!containerView.journeyIds.includes(PARALLEL_SHOWCASE_JOURNEY_ID)) {
    const afterPrimaryIndex = containerView.journeyIds.indexOf('j_c_1')
    if (afterPrimaryIndex >= 0) {
      containerView.journeyIds.splice(afterPrimaryIndex + 1, 0, PARALLEL_SHOWCASE_JOURNEY_ID)
    } else {
      containerView.journeyIds.push(PARALLEL_SHOWCASE_JOURNEY_ID)
    }
  }
  if (!containerView.journeyIds.includes(STAGGERED_PARALLEL_SHOWCASE_JOURNEY_ID)) {
    const parallelIndex = containerView.journeyIds.indexOf(PARALLEL_SHOWCASE_JOURNEY_ID)
    if (parallelIndex >= 0) {
      containerView.journeyIds.splice(parallelIndex + 1, 0, STAGGERED_PARALLEL_SHOWCASE_JOURNEY_ID)
    } else {
      containerView.journeyIds.push(STAGGERED_PARALLEL_SHOWCASE_JOURNEY_ID)
    }
  }
}

const applyPortugueseText = (workspace: WorkspaceModel): void => {
  workspace.workspace.name = 'Plataforma de Pedidos - Showcase'
  workspace.views.v_container.name = 'Visao de Containers'
  workspace.views.v_components_api.name = 'Componentes do ms-orders'
  workspace.views.v_hex_api.name = 'Visao Hexagonal do ms-orders'
  workspace.views.v_components_worker.name = 'Componentes do ms-fulfillment'
  workspace.views.v_hex_worker.name = 'Visao Hexagonal do ms-fulfillment'

  const namesByNodeId: Record<string, string> = {
    n_note_gateway:
      'Contrato do gateway:\nvalidate_token antes de encaminhar requisicoes.',
    n_note_projection:
      'Pipeline de projecao:\norder.created -> worker -> atualizacao do modelo de leitura.',
    n_note_tutorial:
      'Tutorial: abra drilldown em cada MS e execute jornadas.\nDepois exporte GIF/MP4 no menu File.',
    n_note_component_guardrails:
      'Guia de componentes:\nservico define fronteira transacional.',
    n_note_hex_boundary:
      'Fronteira hexagonal:\nports isolam adapters de infraestrutura.',
    n_note_worker_flow:
      'Fluxo fulfillment:\nconsumer valida evento e atualiza projecao + metricas.',
    n_note_worker_hex:
      'Hex fulfillment:\nports mantem o caso de uso independente de storage e telemetria.',
  }

  for (const [nodeId, name] of Object.entries(namesByNodeId)) {
    if (workspace.nodes[nodeId]) {
      workspace.nodes[nodeId].name = name
    }
  }

  const labelsByEdgeId: Record<string, string> = {
    e_c_2: 'validar token',
    e_c_3: 'encaminhar requisicao',
    e_c_5: 'publicar order.created',
    e_c_6: 'consumir order.created',
    e_c_7: 'atualizar projecao',
    e_c_8: 'publicar metricas',
    e_comp_1: 'criar_pedido',
    e_comp_2: 'validar_regras_do_pedido',
    e_comp_3: 'persistir_registro_do_pedido',
    e_comp_4: 'publicar_evento_order_created',
    e_worker_comp_1: 'consumir_evento_order_created',
    e_worker_comp_2: 'aplicar_regras_de_projecao',
    e_worker_comp_3: 'publicar_metrica_de_fulfillment',
    e_worker_comp_4: 'emitir_sinal_projection_updated',
  }

  for (const [edgeId, label] of Object.entries(labelsByEdgeId)) {
    if (workspace.edges[edgeId]) {
      workspace.edges[edgeId].label = label
    }
  }

  const namesByJourneyId: Record<string, string> = {
    j_c_1: 'Criacao de Pedido (Sync + Evento)',
    [PARALLEL_SHOWCASE_JOURNEY_ID]: 'Demo de Jornadas Paralelas (Threads)',
    [STAGGERED_PARALLEL_SHOWCASE_JOURNEY_ID]: 'Threads Paralelas com Inicio Escalonado',
    j_c_2: 'Atualizacao Assincrona de Projecao',
    j_c_3: 'Consulta de Pedido',
    j_comp_1: 'Orquestracao de Componentes (ms-orders)',
    j_hex_1: 'Fluxo Hexagonal (ms-orders)',
    j_worker_comp_1: 'Orquestracao de Componentes (fulfillment)',
    j_worker_hex_1: 'Fluxo Hexagonal (fulfillment)',
  }

  for (const [journeyId, journeyName] of Object.entries(namesByJourneyId)) {
    if (workspace.journeys[journeyId]) {
      workspace.journeys[journeyId].name = journeyName
    }
  }
}

const applyTutorialMode = (
  workspace: WorkspaceModel,
  locale: ShowcaseLocale,
): void => {
  workspace.workspace.name =
    locale === 'pt'
      ? 'Plataforma de Pedidos - Tutorial Guiado'
      : 'Orders Platform - Guided Tutorial'

  if (workspace.nodes.n_note_tutorial) {
    workspace.nodes.n_note_tutorial.name =
      locale === 'pt'
        ? 'Passo a passo:\n1) siga a jornada principal.\n2) abra drilldowns dos MS.\n3) exporte GIF/MP4.'
        : 'Step-by-step:\n1) follow the main journey.\n2) open microservice drilldowns.\n3) export GIF/MP4.'
  }
}

export const createShowcaseWorkspace = (
  locale: ShowcaseLocale = 'en',
  mode: ShowcaseMode = 'showcase',
): WorkspaceModel => {
  const workspace = cloneWorkspace(createDefaultWorkspace())

  injectParallelThreadShowcaseJourney(workspace, locale)

  workspace.workspace.id =
    locale === 'pt'
      ? mode === 'tutorial'
        ? 'workspace-tutorial-pt'
        : 'workspace-showcase-pt'
      : mode === 'tutorial'
      ? 'workspace-tutorial-en'
      : 'workspace-showcase-en'

  if (locale === 'pt') {
    applyPortugueseText(workspace)
  }

  if (mode === 'tutorial') {
    applyTutorialMode(workspace, locale)
  }

  return workspace
}
