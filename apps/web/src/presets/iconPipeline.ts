const icons: Record<string, string> = {
  system: '🧭',
  container: '📦',
  component: '🧩',
  boundary: '🗂️',
  database: '🛢️',
  queue: '📨',
  gateway: '🌐',
  security: '🔐',
  spring: '🍃',
  kafka: '🟦',
  postgres: '🐘',
  cache: '⚡',
  search: '🔎',
}

export const iconForKey = (key?: string): string => {
  if (!key) {
    return '⬜'
  }
  return icons[key] ?? '⬜'
}
