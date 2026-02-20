import type { Monaco } from '@monaco-editor/react'

export const JOURNEY_SCRIPT_LANGUAGE_ID = 'journey-script'
export const JOURNEY_SCRIPT_NAME = 'SJV Script'

const KEYWORDS = [
  'workspace',
  'view',
  'parent',
  'via',
  'tech',
  'drilldown',
  'contains',
  'journey',
  'color',
  'metadata',
  'ui-layout',
  'edge',
  'note',
  'on',
  'label',
  'at',
  'size',
  'side',
  'font',
  'angle',
]

const THEME_LIGHT = 'sjv-journeyscript-light'
const THEME_DARK = 'sjv-journeyscript-dark'

const DEFAULT_THEME_TOKENS = [
  { token: 'keyword', foreground: '0f52ba', fontStyle: 'bold' },
  { token: 'type', foreground: '0ea5e9' },
  { token: 'identifier', foreground: '0f172a' },
  { token: 'string', foreground: '166534' },
  { token: 'number', foreground: '7c3aed' },
  { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
]

const DARK_THEME_TOKENS = [
  { token: 'keyword', foreground: '7dd3fc', fontStyle: 'bold' },
  { token: 'type', foreground: '93c5fd' },
  { token: 'identifier', foreground: 'e2e8f0' },
  { token: 'string', foreground: '86efac' },
  { token: 'number', foreground: 'c4b5fd' },
  { token: 'comment', foreground: '94a3b8', fontStyle: 'italic' },
]

let isRegistered = false

export const registerJourneyScriptLanguage = (monaco: Monaco): void => {
  if (
    isRegistered ||
    monaco.languages
      .getLanguages()
      .some((language: { id: string }) => language.id === JOURNEY_SCRIPT_LANGUAGE_ID)
  ) {
    isRegistered = true
    return
  }

  monaco.languages.register({ id: JOURNEY_SCRIPT_LANGUAGE_ID })

  monaco.languages.setMonarchTokensProvider(JOURNEY_SCRIPT_LANGUAGE_ID, {
    defaultToken: 'invalid',
    keywords: KEYWORDS,
    tokenizer: {
      root: [
        [/\s+/, 'white'],
        [/\/\/.*$/, 'comment'],
        [/#[^\n]*$/, 'comment'],
        [/"([^"\\]|\\.)*"/, 'string'],
        [/[{}()[\],]/, '@brackets'],
        [/\b\d+\b/, 'number'],
        [
          /[a-zA-Z_][\w-]*/,
          {
            cases: {
              '@keywords': 'keyword',
              'container|component|system-context|hex|system|boundary|domain|application-service|port-in|port-out|adapter-in|adapter-out|db|queue|gateway|security|note':
                'type',
              '@default': 'identifier',
            },
          },
        ],
      ],
    },
  })

  monaco.languages.setLanguageConfiguration(JOURNEY_SCRIPT_LANGUAGE_ID, {
    comments: {
      lineComment: '//',
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
    ],
    surroundingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"' },
    ],
  })

  monaco.editor.defineTheme(THEME_LIGHT, {
    base: 'vs',
    inherit: true,
    rules: DEFAULT_THEME_TOKENS,
    colors: {
      'editor.background': '#f8fafc',
      'editorLineNumber.foreground': '#94a3b8',
      'editorLineNumber.activeForeground': '#0f172a',
      'editorCursor.foreground': '#0369a1',
      'editor.selectionBackground': '#dbeafe',
      'editor.inactiveSelectionBackground': '#e2e8f0',
    },
  })

  monaco.editor.defineTheme(THEME_DARK, {
    base: 'vs-dark',
    inherit: true,
    rules: DARK_THEME_TOKENS,
    colors: {
      'editor.background': '#0f172a',
      'editorLineNumber.foreground': '#64748b',
      'editorLineNumber.activeForeground': '#e2e8f0',
      'editorCursor.foreground': '#38bdf8',
      'editor.selectionBackground': '#1e3a8a',
      'editor.inactiveSelectionBackground': '#1e293b',
    },
  })

  isRegistered = true
}

export const resolveJourneyScriptTheme = (mode: 'light' | 'dark'): string =>
  mode === 'dark' ? THEME_DARK : THEME_LIGHT
