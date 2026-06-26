/**
 * Purpose: Store app icon mappings and preset glyph fallbacks outside React component files.
 */

import {
  BookOpen,
  CircleHelp,
  Code2,
  Compass,
  Container,
  Copy,
  Database,
  Dock,
  Download,
  FilePlus2,
  Filter,
  Folder,
  FolderOpen,
  Globe2,
  Grid3X3,
  GripVertical,
  Image,
  Info,
  Languages,
  Leaf,
  Link2,
  ListOrdered,
  Magnet,
  MessagesSquare,
  Moon,
  MousePointer,
  PanelBottomClose,
  PanelBottomOpen,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Pause,
  Play,
  Plus,
  Presentation,
  Puzzle,
  RadioTower,
  Redo2,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Target,
  Trash2,
  Type,
  Undo2,
  Workflow,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from 'lucide-react'

export type AppIconId =
  | 'book'
  | 'close'
  | 'code'
  | 'copy'
  | 'dock'
  | 'download'
  | 'file-plus'
  | 'filter'
  | 'folder'
  | 'folder-open'
  | 'grid'
  | 'grip-vertical'
  | 'help'
  | 'image'
  | 'info'
  | 'language'
  | 'link'
  | 'list-ordered'
  | 'magnet'
  | 'moon'
  | 'pause'
  | 'play'
  | 'plus'
  | 'pointer'
  | 'presentation'
  | 'redo'
  | 'reset'
  | 'save'
  | 'search'
  | 'skip-back'
  | 'skip-forward'
  | 'sliders'
  | 'sparkles'
  | 'sun'
  | 'target'
  | 'trash'
  | 'type'
  | 'undo'
  | 'workflow'
  | 'zoom-in'
  | 'zoom-out'
  | 'panel-bottom-close'
  | 'panel-bottom-open'
  | 'panel-left-close'
  | 'panel-left-open'
  | 'panel-right-close'
  | 'panel-right-open'

export type PresetIconKey =
  | 'system'
  | 'container'
  | 'component'
  | 'boundary'
  | 'database'
  | 'queue'
  | 'gateway'
  | 'security'
  | 'spring'
  | 'kafka'
  | 'postgres'
  | 'cache'
  | 'search'

export const APP_ICON_COMPONENTS: Record<AppIconId, LucideIcon> = {
  book: BookOpen,
  close: X,
  code: Code2,
  copy: Copy,
  dock: Dock,
  download: Download,
  'file-plus': FilePlus2,
  filter: Filter,
  folder: Folder,
  'folder-open': FolderOpen,
  grid: Grid3X3,
  'grip-vertical': GripVertical,
  help: CircleHelp,
  image: Image,
  info: Info,
  language: Languages,
  link: Link2,
  'list-ordered': ListOrdered,
  magnet: Magnet,
  moon: Moon,
  pause: Pause,
  play: Play,
  plus: Plus,
  pointer: MousePointer,
  presentation: Presentation,
  redo: Redo2,
  reset: RotateCcw,
  save: Save,
  search: Search,
  'skip-back': SkipBack,
  'skip-forward': SkipForward,
  sliders: SlidersHorizontal,
  sparkles: Sparkles,
  sun: Sun,
  target: Target,
  trash: Trash2,
  type: Type,
  undo: Undo2,
  workflow: Workflow,
  'zoom-in': ZoomIn,
  'zoom-out': ZoomOut,
  'panel-bottom-close': PanelBottomClose,
  'panel-bottom-open': PanelBottomOpen,
  'panel-left-close': PanelLeftClose,
  'panel-left-open': PanelLeftOpen,
  'panel-right-close': PanelRightClose,
  'panel-right-open': PanelRightOpen,
}

export const PRESET_ICON_COMPONENTS: Record<PresetIconKey, LucideIcon> = {
  system: Compass,
  container: Container,
  component: Puzzle,
  boundary: Folder,
  database: Database,
  queue: MessagesSquare,
  gateway: Globe2,
  security: ShieldCheck,
  spring: Leaf,
  kafka: RadioTower,
  postgres: Database,
  cache: Zap,
  search: Search,
}

const PRESET_ICON_GLYPHS: Record<PresetIconKey, string> = {
  system: '⌖',
  container: '▣',
  component: '◇',
  boundary: '▱',
  database: '◉',
  queue: '⇄',
  gateway: '◎',
  security: '◈',
  spring: '✦',
  kafka: '≋',
  postgres: '◉',
  cache: '⚡',
  search: '⌕',
}

export const presetIconGlyphForKey = (key?: string): string => {
  if (!key) {
    return '□'
  }
  return PRESET_ICON_GLYPHS[key as PresetIconKey] ?? '□'
}

export const iconRegistryComponents = {
  app: APP_ICON_COMPONENTS,
  preset: PRESET_ICON_COMPONENTS,
}
