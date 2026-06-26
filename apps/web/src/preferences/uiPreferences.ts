/**
 * Purpose: Parse and style persisted UI preferences with backward-compatible defaults.
 */

import type { CSSProperties } from 'react'
import type { ShowcaseLocale } from '../model/showcaseWorkspace'
import {
  isAppIconSetId,
  type AppIconSetId,
} from '../icons/iconSets'

export const UI_PREFERENCES_STORAGE_KEY = 'sjv-ui-preferences-v1'

export type ToolbarSectionId = 'navigation' | 'editing' | 'viewport' | 'panels' | 'modes'
export type UiDensity = 'comfortable' | 'compact'
export type UiFontScale = 'small' | 'normal' | 'large'
export type ChromeThemeId = 'midnight' | 'graphite' | 'teal' | 'custom'
export type CanvasBackgroundPresetId = 'soft-grid' | 'paper' | 'cool-gray' | 'warm-white' | 'custom'

export type UiChromeCustomColors = {
  shellBackground: string
  panelBackground: string
  controlBackground: string
  accentColor: string
  textColor: string
  mutedTextColor: string
  borderColor: string
}

export type ChromeThemePreset = {
  id: Exclude<ChromeThemeId, 'custom'>
  label: string
  description: string
  colors: UiChromeCustomColors
}

export type CanvasBackgroundPreset = {
  id: Exclude<CanvasBackgroundPresetId, 'custom'>
  label: string
  color: string
}

export type UiPreferences = {
  tooltipsEnabled: boolean
  splashEnabled: boolean
  nodeDepthEffectsEnabled: boolean
  performanceModeEnabled: boolean
  minimapEnabled: boolean
  statusBarEnabled: boolean
  showcaseLocale: ShowcaseLocale
  density: UiDensity
  fontScale: UiFontScale
  chromeThemeId: ChromeThemeId
  customChromeColors: UiChromeCustomColors
  canvasBackgroundPresetId: CanvasBackgroundPresetId
  customCanvasBackground: string
  iconSet: AppIconSetId
  menuBarVisible: boolean
  toolbarInlineWithBrand: boolean
  toolbarVisibility: Record<ToolbarSectionId, boolean>
}

export const CHROME_THEME_PRESETS: ChromeThemePreset[] = [
  {
    id: 'midnight',
    label: 'Midnight Pro',
    description: 'VS Code-inspired dark chrome with a calm blue accent.',
    colors: {
      shellBackground: '#101923',
      panelBackground: '#17212b',
      controlBackground: '#22303d',
      accentColor: '#58c7f3',
      textColor: '#f4f7fb',
      mutedTextColor: '#9fb0c0',
      borderColor: '#2c3f50',
    },
  },
  {
    id: 'graphite',
    label: 'Graphite',
    description: 'Neutral dark surfaces with restrained steel accents.',
    colors: {
      shellBackground: '#15191f',
      panelBackground: '#1d232b',
      controlBackground: '#2a313b',
      accentColor: '#8ab4f8',
      textColor: '#f1f5f9',
      mutedTextColor: '#a8b3c2',
      borderColor: '#343d49',
    },
  },
  {
    id: 'teal',
    label: 'Teal Focus',
    description: 'Productive dark chrome with green-blue action color.',
    colors: {
      shellBackground: '#0f1c1d',
      panelBackground: '#162729',
      controlBackground: '#20383a',
      accentColor: '#5eead4',
      textColor: '#effdf9',
      mutedTextColor: '#9cc9c2',
      borderColor: '#2f4b4d',
    },
  },
]

export const DEFAULT_CUSTOM_CHROME_COLORS: UiChromeCustomColors = {
  shellBackground: '#101923',
  panelBackground: '#17212b',
  controlBackground: '#22303d',
  accentColor: '#58c7f3',
  textColor: '#f4f7fb',
  mutedTextColor: '#9fb0c0',
  borderColor: '#2c3f50',
}

export const CANVAS_BACKGROUND_PRESETS: CanvasBackgroundPreset[] = [
  { id: 'soft-grid', label: 'Soft Grid', color: '#eef1f5' },
  { id: 'paper', label: 'Paper', color: '#f8fafc' },
  { id: 'cool-gray', label: 'Cool Gray', color: '#e5e7eb' },
  { id: 'warm-white', label: 'Warm White', color: '#f5f2ea' },
]

export const DEFAULT_CUSTOM_CANVAS_BACKGROUND = '#eef1f5'

