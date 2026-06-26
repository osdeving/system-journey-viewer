/**
 * Purpose: Sanitize canvas inline text edits before they update the workspace model.
 */

type InlineTextSanitizeOptions = {
  multiline?: boolean
}

const isUnsupportedScriptControlChar = (value: string): boolean => {
  const codePoint = value.charCodeAt(0)
  return codePoint === 127 || (codePoint < 32 && codePoint !== 9 && codePoint !== 10 && codePoint !== 13)
}

const stripUnsupportedScriptControlChars = (value: string): string =>
  [...value].filter((character) => !isUnsupportedScriptControlChar(character)).join('')

export const sanitizeInlineTextEditValue = (
  value: string,
  options: InlineTextSanitizeOptions = {},
): string => {
  const withoutUnsupportedControls = stripUnsupportedScriptControlChars(value)

  if (options.multiline) {
    return withoutUnsupportedControls.replace(/\r\n?/g, '\n')
  }

  return withoutUnsupportedControls
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
