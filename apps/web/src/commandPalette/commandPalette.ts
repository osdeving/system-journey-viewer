/**
 * Purpose: Rank and filter command-palette actions for quick editor navigation.
 */

export type CommandPaletteItem = {
  id: string
  title: string
  section: string
  subtitle?: string
  shortcut?: string
  keywords?: string[]
  disabled?: boolean
}

export type RankedCommandPaletteItem = CommandPaletteItem & {
  score: number
}

const normalizeSearchText = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const scoreField = (field: string, token: string, weight: number): number => {
  const normalizedField = normalizeSearchText(field)
  if (!normalizedField) {
    return 0
  }
  if (normalizedField === token) {
    return weight + 36
  }
  if (normalizedField.startsWith(token)) {
    return weight + 24
  }
  const wordStart = normalizedField
    .split(/\s+/)
    .some((word) => word.startsWith(token))
  if (wordStart) {
    return weight + 12
  }
  if (normalizedField.includes(token)) {
    return weight
  }
  return 0
}

const scoreItemForToken = (item: CommandPaletteItem, token: string): number => {
  const keywordScore = (item.keywords ?? []).reduce(
    (best, keyword) => Math.max(best, scoreField(keyword, token, 48)),
    0,
  )
  return Math.max(
    scoreField(item.title, token, 96),
    scoreField(item.section, token, 34),
    scoreField(item.subtitle ?? '', token, 42),
    scoreField(item.shortcut ?? '', token, 28),
    keywordScore,
  )
}

export const filterCommandPaletteItems = (
  items: CommandPaletteItem[],
  query: string,
  limit = 24,
): RankedCommandPaletteItem[] => {
  const tokens = normalizeSearchText(query)
    .split(/\s+/)
    .filter(Boolean)

  if (!tokens.length) {
    return items.slice(0, limit).map((item, index) => ({
      ...item,
      score: item.disabled ? -1000 - index : -index,
    }))
  }

  return items
    .map((item, index): RankedCommandPaletteItem | null => {
      let score = 0
      for (const token of tokens) {
        const tokenScore = scoreItemForToken(item, token)
        if (tokenScore <= 0) {
          return null
        }
        score += tokenScore
      }
      return {
        ...item,
        score: score - index * 0.01 - (item.disabled ? 24 : 0),
      }
    })
    .filter((item): item is RankedCommandPaletteItem => item !== null)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
}