export const DEFAULT_UI_PREFERENCES: UiPreferences = {
  tooltipsEnabled: true,
  splashEnabled: true,
  nodeDepthEffectsEnabled: false,
  performanceModeEnabled: false,
  minimapEnabled: true,
  statusBarEnabled: true,
  showcaseLocale: 'en',
  density: 'compact',
  fontScale: 'normal',
  chromeThemeId: 'midnight',
  customChromeColors: DEFAULT_CUSTOM_CHROME_COLORS,
  canvasBackgroundPresetId: 'soft-grid',
  customCanvasBackground: DEFAULT_CUSTOM_CANVAS_BACKGROUND,
  iconSet: 'lucide',
  menuBarVisible: true,
  toolbarInlineWithBrand: false,
  toolbarVisibility: {
    navigation: true,
    editing: true,
    viewport: true,
    panels: true,
    modes: true,
  },
}

const isRecordLike = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isHexColor = (value: unknown): value is string =>
  typeof value === 'string' && /^#[\da-fA-F]{6}$/.test(value)

const parseCustomChromeColors = (candidate: unknown): UiChromeCustomColors => {
  if (!isRecordLike(candidate)) {
    return DEFAULT_CUSTOM_CHROME_COLORS
  }
  return {
    shellBackground: isHexColor(candidate.shellBackground)
      ? candidate.shellBackground
      : DEFAULT_CUSTOM_CHROME_COLORS.shellBackground,
    panelBackground: isHexColor(candidate.panelBackground)
      ? candidate.panelBackground
      : DEFAULT_CUSTOM_CHROME_COLORS.panelBackground,
    controlBackground: isHexColor(candidate.controlBackground)
      ? candidate.controlBackground
      : DEFAULT_CUSTOM_CHROME_COLORS.controlBackground,
    accentColor: isHexColor(candidate.accentColor)
      ? candidate.accentColor
      : DEFAULT_CUSTOM_CHROME_COLORS.accentColor,
    textColor: isHexColor(candidate.textColor)
      ? candidate.textColor
      : DEFAULT_CUSTOM_CHROME_COLORS.textColor,
    mutedTextColor: isHexColor(candidate.mutedTextColor)
      ? candidate.mutedTextColor
      : DEFAULT_CUSTOM_CHROME_COLORS.mutedTextColor,
    borderColor: isHexColor(candidate.borderColor)
      ? candidate.borderColor
      : DEFAULT_CUSTOM_CHROME_COLORS.borderColor,
  }
}

const parseChromeThemeId = (value: unknown): ChromeThemeId => {
  if (value === 'midnight' || value === 'graphite' || value === 'teal' || value === 'custom') {
    return value
  }
  return DEFAULT_UI_PREFERENCES.chromeThemeId
}

const parseCanvasBackgroundPresetId = (value: unknown): CanvasBackgroundPresetId => {
  if (
    value === 'soft-grid' ||
    value === 'paper' ||
    value === 'cool-gray' ||
    value === 'warm-white' ||
    value === 'custom'
  ) {
    return value
  }
  return DEFAULT_UI_PREFERENCES.canvasBackgroundPresetId
}

const parseFontScale = (value: unknown): UiFontScale => {
  if (value === 'small' || value === 'normal' || value === 'large') {
    return value
  }
  return DEFAULT_UI_PREFERENCES.fontScale
}

