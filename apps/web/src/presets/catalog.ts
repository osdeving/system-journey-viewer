import nodePresetsJson from './nodePresets.json'
import protocolPresetsJson from './protocolPresets.json'
import techPresetsJson from './techPresets.json'

export interface NodePreset {
  id: string
  kind: string
  label: string
  category: 'C4' | 'Infra' | 'Hex'
  defaultTechId: string
  iconKey: string
  defaultWidth: number
  defaultHeight: number
}

export interface TechPreset {
  id: string
  label: string
  iconKey: string
}

export interface ProtocolPreset {
  id: string
  label: string
}

export const nodePresets = nodePresetsJson as NodePreset[]
export const techPresets = techPresetsJson as TechPreset[]
export const protocolPresets = protocolPresetsJson as ProtocolPreset[]

const nodePresetMap = Object.fromEntries(nodePresets.map((preset) => [preset.id, preset]))
const techPresetMap = Object.fromEntries(techPresets.map((preset) => [preset.id, preset]))

export const nodePresetsByCategory = nodePresets.reduce<Record<string, NodePreset[]>>((acc, preset) => {
  if (!acc[preset.category]) {
    acc[preset.category] = []
  }
  acc[preset.category].push(preset)
  return acc
}, {})

export const resolveNodePreset = (presetId: string): NodePreset | undefined =>
  nodePresetMap[presetId]

export const resolveTechPreset = (techId: string): TechPreset | undefined =>
  techPresetMap[techId]
