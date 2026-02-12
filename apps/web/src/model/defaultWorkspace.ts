import type { WorkspaceModel } from './types'

const defaultPorts = [
  { id: 'north', x: 0.5, y: 0 },
  { id: 'east', x: 1, y: 0.5 },
  { id: 'south', x: 0.5, y: 1 },
  { id: 'west', x: 0, y: 0.5 },
]

export const createDefaultWorkspace = (): WorkspaceModel => ({
  schemaVersion: '1.0',
  workspace: {
    id: 'workspace-default',
    name: 'C4 Journey Workspace',
  },
  views: {
    v_container: {
      id: 'v_container',
      kind: 'container',
      name: 'Container View',
      nodeIds: ['n_api', 'n_kafka', 'n_db'],
      edgeIds: [],
      journeyIds: [],
    },
  },
  nodes: {
    n_api: {
      id: 'n_api',
      presetId: 'container',
      kind: 'container',
      name: 'ms-orders',
      tags: ['core'],
      tech: { id: 'spring-boot', label: 'Spring Boot', iconKey: 'spring' },
      bounds: { x: 180, y: 120, w: 220, h: 120 },
      ports: defaultPorts,
      children: [],
    },
    n_kafka: {
      id: 'n_kafka',
      presetId: 'queue',
      kind: 'queue',
      name: 'Kafka',
      tags: ['infra'],
      tech: { id: 'kafka', label: 'Kafka', iconKey: 'kafka' },
      bounds: { x: 520, y: 110, w: 180, h: 90 },
      ports: defaultPorts,
      children: [],
    },
    n_db: {
      id: 'n_db',
      presetId: 'db',
      kind: 'db',
      name: 'orders-db',
      tags: ['infra'],
      tech: { id: 'postgres', label: 'PostgreSQL', iconKey: 'postgres' },
      bounds: { x: 520, y: 260, w: 180, h: 90 },
      ports: defaultPorts,
      children: [],
    },
  },
  edges: {},
  journeys: {},
  settings: {
    grid: false,
    snap: false,
  },
})
