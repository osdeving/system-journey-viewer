/**
 * Purpose: Define core workspace types and built-in workspace/example data used by the editor.
 */

import { z } from 'zod'

export const portSchema = z.object({
  id: z.string().min(1),
  x: z.number(),
  y: z.number(),
})

export const nodeSchema = z.object({
  id: z.string().min(1),
  presetId: z.string().min(1).optional(),
  kind: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  tags: z.array(z.string()),
  tech: z
    .object({
      id: z.string().min(1),
      label: z.string().min(1),
      iconKey: z.string().min(1).optional(),
    })
    .optional(),
  style: z
    .object({
      fillColor: z.string().min(1).optional(),
      textColor: z.string().min(1).optional(),
    })
    .optional(),
  bounds: z.object({
    x: z.number(),
    y: z.number(),
    w: z.number().positive(),
    h: z.number().positive(),
  }),
  ports: z.array(portSchema),
  children: z.array(z.string()),
  drilldownRef: z.string().min(1).optional(),
  noteTargetNodeId: z.string().min(1).optional(),
})

export const edgeSchema = z.object({
  id: z.string().min(1),
  from: z.object({
    nodeId: z.string().min(1),
    portId: z.string().min(1).optional(),
  }),
  to: z.object({
    nodeId: z.string().min(1),
    portId: z.string().min(1).optional(),
  }),
  protocolPresetId: z.string().min(1),
  label: z.string(),
  description: z.string().optional(),
  route: z.object({
    kind: z.enum(['auto', 'manual']),
    points: z.array(z.object({ x: z.number(), y: z.number() })),
  }),
  style: z.object({
    dashed: z.boolean(),
    thickness: z.number().positive(),
    arrow: z.boolean(),
    labelFontSize: z.number().min(1).max(64).optional(),
    labelPosition: z.number().min(0).max(1).optional(),
    labelSide: z.enum(['left', 'right']).optional(),
    labelAngle: z.number().min(-180).max(180).optional(),
  }),
})

const journeyThreadStepSchema = z.object({
  n: z.number().int().positive(),
  edgeId: z.string().min(1),
  highlightNodes: z.array(z.string()).optional(),
})

const journeyThreadSchema = z.object({
  id: z.string().min(1),
  steps: z.array(journeyThreadStepSchema),
})

export const journeySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  colorKey: z.string().min(1),
  steps: z.array(
    z.object({
      n: z.number().int().positive(),
      edgeId: z.string().min(1),
      highlightNodes: z.array(z.string()).optional(),
      threads: z.array(journeyThreadSchema).optional(),
    }),
  ),
  player: z.object({
    loop: z.boolean(),
    speedMs: z.number().int().positive(),
    pauseOnStep: z.boolean(),
  }),
})

export const viewSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['system-context', 'container', 'component', 'hex']),
  name: z.string().min(1),
  nodeIds: z.array(z.string()),
  edgeIds: z.array(z.string()),
  journeyIds: z.array(z.string()),
})

export const workspaceSchema = z.object({
  schemaVersion: z.literal('1.0'),
  workspace: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
  }),
  views: z.record(z.string(), viewSchema),
  nodes: z.record(z.string(), nodeSchema),
  edges: z.record(z.string(), edgeSchema),
  journeys: z.record(z.string(), journeySchema),
  settings: z.object({
    grid: z.boolean(),
    snap: z.boolean(),
    theme: z.enum(['light', 'dark']).default('light'),
    journeyFocus: z
      .object({
        offscopeRenderMode: z.enum(['show', 'hide', 'dim']).default('hide'),
        layoutMode: z.enum(['preserve', 'reflow']).default('preserve'),
        autoLayoutMode: z.enum(['manual', 'always']).default('manual'),
      })
      .default({
        offscopeRenderMode: 'hide',
        layoutMode: 'preserve',
        autoLayoutMode: 'manual',
      }),
  }),
})

export const viewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number().positive(),
})

export const editorSnapshotSchema = z.object({
  workspace: workspaceSchema,
  currentViewId: z.string().min(1),
  viewport: viewportSchema,
  viewHistory: z.array(z.string().min(1)).optional(),
  selectedNodeId: z.string().min(1).nullable().optional(),
  selectedNodeIds: z.array(z.string().min(1)).optional(),
  selectedEdgeId: z.string().min(1).nullable().optional(),
  activeTool: z.enum(['select', 'connector']).optional(),
  pendingConnectionFrom: z.string().min(1).nullable().optional(),
  pendingConnectionPortId: z.string().min(1).nullable().optional(),
  activeJourneyId: z.string().min(1).nullable().optional(),
  journeyFilterId: z.string().min(1).nullable().optional(),
  playerJourneyId: z.string().min(1).nullable().optional(),
  playerIsRunning: z.boolean().optional(),
  playerStepIndex: z.number().int().min(0).optional(),
  playerLoop: z.boolean().optional(),
  playerSpeedMs: z.number().int().positive().optional(),
  playerHighlightNodes: z.boolean().optional(),
  playerTrailEnabled: z.boolean().optional(),
})

export type WorkspaceModelSchema = z.infer<typeof workspaceSchema>
export type EditorSnapshotSchema = z.infer<typeof editorSnapshotSchema>