export const parseUiPreferencesCandidate = (candidate: unknown): UiPreferences => {
  if (!isRecordLike(candidate)) {
    return DEFAULT_UI_PREFERENCES
  }

  const toolbarVisibility = isRecordLike(candidate.toolbarVisibility)
    ? candidate.toolbarVisibility
    : {}

  return {
    tooltipsEnabled:
      typeof candidate.tooltipsEnabled === 'boolean'
        ? candidate.tooltipsEnabled
        : DEFAULT_UI_PREFERENCES.tooltipsEnabled,
    splashEnabled:
      typeof candidate.splashEnabled === 'boolean'
        ? candidate.splashEnabled
        : DEFAULT_UI_PREFERENCES.splashEnabled,
    nodeDepthEffectsEnabled:
      typeof candidate.nodeDepthEffectsEnabled === 'boolean'
        ? candidate.nodeDepthEffectsEnabled
        : DEFAULT_UI_PREFERENCES.nodeDepthEffectsEnabled,
    performanceModeEnabled:
      typeof candidate.performanceModeEnabled === 'boolean'
        ? candidate.performanceModeEnabled
        : DEFAULT_UI_PREFERENCES.performanceModeEnabled,
    minimapEnabled:
      typeof candidate.minimapEnabled === 'boolean'
        ? candidate.minimapEnabled
        : DEFAULT_UI_PREFERENCES.minimapEnabled,
    statusBarEnabled:
      typeof candidate.statusBarEnabled === 'boolean'
        ? candidate.statusBarEnabled
        : DEFAULT_UI_PREFERENCES.statusBarEnabled,
    showcaseLocale:
      candidate.showcaseLocale === 'pt' || candidate.showcaseLocale === 'en'
        ? candidate.showcaseLocale
        : DEFAULT_UI_PREFERENCES.showcaseLocale,
    density:
      candidate.density === 'compact' || candidate.density === 'comfortable'
        ? candidate.density
        : DEFAULT_UI_PREFERENCES.density,
    fontScale: parseFontScale(candidate.fontScale),
    chromeThemeId: parseChromeThemeId(candidate.chromeThemeId),
    customChromeColors: parseCustomChromeColors(candidate.customChromeColors),
    canvasBackgroundPresetId: parseCanvasBackgroundPresetId(candidate.canvasBackgroundPresetId),
    customCanvasBackground: isHexColor(candidate.customCanvasBackground)
      ? candidate.customCanvasBackground
      : DEFAULT_UI_PREFERENCES.customCanvasBackground,
    iconSet: isAppIconSetId(candidate.iconSet) ? candidate.iconSet : DEFAULT_UI_PREFERENCES.iconSet,
    menuBarVisible:
      typeof candidate.menuBarVisible === 'boolean'
        ? candidate.menuBarVisible
        : DEFAULT_UI_PREFERENCES.menuBarVisible,
    toolbarInlineWithBrand:
      typeof candidate.toolbarInlineWithBrand === 'boolean'
        ? candidate.toolbarInlineWithBrand
        : DEFAULT_UI_PREFERENCES.toolbarInlineWithBrand,
    toolbarVisibility: {
      navigation:
        typeof toolbarVisibility.navigation === 'boolean'
          ? toolbarVisibility.navigation
          : DEFAULT_UI_PREFERENCES.toolbarVisibility.navigation,
      editing:
        typeof toolbarVisibility.editing === 'boolean'
          ? toolbarVisibility.editing
          : DEFAULT_UI_PREFERENCES.toolbarVisibility.editing,
      viewport:
        typeof toolbarVisibility.viewport === 'boolean'
          ? toolbarVisibility.viewport
          : DEFAULT_UI_PREFERENCES.toolbarVisibility.viewport,
      panels:
        typeof toolbarVisibility.panels === 'boolean'
          ? toolbarVisibility.panels
          : DEFAULT_UI_PREFERENCES.toolbarVisibility.panels,
      modes:
        typeof toolbarVisibility.modes === 'boolean'
          ? toolbarVisibility.modes
          : DEFAULT_UI_PREFERENCES.toolbarVisibility.modes,
    },
  }
}

export const resolveInitialUiPreferences = (): UiPreferences => {
  if (typeof window === 'undefined') {
    return DEFAULT_UI_PREFERENCES
  }
  try {
    const raw = window.localStorage.getItem(UI_PREFERENCES_STORAGE_KEY)
    return raw ? parseUiPreferencesCandidate(JSON.parse(raw)) : DEFAULT_UI_PREFERENCES
  } catch {
    return DEFAULT_UI_PREFERENCES
  }
}

const FONT_SCALE_VALUES: Record<UiFontScale, number> = {
  small: 0.92,
  normal: 1,
  large: 1.12,
}

const resolveChromeColors = (preferences: UiPreferences): UiChromeCustomColors => {
  if (preferences.chromeThemeId === 'custom') {
    return preferences.customChromeColors
  }
  return CHROME_THEME_PRESETS.find((preset) => preset.id === preferences.chromeThemeId)?.colors ??
    CHROME_THEME_PRESETS[0].colors
}

const resolveCanvasBackgroundColor = (preferences: UiPreferences): string => {
  if (preferences.canvasBackgroundPresetId === 'custom') {
    return preferences.customCanvasBackground
  }
  return CANVAS_BACKGROUND_PRESETS.find((preset) => preset.id === preferences.canvasBackgroundPresetId)?.color ??
    CANVAS_BACKGROUND_PRESETS[0].color
}

const shellMixFallback = (hexColor: string): string => `${hexColor}dd`

export const resolveUiPreferenceCssVariables = (preferences: UiPreferences): CSSProperties => {
  const colors = resolveChromeColors(preferences)
  return {
    '--sjv-ui-font-scale': String(FONT_SCALE_VALUES[preferences.fontScale]),
    '--sjv-shell-bg': colors.shellBackground,
    '--sjv-shell-panel-bg': colors.panelBackground,
    '--sjv-shell-panel-bg-alt': shellMixFallback(colors.panelBackground),
    '--sjv-shell-control-bg': colors.controlBackground,
    '--sjv-shell-control-hover': shellMixFallback(colors.controlBackground),
    '--sjv-shell-border': colors.borderColor,
    '--sjv-shell-text': colors.textColor,
    '--sjv-shell-muted': colors.mutedTextColor,
    '--sjv-shell-control-text': colors.textColor,
    '--sjv-shell-accent': colors.accentColor,
    '--sjv-shell-accent-soft': `${colors.accentColor}29`,
    '--sjv-shell-accent-border': `${colors.accentColor}73`,
    '--sjv-shell-status-bg': colors.shellBackground,
    '--sjv-shell-status-border': colors.borderColor,
    '--sjv-canvas-bg': resolveCanvasBackgroundColor(preferences),
  } as CSSProperties
}
